# SpaceNet Sample Segmentation Experiment

Small-scale building segmentation experiment using the official SpaceNet 2 building sample dataset.

This experiment is designed as a practical substitute project for a DACON-style satellite building segmentation portfolio entry.

## Data source

Official SpaceNet sample download:

```bash
curl -L https://spacenet-dataset.s3.amazonaws.com/spacenet/SN2_buildings/train/tarballs/SN2_buildings_train_sample.tar.gz -o SN2_buildings_train_sample.tar.gz
```

The sample contains:
- 4 AOIs: Vegas, Paris, Shanghai, Khartoum
- 10 RGB pansharpened tiles per AOI
- building polygons in GeoJSON and pixel-space WKT summaries

## Environment

```bash
/usr/bin/python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Workflow

1. Prepare RGB previews and binary masks from SpaceNet sample data.
2. Train a compact U-Net on the generated dataset.
3. Evaluate validation Dice and save qualitative predictions.

## Commands

```bash
python prepare_spacenet_sample.py \
  --source-root /absolute/path/to/data/spacenet_sample/SpaceNet_Buildings_Competition_Round2_Sample \
  --output-root /absolute/path/to/data/spacenet_prepared

python train_spacenet_unet.py \
  --data-root /absolute/path/to/data/spacenet_prepared \
  --output-dir /absolute/path/to/runs/spacenet_unet \
  --epochs 20 \
  --batch-size 4 \
  --image-size 256
```
