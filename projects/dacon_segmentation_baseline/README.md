# Dacon Satellite Building Segmentation Baseline

이 폴더는 DACON `위성 이미지 건물 영역 분할` 대회를 빠르게 시작하기 위한 최소 베이스라인입니다.

포함 내용:
- U-Net 기반 세그멘테이션 모델
- `train.csv`의 `mask_rle` 디코딩
- 제출용 RLE 인코딩
- 학습, 검증, 제출 CSV 생성까지 이어지는 단일 파이프라인

중요:
- 공식 대회 데이터는 포함되어 있지 않습니다.
- 이 코드는 실전 시작용 뼈대이며, 점수 경쟁용 최적화 버전은 아닙니다.

## 1. 데이터 배치

권장 표준 경로:

```text
data/dacon_236092_raw
```

이 경로를 기준으로 실행하는 방식을 권장합니다.

원본 데이터가 어디에 다운로드되었는지 확인하거나 symlink를 준비하려면 아래 스크립트를 먼저 실행하면 됩니다.

```bash
python prepare_dacon_raw_data.py
```

또는 원본 데이터를 이미 찾은 경우:

```bash
python prepare_dacon_raw_data.py --source-dir /absolute/path/to/downloaded/dacon/data
```

아래 구조로 데이터를 두면 됩니다.

```text
data/dacon_236092_raw/
  train_img/
    TRAIN_0000.png
    ...
  test_img/
    TEST_00000.png
    ...
  train.csv
  test.csv
  sample_submission.csv
```

이 베이스라인은 다음 컬럼을 가정합니다.
- `train.csv`: `img_id`, `img_path`, `mask_rle`
- `test.csv`: `img_id`, `img_path`
- `sample_submission.csv`: `img_id`, `mask_rle`

## 2. 환경 설치

Python 3.9 이상을 권장합니다.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r ../../requirements.txt
```

## 3. 먼저 학습 돌리기

가장 먼저 아래 명령으로 베이스라인을 한 번 끝까지 돌려보세요.

```bash
python train.py \
  --data-root ../../data/dacon_236092_raw \
  --image-size 224 \
  --epochs 20 \
  --batch-size 8 \
  --lr 1e-3 \
  --val-ratio 0.2 \
  --threshold 0.5 \
  --output-dir runs/unet_baseline
```

학습 결과물:
- `runs/unet_baseline/best.pt`
- `runs/unet_baseline/history.csv`
- `runs/unet_baseline/config.json`
- `runs/unet_baseline/summary.json`

설명:
- 학습 이미지는 지정한 `image_size`로 리사이즈됩니다.
- 손실은 `BCEWithLogitsLoss + soft Dice loss` 입니다.
- 검증 점수는 임계값을 적용한 `hard Dice`로 저장됩니다.

## EDA

대회 규정에 맞춘 `train` 중심 EDA 스크립트도 포함되어 있습니다.

```bash
python eda.py \
  --data-root ../../data/dacon_236092_raw \
  --output-dir runs/eda \
  --num-samples 12
```

산출물:
- `runs/eda/summary.json`
- `runs/eda/train_mask_stats.csv`
- `runs/eda/building_ratio_buckets.csv`
- `runs/eda/sample_overlays/*.png`

이 스크립트는 아래 항목을 점검합니다.
- train/test CSV 컬럼 및 중복 여부
- 학습/테스트 이미지 해상도 차이
- 건물 면적 비율 분포
- 빈 마스크 여부
- 시각 샘플 오버레이

주의:
- 규정상 외부 데이터 사용 없이 `train` 중심으로 해석해야 합니다.
- `test`는 형식과 해상도 확인 정도로만 사용하고, 분포 맞춤 튜닝 근거로 쓰지 않는 것이 안전합니다.

## 4. 제출 파일 만들기

학습이 끝나면 최고 성능 체크포인트로 제출 파일을 생성합니다.

```bash
python infer.py \
  --data-root ../../data/dacon_236092_raw \
  --checkpoint runs/unet_baseline/best.pt \
  --image-size 224 \
  --batch-size 16 \
  --threshold 0.5 \
  --output-csv runs/unet_baseline/submission.csv
```

이 스크립트는:
- 테스트 이미지를 추론용 크기로 리사이즈해서 예측하고
- 예측 마스크를 각 이미지의 원래 해상도로 다시 복원한 뒤
- `sample_submission.csv` 형식에 맞춰 `submission.csv`를 만듭니다.

건물이 없다고 판단되면 `mask_rle`는 자동으로 `-1`로 저장됩니다.

## 5. 처음 점수 올릴 때 추천 순서

1. 현재 베이스라인을 먼저 끝까지 실행합니다.
2. `history.csv`에서 `val_dice`가 제대로 올라가는지 확인합니다.
3. 제출을 1회 해보고 로컬 검증과 리더보드 차이를 기록합니다.
4. 그 다음부터 아래 항목을 하나씩 바꿉니다.

추천 개선 순서:
- 입력 크기 `224 -> 320 -> 512`
- 모델 `U-Net -> pretrained encoder 모델`
- threshold 튜닝 `0.3 ~ 0.7`
- augmentation 추가
- K-fold 검증

## 6. 주의할 규칙

규정 기준으로 특히 먼저 챙길 것:
- 외부 데이터 사용 금지
- 공개된 논문 기반 사전학습 모델 사용 가능
- 테스트셋이 포함된 사전학습 모델 사용 금지
- 리더보드의 Public 점수만 보고 과도하게 튜닝하지 않기

## 파일 설명

- `train.py`: 학습 및 검증
- `infer.py`: 체크포인트로 제출 CSV 생성
- `src/dataset.py`: 이미지, 마스크 로딩
- `src/model.py`: U-Net 정의
- `src/utils.py`: RLE, Dice, 시드, 유틸 함수

## 참고 링크

- [Rules](https://dacon.io/en/competitions/official/236092/overview/rules)
- [Description](https://dacon.io/en/competitions/official/236092/overview/description)
- [Data](https://dacon.io/en/competitions/official/236092/data)
