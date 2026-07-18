from __future__ import annotations

import argparse
import json
import time
from pathlib import Path


TARGET_KEYS = ("bbox/AP", "bbox/AP50", "segm/AP", "segm/AP50")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Print Detectron2 AP metrics from metrics.json in a readable terminal table."
    )
    parser.add_argument(
        "--metrics",
        type=Path,
        default=Path("runs/detectron2_spacenet_full_khartoum/metrics.json"),
        help="Path to Detectron2 metrics.json",
    )
    parser.add_argument(
        "--follow",
        action="store_true",
        help="Keep watching the file and print new AP evaluation rows as training runs.",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=1.0,
        help="Polling interval in seconds when --follow is enabled.",
    )
    return parser.parse_args()


def print_row(row: dict) -> None:
    iteration = row.get("iteration", "-")
    print("\n" + "=" * 66)
    print(f"Detectron2 evaluation metrics | iteration: {iteration}")
    print("-" * 66)
    print(f"{'항목':<14} {'값':>12}  해석")
    print("-" * 66)
    descriptions = {
        "bbox/AP": "bbox 전체 평균 정밀도",
        "bbox/AP50": "IoU 0.50 기준 bbox 정밀도",
        "segm/AP": "instance mask 전체 평균 정밀도",
        "segm/AP50": "IoU 0.50 기준 instance mask 정밀도",
    }
    for key in TARGET_KEYS:
        value = row.get(key)
        value_text = "-" if value is None else f"{float(value):.4f}"
        print(f"{key:<14} {value_text:>12}  {descriptions[key]}")
    print("=" * 66, flush=True)


def iter_json_lines(metrics_path: Path, start_pos: int = 0):
    with metrics_path.open("r", encoding="utf-8") as f:
        f.seek(start_pos)
        while True:
            pos = f.tell()
            line = f.readline()
            if not line:
                yield pos, None
                return
            try:
                yield f.tell(), json.loads(line)
            except json.JSONDecodeError:
                yield f.tell(), None


def print_existing(metrics_path: Path) -> int:
    if not metrics_path.exists():
        raise FileNotFoundError(f"metrics file not found: {metrics_path}")

    last_pos = 0
    found = False
    for pos, row in iter_json_lines(metrics_path):
        last_pos = pos
        if row and any(key in row for key in TARGET_KEYS):
            print_row(row)
            found = True

    if not found:
        print(f"아직 AP 평가 행이 없습니다: {metrics_path}")
        print("Detectron2는 eval_period마다 AP를 계산하므로, 학습 초반에는 loss만 보일 수 있습니다.")
    return last_pos


def follow(metrics_path: Path, start_pos: int, interval: float) -> None:
    print(f"\nWatching AP metrics: {metrics_path}")
    print("중지하려면 Ctrl+C를 누르세요.")
    pos = start_pos
    while True:
        if metrics_path.exists():
            for new_pos, row in iter_json_lines(metrics_path, pos):
                pos = new_pos
                if row and any(key in row for key in TARGET_KEYS):
                    print_row(row)
        time.sleep(interval)


def main() -> None:
    args = parse_args()
    metrics_path = args.metrics
    if args.follow and not metrics_path.exists():
        print(f"metrics 파일을 기다리는 중입니다: {metrics_path}")
        print("학습이 시작되어 metrics.json이 생성되면 AP 지표를 자동으로 출력합니다.")
        pos = 0
    else:
        pos = print_existing(metrics_path)
    if args.follow:
        follow(metrics_path, pos, args.interval)


if __name__ == "__main__":
    main()
