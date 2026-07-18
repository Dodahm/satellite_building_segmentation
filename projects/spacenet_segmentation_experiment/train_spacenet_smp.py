from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import pandas as pd
import segmentation_models_pytorch as smp
import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision.transforms import functional as TF
from tqdm import tqdm


def set_seed(seed: int) -> None:
    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


class SpaceNetDataset(Dataset):
    def __init__(
        self,
        df: pd.DataFrame,
        image_size: int = 512,
        augment: bool = False,
        crop_size: int | None = None,
        eval_center_crop: bool = False,
    ) -> None:
        self.df = df.reset_index(drop=True)
        self.image_size = image_size
        self.augment = augment
        self.crop_size = crop_size
        self.eval_center_crop = eval_center_crop

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, index: int):
        row = self.df.iloc[index]
        image = Image.open(row["image_path"]).convert("RGB")
        mask = Image.open(row["mask_path"]).convert("L")

        if self.crop_size and min(image.size) >= self.crop_size:
            if self.augment:
                top, left, height, width = torch.randint(0, image.height - self.crop_size + 1, (1,)).item(), torch.randint(0, image.width - self.crop_size + 1, (1,)).item(), self.crop_size, self.crop_size
            elif self.eval_center_crop:
                top = (image.height - self.crop_size) // 2
                left = (image.width - self.crop_size) // 2
                height = self.crop_size
                width = self.crop_size
            else:
                top = 0
                left = 0
                height = self.crop_size
                width = self.crop_size
            image = TF.crop(image, top, left, height, width)
            mask = TF.crop(mask, top, left, height, width)

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


def make_split(df: pd.DataFrame, seed: int, val_per_aoi: int):
    train_parts = []
    val_parts = []
    for _, group in df.groupby("aoi", sort=True):
        group = group.sample(frac=1.0, random_state=seed)
        val_parts.append(group.iloc[:val_per_aoi])
        train_parts.append(group.iloc[val_per_aoi:])
    return pd.concat(train_parts).reset_index(drop=True), pd.concat(val_parts).reset_index(drop=True)


def dice_from_logits(logits: torch.Tensor, targets: torch.Tensor, threshold: float = 0.5, eps: float = 1e-7) -> torch.Tensor:
    probs = torch.sigmoid(logits)
    preds = (probs > threshold).float().flatten(1)
    targets = targets.flatten(1)
    intersection = (preds * targets).sum(dim=1)
    union = preds.sum(dim=1) + targets.sum(dim=1)
    return ((2 * intersection + eps) / (union + eps)).mean()


def save_predictions(model, dataset, out_dir: Path, device: torch.device, threshold: float) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    model.eval()
    with torch.no_grad():
        for idx in range(min(4, len(dataset))):
            image, mask, image_id = dataset[idx]
            logits = model(image.unsqueeze(0).to(device))
            pred = (torch.sigmoid(logits)[0, 0].cpu() > threshold).numpy().astype("uint8") * 255
            Image.fromarray(pred).save(out_dir / f"{image_id}_pred.png")
            Image.fromarray((mask[0].numpy() * 255).astype("uint8")).save(out_dir / f"{image_id}_gt.png")
            TF.to_pil_image(image).save(out_dir / f"{image_id}_img.png")


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--data-root", type=Path, required=True)
    p.add_argument("--output-dir", type=Path, required=True)
    p.add_argument("--image-size", type=int, default=512)
    p.add_argument("--epochs", type=int, default=20)
    p.add_argument("--batch-size", type=int, default=2)
    p.add_argument("--lr", type=float, default=3e-4)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--encoder", type=str, default="resnet34")
    p.add_argument("--manifest-path", type=Path, default=None)
    p.add_argument("--aoi", type=str, default=None)
    p.add_argument("--val-per-aoi", type=int, default=32)
    p.add_argument("--crop-size", type=int, default=None)
    p.add_argument("--eval-center-crop", action="store_true")
    p.add_argument("--drop-empty-train", action="store_true")
    p.add_argument("--drop-empty-val", action="store_true")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    set_seed(args.seed)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = args.manifest_path or (args.data_root / "manifest.csv")
    manifest = pd.read_csv(manifest_path)
    if args.aoi:
        manifest = manifest[manifest["aoi"] == args.aoi].reset_index(drop=True)
    train_df, val_df = make_split(manifest, args.seed, args.val_per_aoi)
    if args.drop_empty_train and "building_count" in train_df.columns:
        train_df = train_df[train_df["building_count"].astype(int) > 0].reset_index(drop=True)
    if args.drop_empty_val and "building_count" in val_df.columns:
        val_df = val_df[val_df["building_count"].astype(int) > 0].reset_index(drop=True)
    train_df.to_csv(args.output_dir / "train_split.csv", index=False)
    val_df.to_csv(args.output_dir / "val_split.csv", index=False)

    train_ds = SpaceNetDataset(
        train_df,
        image_size=args.image_size,
        augment=True,
        crop_size=args.crop_size,
        eval_center_crop=False,
    )
    val_ds = SpaceNetDataset(
        val_df,
        image_size=args.image_size,
        augment=False,
        crop_size=args.crop_size,
        eval_center_crop=args.eval_center_crop,
    )
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    model = smp.Unet(
        encoder_name=args.encoder,
        encoder_weights="imagenet",
        in_channels=3,
        classes=1,
    ).to(device)

    dice_loss = smp.losses.DiceLoss(mode="binary", from_logits=True)
    bce_loss = torch.nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    history = []
    best_val_dice = -1.0
    best_epoch = -1
    best_threshold = 0.5

    for epoch in range(1, args.epochs + 1):
        model.train()
        train_loss = 0.0
        train_dice = 0.0
        train_count = 0
        for images, masks, _ in tqdm(train_loader, desc=f"train {epoch}", leave=False):
            images = images.to(device)
            masks = masks.to(device)
            logits = model(images)
            loss = 0.5 * bce_loss(logits, masks) + 0.5 * dice_loss(logits, masks)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            bs = images.size(0)
            train_loss += float(loss.item()) * bs
            train_dice += float(dice_from_logits(logits.detach(), masks).item()) * bs
            train_count += bs

        model.eval()
        val_loss = 0.0
        val_count = 0
        logits_list = []
        masks_list = []
        with torch.no_grad():
            for images, masks, _ in tqdm(val_loader, desc=f"val {epoch}", leave=False):
                images = images.to(device)
                masks = masks.to(device)
                logits = model(images)
                loss = 0.5 * bce_loss(logits, masks) + 0.5 * dice_loss(logits, masks)
                bs = images.size(0)
                val_loss += float(loss.item()) * bs
                val_count += bs
                logits_list.append(logits.cpu())
                masks_list.append(masks.cpu())

        logits_all = torch.cat(logits_list, dim=0)
        masks_all = torch.cat(masks_list, dim=0)
        threshold_scores = [(th / 100.0, float(dice_from_logits(logits_all, masks_all, threshold=th / 100.0).item())) for th in range(25, 81, 5)]
        current_threshold, current_val_dice = max(threshold_scores, key=lambda x: x[1])
        scheduler.step()

        record = {
            "epoch": epoch,
            "train_loss": train_loss / train_count,
            "train_dice": train_dice / train_count,
            "val_loss": val_loss / val_count,
            "val_dice": current_val_dice,
            "threshold": current_threshold,
            "lr": scheduler.get_last_lr()[0],
        }
        history.append(record)
        print(json.dumps(record))

        if current_val_dice > best_val_dice:
            best_val_dice = current_val_dice
            best_epoch = epoch
            best_threshold = current_threshold
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
        "crop_size": args.crop_size,
        "eval_center_crop": args.eval_center_crop,
        "drop_empty_train": args.drop_empty_train,
        "drop_empty_val": args.drop_empty_val,
        "train_samples": len(train_df),
        "val_samples": len(val_df),
        "best_val_dice": best_val_dice,
        "best_epoch": best_epoch,
        "best_threshold": best_threshold,
        "device": str(device),
        "encoder": args.encoder,
        "aois": sorted(manifest["aoi"].unique().tolist()),
    }
    (args.output_dir / "summary.json").write_text(json.dumps(summary, indent=2))

    model.load_state_dict(torch.load(args.output_dir / "best.pt", map_location=device))
    save_predictions(model, val_ds, args.output_dir / "qualitative", device, best_threshold)
    print(args.output_dir / "summary.json")


if __name__ == "__main__":
    main()
