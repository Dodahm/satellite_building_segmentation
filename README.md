# Satellite Image Building Area Segmentation

위성 이미지에서 건물 영역을 픽셀 단위로 분할하고, 예측 mask를 DACON 제출 형식인 RLE로 변환하는 segmentation 프로젝트입니다.

이 저장소는 **데이터 구조 이해 -> baseline U-Net -> UNet++ 개선 모델 -> holdout validation -> threshold tuning -> 제출 파일 생성**까지 이어지는 핵심 학습 코드를 정리합니다.

## Key Results

| 구분 | 값 | 설명 |
|---|---:|---|
| Baseline | 자체 검증 기준 | U-Net 기반 기본 segmentation pipeline |
| UNet++ 10 epoch | Holdout Dice 0.7998 | DACON train split으로 구성한 내부 holdout validation |
| UNet++ fine-tuning | Holdout Dice 0.8007 | 기존 best weight에서 낮은 learning rate로 추가 검증 |
| Official Private Score | 미확인 | 공식 제출 서버에서만 확인 가능 |

위 수치는 공식 Private Leaderboard 점수가 아니라 내부 validation 결과입니다. 모델 가중치와 원본 데이터는 저장소에 포함하지 않습니다.

## What This Project Shows

| 역량 | 프로젝트에서 확인할 수 있는 내용 |
|---|---|
| 데이터 이해 | `train.csv`, `test.csv`, `sample_submission.csv`, RLE mask 구조 분석 |
| 모델링 | U-Net baseline과 UNet++ 기반 개선 모델 구현 |
| 실험 설계 | holdout split, Dice metric, threshold sweep, TTA 적용 |
| 성능 개선 | loss 변경, crop 기반 학습, 후처리, threshold 최적화 |
| 제출 파이프라인 | 예측 mask를 RLE로 변환해 `submission.csv` 생성 |

## Repository Structure

```text
.
├── README.md
├── requirements.txt
├── projects/
│   ├── dacon_segmentation_baseline/
│   │   ├── eda.py
│   │   ├── train.py
│   │   ├── infer.py
│   │   ├── prepare_dacon_raw_data.py
│   │   └── src/
│   │       ├── dataset.py
│   │       ├── model.py
│   │       └── utils.py
│   └── dacon_segmentation_pipeline/
│       ├── prepare_dacon_raw_holdout.py
│       ├── train_segmentation_pipeline.py
│       └── run_training_until_complete.sh
└── .gitignore
```

## Data

공식 대회 데이터는 저장소에 포함하지 않습니다. 아래와 같은 구조로 로컬에 배치한 뒤 실행합니다.

```text
data/
└── dacon_236092_raw/
    ├── train_img/
    │   ├── TRAIN_0000.png
    │   └── ...
    ├── test_img/
    │   ├── TEST_00000.png
    │   └── ...
    ├── train.csv
    ├── test.csv
    └── sample_submission.csv
```

`data/`, `runs/`, model weight, 압축파일은 Git에 포함하지 않도록 제외했습니다.

## Environment

```bash
python -m venv tmp/spacevenv
source tmp/spacevenv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Baseline U-Net

기본 U-Net 학습 코드는 `projects/dacon_segmentation_baseline`에 있습니다.

```bash
python projects/dacon_segmentation_baseline/train.py \
  --data-root data/dacon_236092_raw \
  --image-size 224 \
  --epochs 20 \
  --batch-size 8 \
  --lr 1e-3 \
  --val-ratio 0.2 \
  --threshold 0.5 \
  --output-dir runs/unet_baseline
```

제출 파일 생성:

```bash
python projects/dacon_segmentation_baseline/infer.py \
  --data-root data/dacon_236092_raw \
  --checkpoint runs/unet_baseline/best.pt \
  --image-size 224 \
  --batch-size 16 \
  --threshold 0.5 \
  --output-csv runs/unet_baseline/submission.csv
```

## Improved UNet++ Pipeline

먼저 DACON `train.csv`를 학습/검증용 holdout 구조로 나눕니다.

```bash
python projects/dacon_segmentation_pipeline/prepare_dacon_raw_holdout.py \
  --data-root data/dacon_236092_raw \
  --output-root data/dacon_236092_holdout \
  --val-ratio 0.2 \
  --seed 42
```

UNet++ 기반 최종 학습:

```bash
python projects/dacon_segmentation_pipeline/train_segmentation_pipeline.py \
  --data-root data/dacon_236092_holdout \
  --output-dir runs/dacon_unetpp_v1 \
  --epochs 10 \
  --batch-size 8 \
  --image-size 256 \
  --crop-size 384 \
  --lr 3e-4 \
  --models unetplusplus \
  --use-tta \
  --min-area 16 \
  --fill-holes \
  --loss-type focal_dice
```

기존 best weight에서 낮은 learning rate로 추가 fine-tuning:

```bash
python projects/dacon_segmentation_pipeline/train_segmentation_pipeline.py \
  --data-root data/dacon_236092_holdout \
  --output-dir runs/dacon_unetpp_finetune \
  --epochs 1 \
  --batch-size 16 \
  --image-size 256 \
  --crop-size 384 \
  --lr 3e-5 \
  --models unetplusplus \
  --init-checkpoint-dir runs/dacon_unetpp_v1 \
  --use-tta \
  --min-area 16 \
  --fill-holes \
  --loss-type focal_dice \
  --threshold-start 0.20 \
  --threshold-end 0.50 \
  --threshold-step 0.01
```

학습이 중간에 멈춘 경우:

```bash
zsh projects/dacon_segmentation_pipeline/run_training_until_complete.sh
```

## Core Pipeline

```text
CSV metadata
    ↓
RLE decode
    ↓
image / mask dataset
    ↓
crop + resize + augmentation
    ↓
UNet++ training
    ↓
Dice validation + threshold sweep
    ↓
TTA + post-processing
    ↓
RLE encode
    ↓
submission.csv
```

## Notes

- 공식 데이터와 외부 데이터셋은 각 제공처의 이용 규정을 따르며, 이 저장소에는 포함하지 않습니다.
- 내부 validation 결과와 공식 Private Leaderboard 점수는 다릅니다.
- 이 저장소는 포트폴리오용 산출물 생성 코드가 아니라, 학습 재현에 필요한 핵심 segmentation 코드만 포함합니다.
