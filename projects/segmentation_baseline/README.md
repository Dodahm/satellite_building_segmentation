# Satellite Building Segmentation Baseline

위성 이미지 건물 영역 분할 시작용 최소 baseline

포함 내용:
- U-Net 기반 segmentation 모델
- `train.csv`의 `mask_rle` 디코딩
- 예측 mask의 RLE 인코딩
- 학습, 검증, inference CSV 생성까지 이어지는 단일 파이프라인

중요:
- 저장소 포함 범위: 코드와 문서
- 원본 이미지와 CSV 제외
- 코드 성격: 실험 시작용 기본 구조

## 1. 데이터 배치

권장 표준 경로

```text
data/satellite_raw
```

원본 데이터 위치 확인 또는 symlink 준비

```bash
python prepare_raw_data.py
```

원본 데이터 경로 직접 지정

```bash
python prepare_raw_data.py --source-dir /absolute/path/to/downloaded/satellite/data
```

필요 데이터 구조

```text
data/satellite_raw/
  train_img/
    TRAIN_0000.png
    ...
  test_img/
    TEST_00000.png
    ...
  train.csv
  test.csv
  prediction_template.csv
```

가정 컬럼

| 파일 | 컬럼 |
|---|---|
| `train.csv` | `img_id`, `img_path`, `mask_rle` |
| `test.csv` | `img_id`, `img_path` |
| `prediction_template.csv` | `img_id`, `mask_rle` |

## 2. 환경 설치

Python 3.9 이상 권장

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r ../../requirements.txt
```

## 3. 학습

기본 학습 실행

```bash
python train.py \
  --data-root ../../data/satellite_raw \
  --image-size 224 \
  --epochs 20 \
  --batch-size 8 \
  --lr 1e-3 \
  --val-ratio 0.2 \
  --threshold 0.5 \
  --output-dir runs/unet_baseline
```

학습 결과물

| 파일 | 역할 |
|---|---|
| `runs/unet_baseline/best.pt` | 최고 validation Dice checkpoint |
| `runs/unet_baseline/history.csv` | epoch별 loss와 Dice 기록 |
| `runs/unet_baseline/config.json` | 학습 설정 |
| `runs/unet_baseline/summary.json` | 최고 성능 요약 |

설명

- 학습 이미지: 지정한 `image_size`로 resize
- 손실 함수: `BCEWithLogitsLoss + soft Dice loss`
- 검증 점수: threshold 적용 후 `hard Dice`로 저장

## 4. EDA

`train` 중심 데이터 점검 스크립트

```bash
python eda.py \
  --data-root ../../data/satellite_raw \
  --output-dir runs/eda \
  --num-samples 12
```

산출물

| 파일 | 역할 |
|---|---|
| `runs/eda/summary.json` | CSV, 이미지 크기, mask 분포 요약 |
| `runs/eda/train_mask_stats.csv` | 이미지별 건물 면적 통계 |
| `runs/eda/building_ratio_buckets.csv` | 건물 비율 구간별 분포 |
| `runs/eda/sample_overlays/*.png` | 이미지와 mask overlay 샘플 |

점검 항목

- train/test CSV 컬럼 및 중복 여부
- 학습/테스트 이미지 해상도 차이
- 건물 면적 비율 분포
- 빈 마스크 여부
- 시각 샘플 overlay

## 5. Inference CSV 생성

학습 후 최고 성능 checkpoint 기반 inference CSV 생성

```bash
python infer.py \
  --data-root ../../data/satellite_raw \
  --checkpoint runs/unet_baseline/best.pt \
  --image-size 224 \
  --batch-size 16 \
  --threshold 0.5 \
  --output-csv runs/unet_baseline/predictions.csv
```

처리 흐름

- 테스트 이미지 추론 크기로 resize
- 예측 mask 원래 해상도로 복원
- prediction template과 같은 컬럼 구조로 저장
- 예측 건물이 없는 경우 `mask_rle` 값 `-1`

## 6. 개선 순서

추천 실험 순서

1. baseline 학습 완료
2. `history.csv`의 `val_dice` 변화 확인
3. 입력 크기 변경: `224 -> 320 -> 512`
4. 모델 변경: `U-Net -> pretrained encoder 모델`
5. threshold tuning: `0.3 ~ 0.7`
6. augmentation 추가
7. K-fold validation 검토

## File Roles

| 파일 | 역할 |
|---|---|
| `train.py` | 학습 및 검증 |
| `infer.py` | checkpoint 기반 inference CSV 생성 |
| `eda.py` | 데이터 구조와 mask 분포 점검 |
| `prepare_raw_data.py` | 원본 데이터 경로 탐색 및 표준 경로 연결 |
| `src/dataset.py` | 이미지, 마스크 로딩 |
| `src/model.py` | U-Net 정의 |
| `src/utils.py` | RLE, Dice, seed, 공통 유틸 |
