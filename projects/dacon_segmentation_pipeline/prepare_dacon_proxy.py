from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image


def rle_encode(mask: np.ndarray) -> str:
    # Binary mask를 DACON 제출 형식인 run-length encoding 문자열로 변환한다.
    pixels = mask.flatten()
    pixels = np.concatenate([[0], pixels, [0]])
    runs = np.where(pixels[1:] != pixels[:-1])[0] + 1
    runs[1::2] -= runs[::2]
    return " ".join(str(x) for x in runs)


def parse_args() -> argparse.Namespace:
    # SpaceNet manifest를 DACON 스타일 CSV로 바꾸기 위한 CLI 인자를 받는다.
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest-path", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--val-size", type=int, default=128)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_root = args.output_root
    output_root.mkdir(parents=True, exist_ok=True)

    # 기존 manifest를 읽고 train/holdout으로 나눠
    # train.csv / test.csv / sample_submission.csv 구조를 재현한다.
    df = pd.read_csv(args.manifest_path)
    df = df.sample(frac=1.0, random_state=args.seed).reset_index(drop=True)
    val_df = df.iloc[: args.val_size].copy()
    train_df = df.iloc[args.val_size :].copy()

    train_rows = []
    for idx, row in train_df.iterrows():
        mask = np.array(Image.open(row["mask_path"]).convert("L")) > 0
        mask_rle = rle_encode(mask.astype(np.uint8))
        # DACON 설명상 train에는 건물이 반드시 존재하므로 비어 있는 마스크는 제외한다.
        if not mask_rle:
            continue
        train_rows.append(
            {
                "img_id": f"TRAIN_{idx:04d}",
                "img_path": row["image_path"],
                "mask_rle": mask_rle,
                "source_image_id": row["image_id"],
            }
        )

    test_rows = []
    holdout_rows = []
    for idx, row in val_df.iterrows():
        mask = np.array(Image.open(row["mask_path"]).convert("L")) > 0
        mask_rle = rle_encode(mask.astype(np.uint8))
        # holdout은 test.csv와 별도 truth를 함께 남겨,
        # 리더보드처럼 예측 후 검증할 수 있게 만든다.
        if not mask_rle:
            continue
        test_rows.append(
            {
                "img_id": f"TEST_{idx:05d}",
                "img_path": row["image_path"],
                "source_image_id": row["image_id"],
            }
        )
        holdout_rows.append(
            {
                "img_id": f"TEST_{idx:05d}",
                "img_path": row["image_path"],
                "mask_rle": mask_rle,
                "source_image_id": row["image_id"],
            }
        )

    train_csv = output_root / "train.csv"
    test_csv = output_root / "test.csv"
    holdout_csv = output_root / "holdout_truth.csv"
    sample_submission_csv = output_root / "sample_submission.csv"
    split_json = output_root / "split_summary.json"

    pd.DataFrame(train_rows).to_csv(train_csv, index=False)
    pd.DataFrame(test_rows).to_csv(test_csv, index=False)
    pd.DataFrame(holdout_rows).to_csv(holdout_csv, index=False)
    pd.DataFrame({"img_id": [row["img_id"] for row in test_rows], "mask_rle": ["-1"] * len(test_rows)}).to_csv(
        sample_submission_csv, index=False
    )
    split_json.write_text(
        json.dumps(
            {
                "manifest_path": str(args.manifest_path),
                "seed": args.seed,
                "train_samples": len(train_rows),
                "holdout_samples": len(holdout_rows),
            },
            indent=2,
        )
    )
    print(train_csv)
    print(test_csv)
    print(holdout_csv)


if __name__ == "__main__":
    main()
