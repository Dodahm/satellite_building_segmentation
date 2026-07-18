from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import pandas as pd
import torch
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision.transforms import functional as TF
from tqdm import tqdm


def set_seed(seed: int) -> None:
    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


class ConvBlock(nn.Module):
    def __init__(self, in_channels: int, out_channels: int) -> None:
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class UNet(nn.Module):
    def __init__(self, in_channels: int = 3, out_channels: int = 1, features: tuple[int, ...] = (16, 32, 64, 128)) -> None:
        super().__init__()
        self.pool = nn.MaxPool2d(2, 2)
        self.downs = nn.ModuleList()
        self.ups = nn.ModuleList()
        channels = in_channels
        for feature in features:
            self.downs.append(ConvBlock(channels, feature))
            channels = feature
        self.bottleneck = ConvBlock(features[-1], features[-1] * 2)
        current = features[-1] * 2
        for feature in reversed(features):
            self.ups.append(nn.ConvTranspose2d(current, feature, kernel_size=2, stride=2))
            self.ups.append(ConvBlock(feature * 2, feature))
            current = feature
        self.final = nn.Conv2d(features[0], out_channels, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        skips = []
        for down in self.downs:
            x = down(x)
            skips.append(x)
            x = self.pool(x)
        x = self.bottleneck(x)
        skips = skips[::-1]
        for idx in range(0, len(self.ups), 2):
            x = self.ups[idx](x)
            skip = skips[idx // 2]
            if x.shape[-2:] != skip.shape[-2:]:
                x = TF.resize(x, list(skip.shape[-2:]), antialias=False)
            x = torch.cat([skip, x], dim=1)
            x = self.ups[idx + 1](x)
        return self.final(x)


def dice_from_logits(logits: torch.Tensor, targets: torch.Tensor, threshold: float = 0.5, eps: float = 1e-7) -> torch.Tensor:
    probs = torch.sigmoid(logits)
    preds = (probs > threshold).float()
    preds = preds.flatten(1)
    targets = targets.flatten(1)
    intersection = (preds * targets).sum(dim=1)
    union = preds.sum(dim=1) + targets.sum(dim=1)
    return ((2 * intersection + eps) / (union + eps)).mean()


class BCEDiceLoss(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.bce = nn.BCEWithLogitsLoss()

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        probs = torch.sigmoid(logits)
        probs = probs.flatten(1)
        targets_flat = targets.flatten(1)
        intersection = (probs * targets_flat).sum(dim=1)
        union = probs.sum(dim=1) + targets_flat.sum(dim=1)
        dice_loss = 1 - ((2 * intersection + 1e-7) / (union + 1e-7)).mean()
        return self.bce(logits, targets) + dice_loss


class SpaceNetDataset(Dataset):
    def __init__(self, df: pd.DataFrame, image_size: int = 256, augment: bool = False) -> None:
        self.df = df.reset_index(drop=True)
        self.image_size = image_size
        self.augment = augment

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor, str]:
        row = self.df.iloc[index]
        image = Image.open(row["image_path"]).convert("RGB")
        mask = Image.open(row["mask_path"]).convert("L")
        image = TF.resize(image, [self.image_size, self.image_size], antialias=True)
        mask = TF.resize(mask, [self.image_size, self.image_size], interpolation=Image.NEAREST)

        if self.augment and random.random() < 0.5:
            image = TF.hflip(image)
            mask = TF.hflip(mask)
        if self.augment and random.random() < 0.5:
            image = TF.vflip(image)
            mask = TF.vflip(mask)

        image_t = TF.to_tensor(image)
        mask_t = (TF.to_tensor(mask) > 0.5).float()
        return image_t, mask_t, row["image_id"]


def make_split(df: pd.DataFrame, seed: int, val_per_aoi: int = 2) -> tuple[pd.DataFrame, pd.DataFrame]:
    train_parts = []
    val_parts = []
    for _, group in df.groupby("aoi", sort=True):
        group = group.sample(frac=1.0, random_state=seed)
        val_parts.append(group.iloc[:val_per_aoi])
        train_parts.append(group.iloc[val_per_aoi:])
    return pd.concat(train_parts).reset_index(drop=True), pd.concat(val_parts).reset_index(drop=True)


def save_predictions(model: nn.Module, dataset: SpaceNetDataset, out_dir: Path, device: torch.device) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    model.eval()
    with torch.no_grad():
        for idx in range(min(4, len(dataset))):
            image, mask, image_id = dataset[idx]
            logits = model(image.unsqueeze(0).to(device))
            pred = (torch.sigmoid(logits)[0, 0].cpu() > 0.5).numpy().astype("uint8") * 255
            Image.fromarray(pred).save(out_dir / f"{image_id}_pred.png")
            Image.fromarray((mask[0].numpy() * 255).astype("uint8")).save(out_dir / f"{image_id}_gt.png")
            TF.to_pil_image(image).save(out_dir / f"{image_id}_img.png")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--manifest-path", type=Path, default=None)
    parser.add_argument("--aoi", type=str, default=None)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--image-size", type=int, default=256)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--val-per-aoi", type=int, default=2)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    set_seed(args.seed)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = args.manifest_path or (args.data_root / "manifest.csv")
    manifest = pd.read_csv(manifest_path)
    if args.aoi:
        manifest = manifest[manifest["aoi"] == args.aoi].reset_index(drop=True)
    train_df, val_df = make_split(manifest, args.seed, args.val_per_aoi)
    train_df.to_csv(args.output_dir / "train_split.csv", index=False)
    val_df.to_csv(args.output_dir / "val_split.csv", index=False)

    train_ds = SpaceNetDataset(train_df, image_size=args.image_size, augment=True)
    val_ds = SpaceNetDataset(val_df, image_size=args.image_size, augment=False)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    model = UNet().to(device)
    criterion = BCEDiceLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

    history = []
    best_val_dice = -1.0
    best_epoch = -1

    for epoch in range(1, args.epochs + 1):
        model.train()
        train_loss = 0.0
        train_dice = 0.0
        train_count = 0
        for images, masks, _ in tqdm(train_loader, desc=f"train {epoch}", leave=False):
            images = images.to(device)
            masks = masks.to(device)
            logits = model(images)
            loss = criterion(logits, masks)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            bs = images.size(0)
            train_loss += float(loss.item()) * bs
            train_dice += float(dice_from_logits(logits.detach(), masks).item()) * bs
            train_count += bs

        model.eval()
        val_loss = 0.0
        val_dice = 0.0
        val_count = 0
        with torch.no_grad():
            for images, masks, _ in tqdm(val_loader, desc=f"val {epoch}", leave=False):
                images = images.to(device)
                masks = masks.to(device)
                logits = model(images)
                loss = criterion(logits, masks)
                bs = images.size(0)
                val_loss += float(loss.item()) * bs
                val_dice += float(dice_from_logits(logits, masks).item()) * bs
                val_count += bs

        record = {
            "epoch": epoch,
            "train_loss": train_loss / train_count,
            "train_dice": train_dice / train_count,
            "val_loss": val_loss / val_count,
            "val_dice": val_dice / val_count,
        }
        history.append(record)
        print(json.dumps(record))

        if record["val_dice"] > best_val_dice:
            best_val_dice = record["val_dice"]
            best_epoch = epoch
            torch.save(model.state_dict(), args.output_dir / "best.pt")

    pd.DataFrame(history).to_csv(args.output_dir / "history.csv", index=False)
    summary = {
        "image_size": args.image_size,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "lr": args.lr,
        "seed": args.seed,
        "manifest_path": str(manifest_path),
        "aoi": args.aoi,
        "val_per_aoi": args.val_per_aoi,
        "train_samples": len(train_df),
        "val_samples": len(val_df),
        "best_val_dice": best_val_dice,
        "best_epoch": best_epoch,
        "device": str(device),
        "aois": sorted(manifest["aoi"].unique().tolist()),
    }
    (args.output_dir / "summary.json").write_text(json.dumps(summary, indent=2))

    model.load_state_dict(torch.load(args.output_dir / "best.pt", map_location=device))
    save_predictions(model, val_ds, args.output_dir / "qualitative", device)
    print(args.output_dir / "summary.json")


if __name__ == "__main__":
    main()
