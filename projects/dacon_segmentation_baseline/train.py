from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader, Subset
from tqdm import tqdm

from src.dataset import TrainDataset
from src.model import UNet
from src.utils import AverageMeter, dice_from_logits, dice_torch, ensure_dir, format_metrics, set_seed


class BCEDiceLoss(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.bce = nn.BCEWithLogitsLoss()

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        bce = self.bce(logits, targets)
        dice_loss = 1.0 - dice_torch(logits, targets)
        return bce + dice_loss


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--output-dir", type=Path, default=Path("runs/unet_baseline"))
    parser.add_argument("--resume-from", type=Path, default=None)
    return parser.parse_args()


def make_splits(df: pd.DataFrame, val_ratio: float, seed: int) -> tuple[list[int], list[int]]:
    rng = torch.Generator().manual_seed(seed)
    indices = torch.randperm(len(df), generator=rng).tolist()
    val_size = int(len(indices) * val_ratio)
    val_indices = indices[:val_size]
    train_indices = indices[val_size:]
    return train_indices, val_indices


def run_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
    threshold: float,
) -> tuple[float, float, float]:
    is_train = optimizer is not None
    model.train(is_train)
    loss_meter = AverageMeter()
    soft_dice_meter = AverageMeter()
    hard_dice_meter = AverageMeter()

    for images, masks in tqdm(loader, leave=False):
        images = images.to(device)
        masks = masks.to(device)

        with torch.set_grad_enabled(is_train):
            logits = model(images)
            loss = criterion(logits, masks)
            soft_dice = dice_torch(logits.detach(), masks).item()
            hard_dice = dice_from_logits(logits.detach(), masks, threshold=threshold).item()

            if is_train:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

        batch_size = images.size(0)
        loss_meter.update(float(loss.item()), batch_size)
        soft_dice_meter.update(float(soft_dice), batch_size)
        hard_dice_meter.update(float(hard_dice), batch_size)

    return loss_meter.avg, soft_dice_meter.avg, hard_dice_meter.avg


def main() -> None:
    args = parse_args()
    set_seed(args.seed)
    out_dir = ensure_dir(args.output_dir)

    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")

    train_csv = args.data_root / "train.csv"
    df = pd.read_csv(train_csv)
    dataset = TrainDataset(train_csv, args.data_root, image_size=args.image_size)
    train_idx, val_idx = make_splits(df, args.val_ratio, args.seed)
    train_set = Subset(dataset, train_idx)
    val_set = Subset(dataset, val_idx)

    train_loader = DataLoader(train_set, batch_size=args.batch_size, shuffle=True, num_workers=args.num_workers)
    val_loader = DataLoader(val_set, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers)

    model = UNet().to(device)
    criterion = BCEDiceLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

    best_dice = -1.0
    history: list[dict[str, float]] = []
    start_epoch = 1

    config = {
        "data_root": str(args.data_root),
        "image_size": args.image_size,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "lr": args.lr,
        "val_ratio": args.val_ratio,
        "threshold": args.threshold,
        "seed": args.seed,
        "device": str(device),
        "train_size": len(train_idx),
        "val_size": len(val_idx),
        "resume_from": str(args.resume_from) if args.resume_from else None,
    }
    (out_dir / "config.json").write_text(json.dumps(config, indent=2))

    # 변경 전:
    # - 중간에 학습이 끊기면 처음부터 다시 시작해야 했다.
    # - history.csv도 학습 전체가 끝나야 저장되어 중간 진행 상황이 남지 않았다.
    #
    # 변경 후:
    # - --resume-from 체크포인트로 중단된 학습을 이어갈 수 있게 했다.
    # - epoch마다 history.csv와 last.pt를 저장해 중간 결과를 보존한다.
    if (out_dir / "history.csv").exists():
        history = pd.read_csv(out_dir / "history.csv").to_dict("records")

    if args.resume_from is not None and args.resume_from.exists():
        checkpoint = torch.load(args.resume_from, map_location=device)
        model.load_state_dict(checkpoint["model_state_dict"])
        if "optimizer_state_dict" in checkpoint:
            optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        best_dice = float(checkpoint.get("best_val_dice", best_dice))
        start_epoch = int(checkpoint.get("epoch", 0)) + 1
        print(f"Resuming from {args.resume_from} at epoch {start_epoch}")

    for epoch in range(start_epoch, args.epochs + 1):
        train_loss, train_soft_dice, train_dice = run_epoch(
            model,
            train_loader,
            criterion,
            optimizer,
            device,
            args.threshold,
        )
        val_loss, val_soft_dice, val_dice = run_epoch(
            model,
            val_loader,
            criterion,
            None,
            device,
            args.threshold,
        )

        row = {
            "epoch": epoch,
            "train_loss": train_loss,
            "train_soft_dice": train_soft_dice,
            "train_dice": train_dice,
            "val_loss": val_loss,
            "val_soft_dice": val_soft_dice,
            "val_dice": val_dice,
        }
        history.append(row)
        print(f"Epoch {epoch:02d} | " + format_metrics(row.items()))
        pd.DataFrame(history).to_csv(out_dir / "history.csv", index=False)

        torch.save(
            {
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "config": config,
                "best_val_dice": best_dice,
                "epoch": epoch,
            },
            out_dir / "last.pt",
        )

        if val_dice > best_dice:
            best_dice = val_dice
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "config": config,
                    "best_val_dice": best_dice,
                    "epoch": epoch,
                },
                out_dir / "best.pt",
            )

    summary = {
        **config,
        "best_val_dice": best_dice,
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2))
    print(f"Saved outputs to {out_dir}")


if __name__ == "__main__":
    main()
