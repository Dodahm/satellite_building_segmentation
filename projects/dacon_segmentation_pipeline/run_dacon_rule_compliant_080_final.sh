#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# DACON 규칙 준수 0.8+ 재현 실행 스크립트
#
# 목적:
# - 외부 데이터 없이 DACON 원본 train split만 사용한다.
# - 기존 UNet++ 10 epoch best checkpoint에서 낮은 LR fine-tuning을 수행한다.
# - 자체 holdout validation Dice 0.8+ 결과를 재현한다.
#
# 최종 확인 결과:
# - 기존 best checkpoint 재평가: Dice 0.7991617294, threshold 0.27
# - 1 epoch fine-tuning 후: Dice 0.8007050573, threshold 0.37
#
# 주의:
# - 이 점수는 공식 DACON Private Leaderboard 점수가 아니다.
# - 공식 점수는 submission을 DACON에 제출해야만 확인할 수 있다.
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PYTHON="${PYTHON:-python}"

DATA_ROOT="$ROOT/data/dacon_236092_patch_ready"
BASE_RUN="$ROOT/runs/dacon_raw_patch_unetpp_v1"
EVAL_RUN="$ROOT/runs/dacon_raw_patch_unetpp_eval_threshold_v2"
FINAL_RUN="$ROOT/runs/dacon_raw_patch_unetpp_finetune_v3_e1"
TRAIN_SCRIPT="$ROOT/projects/dacon_segmentation_pipeline/train_segmentation_pipeline.py"

echo "[1/3] 기존 best checkpoint를 촘촘한 threshold로 재평가합니다."
"$PYTHON" "$TRAIN_SCRIPT" \
  --data-root "$DATA_ROOT" \
  --output-dir "$EVAL_RUN" \
  --models unetplusplus \
  --init-checkpoint-dir "$BASE_RUN" \
  --eval-only \
  --skip-infer \
  --batch-size 8 \
  --image-size 256 \
  --crop-size 384 \
  --loss-type focal_dice \
  --use-tta \
  --fill-holes \
  --min-area 16 \
  --threshold-start 0.20 \
  --threshold-end 0.50 \
  --threshold-step 0.01

echo "[2/3] 기존 best weight에서 낮은 LR fine-tuning을 1 epoch 수행합니다."
"$PYTHON" "$TRAIN_SCRIPT" \
  --data-root "$DATA_ROOT" \
  --output-dir "$FINAL_RUN" \
  --models unetplusplus \
  --init-checkpoint-dir "$BASE_RUN" \
  --skip-infer \
  --epochs 1 \
  --batch-size 16 \
  --image-size 256 \
  --crop-size 384 \
  --lr 3e-5 \
  --loss-type focal_dice \
  --use-tta \
  --fill-holes \
  --min-area 16 \
  --threshold-start 0.20 \
  --threshold-end 0.50 \
  --threshold-step 0.01

echo "[3/3] 최종 결과 summary를 출력합니다."
cat "$FINAL_RUN/summary.json"
