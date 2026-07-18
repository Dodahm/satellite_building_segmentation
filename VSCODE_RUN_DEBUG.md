# VS Code Run and Debug Guide

이 문서는 DACON 위성영상 건물 분할 프로젝트를 VS Code에서 수정, 실행, 디버깅하기 위한 안내서다.

## 1. Open Project

터미널에서 프로젝트 루트로 이동한 뒤 아래 명령을 실행하면 현재 workspace가 VS Code로 열린다.

```bash
code .
```

## 2. Main Files

| File | Role |
|---|---|
| `projects/dacon_segmentation_pipeline/prepare_dacon_raw_holdout.py` | DACON 원본 train.csv를 train/holdout으로 분리 |
| `projects/dacon_segmentation_pipeline/train_segmentation_pipeline.py` | UNet++ patch training, validation, TTA, 후처리, resume |
| `projects/dacon_segmentation_pipeline/run_raw_patch_until_complete.sh` | epoch 10까지 자동 재개 실행 |
| `projects/dacon_segmentation_baseline/train.py` | baseline U-Net 학습 |
| `scripts/generate_segmentation_scifi_pptx.js` | 포트폴리오 PPTX 생성 |

## 3. Debug Configurations

VS Code 왼쪽 `Run and Debug` 탭에서 아래 구성을 선택할 수 있다.

| Debug Name | Purpose |
|---|---|
| `Debug UNet++ Patch Training (small sample)` | 16개 train, 8개 validation 샘플만 사용해 빠르게 디버깅 |
| `Debug Holdout Split` | 원본 DACON CSV를 holdout 구조로 변환하는 코드 디버깅 |
| `Debug Baseline U-Net (small run)` | baseline U-Net 코드 흐름 확인 |

가장 먼저 볼 디버그 구성은 `Debug UNet++ Patch Training (small sample)`이다. 전체 학습을 돌리지 않고 Dataset, transform, model forward, loss, validation 흐름을 빠르게 확인할 수 있다.

## 4. Useful Tasks

VS Code에서 `Terminal -> Run Task...`를 열면 아래 task를 실행할 수 있다.

| Task | Purpose |
|---|---|
| `Prepare DACON holdout split` | 원본 데이터를 학습/검증 구조로 다시 생성 |
| `Run final UNet++ patch training to epoch 10` | 최종 patch 학습 실행 |
| `Watch UNet++ training log` | `live.log` 실시간 확인 |
| `Watch auto-runner log` | 자동 재개 러너 로그 확인 |
| `Generate SciFi portfolio PPTX` | 포트폴리오 PPTX 재생성 |
| `Check Python syntax` | 주요 Python 파일 문법 검사 |

## 5. Breakpoint Suggestions

아래 위치에 breakpoint를 걸면 학습 흐름을 이해하기 쉽다.

| File | Function | What To Inspect |
|---|---|---|
| `train_segmentation_pipeline.py` | `SatelliteDataset.__getitem__` | CSV 한 줄이 이미지/mask tensor로 바뀌는 과정 |
| `train_segmentation_pipeline.py` | `build_transforms` | crop, resize, augmentation 적용 순서 |
| `train_segmentation_pipeline.py` | `make_model` | UNet++ 모델 생성 |
| `train_segmentation_pipeline.py` | training loop | logits, loss, optimizer step |
| `train_segmentation_pipeline.py` | `evaluate_model` | threshold sweep과 Dice 계산 |
| `train_segmentation_pipeline.py` | `postprocess_mask` | min-area filtering, hole filling |

## 6. Final Result Files

| File | Meaning |
|---|---|
| `runs/dacon_raw_patch_unetpp_v1/unetplusplus_history.csv` | epoch 1~10 성능 기록 |
| `runs/dacon_raw_patch_unetpp_v1/unetplusplus_best.pt` | best validation checkpoint |
| `runs/dacon_raw_patch_unetpp_v1/epoch_1_10_results.png` | 학습 곡선 이미지 |
| `runs/dacon_raw_patch_unetpp_v1/qualitative_results/segmentation_validation_contact_sheet.png` | 정성 결과 이미지 |
| `output/portfolio/segmentation_portfolio_scifi_holographic_example.pptx` | 포트폴리오 예시 PPTX |

## 7. Notes

- `0.7991`은 공식 DACON Private 점수가 아니라 raw DACON train 데이터를 분리한 holdout validation 점수다.
- 최종 학습은 `384 crop -> 256 input`을 사용한다.
- DACON test 이미지는 `224x224`라 test inference에는 crop을 적용하지 않는다.
- 빠른 디버깅은 `--train-limit`, `--val-limit` 옵션을 사용한다.
