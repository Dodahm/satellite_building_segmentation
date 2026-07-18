from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
import torch

# -----------------------------------------------------------------------------
# 역할:
# - 원본 데이터는 train.csv / test.csv 구조를 기준으로 구성된다.
# - 모델 성능을 내부에서 검증하려면 train.csv 일부를 validation으로 떼어내야 한다.
# - 이 스크립트는 원본 train.csv를
#   train.csv / holdout_truth.csv / test.csv 구조로 다시 저장한다.
#
# 왜 만들었는가:
# - train_segmentation_pipeline.py는 holdout_truth.csv를 기준으로
#   threshold sweep과 validation Dice를 계산한다.
# - 원본 데이터에도 같은 검증 체계를 적용하기 위한 split 단계가 필요했다.
# -----------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    # data-root: 원본 데이터가 들어 있는 폴더
    # output-root: 학습 코드가 읽을 split CSV를 저장할 폴더
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def make_splits(length: int, val_ratio: float, seed: int) -> tuple[list[int], list[int]]:
    # baseline 학습과 같은 방식으로 무작위 holdout split을 만든다.
    #
    # 개선 포인트:
    # - seed를 고정해 같은 train/validation 분할이 반복 재현되도록 했다.
    # - 포트폴리오에 기록한 5712/1428 split도 이 함수 결과다.
    rng = torch.Generator().manual_seed(seed)
    indices = torch.randperm(length, generator=rng).tolist()
    val_size = int(length * val_ratio)
    val_indices = indices[:val_size]
    train_indices = indices[val_size:]
    return train_indices, val_indices


def absolutize_paths(df: pd.DataFrame, data_root: Path) -> pd.DataFrame:
    # CSV의 상대경로를 실제 학습 코드가 바로 읽을 수 있는 절대경로로 바꾼다.
    #
    # 변경 전:
    # - CSV에는 ./train_img/TRAIN_0000.png 같은 상대경로가 들어 있었다.
    # - 작업 위치가 바뀌면 이미지 로딩이 실패할 수 있었다.
    #
    # 변경 후:
    # - 모든 img_path를 절대경로로 바꿔 학습 스크립트 실행 위치에 영향을 받지 않게 했다.
    out = df.copy()
    out["img_path"] = out["img_path"].apply(lambda p: str((data_root / str(p)).resolve()))
    return out


def main() -> None:
    args = parse_args()
    args.output_root.mkdir(parents=True, exist_ok=True)

    train_csv = args.data_root / "train.csv"
    test_csv = args.data_root / "test.csv"
    sample_submission_csv = args.data_root / "sample_submission.csv"

    train_df = pd.read_csv(train_csv)
    test_df = pd.read_csv(test_csv)

    # 원본 train.csv 안에서 validation을 떼어낸다.
    # holdout_truth.csv에는 정답 mask_rle이 남아 있어 validation Dice 계산에 사용된다.
    train_indices, val_indices = make_splits(len(train_df), args.val_ratio, args.seed)
    train_split = absolutize_paths(train_df.iloc[train_indices].reset_index(drop=True), args.data_root)
    holdout_split = absolutize_paths(train_df.iloc[val_indices].reset_index(drop=True), args.data_root)
    test_split = absolutize_paths(test_df.reset_index(drop=True), args.data_root)

    train_split.to_csv(args.output_root / "train.csv", index=False)
    holdout_split.to_csv(args.output_root / "holdout_truth.csv", index=False)
    test_split.to_csv(args.output_root / "test.csv", index=False)
    if sample_submission_csv.exists():
        pd.read_csv(sample_submission_csv).to_csv(args.output_root / "sample_submission.csv", index=False)

    summary = {
        "source_root": str(args.data_root),
        "output_root": str(args.output_root),
        "seed": args.seed,
        "val_ratio": args.val_ratio,
        "train_size": len(train_split),
        "holdout_size": len(holdout_split),
        "test_size": len(test_split),
    }
    (args.output_root / "split_summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
