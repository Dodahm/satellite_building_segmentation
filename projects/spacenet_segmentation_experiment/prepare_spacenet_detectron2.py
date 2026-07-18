from __future__ import annotations

import argparse
import json
import random
import re
from pathlib import Path

import pandas as pd


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--prepared-image-root", type=Path, default=None)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--val-per-aoi", type=int, default=2)
    return parser.parse_args()


def parse_wkt_polygon(wkt: str) -> list[list[float]]:
    if not isinstance(wkt, str) or wkt.strip() == "POLYGON EMPTY":
        return []
    text = wkt.strip()
    text = text.replace("POLYGON ((", "").replace("))", "")
    rings = text.split("),(")
    polygons = []
    for ring in rings:
        coords = []
        for token in ring.split(","):
            parts = token.strip().split()
            if len(parts) >= 2:
                coords.extend([float(parts[0]), float(parts[1])])
        if len(coords) >= 6:
            polygons.append(coords)
    return polygons


def bbox_from_polygon(poly: list[float]) -> list[float]:
    xs = poly[0::2]
    ys = poly[1::2]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    return [min_x, min_y, max_x - min_x, max_y - min_y]


def build_coco_split(items: list[dict], split_ids: set[str]) -> dict:
    images = []
    annotations = []
    ann_id = 1
    for item in items:
        if item["image_id"] not in split_ids:
            continue
        images.append(
            {
                "id": item["image_id"],
                "file_name": item["file_name"],
                "height": item["height"],
                "width": item["width"],
            }
        )
        for ann in item["annotations"]:
            annotations.append(
                {
                    "id": ann_id,
                    "image_id": item["image_id"],
                    "category_id": 1,
                    "bbox": ann["bbox"],
                    "bbox_mode": 1,
                    "segmentation": ann["segmentation"],
                    "area": ann["area"],
                    "iscrowd": 0,
                }
            )
            ann_id += 1

    return {
        "images": images,
        "annotations": annotations,
        "categories": [{"id": 1, "name": "building"}],
    }


def main() -> None:
    args = parse_args()
    random.seed(args.seed)

    items = []
    for aoi_dir in sorted(args.source_root.iterdir()):
        if not aoi_dir.is_dir():
            continue
        summary_csv = next((aoi_dir / "summaryData").glob("*.csv"))
        labels = pd.read_csv(summary_csv)
        rgb_dir = aoi_dir / "RGB-PanSharpen"
        image_files = sorted(rgb_dir.glob("*.tif"))
        for image_path in image_files:
            image_id = image_path.stem.replace("RGB-PanSharpen_", "")
            if args.prepared_image_root:
                prepared = args.prepared_image_root / "images" / f"{image_id}.png"
                file_name = str(prepared.resolve())
            else:
                file_name = str(image_path.resolve())
            rows = labels[labels["ImageId"] == image_id]
            annotations = []
            for _, row in rows.iterrows():
                polys = parse_wkt_polygon(str(row["PolygonWKT_Pix"]))
                if not polys:
                    continue
                area = 0.0
                for poly in polys:
                    xs = poly[0::2]
                    ys = poly[1::2]
                    # Shoelace formula
                    s = 0.0
                    for i in range(len(xs)):
                        j = (i + 1) % len(xs)
                        s += xs[i] * ys[j] - xs[j] * ys[i]
                    area += abs(s) / 2.0
                annotations.append(
                    {
                        "segmentation": polys,
                        "bbox": bbox_from_polygon(polys[0]),
                        "area": area,
                    }
                )

            items.append(
                {
                    "image_id": image_id,
                    "aoi": aoi_dir.name,
                    "file_name": file_name,
                    "height": 650,
                    "width": 650,
                    "annotations": annotations,
                }
            )

    output_root = args.output_root
    output_root.mkdir(parents=True, exist_ok=True)
    (output_root / "all.json").write_text(json.dumps(items, indent=2))

    train_ids = set()
    val_ids = set()
    grouped: dict[str, list[str]] = {}
    for item in items:
        grouped.setdefault(item["aoi"], []).append(item["image_id"])
    for aoi, ids in grouped.items():
        ids = sorted(ids)
        random.Random(args.seed).shuffle(ids)
        val = ids[: args.val_per_aoi]
        train = ids[args.val_per_aoi :]
        val_ids.update(val)
        train_ids.update(train)

    train_json = build_coco_split(items, train_ids)
    val_json = build_coco_split(items, val_ids)

    (output_root / "train_coco.json").write_text(json.dumps(train_json))
    (output_root / "val_coco.json").write_text(json.dumps(val_json))
    (output_root / "split.json").write_text(
        json.dumps(
            {
                "train_ids": sorted(train_ids),
                "val_ids": sorted(val_ids),
                "val_per_aoi": args.val_per_aoi,
            },
            indent=2,
        )
    )
    print(output_root / "train_coco.json")
    print(output_root / "val_coco.json")


if __name__ == "__main__":
    main()
