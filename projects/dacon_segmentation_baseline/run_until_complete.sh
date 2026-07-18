#!/bin/zsh

# -----------------------------------------------------------------------------
# DACON baseline 학습 자동 재개 스크립트
#
# 목적:
# - 학습이 중간에 멈춰도 last.pt / best.pt를 기준으로 자동 재시작
# - 목표 epoch에 도달할 때까지 반복 실행
# - 모든 상태를 live.log / orchestrator.log에 남겨서 터미널에서 tail -f 가능
#
# 사용 예시:
#   zsh run_until_complete.sh
#
# 모니터링:
#   tail -f runs/unet_baseline_dacon_raw/live.log
#   tail -f runs/unet_baseline_dacon_raw/orchestrator.log
# -----------------------------------------------------------------------------

set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKDIR="$ROOT/projects/dacon_segmentation_baseline"
VENV="$ROOT/tmp/spacevenv/bin/activate"
DATA_ROOT="$ROOT/data/dacon_236092_raw"
OUTPUT_DIR="$WORKDIR/runs/unet_baseline_dacon_raw"
TARGET_EPOCHS=20

mkdir -p "$OUTPUT_DIR"

LOG_FILE="$OUTPUT_DIR/live.log"
ORCH_LOG="$OUTPUT_DIR/orchestrator.log"

log() {
  local msg="$1"
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$msg" | tee -a "$ORCH_LOG"
}

current_epoch() {
  OUTPUT_DIR="$OUTPUT_DIR" python - <<'PY'
import os
from pathlib import Path
import csv

p = Path(os.environ["OUTPUT_DIR"]) / "history.csv"
if not p.exists():
    print(0)
else:
    rows = list(csv.DictReader(p.open()))
    if not rows:
        print(0)
    else:
        print(max(int(float(r["epoch"])) for r in rows))
PY
}

resume_path() {
  if [[ -f "$OUTPUT_DIR/last.pt" ]]; then
    echo "$OUTPUT_DIR/last.pt"
  elif [[ -f "$OUTPUT_DIR/best.pt" ]]; then
    echo "$OUTPUT_DIR/best.pt"
  else
    echo ""
  fi
}

log "자동 재개 러너 시작"
log "목표 epoch: $TARGET_EPOCHS"
log "출력 경로: $OUTPUT_DIR"

while true; do
  DONE_EPOCHS="$(current_epoch)"
  if [[ "$DONE_EPOCHS" -ge "$TARGET_EPOCHS" ]]; then
    log "목표 epoch 도달: $DONE_EPOCHS / $TARGET_EPOCHS"
    break
  fi

  RESUME_FILE="$(resume_path)"
  if [[ -n "$RESUME_FILE" ]]; then
    log "학습 재개 시도: resume-from=$RESUME_FILE, 현재 기록 epoch=$DONE_EPOCHS"
    RUN_CMD=(
      python -u train.py
      --data-root "$DATA_ROOT"
      --image-size 224
      --epochs "$TARGET_EPOCHS"
      --batch-size 8
      --lr 1e-3
      --val-ratio 0.2
      --threshold 0.5
      --output-dir runs/unet_baseline_dacon_raw
      --resume-from "$RESUME_FILE"
    )
  else
    log "처음부터 학습 시작: 현재 기록 epoch=$DONE_EPOCHS"
    RUN_CMD=(
      python -u train.py
      --data-root "$DATA_ROOT"
      --image-size 224
      --epochs "$TARGET_EPOCHS"
      --batch-size 8
      --lr 1e-3
      --val-ratio 0.2
      --threshold 0.5
      --output-dir runs/unet_baseline_dacon_raw
    )
  fi

  (
    cd "$WORKDIR"
    if [[ -f "$VENV" ]]; then
      source "$VENV"
    fi
    "${RUN_CMD[@]}"
  ) 2>&1 | tee -a "$LOG_FILE"

  STATUS=${pipestatus[1]}
  NEW_DONE_EPOCHS="$(current_epoch)"

  if [[ "$STATUS" -eq 0 ]]; then
    log "train.py 정상 종료 (현재 기록 epoch=$NEW_DONE_EPOCHS)"
  else
    log "train.py 비정상 종료 (exit=$STATUS, 현재 기록 epoch=$NEW_DONE_EPOCHS)"
    log "중단 원인을 확인하고 same config로 자동 재시도합니다."
    sleep 2
  fi
done

log "자동 재개 러너 종료"
