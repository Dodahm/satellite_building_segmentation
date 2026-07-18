from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import tifffile as tiff
from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--glob", type=str, default="AOI_*")
    return parser.parse_args()


def to_uint8_rgb(arr: np.ndarray) -> np.ndarray:
    arr = arr.astype(np.float32)
    if arr.ndim == 3 and arr.shape[2] >= 3:
        arr = arr[:, :, :3]
    arr = np.clip(arr, 0, 2047)
    arr = (arr / 2047.0) * 255.0
    return arr.astype(np.uint8)


def main() -> None:
    args = parse_args()
    images_dir = args.output_root / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for aoi_dir in sorted(args.source_root.glob(args.glob)):
        rgb_dir = aoi_dir / "RGB-PanSharpen"
        if not rgb_dir.exists():
            continue
        for tif_path in sorted(rgb_dir.glob("*.tif")):
            image_id = tif_path.stem.replace("RGB-PanSharpen_", "")
            out_path = images_dir / f"{image_id}.png"
            if out_path.exists():
                count += 1
                continue
            arr = tiff.imread(tif_path)
            rgb = to_uint8_rgb(arr)
            Image.fromarray(rgb).save(out_path)
            count += 1
    print(f"converted={count}")


if __name__ == "__main__":
    main()
