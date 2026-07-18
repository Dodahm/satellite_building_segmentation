# Satellite Image Building Area Segmentation

위성 이미지에서 건물 영역을 픽셀 단위로 분할하고, 예측 mask를 RLE 제출 형식으로 변환하는 AI/데이터 포트폴리오 프로젝트.

이 저장소는 데이터 이해, baseline 구축, UNet++ 기반 개선, validation 설계, threshold sweep, TTA, 후처리, 제출 파일 생성까지 이어지는 end-to-end segmentation pipeline을 정리.

## Key Results

| 구분 | 값 | 해석 |
|---|---:|---|
| Raw holdout Dice | 0.7998 | DACON train split 기반 내부 검증 |
| Proxy patch Dice | 0.8013 | patch 기반 대체 검증 실험 |
| Official Private Score | 미확인 | DACON 제출 서버에서만 확인 가능 |

주의: 위 수치는 공식 Private Leaderboard 점수가 아니라 내부 validation 결과.

## Project Structure

```text
.
├── projects/
│   ├── dacon_segmentation_pipeline/
│   │   ├── prepare_dacon_raw_holdout.py
│   │   ├── train_segmentation_pipeline.py
│   │   ├── run_raw_patch_until_complete.sh
│   │   └── run_dacon_rule_compliant_080_final.sh
│   ├── dacon_segmentation_baseline/
│   │   ├── train.py
│   │   ├── infer.py
│   │   └── src/
│   └── spacenet_segmentation_experiment/
│       ├── train_detectron2_spacenet.py
│       └── train_spacenet_smp.py
├── scripts/
│   ├── watch_detectron2_ap_metrics.py
│   ├── export_segmentation_visual_asset_pack.py
│   └── generate_*_pptx.js
├── .vscode/
└── VSCODE_RUN_DEBUG.md
```

## Main Pipeline

```text
train.csv / test.csv
        ↓
RLE decode / image loading
        ↓
Dataset + crop / resize / normalize
        ↓
UNet++ ResNet34 encoder
        ↓
Focal + Dice loss training
        ↓
Validation Dice + threshold sweep
        ↓
TTA + post-processing
        ↓
RLE encode + submission.csv
```

## Data

공식 대회 데이터와 SpaceNet 원본 데이터는 저장소에 포함 되지 않음.

권장 데이터 배치:

```text
data/
├── dacon_236092_raw/
│   ├── train_img/
│   ├── test_img/
│   ├── train.csv
│   ├── test.csv
│   └── sample_submission.csv
└── dacon_236092_patch_ready/
    ├── train.csv
    ├── holdout_truth.csv
    ├── test.csv
    └── sample_submission.csv
```

`data/`, `runs/`, model weights는 `.gitignore`로 제외.

## Environment

Python 3.9 이상을 권장.

```bash
python -m venv tmp/spacevenv
source tmp/spacevenv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements-main.txt
```

Detectron2 보조 실험은 별도 설치가 필요.

## Reproduce Holdout Split

```bash
python projects/dacon_segmentation_pipeline/prepare_dacon_raw_holdout.py \
  --data-root data/dacon_236092_raw \
  --output-root data/dacon_236092_patch_ready \
  --val-ratio 0.2 \
  --seed 42
```

## Train Final Segmentation Pipeline

```bash
python projects/dacon_segmentation_pipeline/train_segmentation_pipeline.py \
  --data-root data/dacon_236092_patch_ready \
  --output-dir runs/dacon_raw_patch_unetpp_v1 \
  --epochs 10 \
  --batch-size 8 \
  --image-size 256 \
  --crop-size 384 \
  --lr 3e-4 \
  --models unetplusplus \
  --use-tta \
  --min-area 16 \
  --fill-holes \
  --loss-type focal_dice \
  --skip-infer
```

## Run Rule-Compliant Fine-Tuning Check

```bash
bash projects/dacon_segmentation_pipeline/run_dacon_rule_compliant_080_final.sh
```

## Check Detectron2 AP Metrics

```bash
python scripts/watch_detectron2_ap_metrics.py \
  --metrics runs/detectron2_spacenet_full_khartoum/metrics.json
```

## VS Code

VS Code 실행과 디버깅 방법은 `VSCODE_RUN_DEBUG.md`에 정리.

주요 디버깅 포인트:

| 모듈 | 확인할 내용 |
|---|---|
| `SatelliteDataset.__getitem__` | CSV row가 image/mask tensor로 변환되는 과정 |
| `build_transforms` | crop, resize, augmentation 적용 순서 |
| `make_model` | UNet++ 모델 생성 |
| `evaluate_model` | threshold sweep과 Dice 계산 |
| `postprocess_mask` | min-area filtering과 hole filling |

## Portfolio Notes

이 프로젝트는 최종 점수만 강조하지 않고, 아래 역량이 드러나도록 정리.

| 역량 | 프로젝트 근거 |
|---|---|
| 데이터 이해 | CSV, RLE, mask, submission 구조 분석 |
| 모델링 | U-Net baseline에서 UNet++ ResNet34 encoder 기반 모델로 개선 |
| 실험 설계 | holdout split, threshold sweep, TTA, 후처리 비교 |
| 결과 해석 | 성공/실패 사례와 hard case 분석 |
| 적용 가능성 | RLE 제출 파일 생성까지 end-to-end 구현 |

## License and Data Notice


