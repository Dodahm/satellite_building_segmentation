from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image

from src.utils import rle_decode


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="DACON building segmentation EDA")
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("runs/eda"))
    parser.add_argument("--num-samples", type=int, default=12)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def load_shape(image_path: Path) -> tuple[int, int]:
    with Image.open(image_path) as image:
        width, height = image.size
    return height, width


def decode_mask(mask_rle: str | float, shape: tuple[int, int]) -> np.ndarray:
    return rle_decode(mask_rle, shape).astype(np.uint8)


def mask_stats(mask: np.ndarray) -> dict[str, float]:
    total_pixels = int(mask.size)
    building_pixels = int(mask.sum())
    building_ratio = float(building_pixels / total_pixels)
    coords = np.argwhere(mask > 0)
    if len(coords) == 0:
        bbox_height = 0
        bbox_width = 0
        bbox_ratio = 0.0
    else:
        y_min, x_min = coords.min(axis=0)
        y_max, x_max = coords.max(axis=0)
        bbox_height = int(y_max - y_min + 1)
        bbox_width = int(x_max - x_min + 1)
        bbox_ratio = float((bbox_height * bbox_width) / total_pixels)

    return {
        "building_pixels": building_pixels,
        "building_ratio": building_ratio,
        "bbox_height": bbox_height,
        "bbox_width": bbox_width,
        "bbox_ratio": bbox_ratio,
        "is_empty": int(building_pixels == 0),
    }


def save_overlay(image_path: Path, mask: np.ndarray, output_path: Path) -> None:
    image = Image.open(image_path).convert("RGB")
    overlay = image.copy()
    overlay_np = np.asarray(overlay).copy()
    overlay_np[mask > 0] = np.array([255, 80, 80], dtype=np.uint8)
    overlay = Image.fromarray(overlay_np)
    blended = Image.blend(image, overlay, alpha=0.35)
    blended.save(output_path)


def summarize_numeric(series: pd.Series) -> dict[str, float]:
    return {
        "min": float(series.min()),
        "p25": float(series.quantile(0.25)),
        "median": float(series.median()),
        "mean": float(series.mean()),
        "p75": float(series.quantile(0.75)),
        "max": float(series.max()),
    }


def build_summary(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    train_stats_df: pd.DataFrame,
    train_shape_counts: dict[str, int],
    test_shape_counts: dict[str, int],
) -> dict[str, object]:
    return {
        "competition_constraints": {
            "train_contains_buildings": True,
            "test_may_have_no_buildings": True,
            "submission_empty_mask_value": "-1",
            "external_data_allowed": False,
            "eda_rule": "Use train-centered analysis; do not tune directly on test patterns.",
        },
        "train_csv_checks": {
            "rows": int(len(train_df)),
            "duplicate_img_id_count": int(train_df["img_id"].duplicated().sum()),
            "missing_img_path_count": int(train_df["img_path"].isna().sum()),
            "missing_mask_rle_count": int(train_df["mask_rle"].isna().sum()),
        },
        "test_csv_checks": {
            "rows": int(len(test_df)),
            "duplicate_img_id_count": int(test_df["img_id"].duplicated().sum()),
            "missing_img_path_count": int(test_df["img_path"].isna().sum()),
        },
        "image_shapes": {
            "train_shape_counts": train_shape_counts,
            "test_shape_counts": test_shape_counts,
        },
        "train_mask_distribution": {
            "building_ratio": summarize_numeric(train_stats_df["building_ratio"]),
            "building_pixels": summarize_numeric(train_stats_df["building_pixels"]),
            "bbox_ratio": summarize_numeric(train_stats_df["bbox_ratio"]),
            "empty_mask_count": int(train_stats_df["is_empty"].sum()),
        },
        "eda_recommendations": [
            "If train images are much larger than test images, compare naive resize against patch-based training.",
            "If many masks have very small building ratios, prioritize boundary-preserving augmentation and higher-resolution crops.",
            "Because test images may contain no buildings, validate the no-building threshold and keep '-1' submission handling.",
            "Prefer stratified validation splits using building_ratio buckets to reduce score variance.",
        ],
    }


def main() -> None:
    args = parse_args()
    random.seed(args.seed)

    output_dir = ensure_dir(args.output_dir)
    sample_dir = ensure_dir(output_dir / "sample_overlays")

    train_csv = args.data_root / "train.csv"
    test_csv = args.data_root / "test.csv"
    train_df = pd.read_csv(train_csv)
    test_df = pd.read_csv(test_csv)

    train_records: list[dict[str, object]] = []
    train_shape_counts: dict[str, int] = {}
    test_shape_counts: dict[str, int] = {}

    for _, row in train_df.iterrows():
        image_path = args.data_root / row["img_path"]
        shape = load_shape(image_path)
        shape_key = f"{shape[0]}x{shape[1]}"
        train_shape_counts[shape_key] = train_shape_counts.get(shape_key, 0) + 1

        mask = decode_mask(row["mask_rle"], shape)
        stats = mask_stats(mask)
        train_records.append(
            {
                "img_id": row["img_id"],
                "img_path": row["img_path"],
                "height": shape[0],
                "width": shape[1],
                **stats,
            }
        )

    for _, row in test_df.iterrows():
        image_path = args.data_root / row["img_path"]
        shape = load_shape(image_path)
        shape_key = f"{shape[0]}x{shape[1]}"
        test_shape_counts[shape_key] = test_shape_counts.get(shape_key, 0) + 1

    train_stats_df = pd.DataFrame(train_records)
    train_stats_df["building_ratio_bucket"] = pd.cut(
        train_stats_df["building_ratio"],
        bins=[-1e-9, 0.01, 0.05, 0.10, 0.20, 1.0],
        labels=["<=1%", "1-5%", "5-10%", "10-20%", ">20%"],
    )

    sampled_rows = train_stats_df.sample(min(args.num_samples, len(train_stats_df)), random_state=args.seed)
    for _, sampled in sampled_rows.iterrows():
        image_path = args.data_root / str(sampled["img_path"])
        shape = (int(sampled["height"]), int(sampled["width"]))
        mask_rle = train_df.loc[train_df["img_id"] == sampled["img_id"], "mask_rle"].iloc[0]
        mask = decode_mask(mask_rle, shape)
        save_overlay(image_path, mask, sample_dir / f"{sampled['img_id']}_overlay.png")

    train_stats_df.to_csv(output_dir / "train_mask_stats.csv", index=False)
    train_stats_df.groupby("building_ratio_bucket", observed=False).size().reset_index(name="count").to_csv(
        output_dir / "building_ratio_buckets.csv",
        index=False,
    )

    summary = build_summary(train_df, test_df, train_stats_df, train_shape_counts, test_shape_counts)
    (output_dir / "summary.json").write_text(json.dumps(summary, indent=2))

    print(f"Saved EDA outputs to {output_dir}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
