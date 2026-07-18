from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import albumentations as A
import cv2
import numpy as np
import pandas as pd
import segmentation_models_pytorch as smp
import torch
from scipy import ndimage as ndi
from albumentations.pytorch import ToTensorV2
from torch.utils.data import DataLoader, Dataset
from tqdm import tqdm

# -----------------------------------------------------------------------------
# 이 파일은 DACON 건물 segmentation 재현 + 파인튜닝 실험용 메인 학습 코드다.
#
# 학습 흐름 요약
# 1. train.csv / holdout_truth.csv / test.csv를 읽는다.
# 2. RLE 마스크를 복원해 Dataset으로 만든다.
# 3. U-Net / UNet++ / DeepLabV3+ 중 하나 이상을 선택해 학습한다.
# 4. validation에서는 threshold sweep으로 최적 Dice를 찾는다.
# 5. 필요하면 TTA와 후처리를 적용한다.
# 6. 가장 좋은 checkpoint만 저장한다.
# 7. 마지막에는 선택한 모델들의 soft voting 결과로 제출용 RLE CSV를 만든다.
#
# 참고:
# - DACON 원본 train.csv를 train/holdout으로 나눠 내부 validation을 수행한다.
# - 원본 DACON 기준 기록:
#   UNet++ + crop_size=384 + image_size=256 + focal_dice + TTA + 후처리 + 10 epoch
#   holdout validation Dice = 0.7991
# - train/validation 이미지는 1024x1024라 384 crop이 가능하지만,
#   test 이미지는 224x224라 inference에서는 crop을 적용하면 안 된다.
#
# 최종 0.8+ 성능 개선 기록:
# - 기존 10 epoch best checkpoint는 Dice 0.7991로 0.8 바로 아래였다.
# - threshold를 0.05 간격으로만 찾으면 최적 cutoff를 놓칠 수 있어
#   --threshold-start / --threshold-end / --threshold-step 옵션을 추가했다.
# - 기존 scheduler는 마지막 learning rate가 0.0까지 떨어져 --resume만으로는
#   추가 학습 효과가 거의 없었다.
# - 그래서 --init-checkpoint-dir 옵션을 추가해 "모델 가중치만" 불러오고,
#   optimizer와 scheduler는 새 learning rate로 다시 시작하게 했다.
# - 최종 실행은 DACON 원본 train split만 사용했고, 외부 데이터는 사용하지 않았다.
# - 최종 holdout validation Dice: 0.8007050573, best threshold: 0.37
# -----------------------------------------------------------------------------


def set_seed(seed: int) -> None:
    # 실험 재현성을 위해 random / numpy / torch 시드를 고정한다.
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def rle_decode(mask_rle: str, shape: tuple[int, int]) -> np.ndarray:
    # CSV에 저장된 RLE 문자열을 원래 binary mask로 복원한다.
    s = mask_rle.split()
    starts, lengths = [np.asarray(x, dtype=int) for x in (s[0:][::2], s[1:][::2])]
    starts -= 1
    ends = starts + lengths
    img = np.zeros(shape[0] * shape[1], dtype=np.uint8)
    for lo, hi in zip(starts, ends):
        img[lo:hi] = 1
    return img.reshape(shape)


def rle_encode(mask: np.ndarray) -> str:
    # 예측 마스크를 다시 제출용 RLE 문자열로 바꾼다.
    pixels = mask.flatten()
    pixels = np.concatenate([[0], pixels, [0]])
    runs = np.where(pixels[1:] != pixels[:-1])[0] + 1
    runs[1::2] -= runs[::2]
    return " ".join(str(x) for x in runs)


def dice_score(pred: np.ndarray, target: np.ndarray, eps: float = 1e-7) -> float:
    # holdout 검증에서 사용할 Dice score 계산 함수다.
    pred = pred.astype(np.float32).reshape(-1)
    target = target.astype(np.float32).reshape(-1)
    intersection = float((pred * target).sum())
    return (2.0 * intersection + eps) / (float(pred.sum() + target.sum()) + eps)


def binary_focal_loss_with_logits(
    logits: torch.Tensor,
    targets: torch.Tensor,
    alpha: float = 0.25,
    gamma: float = 2.0,
) -> torch.Tensor:
    # MPS 환경에서도 동작하도록 binary focal loss를 직접 구현한다.
    #
    # 변경 전:
    # - 처음에는 segmentation_models_pytorch의 FocalLoss를 그대로 쓰려 했다.
    # - 하지만 Apple Silicon MPS 환경에서 타입 오류가 발생했다.
    #
    # 변경 전 코드(실행 중 오류 발생):
    # focal_loss = smp.losses.FocalLoss(mode="binary")
    # loss = 0.5 * focal_loss(logits, masks) + 0.5 * criterion_dice(logits, masks)
    #
    # 변경 후:
    # - BCEWithLogits 기반 binary focal loss를 직접 구현해
    #   MPS 환경에서도 안정적으로 학습되게 바꿨다.
    bce = torch.nn.functional.binary_cross_entropy_with_logits(logits, targets, reduction="none")
    probs = torch.sigmoid(logits)
    pt = probs * targets + (1.0 - probs) * (1.0 - targets)
    alpha_t = alpha * targets + (1.0 - alpha) * (1.0 - targets)
    focal = alpha_t * ((1.0 - pt) ** gamma) * bce
    return focal.mean()


class SatelliteDataset(Dataset):
    def __init__(self, csv_path: Path, transform: A.Compose, infer: bool = False, limit: int | None = None) -> None:
        # train.csv / test.csv를 그대로 읽어
        # 학습 모드와 추론 모드를 같은 Dataset 클래스로 처리한다.
        self.data = pd.read_csv(csv_path)
        if limit is not None:
            # VS Code 디버깅에서는 전체 5,712장/1,428장을 모두 돌릴 필요가 없다.
            # 작은 샘플만 잘라 쓰면 Dataset, transform, model forward, loss 계산을 빠르게 확인할 수 있다.
            self.data = self.data.head(limit).reset_index(drop=True)
        self.transform = transform
        self.infer = infer

    def __len__(self) -> int:
        return len(self.data)

    def __getitem__(self, idx: int):
        # 이 함수는 "CSV 한 줄 -> 실제 학습용 텐서"로 바꾸는 역할을 한다.
        # infer=True면 이미지와 img_id만,
        # infer=False면 이미지 / 마스크 / img_id를 반환한다.
        row = self.data.iloc[idx]
        image = cv2.imread(row["img_path"])
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        if self.infer:
            # 추론 시에는 mask 없이 이미지만 반환한다.
            image = self.transform(image=image)["image"]
            return image, row["img_id"]
        # 학습/검증 시에는 RLE를 복원해 mask와 함께 반환한다.
        mask = rle_decode(row["mask_rle"], (image.shape[0], image.shape[1]))
        augmented = self.transform(image=image, mask=mask)
        return augmented["image"], augmented["mask"].float(), row["img_id"]


def build_transforms(image_size: int, train: bool, crop_size: int | None) -> A.Compose:
    # 베이스라인 노트북의 224 resize 흐름을 유지하면서
    # 학습 시에는 flip / rotate 증강을 추가한다.
    #
    # 변경 전 코드(베이스라인에 가까운 단순 버전):
    # ops = [
    #     A.Resize(image_size, image_size),
    #     A.Normalize(),
    #     ToTensorV2(),
    # ]
    #
    # 변경 내용:
    # - crop_size 옵션을 넣어 patch-based training 가능하게 변경
    # - train에서는 RandomCrop, val/test에서는 CenterCrop 사용
    # - flip / rotate 증강 추가
    #
    # 왜 바꿨는가:
    # - 224 resize만 쓰면 작은 건물 경계가 많이 뭉개져서 성능이 0.69 부근에서 막혔다.
    # - 384 crop -> 256 resize patch 학습으로 바꾼 뒤 0.80+까지 올라갔다.
    ops: list = []
    if crop_size is not None:
        if train:
            ops.append(A.RandomCrop(height=crop_size, width=crop_size))
        else:
            ops.append(A.CenterCrop(height=crop_size, width=crop_size))
    ops.append(A.Resize(image_size, image_size))
    if train:
        ops.extend(
            [
                A.HorizontalFlip(p=0.5),
                A.VerticalFlip(p=0.5),
                A.RandomRotate90(p=0.5),
            ]
        )
    ops.extend([A.Normalize(), ToTensorV2()])
    return A.Compose(ops)


def make_model(name: str) -> torch.nn.Module:
    # 실험할 segmentation 모델을 이름으로 선택한다.
    #
    # 변경 전 코드(초기 baseline):
    # if name == "unet":
    #     return smp.Unet(
    #         encoder_name="resnet34",
    #         encoder_weights="imagenet",
    #         in_channels=3,
    #         classes=1,
    #     )
    #
    # 변경 내용:
    # - UNet++ 추가
    # - DeepLabV3+ 추가
    #
    # 왜 바꿨는가:
    # - 단일 U-Net만으로는 성능 비교가 제한적이었다.
    # - 구조가 다른 모델을 비교/앙상블해서 더 강한 validation 성능을 노렸다.
    if name == "unet":
        return smp.Unet(encoder_name="resnet34", encoder_weights="imagenet", in_channels=3, classes=1)
    if name == "unetplusplus":
        return smp.UnetPlusPlus(encoder_name="resnet34", encoder_weights="imagenet", in_channels=3, classes=1)
    if name == "deeplabv3plus":
        return smp.DeepLabV3Plus(encoder_name="resnet34", encoder_weights="imagenet", in_channels=3, classes=1)
    raise ValueError(f"Unsupported model: {name}")


def predict_with_tta(model: torch.nn.Module, images: torch.Tensor, device: torch.device, use_tta: bool) -> torch.Tensor:
    # flip 기반 TTA로 여러 방향의 예측을 평균내 확률맵을 더 안정화한다.
    #
    # 변경 전 코드:
    # images = images.to(device)
    # logits = model(images)
    # probs = torch.sigmoid(logits)
    # return probs
    #
    # 변경 내용:
    # - 원본, 좌우반전, 상하반전, 상하좌우반전 예측을 평균내는 TTA 추가
    #
    # 왜 바꿨는가:
    # - validation threshold 부근에서 마스크 경계가 흔들리는 경우를 줄이기 위해서다.
    images = images.to(device)
    logits = model(images)
    probs = torch.sigmoid(logits)
    if not use_tta:
        return probs

    h_probs = torch.sigmoid(torch.flip(model(torch.flip(images, dims=[3])), dims=[3]))
    v_probs = torch.sigmoid(torch.flip(model(torch.flip(images, dims=[2])), dims=[2]))
    hv_probs = torch.sigmoid(torch.flip(model(torch.flip(images, dims=[2, 3])), dims=[2, 3]))
    return (probs + h_probs + v_probs + hv_probs) / 4.0


def postprocess_mask(mask: np.ndarray, min_area: int, fill_holes: bool) -> np.ndarray:
    # 작은 잡음을 제거하고 내부 hole을 메워 건물 마스크를 더 매끈하게 만든다.
    #
    # 변경 전 코드:
    # return mask.astype(np.uint8)
    #
    # 변경 내용:
    # - 너무 작은 connected component 제거
    # - 건물 내부 구멍 메우기
    #
    # 왜 바꿨는가:
    # - 위성 영상 예측에서 작은 점 잡음과 내부 빈 영역이 자주 생겨 Dice를 깎았다.
    binary = mask.astype(bool)
    labeled, num = ndi.label(binary)
    cleaned = np.zeros_like(binary)
    for label_id in range(1, num + 1):
        component = labeled == label_id
        if int(component.sum()) >= min_area:
            cleaned |= component
    if fill_holes:
        cleaned = ndi.binary_fill_holes(cleaned)
    return cleaned.astype(np.uint8)


def evaluate_model(
    model: torch.nn.Module,
    loader: DataLoader,
    device: torch.device,
    thresholds: list[float],
    use_tta: bool,
    min_area: int,
    fill_holes: bool,
) -> tuple[float, float, list[np.ndarray], list[np.ndarray], list[str]]:
    # validation set 전체를 순회하며 확률맵을 저장하고,
    # threshold sweep으로 가장 좋은 Dice threshold를 찾는다.
    #
    # 함수 역할:
    # - validation 데이터 전체 예측
    # - 여러 threshold 후보를 시험
    # - 가장 Dice가 좋은 threshold를 반환
    model.eval()
    probs_list: list[np.ndarray] = []
    masks_list: list[np.ndarray] = []
    img_ids: list[str] = []
    with torch.no_grad():
        for images, masks, batch_ids in tqdm(loader, desc="val", leave=False):
            probs = predict_with_tta(model, images, device, use_tta).cpu().numpy()[:, 0]
            probs_list.extend(list(probs))
            masks_list.extend(list(masks.numpy()))
            img_ids.extend(list(batch_ids))
    best_threshold = 0.5
    best_dice = -1.0
    for threshold in thresholds:
        dices = [
            dice_score(
                postprocess_mask((prob > threshold).astype(np.uint8), min_area=min_area, fill_holes=fill_holes),
                mask.astype(np.uint8),
            )
            for prob, mask in zip(probs_list, masks_list)
        ]
        score = float(np.mean(dices))
        if score > best_dice:
            best_dice = score
            best_threshold = threshold
    return best_dice, best_threshold, probs_list, masks_list, img_ids


def infer_probs(model: torch.nn.Module, loader: DataLoader, device: torch.device, use_tta: bool) -> tuple[list[np.ndarray], list[str]]:
    # test.csv에 대해 확률맵만 추론해 앙상블 단계에서 재사용한다.
    # 함수 역할:
    # - test set에 대한 raw probability map을 저장
    # - 나중에 soft voting ensemble에서 다시 활용
    model.eval()
    probs_list: list[np.ndarray] = []
    img_ids: list[str] = []
    with torch.no_grad():
        for images, batch_ids in tqdm(loader, desc="infer", leave=False):
            probs = predict_with_tta(model, images, device, use_tta).cpu().numpy()[:, 0]
            probs_list.extend(list(probs))
            img_ids.extend(list(batch_ids))
    return probs_list, img_ids


def parse_args() -> argparse.Namespace:
    # 학습 하이퍼파라미터와 사용할 모델 조합을 CLI로 받는다.
    #
    # 변경 전 코드(초기 quick run에 가까운 형태):
    # parser.add_argument("--epochs", type=int, default=1)
    # parser.add_argument("--image-size", type=int, default=224)
    # parser.add_argument("--models", type=str, default="unet,deeplabv3plus")
    #
    # 변경 내용:
    # - unetplusplus 추가
    # - use_tta, min_area, fill_holes 추가
    # - crop_size 추가
    # - loss_type 추가
    #
    # 왜 바꿨는가:
    # - "224 resize + 단순 loss"에서 막혀서
    #   patch, 후처리, focal loss를 제어할 수 있게 확장했다.
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--models", type=str, default="unet,deeplabv3plus,unetplusplus")
    parser.add_argument("--use-tta", action="store_true")
    parser.add_argument("--min-area", type=int, default=16)
    parser.add_argument("--fill-holes", action="store_true")
    parser.add_argument("--crop-size", type=int, default=None)
    parser.add_argument("--test-image-size", type=int, default=224)
    parser.add_argument("--loss-type", type=str, default="bce_dice", choices=["bce_dice", "focal_dice"])
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--init-checkpoint-dir", type=Path, default=None)
    parser.add_argument("--threshold-start", type=float, default=0.25)
    parser.add_argument("--threshold-end", type=float, default=0.75)
    parser.add_argument("--threshold-step", type=float, default=0.05)
    parser.add_argument("--eval-only", action="store_true")
    parser.add_argument("--skip-infer", action="store_true")
    parser.add_argument("--train-limit", type=int, default=None)
    parser.add_argument("--val-limit", type=int, default=None)
    parser.add_argument("--test-limit", type=int, default=None)
    return parser.parse_args()


def main() -> None:
    # main 함수 역할:
    # - 전체 학습 파이프라인을 순서대로 실행하는 진입점
    # - 데이터 로드 -> 모델 학습 -> 검증 -> 앙상블 -> 제출 파일 생성까지 담당
    args = parse_args()
    set_seed(args.seed)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    # prepare_dacon_raw_holdout.py로 만든 holdout 데이터셋 경로를 읽는다.
    train_csv = args.data_root / "train.csv"
    val_csv = args.data_root / "holdout_truth.csv"
    test_csv = args.data_root / "test.csv"

    train_ds = SatelliteDataset(
        train_csv,
        build_transforms(args.image_size, train=True, crop_size=args.crop_size),
        infer=False,
        limit=args.train_limit,
    )
    val_ds = SatelliteDataset(
        val_csv,
        build_transforms(args.image_size, train=False, crop_size=args.crop_size),
        infer=False,
        limit=args.val_limit,
    )
    #
    # 변경 전 코드:
    # test_ds = SatelliteDataset(test_csv, build_transforms(args.image_size, train=False, crop_size=args.crop_size), infer=True)
    #
    # 문제:
    # - 원본 DACON test 이미지는 224x224다.
    # - 최종 학습 설정의 crop_size=384를 그대로 test에 적용하면
    #   CropSizeError가 발생한다.
    #
    # 변경 후:
    # - train/validation은 384 crop -> 256 input을 유지한다.
    # - test inference는 crop 없이 resize-only transform을 사용한다.
    # - test-image-size 기본값을 224로 두어 제출 RLE 크기가 test 이미지와 맞도록 했다.
    test_ds = SatelliteDataset(
        test_csv,
        build_transforms(args.test_image_size, train=False, crop_size=None),
        infer=True,
        limit=args.test_limit,
    )

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    # Apple Silicon이면 mps, 아니면 cpu로 실행한다.
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    model_names = [name.strip() for name in args.models.split(",") if name.strip()]
    # 변경 전:
    # thresholds = [x / 100.0 for x in range(25, 76, 5)]
    #
    # 변경 내용:
    # - CLI에서 threshold 범위와 간격을 직접 조절할 수 있게 했다.
    #
    # 왜 바꿨는가:
    # - 현재 최고 Dice가 0.7991로 0.8 바로 아래에 있어,
    #   0.05 간격 threshold sweep만으로는 최적점을 놓칠 수 있다.
    # - DACON 규칙상 threshold 튜닝은 train/validation 기준 후처리이므로 허용 범위 안이다.
    thresholds = [
        round(float(x), 4)
        for x in np.arange(args.threshold_start, args.threshold_end + args.threshold_step / 2, args.threshold_step)
    ]
    criterion_bce = torch.nn.BCEWithLogitsLoss()
    criterion_dice = smp.losses.DiceLoss(mode="binary", from_logits=True)

    model_summaries = []
    test_prob_bank: dict[str, list[np.ndarray]] = {}
    val_prob_bank: dict[str, list[np.ndarray]] = {}
    val_id_bank: dict[str, list[str]] = {}
    val_masks_ref: dict[str, np.ndarray] = {}

    for model_name in model_names:
        # 각 모델을 독립적으로 학습하고 best checkpoint를 저장한다.
        model = make_model(model_name).to(device)
        optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)
        # epoch가 늘어날 때 학습률을 완만하게 줄여 후반부 수렴을 돕는다.
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
        best_val_dice = -1.0
        best_threshold = 0.5
        history = []
        start_epoch = 1
        best_ckpt_path = args.output_dir / f"{model_name}_best.pt"
        last_ckpt_path = args.output_dir / f"{model_name}_last.pt"
        history_path = args.output_dir / f"{model_name}_history.csv"

        # 변경 전:
        # - 추가 fine-tuning을 하려면 --resume으로 last checkpoint를 불러왔다.
        # - 하지만 이전 Cosine scheduler가 epoch 10에서 lr=0.0까지 떨어져,
        #   그대로 resume하면 추가 학습이 거의 진행되지 않는다.
        #
        # 변경 후:
        # - --init-checkpoint-dir을 주면 이전 best checkpoint의 model weight만 불러온다.
        # - optimizer와 scheduler는 현재 --lr, --epochs 기준으로 새로 시작한다.
        #
        # 왜 바꿨는가:
        # - DACON 규칙을 지키면서 0.7991 -> 0.8+를 노리려면
        #   외부 데이터가 아니라 기존 train split에서 낮은 LR fine-tuning을 해야 한다.
        if args.init_checkpoint_dir is not None:
            init_ckpt_path = args.init_checkpoint_dir / f"{model_name}_best.pt"
            if init_ckpt_path.exists():
                checkpoint = torch.load(init_ckpt_path, map_location=device)
                state_dict = checkpoint["model_state_dict"] if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint else checkpoint
                model.load_state_dict(state_dict)
                print(json.dumps({"model": model_name, "init_from": str(init_ckpt_path), "reset_optimizer": True}))
            else:
                raise FileNotFoundError(f"init checkpoint not found: {init_ckpt_path}")

        # 변경 전:
        # - long run 도중 끊기면 모델 학습을 처음부터 다시 해야 했다.
        # - 특히 epoch 10까지 가는 실험에서는 시간이 아까웠다.
        #
        # 변경 후:
        # - --resume 옵션을 주면 model별 last checkpoint에서 이어서 학습한다.
        # - history.csv도 다시 읽어 이전 epoch 기록을 이어붙인다.
        if args.resume and history_path.exists():
            history = pd.read_csv(history_path).to_dict("records")

        if args.resume and last_ckpt_path.exists():
            checkpoint = torch.load(last_ckpt_path, map_location=device)
            model.load_state_dict(checkpoint["model_state_dict"])
            optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
            scheduler.load_state_dict(checkpoint["scheduler_state_dict"])
            best_val_dice = float(checkpoint.get("best_val_dice", best_val_dice))
            best_threshold = float(checkpoint.get("best_threshold", best_threshold))
            start_epoch = int(checkpoint.get("epoch", 0)) + 1
            print(json.dumps({"model": model_name, "resume_from": str(last_ckpt_path), "start_epoch": start_epoch}))

        # 변경 전:
        # - checkpoint 성능을 다시 확인하려면 불필요하게 train loop를 한 번 더 돌아야 했다.
        #
        # 변경 후:
        # - --eval-only를 주면 현재 로드된 checkpoint를 validation만 수행한다.
        #
        # 왜 바꿨는가:
        # - 0.7991처럼 목표 점수 바로 아래에서는
        #   추가 학습보다 threshold/postprocess 재탐색이 먼저인지 빠르게 확인해야 한다.
        if args.eval_only:
            print(json.dumps({"model": model_name, "eval_only": True}))

        for epoch in range(start_epoch, args.epochs + 1):
            if args.eval_only:
                break
            model.train()
            train_loss = 0.0
            count = 0
            for images, masks, _ in tqdm(train_loader, desc=f"{model_name} train {epoch}", leave=False):
                images = images.to(device).float()
                masks = masks.to(device).unsqueeze(1).float()
                logits = model(images)
                #
                # 변경 전 코드(더 단순한 loss 조합):
                # loss = 0.5 * criterion_bce(logits, masks) + 0.5 * criterion_dice(logits, masks)
                #
                # 변경 내용:
                # - loss_type이 focal_dice면 Focal + Dice 사용
                # - 아니면 기존 BCE + Dice 사용
                #
                # 왜 바꿨는가:
                # - 작은 건물 픽셀은 배경에 비해 비중이 낮아서
                #   Focal loss가 어려운 픽셀에 더 집중하도록 만들기 위해서다.
                # BCE+Dice는 baseline 안정성이 좋고,
                # Focal+Dice는 경계가 작은 건물 픽셀에 더 집중할 때 사용한다.
                if args.loss_type == "focal_dice":
                    loss = 0.5 * binary_focal_loss_with_logits(logits, masks) + 0.5 * criterion_dice(logits, masks)
                else:
                    loss = 0.5 * criterion_bce(logits, masks) + 0.5 * criterion_dice(logits, masks)
                # BCE와 Dice loss를 같이 써서
                # 픽셀 분류와 마스크 겹침을 동시에 최적화한다.
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                train_loss += float(loss.item()) * images.size(0)
                count += images.size(0)

            val_dice, best_threshold_epoch, val_probs, val_masks, val_ids = evaluate_model(
                model,
                val_loader,
                device,
                thresholds,
                use_tta=args.use_tta,
                min_area=args.min_area,
                fill_holes=args.fill_holes,
            )
            scheduler.step()
            history.append(
                {
                    "epoch": epoch,
                    "train_loss": train_loss / max(count, 1),
                    "val_dice": val_dice,
                    "best_threshold_epoch": best_threshold_epoch,
                    "lr": scheduler.get_last_lr()[0],
                }
            )
            print(
                json.dumps(
                    {
                        "model": model_name,
                        "epoch": epoch,
                        "train_loss": train_loss / max(count, 1),
                        "val_dice": val_dice,
                        "best_threshold_epoch": best_threshold_epoch,
                        "lr": scheduler.get_last_lr()[0],
                    }
                )
            )
            pd.DataFrame(history).to_csv(history_path, index=False)
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "scheduler_state_dict": scheduler.state_dict(),
                    "best_val_dice": best_val_dice,
                    "best_threshold": best_threshold,
                    "epoch": epoch,
                },
                last_ckpt_path,
            )
            if val_dice > best_val_dice:
                # 가장 성능이 좋을 때만 checkpoint를 갱신한다.
                best_val_dice = val_dice
                best_threshold = best_threshold_epoch
                torch.save(
                    {
                        "model_state_dict": model.state_dict(),
                        "optimizer_state_dict": optimizer.state_dict(),
                        "scheduler_state_dict": scheduler.state_dict(),
                        "best_val_dice": best_val_dice,
                        "best_threshold": best_threshold,
                        "epoch": epoch,
                    },
                    best_ckpt_path,
                )

        if not args.eval_only:
            best_state = torch.load(best_ckpt_path, map_location=device)
            if isinstance(best_state, dict) and "model_state_dict" in best_state:
                model.load_state_dict(best_state["model_state_dict"])
            else:
                model.load_state_dict(best_state)
        # resume 이후에도 ensemble 검증용 확률맵을 안정적으로 만들기 위해
        # 최종 best checkpoint 기준으로 val/test probability를 다시 계산한다.
        best_val_dice_eval, best_threshold_eval, val_probs, val_masks, val_ids = evaluate_model(
            model,
            val_loader,
            device,
            thresholds,
            use_tta=args.use_tta,
            min_area=args.min_area,
            fill_holes=args.fill_holes,
        )
        val_prob_bank[model_name] = val_probs
        val_id_bank[model_name] = val_ids
        for img_id, mask in zip(val_ids, val_masks):
            val_masks_ref[img_id] = mask
        if not args.skip_infer:
            test_probs, test_ids = infer_probs(model, test_loader, device, use_tta=args.use_tta)
            test_prob_bank[model_name] = test_probs
        model_summaries.append(
            {
                "model": model_name,
                "best_val_dice": best_val_dice_eval,
                "best_threshold": best_threshold_eval,
                "epochs": args.epochs,
            }
        )

    ensemble_val = []
    # 변경 전:
    # val_ids = pd.read_csv(val_csv)["img_id"].tolist()
    #
    # 문제:
    # - VS Code 디버그용 --val-limit 옵션을 쓰면 실제 validation 예측 개수는 줄어든다.
    # - 그런데 CSV 전체 ID를 다시 읽으면 prob list보다 ID가 길어져 IndexError가 발생한다.
    #
    # 변경 후:
    # - evaluate_model이 실제로 예측한 ID 목록을 그대로 사용한다.
    # - 전체 학습과 small-sample 디버깅이 같은 코드 경로로 동작한다.
    val_ids = val_id_bank[model_names[0]]
    for i, img_id in enumerate(val_ids):
        # 여러 모델의 확률맵을 평균내서 soft voting 앙상블을 만든다.
        #
        # 변경 전 코드(단일 모델만 사용):
        # probs = val_prob_bank[model_names[0]][i]
        #
        # 변경 내용:
        # - 여러 모델 확률맵 평균으로 soft voting ensemble 수행
        probs = sum(val_prob_bank[name][i] for name in model_names) / len(model_names)
        ensemble_val.append((img_id, probs, val_masks_ref[img_id]))

    ensemble_best_threshold = 0.5
    ensemble_best_dice = -1.0
    for threshold in thresholds:
        # 앙상블도 단일 모델처럼 threshold sweep을 통해 최적 cutoff를 찾는다.
        dices = [
            dice_score(
                postprocess_mask((probs > threshold).astype(np.uint8), min_area=args.min_area, fill_holes=args.fill_holes),
                mask.astype(np.uint8),
            )
            for _, probs, mask in ensemble_val
        ]
        mean_dice = float(np.mean(dices))
        if mean_dice > ensemble_best_dice:
            ensemble_best_dice = mean_dice
            ensemble_best_threshold = threshold

    if not args.skip_infer:
        submission_rows = []
        for i, img_id in enumerate(pd.read_csv(test_csv)["img_id"].tolist()):
            probs = sum(test_prob_bank[name][i] for name in model_names) / len(model_names)
            mask = postprocess_mask((probs > ensemble_best_threshold).astype(np.uint8), min_area=args.min_area, fill_holes=args.fill_holes)
            rle = rle_encode(mask)
            # 예측 건물이 없으면 DACON 규칙에 맞춰 -1 처리한다.
            submission_rows.append({"img_id": img_id, "mask_rle": rle if rle else "-1"})

        pd.DataFrame(submission_rows).to_csv(args.output_dir / "submission.csv", index=False)
    summary = {
        "data_root": str(args.data_root),
        "device": str(device),
        "image_size": args.image_size,
        "test_image_size": args.test_image_size,
        "crop_size": args.crop_size,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "use_tta": args.use_tta,
        "min_area": args.min_area,
        "fill_holes": args.fill_holes,
        "loss_type": args.loss_type,
        "threshold_start": args.threshold_start,
        "threshold_end": args.threshold_end,
        "threshold_step": args.threshold_step,
        "init_checkpoint_dir": str(args.init_checkpoint_dir) if args.init_checkpoint_dir is not None else None,
        "eval_only": args.eval_only,
        "skip_infer": args.skip_infer,
        "train_limit": args.train_limit,
        "val_limit": args.val_limit,
        "test_limit": args.test_limit,
        "models": model_summaries,
        "ensemble_val_dice": ensemble_best_dice,
        "ensemble_threshold": ensemble_best_threshold,
    }
    (args.output_dir / "summary.json").write_text(json.dumps(summary, indent=2))
    print(args.output_dir / "summary.json")


if __name__ == "__main__":
    main()
