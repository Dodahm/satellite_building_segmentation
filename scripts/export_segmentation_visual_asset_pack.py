from __future__ import annotations

import csv
import json
import math
import os
import shutil
from collections import defaultdict
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(os.environ.get("PROJECT_ROOT", Path.cwd())).resolve()
OUT = Path(os.environ.get("PORTFOLIO_OUTPUT_DIR", ROOT / "output" / "portfolio")) / "segmentation_visual_asset_pack"

RAW_RUN = ROOT / "runs/dacon_raw_patch_unetpp_v1"
RAW_QUAL = RAW_RUN / "qualitative_results"
FINETUNE_RUN = ROOT / "runs/dacon_raw_patch_unetpp_finetune_v3_e1"
PROXY_RUN = ROOT / "runs/dacon_proxy_patch_v4"
SPACENET_RUN = ROOT / "runs/spacenet_smp_resnet34"
DETECTION_RUN = ROOT / "runs/detectron2_spacenet_full_khartoum"
DETECTION_DATA = ROOT / "data/spacenet_detectron2_full_khartoum"

FONT_REG = Path(os.environ.get("FONT_REGULAR", Path.home() / "Library/Fonts/NanumGothic.otf"))
FONT_BOLD = Path(os.environ.get("FONT_BOLD", Path.home() / "Library/Fonts/NanumGothicBold.otf"))
FONT_MONO = Path("/System/Library/Fonts/Menlo.ttc")

C = {
    "bg": "#FFFFFF",
    "black": "#111111",
    "gray": "#444444",
    "light": "#DDDDDD",
    "pale": "#F4F4F4",
    "red": "#E8000D",
    "green": "#00A650",
    "blue": "#2563EB",
    "orange": "#F97316",
}


def mkdirs() -> dict[str, Path]:
    dirs = {
        "overview": OUT / "01_overview",
        "seg": OUT / "02_segmentation_results",
        "det": OUT / "03_detection_results",
        "curve": OUT / "04_training_curves",
        "check": OUT / "05_visual_checkpoints",
        "source": OUT / "06_source_reference",
    }
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)
    return dirs


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    fallback = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
    try:
        return ImageFont.truetype(str(path if path.exists() else fallback), size)
    except Exception:
        return ImageFont.truetype(fallback, size)


F = {
    "title": font(FONT_BOLD, 42),
    "h1": font(FONT_BOLD, 30),
    "h2": font(FONT_BOLD, 23),
    "body": font(FONT_REG, 20),
    "small": font(FONT_REG, 16),
    "tiny": font(FONT_REG, 13),
    "mono": font(FONT_MONO, 17),
}


def copy_if_exists(src: Path, dst: Path) -> bool:
    if src.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        return True
    return False


def load_json_lines(path: Path) -> list[dict]:
    rows = []
    if not path.exists():
        return rows
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return rows


def swiss_canvas(title: str, subtitle: str = "", size=(1600, 900)) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", size, C["bg"])
    d = ImageDraw.Draw(im)
    w, h = size
    d.rectangle([0, 0, 18, h], fill=C["red"])
    d.text((70, 58), title, fill=C["black"], font=F["title"])
    if subtitle:
        d.text((74, 115), subtitle, fill=C["gray"], font=F["small"])
    d.line([70, 150, w - 70, 150], fill=C["light"], width=2)
    d.ellipse([w - 145, h - 112, w - 85, h - 52], outline=C["red"], width=3)
    return im, d


def fit_image(src: Image.Image, box: tuple[int, int], fill=(255, 255, 255)) -> Image.Image:
    src = src.convert("RGB")
    canvas = Image.new("RGB", box, fill)
    scale = min(box[0] / src.width, box[1] / src.height)
    nw, nh = int(src.width * scale), int(src.height * scale)
    resized = src.resize((nw, nh), Image.LANCZOS)
    canvas.paste(resized, ((box[0] - nw) // 2, (box[1] - nh) // 2))
    return canvas


def draw_label(d: ImageDraw.ImageDraw, xy, text: str, fill=C["black"], bg=None):
    x, y = xy
    bbox = d.textbbox((x, y), text, font=F["small"])
    if bg:
        d.rectangle([bbox[0] - 8, bbox[1] - 5, bbox[2] + 8, bbox[3] + 5], fill=bg)
    d.text((x, y), text, fill=fill, font=F["small"])


def build_overview_asset(dirs: dict[str, Path]):
    im, d = swiss_canvas(
        "Visual Asset Map",
        "포트폴리오에 넣을 이미지 묶음: 데이터 이해, segmentation, detection, 성능 변화, 점검 타이밍",
    )
    items = [
        ("01", "Data / RLE", "파일 구조, CSV, mask-RLE 변환"),
        ("02", "Segmentation", "원본·정답·예측·겹침 비교"),
        ("03", "Detection", "GT polygon과 예측 bbox/score"),
        ("04", "Training Curve", "epoch별 Dice, loss, threshold"),
        ("05", "Visual QA", "학습 중 언제 이미지를 확인할지"),
    ]
    x0, y0 = 95, 230
    card_w, card_h, gap = 270, 250, 26
    for i, (num, title, desc) in enumerate(items):
        x = x0 + i * (card_w + gap)
        d.rectangle([x, y0, x + card_w, y0 + card_h], outline=C["black"], width=3, fill=C["pale"] if i % 2 else C["bg"])
        d.text((x + 24, y0 + 24), num, fill=C["red"], font=F["h1"])
        d.text((x + 24, y0 + 78), title, fill=C["black"], font=F["h2"])
        # Manual line break keeps the text readable in exported PNG.
        words = desc.split(", ")
        d.text((x + 24, y0 + 132), "\n".join(words), fill=C["gray"], font=F["small"], spacing=8)
    d.text((95, 560), "사용 방식", fill=C["black"], font=F["h1"])
    bullets = [
        "PPT 본문에는 contact sheet와 성능 그래프를 크게 배치",
        "발표 Q&A 대비용으로 개별 성공/실패 사례 이미지를 appendix에 배치",
        "공식 점수와 내부 validation 이미지는 분리해서 표기",
    ]
    for i, b in enumerate(bullets):
        d.text((115, 625 + i * 42), f"- {b}", fill=C["gray"], font=F["body"])
    im.save(dirs["overview"] / "00_visual_asset_map.png")


def build_segmentation_assets(dirs: dict[str, Path]):
    # Copy ready-made validation outputs.
    copy_if_exists(RAW_QUAL / "segmentation_validation_contact_sheet.png", dirs["seg"] / "01_dacon_segmentation_validation_contact_sheet.png")
    copy_if_exists(RAW_QUAL / "segmentation_validation_slideshow.gif", dirs["seg"] / "02_dacon_segmentation_validation_slideshow.gif")
    copy_if_exists(RAW_RUN / "epoch_1_10_results.png", dirs["curve"] / "01_raw_epoch_1_10_result.png")
    copy_if_exists(RAW_RUN / "epoch_1_10_results_dark_academia.png", dirs["curve"] / "02_raw_epoch_1_10_result_dark.png")
    copy_if_exists(FINETUNE_RUN / "portfolio_assets/swiss_validation_dice_trajectory.png", dirs["curve"] / "03_latest_validation_dice_trajectory.png")
    copy_if_exists(FINETUNE_RUN / "portfolio_assets/swiss_score_lift_bar.png", dirs["curve"] / "04_score_lift_bar.png")

    for p in sorted(RAW_QUAL.glob("*_segmentation.png")):
        copy_if_exists(p, dirs["seg"] / f"case_{p.name}")

    # Build a compact case board using selected qualitative examples.
    selected = [
        ("Strong case", RAW_QUAL / "07_TRAIN_6013_segmentation.png"),
        ("Clear buildings", RAW_QUAL / "02_TRAIN_6115_segmentation.png"),
        ("Sparse object", RAW_QUAL / "03_TRAIN_1002_segmentation.png"),
        ("Failure / shadow", RAW_QUAL / "06_TRAIN_1274_segmentation.png"),
    ]
    im, d = swiss_canvas(
        "Segmentation Qualitative Board",
        "초록=Ground Truth, 빨강=Prediction. 성공/애매/실패 사례를 함께 보여주면 결과 해석력이 드러난다.",
        size=(1800, 1200),
    )
    card_w, card_h = 800, 405
    positions = [(80, 210), (930, 210), (80, 700), (930, 700)]
    for (label, path), (x, y) in zip(selected, positions):
        d.text((x, y - 34), label, fill=C["red"] if "Failure" in label else C["black"], font=F["h2"])
        d.rectangle([x, y, x + card_w, y + card_h], outline=C["light"], width=2, fill=C["pale"])
        if path.exists():
            src = Image.open(path)
            fitted = fit_image(src, (card_w, card_h), fill=(255, 255, 255))
            im.paste(fitted, (x, y))
    im.save(dirs["seg"] / "03_segmentation_success_failure_board.png")

    # SpaceNet sample comparison from the substitute experiment.
    spacenet_paths = sorted((SPACENET_RUN / "qualitative").glob("*_img.png"))[:4]
    if spacenet_paths:
        im, d = swiss_canvas(
            "SpaceNet Segmentation Samples",
            "대체 공개 데이터셋에서 원본·정답·예측을 함께 확인한 qualitative result",
            size=(1800, 1120),
        )
        x0, y0 = 90, 210
        panel_w, panel_h = 240, 240
        row_gap = 205
        for row, img_path in enumerate(spacenet_paths[:4]):
            stem = img_path.name.replace("_img.png", "")
            gt_path = img_path.with_name(stem + "_gt.png")
            pred_path = img_path.with_name(stem + "_pred.png")
            d.text((x0, y0 + row * row_gap - 26), stem, fill=C["black"], font=F["small"])
            for col, (label, path) in enumerate([("Image", img_path), ("GT", gt_path), ("Prediction", pred_path)]):
                x = x0 + col * 300
                y = y0 + row * row_gap
                d.text((x, y - 20), label, fill=C["gray"], font=F["tiny"])
                if path.exists():
                    im.paste(fit_image(Image.open(path), (panel_w, panel_h)), (x, y))
        im.save(dirs["seg"] / "04_spacenet_segmentation_sample_board.png")


def build_training_curves(dirs: dict[str, Path]):
    raw = pd.read_csv(RAW_RUN / "unetplusplus_history.csv")
    proxy = pd.read_csv(PROXY_RUN / "unetplusplus_history.csv") if (PROXY_RUN / "unetplusplus_history.csv").exists() else pd.DataFrame()
    fine = pd.read_csv(FINETUNE_RUN / "unetplusplus_history.csv") if (FINETUNE_RUN / "unetplusplus_history.csv").exists() else pd.DataFrame()

    plt.rcParams["font.family"] = "AppleGothic"
    fig, axes = plt.subplots(2, 2, figsize=(16, 10), dpi=160)
    fig.patch.set_facecolor("white")

    ax = axes[0, 0]
    ax.plot(raw["epoch"], raw["val_dice"], marker="o", linewidth=3, color=C["blue"], label="Raw holdout")
    if not proxy.empty:
        ax.plot(proxy["epoch"], proxy["val_dice"], marker="s", linewidth=2.5, color=C["orange"], label="Proxy patch")
    if not fine.empty:
        ax.scatter([10.7], [float(fine["val_dice"].iloc[-1])], s=140, color=C["red"], label="Fine-tune check")
    ax.set_title("Validation Dice 변화", fontsize=16, fontweight="bold")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Dice")
    ax.grid(True, alpha=0.35)
    ax.legend()

    ax = axes[0, 1]
    ax.plot(raw["epoch"], raw["train_loss"], marker="o", linewidth=3, color=C["green"], label="Raw train loss")
    if not proxy.empty:
        ax.plot(proxy["epoch"], proxy["train_loss"], marker="s", linewidth=2.5, color=C["orange"], label="Proxy train loss")
    ax.set_title("Train Loss 감소", fontsize=16, fontweight="bold")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Loss")
    ax.grid(True, alpha=0.35)
    ax.legend()

    ax = axes[1, 0]
    ax.plot(raw["epoch"], raw["best_threshold_epoch"], marker="o", linewidth=3, color=C["red"], label="Raw threshold")
    if not proxy.empty:
        ax.plot(proxy["epoch"], proxy["best_threshold_epoch"], marker="s", linewidth=2.5, color=C["gray"], label="Proxy threshold")
    ax.set_title("Best Threshold 변화", fontsize=16, fontweight="bold")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Threshold")
    ax.set_ylim(0.15, 0.8)
    ax.grid(True, alpha=0.35)
    ax.legend()

    ax = axes[1, 1]
    milestones = [
        ("Baseline/debug", 0.5000),
        ("Proxy ensemble", 0.6898),
        ("Patch v3", 0.7561),
        ("Patch v4 best", 0.8013),
        ("Raw holdout e10", 0.7991),
        ("Fine-tune check", 0.7998),
    ]
    names = [m[0] for m in milestones]
    vals = [m[1] for m in milestones]
    colors = [C["gray"], C["orange"], C["orange"], C["red"], C["blue"], C["blue"]]
    ax.barh(names, vals, color=colors)
    for i, v in enumerate(vals):
        ax.text(v + 0.006, i, f"{v:.4f}", va="center", fontsize=10)
    ax.set_xlim(0.45, 0.84)
    ax.set_title("실험 단계별 최고 Dice", fontsize=16, fontweight="bold")
    ax.grid(axis="x", alpha=0.28)

    fig.suptitle("Training Performance Evolution", fontsize=24, fontweight="bold", y=0.985)
    fig.tight_layout(rect=[0, 0, 1, 0.95])
    fig.savefig(dirs["curve"] / "05_training_performance_evolution.png", bbox_inches="tight")
    plt.close(fig)


def build_detection_metric_curve(dirs: dict[str, Path]):
    rows = load_json_lines(DETECTION_RUN / "metrics.json")
    if not rows:
        return
    train_rows = [r for r in rows if "iteration" in r and any(k.startswith("loss") for k in r)]
    eval_rows = [r for r in rows if "bbox/AP" in r or "segm/AP" in r]
    if not train_rows:
        return

    it = [r["iteration"] for r in train_rows]
    loss_keys = ["loss_cls", "loss_box_reg", "loss_mask", "loss_rpn_cls", "loss_rpn_loc"]
    total_loss = [sum(float(r.get(k, 0)) for k in loss_keys) for r in train_rows]
    mask_loss = [float(r.get("loss_mask", np.nan)) for r in train_rows]
    cls_acc = [float(r.get("fast_rcnn/cls_accuracy", np.nan)) for r in train_rows]

    plt.rcParams["font.family"] = "AppleGothic"
    fig, axes = plt.subplots(1, 3, figsize=(18, 5.8), dpi=160)
    fig.patch.set_facecolor("white")

    axes[0].plot(it, total_loss, color=C["red"], marker="o", linewidth=2.5)
    axes[0].set_title("Total Detection Loss", fontweight="bold")
    axes[0].set_xlabel("Iteration")
    axes[0].set_ylabel("Loss")
    axes[0].grid(alpha=0.3)

    axes[1].plot(it, mask_loss, color=C["blue"], marker="o", linewidth=2.5)
    axes[1].set_title("Mask Loss", fontweight="bold")
    axes[1].set_xlabel("Iteration")
    axes[1].grid(alpha=0.3)

    axes[2].plot(it, cls_acc, color=C["green"], marker="o", linewidth=2.5, label="cls accuracy")
    if eval_rows:
        eval_it = [r.get("iteration", train_rows[min(len(train_rows) - 1, idx)].get("iteration")) for idx, r in enumerate(eval_rows)]
        bbox_ap = [r.get("bbox/AP") for r in eval_rows if "bbox/AP" in r]
        segm_ap = [r.get("segm/AP") for r in eval_rows if "segm/AP" in r]
        # AP is reported in percent-like COCO points, so normalize for a compact dual story.
        if bbox_ap:
            axes[2].scatter([eval_it[-1]], [bbox_ap[-1] / 100], color=C["red"], s=110, label=f"bbox AP {bbox_ap[-1]:.2f}")
        if segm_ap:
            axes[2].scatter([eval_it[-1]], [segm_ap[-1] / 100], color=C["orange"], s=110, label=f"segm AP {segm_ap[-1]:.2f}")
    axes[2].set_title("Classification Accuracy / AP Marker", fontweight="bold")
    axes[2].set_xlabel("Iteration")
    axes[2].grid(alpha=0.3)
    axes[2].legend(fontsize=9)

    fig.suptitle("Detectron2 Training Metrics", fontsize=23, fontweight="bold")
    fig.tight_layout(rect=[0, 0, 1, 0.92])
    fig.savefig(dirs["det"] / "01_detectron2_training_metrics.png", bbox_inches="tight")
    plt.close(fig)


def draw_polygon(draw: ImageDraw.ImageDraw, points: list[float], color: str, width=3):
    xy = [(points[i], points[i + 1]) for i in range(0, len(points), 2)]
    if len(xy) >= 2:
        draw.line(xy + [xy[0]], fill=color, width=width)


def build_detection_visuals(dirs: dict[str, Path]):
    val_path = DETECTION_DATA / "val_coco.json"
    pred_path = DETECTION_RUN / "inference/coco_instances_results.json"
    if not val_path.exists() or not pred_path.exists():
        return
    val = json.loads(val_path.read_text())
    preds = json.loads(pred_path.read_text())
    images = {img["id"]: img for img in val["images"]}
    gts = defaultdict(list)
    for ann in val["annotations"]:
        gts[ann["image_id"]].append(ann)
    by_img = defaultdict(list)
    for pred in preds:
        by_img[pred["image_id"]].append(pred)

    candidates = []
    for image_id, rows in by_img.items():
        if image_id not in images:
            continue
        high = [r for r in rows if r.get("score", 0) >= 0.5]
        if high:
            candidates.append((max(r["score"] for r in high), len(high), image_id))
    candidates = sorted(candidates, reverse=True)[:6]

    contact = Image.new("RGB", (1800, 1340), "white")
    d = ImageDraw.Draw(contact)
    d.rectangle([0, 0, 18, 1340], fill=C["red"])
    d.text((70, 48), "Detectron2 Detection Visual Check", fill=C["black"], font=F["title"])
    d.text((74, 104), "GT polygon=green, prediction bbox=red. Detection branch is used as a complementary instance-level experiment.", fill=C["gray"], font=F["small"])
    d.line([70, 140, 1730, 140], fill=C["light"], width=2)

    panel_w, panel_h = 250, 250
    col_x = [95, 405, 715]
    row_y = [205, 555, 905]
    sheet_cases = candidates[:3]
    for row_idx, (_, _, image_id) in enumerate(sheet_cases):
        img_info = images[image_id]
        img_path = Path(img_info["file_name"])
        if not img_path.exists():
            continue
        base = Image.open(img_path).convert("RGB")
        gt_img = base.copy()
        gt_draw = ImageDraw.Draw(gt_img)
        for ann in gts.get(image_id, [])[:80]:
            for seg in ann.get("segmentation", []):
                draw_polygon(gt_draw, seg, C["green"], 3)
        pred_img = base.copy()
        pred_draw = ImageDraw.Draw(pred_img)
        for pred in sorted(by_img[image_id], key=lambda r: r.get("score", 0), reverse=True)[:20]:
            if pred.get("score", 0) < 0.45:
                continue
            x, y, w, h = pred["bbox"]
            pred_draw.rectangle([x, y, x + w, y + h], outline=C["red"], width=4)
            pred_draw.text((x, max(0, y - 18)), f"{pred['score']:.2f}", fill=C["red"], font=F["tiny"])

        panels = [("Satellite", base), ("GT polygon", gt_img), ("Prediction bbox", pred_img)]
        y = row_y[row_idx]
        d.text((95, y - 34), image_id, fill=C["black"], font=F["h2"])
        for col_idx, (label, panel) in enumerate(panels):
            x = col_x[col_idx]
            d.text((x, y - 18), label, fill=C["gray"], font=F["tiny"])
            contact.paste(fit_image(panel, (panel_w, panel_h)), (x, y))

        # Save individual wide case.
        individual = Image.new("RGB", (1150, 430), "white")
        idraw = ImageDraw.Draw(individual)
        idraw.text((30, 25), f"Detection Case: {image_id}", fill=C["black"], font=F["h1"])
        for col_idx, (label, panel) in enumerate(panels):
            x = 35 + col_idx * 365
            idraw.text((x, 78), label, fill=C["gray"], font=F["small"])
            individual.paste(fit_image(panel, (330, 330)), (x, 105))
        individual.save(dirs["det"] / f"case_{row_idx + 1:02d}_{image_id}.png")

    # Right-side note area on contact sheet.
    x_note = 1050
    d.text((x_note, 225), "읽는 방법", fill=C["black"], font=F["h1"])
    notes = [
        "초록 윤곽: 정답 건물 polygon",
        "빨간 박스: Detectron2 예측 bbox",
        "숫자: 예측 confidence score",
        "segmentation과 달리 객체 단위 검출 품질을 확인",
        "작은 건물·붙어있는 건물에서 오탐/미탐 발생 가능",
    ]
    for i, note in enumerate(notes):
        d.text((x_note, 295 + i * 43), f"- {note}", fill=C["gray"], font=F["body"])
    contact.save(dirs["det"] / "02_detectron2_prediction_contact_sheet.png")


def build_visual_checkpoint_timeline(dirs: dict[str, Path]):
    im, d = swiss_canvas(
        "When To Check Images During Training",
        "학습 숫자만 보지 않고, 아래 타이밍마다 이미지를 확인해야 성능 개선 이유를 설명할 수 있다.",
        size=(1800, 1180),
    )
    steps = [
        ("01", "EDA sample", "원본 이미지 밝기, 해상도, 건물 밀도 확인"),
        ("02", "RLE decode sanity", "CSV의 RLE가 실제 mask와 맞게 복원되는지 확인"),
        ("03", "Crop / augmentation", "patch crop이 건물 경계를 과도하게 자르지 않는지 확인"),
        ("04", "Epoch 1", "모델이 배경만 예측하거나 전체를 건물로 예측하지 않는지 확인"),
        ("05", "Mid epoch 3-5", "loss는 줄지만 Dice가 정체되는지, 오탐이 늘어나는지 확인"),
        ("06", "Best checkpoint", "GT와 prediction overlap을 성공/실패 사례로 분리"),
        ("07", "Threshold sweep", "threshold 변화에 따른 FP/FN trade-off 확인"),
        ("08", "Post-processing", "작은 잡음 제거, hole filling 후 경계가 망가지지 않는지 확인"),
        ("09", "Detection branch", "GT polygon과 prediction bbox/score를 비교"),
        ("10", "Final board", "포트폴리오용 strong/average/failure case 정리"),
    ]
    x_left, x_right = 110, 910
    y0, gap = 205, 88
    for idx, (num, title, desc) in enumerate(steps):
        col = 0 if idx < 5 else 1
        x = x_left if col == 0 else x_right
        y = y0 + (idx % 5) * gap
        d.rectangle([x, y, x + 670, y + 62], outline=C["black"], width=2, fill=C["pale"] if idx % 2 else C["bg"])
        d.rectangle([x, y, x + 76, y + 62], fill=C["red"], outline=C["red"])
        d.text((x + 22, y + 15), num, fill=C["bg"], font=F["h2"])
        d.text((x + 98, y + 10), title, fill=C["black"], font=F["h2"])
        d.text((x + 98, y + 38), desc, fill=C["gray"], font=F["small"])
        if idx % 5 < 4:
            d.line([x + 38, y + 64, x + 38, y + gap - 8], fill=C["red"], width=3)
    d.text((110, 740), "포트폴리오 활용 팁", fill=C["black"], font=F["h1"])
    tips = [
        "각 단계에서 이미지를 본 이유를 한 문장으로 붙이면 실험 설계력이 보인다.",
        "성능 수치가 약한 구간도 실패 사례 분석 이미지가 있으면 문제 해결 과정으로 설명할 수 있다.",
        "최종 결과는 숫자 하나보다 strong/average/failure case를 함께 보여주는 편이 설득력 있다.",
    ]
    for i, tip in enumerate(tips):
        d.text((130, 805 + i * 44), f"- {tip}", fill=C["gray"], font=F["body"])
    im.save(dirs["check"] / "01_visual_check_timeline.png")


def copy_reference_explainers(dirs: dict[str, Path]):
    src_dir = Path(os.environ.get("PORTFOLIO_OUTPUT_DIR", ROOT / "output" / "portfolio"))
    for name in [
        "dataset_inventory_explainer.png",
        "csv_structure_explainer.png",
        "mask_rle_explainer.png",
    ]:
        copy_if_exists(src_dir / name, dirs["source"] / name)


def write_index(dirs: dict[str, Path]):
    files = sorted([p for p in OUT.rglob("*") if p.is_file()])
    lines = [
        "# Segmentation Project Visual Asset Pack",
        "",
        "이 폴더는 포트폴리오/PPT에 바로 넣을 수 있도록 이미지 자료를 주제별로 정리한 결과물입니다.",
        "",
        "## 추천 사용 순서",
        "",
        "1. `01_overview/00_visual_asset_map.png`로 전체 시각자료 구성을 설명합니다.",
        "2. `06_source_reference`의 데이터 구조 이미지를 사용해 데이터 이해도를 보여줍니다.",
        "3. `02_segmentation_results`의 contact sheet와 성공/실패 보드를 사용해 segmentation 결과를 설명합니다.",
        "4. `04_training_curves`의 성능 변화 그래프로 epoch별 개선 과정을 설명합니다.",
        "5. `03_detection_results`의 Detectron2 이미지는 보조 실험 또는 instance-level 분석 자료로 사용합니다.",
        "6. `05_visual_checkpoints`는 학습 중 언제 이미지를 확인했는지 설명하는 진행 절차 슬라이드에 사용합니다.",
        "",
        "## 생성 파일 목록",
        "",
    ]
    for p in files:
        rel = p.relative_to(OUT)
        lines.append(f"- `{rel}`")
    (OUT / "README_visual_assets.md").write_text("\n".join(lines), encoding="utf-8")


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    dirs = mkdirs()
    build_overview_asset(dirs)
    copy_reference_explainers(dirs)
    build_segmentation_assets(dirs)
    build_training_curves(dirs)
    build_detection_metric_curve(dirs)
    build_detection_visuals(dirs)
    build_visual_checkpoint_timeline(dirs)
    write_index(dirs)
    print(OUT)


if __name__ == "__main__":
    main()
