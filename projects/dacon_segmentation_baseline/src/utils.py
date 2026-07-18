from __future__ import annotations

from pathlib import Path
from typing import Iterable

import numpy as np
import torch


def ensure_dir(path: str | Path) -> Path:
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def set_seed(seed: int) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def rle_decode(mask_rle: str | float, shape: tuple[int, int]) -> np.ndarray:
    if mask_rle == -1 or mask_rle == "-1" or mask_rle is None:
        return np.zeros(shape, dtype=np.uint8)
    if isinstance(mask_rle, float) and np.isnan(mask_rle):
        return np.zeros(shape, dtype=np.uint8)

    s = str(mask_rle).split()
    starts, lengths = [np.asarray(x, dtype=int) for x in (s[0::2], s[1::2])]
    starts -= 1
    ends = starts + lengths
    img = np.zeros(shape[0] * shape[1], dtype=np.uint8)
    for lo, hi in zip(starts, ends):
        img[lo:hi] = 1
    return img.reshape(shape, order="F")


def rle_encode(mask: np.ndarray) -> str:
    flat = mask.astype(np.uint8).reshape(-1, order="F")
    if flat.max() == 0:
        return "-1"

    padded = np.concatenate([[0], flat, [0]])
    runs = np.where(padded[1:] != padded[:-1])[0] + 1
    runs[1::2] -= runs[::2]
    return " ".join(str(x) for x in runs)


def dice_numpy(pred: np.ndarray, target: np.ndarray, eps: float = 1e-7) -> float:
    pred = pred.astype(np.float32)
    target = target.astype(np.float32)
    intersection = (pred * target).sum()
    return float((2.0 * intersection + eps) / (pred.sum() + target.sum() + eps))


def dice_from_logits(logits: torch.Tensor, targets: torch.Tensor, threshold: float = 0.5, eps: float = 1e-7) -> torch.Tensor:
    preds = (torch.sigmoid(logits) > threshold).float()
    preds = preds.flatten(1)
    targets = targets.flatten(1)
    intersection = (preds * targets).sum(dim=1)
    union = preds.sum(dim=1) + targets.sum(dim=1)
    return ((2.0 * intersection + eps) / (union + eps)).mean()


def dice_torch(logits: torch.Tensor, targets: torch.Tensor, eps: float = 1e-7) -> torch.Tensor:
    probs = torch.sigmoid(logits)
    probs = probs.flatten(1)
    targets = targets.flatten(1)
    intersection = (probs * targets).sum(dim=1)
    union = probs.sum(dim=1) + targets.sum(dim=1)
    return ((2.0 * intersection + eps) / (union + eps)).mean()


class AverageMeter:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.count = 0
        self.total = 0.0

    def update(self, value: float, n: int = 1) -> None:
        self.total += value * n
        self.count += n

    @property
    def avg(self) -> float:
        return 0.0 if self.count == 0 else self.total / self.count


def format_metrics(items: Iterable[tuple[str, float]]) -> str:
    return " | ".join(f"{name}: {value:.4f}" for name, value in items)
