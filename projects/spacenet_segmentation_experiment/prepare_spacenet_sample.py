from __future__ import annotations

import argparse
import csv
from pathlib import Path

import numpy as np
import pandas as pd
import tifffile as tiff
from PIL import Image, ImageDraw


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    return parser.parse_args()


def extract_rings(wkt: str) -> list[list[tuple[float, float]]]:
    wkt = wkt.strip()
    if not wkt or wkt == "POLYGON EMPTY":
        return []

    text = wkt.replace("POLYGON ((", "").replace("))", "")
    parts = [part.strip() for part in text.split("),(")]
    rings: list[list[tuple[float, float]]] = []
    for part in parts:
        coords: list[tuple[float, float]] = []
        for token in part.split(","):
            nums = token.strip().replace("(", "").replace(")", "").split()
            if len(nums) >= 2:
                coords.append((float(nums[0]), float(nums[1])))
        if len(coords) >= 3:
            rings.append(coords)
    return rings


def to_uint8_rgb(arr: np.ndarray) -> np.ndarray:
    arr = arr.astype(np.float32)
    if arr.ndim == 3 and arr.shape[2] >= 3:
        arr = arr[:, :, :3]
    # Simple robust scaling for 11-bit style satellite values.
    arr = np.clip(arr, 0, 2047)
    arr = (arr / 2047.0) * 255.0
    return arr.astype(np.uint8)


def build_mask(rows: pd.DataFrame, size: tuple[int, int]) -> Image.Image:
    width, height = size
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    for wkt in rows["PolygonWKT_Pix"].tolist():
        for ring in extract_rings(str(wkt)):
            draw.polygon(ring, fill=255)
    return mask


def main() -> None:
    args = parse_args()
    images_dir = args.output_root / "images"
    masks_dir = args.output_root / "masks"
    images_dir.mkdir(parents=True, exist_ok=True)
    masks_dir.mkdir(parents=True, exist_ok=True)

    records: list[dict[str, str]] = []

    for aoi_dir in sorted(args.source_root.iterdir()):
        if not aoi_dir.is_dir():
            continue

        rgb_dir = aoi_dir / "RGB-PanSharpen"
        summary_csv = next((aoi_dir / "summaryData").glob("*.csv"))
        labels = pd.read_csv(summary_csv)

        for tif_path in sorted(rgb_dir.glob("*.tif")):
            image_id = tif_path.stem.replace("RGB-PanSharpen_", "")
            rows = labels[labels["ImageId"] == image_id]
            arr = tiff.imread(tif_path)
            rgb = to_uint8_rgb(arr)
            image = Image.fromarray(rgb)
            mask = build_mask(rows, image.size)

            image_out = images_dir / f"{image_id}.png"
            mask_out = masks_dir / f"{image_id}.png"
            image.save(image_out)
            mask.save(mask_out)

            records.append(
                {
                    "image_id": image_id,
                    "aoi": aoi_dir.name,
                    "image_path": str(image_out.resolve()),
                    "mask_path": str(mask_out.resolve()),
                    "width": image.size[0],
                    "height": image.size[1],
                    "building_count": str(rows["BuildingId"].nunique()),
                }
            )

    manifest = args.output_root / "manifest.csv"
    with manifest.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["image_id", "aoi", "image_path", "mask_path", "width", "height", "building_count"],
        )
        writer.writeheader()
        writer.writerows(records)

    print(manifest)
    print(f"samples={len(records)}")


if __name__ == "__main__":
    main()
