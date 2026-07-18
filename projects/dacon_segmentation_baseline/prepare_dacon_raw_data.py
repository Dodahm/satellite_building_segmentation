from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# -----------------------------------------------------------------------------
# 이 스크립트는 DACON 원본 데이터가 어디에 다운로드되었는지 점검하고,
# 표준 경로(`/data/dacon_236092_raw`)로 연결하기 위한 준비 스크립트다.
#
# 왜 필요한가:
# - 다운로드 폴더는 매번 달라질 수 있다.
# - 학습 코드는 고정된 데이터 구조를 기대한다.
# - 따라서 "찾기 -> 검증 -> 표준 경로 연결" 단계를 자동화해두면 다시 학습할 때 편하다.
# -----------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    # 사용자가 직접 source 폴더를 지정할 수도 있고,
    # 지정하지 않으면 기본 후보 경로를 자동 탐색한다.
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=None)
    parser.add_argument(
        "--target-dir",
        type=Path,
        default=ROOT / "data/dacon_236092_raw",
    )
    parser.add_argument(
        "--project-data-link",
        type=Path,
        default=ROOT / "projects/dacon_segmentation_baseline/data/dacon_satellite",
    )
    return parser.parse_args()


def candidate_roots() -> list[Path]:
    # 변경 전:
    # - 사용자가 매번 직접 폴더 위치를 찾아 입력해야 했다.
    #
    # 변경 후:
    # - Downloads, Desktop, Documents 같은 실제 다운로드 가능성이 높은 위치를 먼저 점검한다.
    return [
        Path.home() / "Downloads",
        Path.home() / "Desktop",
        Path.home() / "Documents",
    ]


def looks_like_dacon_root(path: Path) -> tuple[bool, list[str]]:
    # 이 함수는 폴더가 DACON 원본 데이터 구조를 만족하는지 검사한다.
    required = [
        "train_img",
        "test_img",
        "train.csv",
        "test.csv",
        "sample_submission.csv",
    ]
    missing = [name for name in required if not (path / name).exists()]
    return len(missing) == 0, missing


def find_candidates() -> list[Path]:
    # 변경 전:
    # - 원본 데이터가 있는지 수동으로 확인해야 했다.
    #
    # 변경 후:
    # - 주요 폴더를 순회하면서 DACON 데이터 구조와 비슷한 경로를 찾는다.
    matches: list[Path] = []
    for root in candidate_roots():
        if not root.exists():
            continue
        for path in [root] + [p for p in root.iterdir() if p.is_dir()]:
            ok, _ = looks_like_dacon_root(path)
            if ok:
                matches.append(path)
    return matches


def ensure_symlink(source: Path, target: Path) -> None:
    # 프로젝트 내부 baseline 경로를 표준 원본 데이터 경로로 연결한다.
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() or target.is_symlink():
        if target.is_symlink() and target.resolve() == source.resolve():
            return
        if target.is_symlink() or target.is_file():
            target.unlink()
        else:
            shutil.rmtree(target)
    target.symlink_to(source, target_is_directory=True)


def main() -> None:
    args = parse_args()
    args.target_dir.mkdir(parents=True, exist_ok=True)

    # 1. 사용자가 직접 준 경로를 우선 검사한다.
    source_dir = args.source_dir
    if source_dir is not None:
        ok, missing = looks_like_dacon_root(source_dir)
        if not ok:
            print(f"[ERROR] source-dir 구조가 불완전합니다: {source_dir}")
            print(f"[ERROR] 누락: {missing}")
            raise SystemExit(1)
        print(f"[OK] 사용자가 지정한 원본 데이터 경로 확인: {source_dir}")
    else:
        # 2. 자동 탐색으로 후보를 찾는다.
        matches = find_candidates()
        if not matches:
            print("[INFO] DACON 원본 데이터 구조를 가진 폴더를 찾지 못했습니다.")
            print("[INFO] 아래 표준 경로에 원본 데이터를 배치하세요:")
            print(f"       {args.target_dir}")
            print("[INFO] 필요한 구조:")
            print("       train_img/, test_img/, train.csv, test.csv, sample_submission.csv")
            raise SystemExit(0)
        source_dir = matches[0]
        print(f"[OK] 자동 탐색으로 원본 데이터 후보를 찾았습니다: {source_dir}")

    # 3. 표준 경로와 baseline 프로젝트 경로를 연결한다.
    print(f"[INFO] 표준 원본 데이터 경로: {args.target_dir}")
    print(f"[INFO] baseline 프로젝트 링크 경로: {args.project_data_link}")

    # 변경 전:
    # - 프로젝트 폴더 안쪽의 data/dacon_satellite를 직접 채워야 했다.
    #
    # 변경 후:
    # - 원본 데이터는 표준 경로 하나에만 두고,
    #   프로젝트 내부 경로는 symlink로 연결한다.
    if source_dir.resolve() != args.target_dir.resolve():
        print("[WARN] 현재는 실제 파일 복사를 자동 수행하지 않습니다.")
        print("[WARN] 원본 데이터를 표준 경로로 이동하거나, 아래 명령으로 직접 복사하세요:")
        print(f"       rsync -av '{source_dir}/' '{args.target_dir}/'")
    else:
        print("[OK] 원본 데이터가 이미 표준 경로에 있습니다.")

    ensure_symlink(args.target_dir, args.project_data_link)
    print(f"[OK] symlink 연결 완료: {args.project_data_link} -> {args.target_dir}")


if __name__ == "__main__":
    main()
