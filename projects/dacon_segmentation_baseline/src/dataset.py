from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import torch
from PIL import Image
from torch.utils.data import Dataset

from .utils import rle_decode


def _load_rgb(path: Path, image_size: int) -> np.ndarray:
    image = Image.open(path).convert("RGB")
    image = image.resize((image_size, image_size), Image.BILINEAR)
    arr = np.asarray(image, dtype=np.float32) / 255.0
    arr = np.transpose(arr, (2, 0, 1))
    return arr


def load_image_shape(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        width, height = image.size
    return height, width


def _load_mask_from_rle(mask_rle: str, original_shape: tuple[int, int], image_size: int) -> np.ndarray:
    mask = rle_decode(mask_rle, original_shape) * 255
    pil = Image.fromarray(mask.astype(np.uint8))
    pil = pil.resize((image_size, image_size), Image.NEAREST)
    arr = np.asarray(pil, dtype=np.float32) / 255.0
    return arr[None, ...]


class TrainDataset(Dataset):
    def __init__(self, csv_path: str | Path, data_root: str | Path, image_size: int = 224) -> None:
        self.df = pd.read_csv(csv_path)
        self.data_root = Path(data_root)
        self.image_size = image_size

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        row = self.df.iloc[index]
        image_path = self.data_root / row["img_path"]
        image = _load_rgb(image_path, self.image_size)
        mask = _load_mask_from_rle(str(row["mask_rle"]), load_image_shape(image_path), self.image_size)
        return torch.from_numpy(image), torch.from_numpy(mask)


class TestDataset(Dataset):
    def __init__(self, csv_path: str | Path, data_root: str | Path, image_size: int = 224) -> None:
        self.df = pd.read_csv(csv_path)
        self.data_root = Path(data_root)
        self.image_size = image_size

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, index: int) -> tuple[str, tuple[int, int], torch.Tensor]:
        row = self.df.iloc[index]
        image_path = self.data_root / row["img_path"]
        image = _load_rgb(image_path, self.image_size)
        return row["img_id"], load_image_shape(image_path), torch.from_numpy(image)
