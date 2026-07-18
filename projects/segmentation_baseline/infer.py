from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from PIL import Image
from torch.utils.data import DataLoader
from tqdm import tqdm

from src.dataset import TestDataset
from src.model import UNet
from src.utils import rle_encode


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--output-csv", type=Path, required=True)
    return parser.parse_args()


def resize_mask(mask: torch.Tensor, original_shape: tuple[int, int]) -> torch.Tensor:
    height, width = original_shape
    pil = Image.fromarray((mask.numpy() * 255).astype("uint8"))
    pil = pil.resize((width, height), Image.NEAREST)
    resized = (torch.from_numpy(np.asarray(pil, dtype="uint8")) > 0).to(dtype=torch.uint8)
    return resized


def main() -> None:
    args = parse_args()
    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")

    checkpoint = torch.load(args.checkpoint, map_location=device)
    model = UNet().to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    test_csv = args.data_root / "test.csv"
    dataset = TestDataset(test_csv, args.data_root, image_size=args.image_size)
    loader = DataLoader(dataset, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers)
    sample_submission = pd.read_csv(args.data_root / "sample_submission.csv")

    rows: list[dict[str, str]] = []
    with torch.no_grad():
        for img_ids, original_shapes, images in tqdm(loader):
            images = images.to(device)
            logits = model(images)
            preds = (torch.sigmoid(logits).cpu() > args.threshold).to(dtype=torch.uint8)

            for img_id, original_shape, pred in zip(img_ids, original_shapes, preds):
                original_shape = (int(original_shape[0]), int(original_shape[1]))
                mask = resize_mask(pred[0], original_shape)
                rows.append({"img_id": img_id, "mask_rle": rle_encode(mask)})

    df = sample_submission[["img_id"]].merge(pd.DataFrame(rows), on="img_id", how="left")
    df["mask_rle"] = df["mask_rle"].fillna("-1")
    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output_csv, index=False, encoding="utf-8")
    print(args.output_csv)


if __name__ == "__main__":
    main()
