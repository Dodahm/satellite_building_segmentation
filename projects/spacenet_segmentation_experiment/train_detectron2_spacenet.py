from __future__ import annotations

import argparse
import json
from pathlib import Path

from detectron2 import model_zoo
from detectron2.config import get_cfg
from detectron2.data.datasets import register_coco_instances
from detectron2.engine import DefaultTrainer
from detectron2.evaluation import COCOEvaluator


class Trainer(DefaultTrainer):
    @classmethod
    def build_evaluator(cls, cfg, dataset_name, output_folder=None):
        output_folder = output_folder or str(Path(cfg.OUTPUT_DIR) / "inference")
        return COCOEvaluator(dataset_name, cfg, False, output_folder)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train-json", type=Path, required=True)
    parser.add_argument("--val-json", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--max-iter", type=int, default=300)
    parser.add_argument("--base-lr", type=float, default=0.00025)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--eval-period", type=int, default=100)
    parser.add_argument("--checkpoint-period", type=int, default=100)
    parser.add_argument("--min-size", type=int, default=512)
    parser.add_argument("--max-size", type=int, default=512)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    train_name = "spacenet_train"
    val_name = "spacenet_val"

    register_coco_instances(train_name, {}, str(args.train_json), "")
    register_coco_instances(val_name, {}, str(args.val_json), "")

    cfg = get_cfg()
    cfg.merge_from_file(model_zoo.get_config_file("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml"))
    cfg.DATASETS.TRAIN = (train_name,)
    cfg.DATASETS.TEST = (val_name,)
    cfg.DATALOADER.NUM_WORKERS = args.num_workers
    cfg.MODEL.WEIGHTS = model_zoo.get_checkpoint_url("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml")
    cfg.SOLVER.IMS_PER_BATCH = args.batch_size
    cfg.SOLVER.BASE_LR = args.base_lr
    cfg.SOLVER.MAX_ITER = args.max_iter
    cfg.SOLVER.STEPS = []
    cfg.SOLVER.CHECKPOINT_PERIOD = args.checkpoint_period
    cfg.MODEL.ROI_HEADS.BATCH_SIZE_PER_IMAGE = 64
    cfg.MODEL.ROI_HEADS.NUM_CLASSES = 1
    cfg.MODEL.DEVICE = "cpu"
    cfg.TEST.EVAL_PERIOD = args.eval_period
    cfg.INPUT.MIN_SIZE_TRAIN = (args.min_size,)
    cfg.INPUT.MAX_SIZE_TRAIN = args.max_size
    cfg.INPUT.MIN_SIZE_TEST = args.min_size
    cfg.INPUT.MAX_SIZE_TEST = args.max_size
    cfg.OUTPUT_DIR = str(args.output_dir)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    (args.output_dir / "config_summary.json").write_text(
        json.dumps(
            {
                "train_json": str(args.train_json),
                "val_json": str(args.val_json),
                "max_iter": args.max_iter,
                "base_lr": args.base_lr,
                "batch_size": args.batch_size,
                "num_workers": args.num_workers,
                "eval_period": args.eval_period,
                "checkpoint_period": args.checkpoint_period,
                "min_size": args.min_size,
                "max_size": args.max_size,
                "model": "mask_rcnn_R_50_FPN_3x",
                "device": "cpu",
            },
            indent=2,
        )
    )

    trainer = Trainer(cfg)
    trainer.resume_or_load(resume=False)
    trainer.train()


if __name__ == "__main__":
    main()
