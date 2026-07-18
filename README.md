# Satellite Image Building Area Segmentation

위성 이미지 건물 영역 pixel-level segmentation 및 RLE 기반 prediction CSV 생성

저장소 범위: **데이터 구조 이해 -> baseline U-Net -> UNet++ 개선 모델 -> holdout validation -> threshold tuning -> inference CSV 생성** 핵심 학습 코드

## Key Results

| 구분 | 값 | 설명 |
|---|---:|---|
| Baseline | 자체 검증 기준 | U-Net 기반 기본 segmentation pipeline |
| UNet++ 10 epoch | Holdout Dice 0.7998 | train split 기반 내부 holdout validation |
| UNet++ fine-tuning | Holdout Dice 0.8007 | 기존 best weight에서 낮은 learning rate로 추가 검증 |

수치 기준: 내부 validation / 모델 가중치와 원본 데이터 제외

## What This Project Shows

| 역량 | 프로젝트에서 확인 가능한 내용 |
|---|---|
| 데이터 이해 | `train.csv`, `test.csv`, prediction template, RLE mask 구조 분석 |
| 모델링 | U-Net baseline과 UNet++ 기반 개선 모델 구현 |
| 실험 설계 | holdout split, Dice metric, threshold sweep, TTA 적용 |
| 성능 개선 | loss 변경, crop 기반 학습, 후처리, threshold 최적화 |
| 추론 파이프라인 | 예측 mask를 RLE로 변환해 `predictions.csv` 생성 |

## Repository Structure

```text
.
├── README.md
├── requirements.txt
├── projects/
│   ├── segmentation_baseline/
│   │   ├── eda.py
│   │   ├── train.py
│   │   ├── infer.py
│   │   ├── prepare_raw_data.py
│   │   └── src/
│   │       ├── dataset.py
│   │       ├── model.py
│   │       └── utils.py
│   └── segmentation_pipeline/
│       ├── prepare_holdout_split.py
│       ├── train_segmentation_pipeline.py
│       └── run_training_until_complete.sh
└── .gitignore
```

## Data

저장소 포함 범위: 코드와 문서 / 원본 이미지와 CSV 제외

```text
data/
└── satellite_raw/
    ├── train_img/
    │   ├── TRAIN_0000.png
    │   └── ...
    ├── test_img/
    │   ├── TEST_00000.png
    │   └── ...
    ├── train.csv
    ├── test.csv
    └── prediction_template.csv
```

Git 제외 대상: `data/`, `runs/`, model weight, 압축파일

## Environment

```bash
python -m venv tmp/spacevenv
source tmp/spacevenv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Baseline U-Net

기본 U-Net 학습 코드: `projects/segmentation_baseline`

```bash
python projects/segmentation_baseline/train.py \
  --data-root data/satellite_raw \
  --image-size 224 \
  --epochs 20 \
  --batch-size 8 \
  --lr 1e-3 \
  --val-ratio 0.2 \
  --threshold 0.5 \
  --output-dir runs/unet_baseline
```

추론 CSV 생성

```bash
python projects/segmentation_baseline/infer.py \
  --data-root data/satellite_raw \
  --checkpoint runs/unet_baseline/best.pt \
  --image-size 224 \
  --batch-size 16 \
  --threshold 0.5 \
  --output-csv runs/unet_baseline/predictions.csv
```

## Improved UNet++ Pipeline

Holdout split 생성

```bash
python projects/segmentation_pipeline/prepare_holdout_split.py \
  --data-root data/satellite_raw \
  --output-root data/satellite_holdout \
  --val-ratio 0.2 \
  --seed 42
```

UNet++ 기반 학습

```bash
python projects/segmentation_pipeline/train_segmentation_pipeline.py \
  --data-root data/satellite_holdout \
  --output-dir runs/unetpp_v1 \
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

기존 best weight 기반 낮은 learning rate fine-tuning

```bash
python projects/segmentation_pipeline/train_segmentation_pipeline.py \
  --data-root data/satellite_holdout \
  --output-dir runs/unetpp_finetune \
  --epochs 1 \
  --batch-size 16 \
  --image-size 256 \
  --crop-size 384 \
  --lr 3e-5 \
  --models unetplusplus \
  --init-checkpoint-dir runs/unetpp_v1 \
  --use-tta \
  --min-area 16 \
  --fill-holes \
  --loss-type focal_dice \
  --threshold-start 0.20 \
  --threshold-end 0.50 \
  --threshold-step 0.01
```

학습 중단 시 자동 재개

```bash
zsh projects/segmentation_pipeline/run_training_until_complete.sh
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
predictions.csv
```

## Notes

- 원본 데이터와 외부 데이터셋: 제공처 이용 규정 준수
- 내부 validation 결과와 외부 평가 점수: 별개
- 저장소 목적: 학습 재현에 필요한 핵심 segmentation 코드 정리
