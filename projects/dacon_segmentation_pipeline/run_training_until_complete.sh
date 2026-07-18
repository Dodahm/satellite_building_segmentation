#!/bin/zsh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_DIR="$ROOT/projects/dacon_segmentation_pipeline"
DATA_ROOT="$ROOT/data/dacon_236092_holdout"
OUTPUT_DIR="$ROOT/runs/dacon_unetpp_v1"
LIVE_LOG="$OUTPUT_DIR/live.log"
ORCH_LOG="$OUTPUT_DIR/orchestrator.log"
TARGET_EPOCH=10

mkdir -p "$OUTPUT_DIR"

if [[ -f "$ROOT/tmp/spacevenv/bin/activate" ]]; then
  source "$ROOT/tmp/spacevenv/bin/activate"
fi

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

current_epoch() {
  # 학습이 어디까지 끝났는지 history.csv에서 읽는다.
  # 이 값이 TARGET_EPOCH보다 작으면 아래 while loop가 다시 학습을 실행한다.
  if [[ -f "$OUTPUT_DIR/unetplusplus_history.csv" ]]; then
    OUTPUT_DIR="$OUTPUT_DIR" python - <<'PY'
import os
from pathlib import Path
import pandas as pd

path = Path(os.environ["OUTPUT_DIR"]) / "unetplusplus_history.csv"
if not path.exists():
    print(0)
else:
    df = pd.read_csv(path)
    print(int(df["epoch"].max()) if len(df) else 0)
PY
  else
    echo 0
  fi
}

echo "[$(timestamp)] holdout training auto-runner start" | tee -a "$ORCH_LOG"
echo "[$(timestamp)] target epoch: $TARGET_EPOCH" | tee -a "$ORCH_LOG"
echo "[$(timestamp)] output dir: $OUTPUT_DIR" | tee -a "$ORCH_LOG"

while true; do
  epoch_now="$(current_epoch)"
  if [[ "$epoch_now" -ge "$TARGET_EPOCH" ]]; then
    echo "[$(timestamp)] target reached at epoch $epoch_now" | tee -a "$ORCH_LOG"
    osascript -e 'display notification "UNet++ patch training reached target epoch." with title "Training Complete"' >/dev/null 2>&1 || true
    break
  fi

  echo "[$(timestamp)] launching training from epoch $((epoch_now + 1))" | tee -a "$ORCH_LOG"
  # 변경 전:
  # - 학습 프로세스가 한 번 에러로 종료되면 runner도 같이 종료됐다.
  #
  # 변경 후:
  # - set +e로 학습 명령의 실패를 직접 받아오고,
  #   실패하면 5초 뒤 같은 설정으로 다시 실행한다.
  # - train_segmentation_pipeline.py의 --resume 옵션 덕분에
  #   이미 끝난 epoch는 history/checkpoint 기준으로 이어간다.
  set +e
  (
    cd "$PROJECT_DIR"
    python -u train_segmentation_pipeline.py \
      --data-root "$DATA_ROOT" \
      --output-dir "$OUTPUT_DIR" \
      --epochs "$TARGET_EPOCH" \
      --batch-size 8 \
      --image-size 256 \
      --crop-size 384 \
      --lr 3e-4 \
      --models unetplusplus \
      --use-tta \
      --min-area 16 \
      --fill-holes \
      --loss-type focal_dice \
      --skip-infer \
      --resume
  ) 2>&1 | tee -a "$LIVE_LOG"
  status="${pipestatus[1]}"
  set -e

  if [[ "$status" -ne 0 ]]; then
    echo "[$(timestamp)] training exited with status $status, retrying in 5s" | tee -a "$ORCH_LOG"
    osascript -e 'display notification "Training stopped unexpectedly. Retrying in 5 seconds." with title "Training Retry"' >/dev/null 2>&1 || true
    sleep 5
  else
    echo "[$(timestamp)] training process finished cleanly" | tee -a "$ORCH_LOG"
  fi
done
