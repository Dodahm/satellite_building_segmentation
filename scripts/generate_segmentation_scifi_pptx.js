const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.PROJECT_ROOT || process.cwd();
const OUT_DIR = path.join(ROOT, "output", "portfolio");
const RUN_DIR = path.join(ROOT, "runs", "dacon_raw_patch_unetpp_v1");
const QUAL_DIR = path.join(RUN_DIR, "qualitative_results");
const PPTX_PATH = path.join(OUT_DIR, "segmentation_portfolio_scifi_holographic_example.pptx");

fs.mkdirSync(OUT_DIR, { recursive: true });

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "hamdodam";
pptx.subject = "Satellite Image Building Area Segmentation Portfolio";
pptx.title = "Segmentation Portfolio - SciFi Holographic Data";
pptx.company = "Personal Portfolio";
pptx.lang = "ko-KR";
pptx.theme = {
  headFontFace: "Space Mono",
  bodyFontFace: "Apple SD Gothic Neo",
  lang: "ko-KR",
};
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";

const C = {
  bg: "03050D",
  cyan: "00C8FF",
  cyanSoft: "7DE7FF",
  white: "E8FBFF",
  muted: "6FAEC0",
  grid: "0B2D3A",
  red: "FF4D6D",
};

const W = 13.333;
const H = 7.5;

function exists(p) {
  return fs.existsSync(p);
}

function addHud(slide, label = "SEGMENTATION SYSTEM") {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.bg }, line: { color: C.bg } });

  // Signature style 29: concentric cyan HUD rings, static scan line, top/bottom bars.
  [2.2, 1.55, 0.92].forEach((r, i) => {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: W - 3.2 - r / 2,
      y: 0.45 + (2.2 - r) / 2,
      w: r,
      h: r,
      fill: { color: C.bg, transparency: 100 },
      line: { color: C.cyan, transparency: 60 - i * 15, width: 1.1 },
      rotate: i === 1 ? 30 : 0,
    });
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: W - 3.2 - 0.05,
    y: 1.55,
    w: 0.1,
    h: 0.1,
    fill: { color: C.cyan, transparency: 0 },
    line: { color: C.cyan, transparency: 0 },
  });
  slide.addShape(pptx.ShapeType.line, { x: 0.55, y: 3.76, w: 12.1, h: 0, line: { color: C.cyan, transparency: 68, width: 0.8 } });
  slide.addShape(pptx.ShapeType.line, { x: 0.55, y: 0.35, w: 4.2, h: 0, line: { color: C.cyan, transparency: 40, width: 2.2 } });
  slide.addShape(pptx.ShapeType.line, { x: 8.55, y: 7.08, w: 4.2, h: 0, line: { color: C.cyan, transparency: 40, width: 2.2 } });
  slide.addText(label, {
    x: 0.55,
    y: 0.18,
    w: 4.8,
    h: 0.18,
    fontFace: "Space Mono",
    fontSize: 6.8,
    bold: true,
    color: C.cyan,
    charSpace: 2.5,
    transparency: 18,
  });
  slide.addText("RUN: DACON_RAW_PATCH_UNETPP_V1", {
    x: 8.75,
    y: 7.08,
    w: 4.0,
    h: 0.18,
    fontFace: "Space Mono",
    fontSize: 6.5,
    color: C.cyan,
    charSpace: 1.6,
    transparency: 28,
    align: "right",
  });
}

function title(slide, text, sub = "") {
  slide.addText(text, {
    x: 0.7,
    y: 0.72,
    w: 8.2,
    h: 0.6,
    fontFace: "Apple SD Gothic Neo",
    fontSize: 25,
    bold: true,
    color: C.white,
    margin: 0,
    breakLine: false,
  });
  if (sub) {
    slide.addText(sub, {
      x: 0.72,
      y: 1.33,
      w: 8.0,
      h: 0.35,
      fontFace: "Space Mono",
      fontSize: 8,
      color: C.cyan,
      transparency: 15,
      margin: 0,
    });
  }
}

function body(slide, lines, x = 0.82, y = 2.0, w = 5.0, h = 3.7) {
  slide.addText(lines.join("\n"), {
    x,
    y,
    w,
    h,
    fontFace: "Apple SD Gothic Neo",
    fontSize: 13,
    color: C.white,
    breakLine: false,
    fit: "shrink",
    margin: 0.05,
    paraSpaceAfterPt: 8,
  });
}

function label(slide, text, x, y, w = 2.0) {
  slide.addText(text, {
    x,
    y,
    w,
    h: 0.22,
    fontFace: "Space Mono",
    fontSize: 7.2,
    color: C.cyan,
    charSpace: 1.4,
    margin: 0,
    transparency: 10,
  });
}

function frame(slide, x, y, w, h, alpha = 35) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.cyan, transparency: alpha, width: 1.0 },
  });
  slide.addShape(pptx.ShapeType.line, { x, y, w: 0.45, h: 0, line: { color: C.cyan, transparency: 10, width: 2 } });
  slide.addShape(pptx.ShapeType.line, { x: x + w - 0.45, y: y + h, w: 0.45, h: 0, line: { color: C.cyan, transparency: 10, width: 2 } });
}

function kpi(slide, number, caption, x, y, w = 2.5) {
  frame(slide, x, y, w, 0.95, 50);
  slide.addText(number, { x: x + 0.12, y: y + 0.14, w: w - 0.24, h: 0.38, fontFace: "Space Mono", fontSize: 19, bold: true, color: C.cyan, margin: 0 });
  slide.addText(caption, { x: x + 0.12, y: y + 0.62, w: w - 0.24, h: 0.22, fontFace: "Space Mono", fontSize: 6.6, color: C.muted, margin: 0 });
}

function image(slide, imgPath, x, y, w, h) {
  if (exists(imgPath)) {
    frame(slide, x - 0.04, y - 0.04, w + 0.08, h + 0.08, 45);
    slide.addImage({ path: imgPath, x, y, w, h });
  } else {
    frame(slide, x, y, w, h, 45);
    slide.addText("IMAGE MISSING", { x: x + 0.1, y: y + h / 2 - 0.1, w: w - 0.2, h: 0.2, fontFace: "Space Mono", fontSize: 8, color: C.red, align: "center" });
  }
}

function node(slide, text, x, y, w, h = 0.56) {
  frame(slide, x, y, w, h, 48);
  slide.addText(text, { x: x + 0.1, y: y + 0.15, w: w - 0.2, h: h - 0.18, fontFace: "Apple SD Gothic Neo", fontSize: 10.5, color: C.white, align: "center", margin: 0 });
}

function arrow(slide, x1, y1, x2, y2) {
  slide.addShape(pptx.ShapeType.line, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color: C.cyan, transparency: 35, width: 1.4, beginArrowType: "none", endArrowType: "triangle" } });
}

function table(slide, rows, x, y, w, rowH = 0.45) {
  rows.forEach((r, i) => {
    const h = rowH;
    frame(slide, x, y + i * h, w, h, i === 0 ? 25 : 65);
    const colW = w / r.length;
    r.forEach((cell, j) => {
      slide.addText(cell, {
        x: x + j * colW + 0.07,
        y: y + i * h + 0.12,
        w: colW - 0.14,
        h: h - 0.1,
        fontFace: i === 0 ? "Space Mono" : "Apple SD Gothic Neo",
        fontSize: i === 0 ? 7.2 : 9.0,
        bold: i === 0,
        color: i === 0 ? C.cyan : C.white,
        fit: "shrink",
        margin: 0,
      });
    });
  });
}

function slideBase(section, heading, subtitle) {
  const s = pptx.addSlide();
  addHud(s, section);
  title(s, heading, subtitle);
  return s;
}

const chart = path.join(RUN_DIR, "epoch_1_10_results.png");
const contact = path.join(QUAL_DIR, "segmentation_validation_contact_sheet.png");
const panels = [
  "01_TRAIN_6344_segmentation.png",
  "02_TRAIN_6115_segmentation.png",
  "03_TRAIN_1002_segmentation.png",
  "04_TRAIN_2657_segmentation.png",
  "05_TRAIN_4311_segmentation.png",
  "06_TRAIN_1274_segmentation.png",
  "07_TRAIN_6013_segmentation.png",
  "08_TRAIN_0175_segmentation.png",
].map((f) => path.join(QUAL_DIR, f));

let s;

s = slideBase("PORTFOLIO / 00", "Satellite Image Building Area Segmentation", "DACON RAW HOLDOUT · UNET++ PATCH TRAINING · VAL DICE 0.7991");
kpi(s, "0.7991", "BEST VALIDATION DICE", 0.75, 5.85, 2.5);
kpi(s, "10", "EPOCHS COMPLETED", 3.45, 5.85, 2.0);
kpi(s, "0.30", "BEST THRESHOLD", 5.65, 5.85, 2.2);
image(s, panels[6], 7.3, 2.05, 5.25, 1.72);
body(s, ["위성영상에서 건물 영역을 분할하는 semantic segmentation 프로젝트", "RLE 기반 DACON 데이터 구조 재현", "224 resize 병목 분석 후 patch-based training으로 개선"], 0.78, 2.15, 5.8, 2.4);

s = slideBase("SYSTEM / 01", "Executive Summary", "WHAT THIS PROJECT PROVES");
kpi(s, "5712", "TRAIN SPLIT", 0.78, 2.0, 2.0);
kpi(s, "1428", "VALIDATION SPLIT", 3.0, 2.0, 2.1);
kpi(s, "60640", "TEST IMAGES", 5.35, 2.0, 2.2);
body(s, ["1. DACON 원본 이미지를 학습 가능한 holdout 구조로 재구성", "2. UNet++ 기반 patch 학습으로 validation Dice 0.7991 달성", "3. 정량 지표와 정성 예측 결과를 함께 포트폴리오화"], 0.82, 3.45, 6.1, 2.2);
image(s, chart, 7.4, 2.05, 5.0, 3.25);

s = slideBase("PROBLEM / 02", "Problem Definition", "SATELLITE IMAGE → BUILDING MASK");
node(s, "위성 원본 이미지", 0.9, 2.3, 2.4);
node(s, "Segmentation Model", 4.0, 2.3, 2.5);
node(s, "Binary Building Mask", 7.2, 2.3, 2.7);
arrow(s, 3.3, 2.58, 4.0, 2.58);
arrow(s, 6.5, 2.58, 7.2, 2.58);
body(s, ["목표는 픽셀 단위로 건물 영역을 분리하는 것", "난점은 작은 객체, 복잡한 경계, 배경 비율 불균형", "단순 모델 실행보다 데이터 표현과 검증 설계가 중요"], 0.95, 3.55, 8.8, 2.0);
kpi(s, "PIXEL", "LEVEL PREDICTION", 10.2, 2.35, 2.1);

s = slideBase("DATA / 03", "DACON Data Structure", "RAW DATA FORMAT");
table(s, [
  ["Item", "Description", "Portfolio Point"],
  ["train_img", "TRAIN_0000~7139, 1024x1024", "고해상도 학습 이미지"],
  ["test_img", "TEST_00000~60639, 224x224", "테스트 해상도 차이 존재"],
  ["train.csv", "img_id, img_path, mask_rle", "RLE decode 필요"],
  ["submission", "mask_rle, empty=-1", "후처리와 제출 규칙 필요"],
], 0.8, 2.0, 7.3, 0.62);
kpi(s, "7140", "RAW TRAIN", 8.65, 2.05, 1.9);
kpi(s, "1024", "TRAIN RESOLUTION", 10.75, 2.05, 2.0);
kpi(s, "224", "TEST RESOLUTION", 9.72, 3.25, 2.0);

s = slideBase("DATA / 04", "Holdout Validation Strategy", "REPRODUCIBLE SPLIT");
body(s, ["공식 Private score를 직접 볼 수 없는 상황에서 validation 체계를 먼저 고정", "원본 train.csv를 train 5712 / validation 1428로 분리", "모델 선택과 threshold는 validation Dice 기준으로 판단"], 0.85, 2.05, 5.5, 2.7);
node(s, "RAW train.csv", 7.0, 2.0, 1.9);
node(s, "train.csv 5712", 9.3, 1.55, 2.1);
node(s, "holdout_truth.csv 1428", 9.3, 2.75, 2.5);
arrow(s, 8.9, 2.27, 9.3, 1.83);
arrow(s, 8.9, 2.27, 9.3, 3.03);
kpi(s, "0.2", "VAL RATIO", 7.1, 4.25, 1.5);

s = slideBase("DATA / 05", "RLE Pipeline", "CSV → MASK → MODEL → RLE");
node(s, "mask_rle", 0.85, 2.4, 1.8);
node(s, "decode", 3.0, 2.4, 1.6);
node(s, "binary mask", 5.0, 2.4, 2.0);
node(s, "prediction", 7.45, 2.4, 2.0);
node(s, "encode / -1", 9.95, 2.4, 2.0);
[2.65, 4.6, 7.05, 9.55].forEach((x) => arrow(s, x, 2.68, x + 0.35, 2.68));
body(s, ["데이터 처리에서 중요한 부분은 이미지보다 CSV-RLE 구조", "정답 마스크 복원, 예측 마스크 재인코딩, 빈 마스크 -1 처리까지 end-to-end로 구성"], 0.85, 3.75, 8.9, 1.8);

s = slideBase("EDA / 06", "Why This Task Is Hard", "SMALL OBJECTS · BOUNDARY LOSS · IMBALANCE");
image(s, panels[7], 0.85, 2.0, 5.4, 1.76);
body(s, ["작은 건물은 resize 과정에서 경계가 쉽게 사라짐", "도로, 그림자, 밝은 지붕이 오탐을 유발", "배경 픽셀이 압도적으로 많아 loss 설계가 중요"], 7.0, 2.05, 4.6, 2.6);
kpi(s, "384", "PATCH CROP", 7.0, 5.4, 1.8);
kpi(s, "256", "MODEL INPUT", 9.05, 5.4, 1.8);

s = slideBase("BASELINE / 07", "Baseline Reproduction", "DACON NOTEBOOK LOGIC");
table(s, [
  ["Component", "Baseline", "Issue"],
  ["Model", "U-Net", "경계 복원 제한"],
  ["Input", "224 resize", "작은 건물 손실"],
  ["Loss", "BCE + Dice", "어려운 픽셀 집중 약함"],
  ["Metric", "Dice", "threshold 민감"],
], 0.85, 2.0, 6.7, 0.58);
body(s, ["초기 baseline은 비교 기준 확보가 목적", "성능 개선의 핵심은 baseline을 오래 돌리는 것이 아니라 병목을 찾는 것"], 8.1, 2.15, 4.0, 1.9);
kpi(s, "0.0", "RAW BASELINE EPOCH 1 HARD DICE", 8.2, 4.5, 3.2);

s = slideBase("BOTTLENECK / 08", "Baseline Bottleneck", "224 RESIZE LIMITATION");
body(s, ["원본 학습 이미지는 1024x1024지만 baseline 입력은 224x224", "전체 타일을 축소하면 얇은 경계와 작은 건물이 배경으로 흡수", "따라서 모델 변경보다 입력 표현을 먼저 바꾸는 것이 필요"], 0.85, 2.0, 5.5, 2.5);
node(s, "1024 tile", 7.1, 2.0, 1.7);
node(s, "224 resize", 9.3, 2.0, 1.8);
node(s, "boundary loss", 9.3, 3.25, 2.0);
arrow(s, 8.8, 2.28, 9.3, 2.28);
arrow(s, 10.2, 2.56, 10.2, 3.25);

s = slideBase("MODEL / 09", "Model Selection", "WHY U-NET++");
table(s, [
  ["Model", "Role", "Reason"],
  ["U-Net", "baseline", "구조가 단순하고 비교 기준 명확"],
  ["DeepLabV3+", "context", "넓은 문맥 반영"],
  ["UNet++", "final", "skip path 강화로 경계 복원에 유리"],
], 0.85, 2.0, 7.8, 0.72);
kpi(s, "UNet++", "FINAL MODEL", 9.3, 2.05, 2.4);
body(s, ["최종 모델은 건물 경계와 mask refinement가 중요한 과제 특성에 맞춰 UNet++로 선정"], 9.25, 3.35, 2.9, 1.4);

s = slideBase("CODE / 10", "Code Changes That Mattered", "WHAT WAS ADDED");
table(s, [
  ["Added Code", "Purpose", "Effect"],
  ["crop_size", "patch training", "해상도 손실 완화"],
  ["focal_dice", "hard pixel focus", "작은 건물 대응"],
  ["TTA", "prediction averaging", "방향 민감도 완화"],
  ["postprocess", "noise/hole fix", "마스크 품질 안정화"],
  ["resume", "long run stability", "중단 후 재개 가능"],
], 0.75, 1.95, 8.6, 0.55);
kpi(s, "5", "CORE PATCHES", 10.1, 2.0, 1.8);
kpi(s, "END", "TO END PIPELINE", 10.1, 3.15, 1.8);

s = slideBase("PATCH / 11", "Patch-Based Training", "384 CROP → 256 INPUT");
node(s, "1024x1024 tile", 0.9, 2.2, 2.1);
node(s, "384 crop", 3.6, 2.2, 1.8);
node(s, "256 input", 6.0, 2.2, 1.8);
node(s, "UNet++", 8.4, 2.2, 1.6);
node(s, "mask", 10.6, 2.2, 1.4);
[3.1, 5.5, 7.9, 10.1].forEach((x) => arrow(s, x, 2.48, x + 0.42, 2.48));
body(s, ["전체 이미지를 한 번에 줄이지 않고 건물 근처의 local detail을 보존", "proxy 실험과 raw holdout 모두에서 가장 큰 성능 개선 요인"], 0.9, 3.65, 7.8, 1.6);

s = slideBase("LOSS / 12", "Loss, TTA, Post-Processing", "FINAL BOOSTERS");
table(s, [
  ["Technique", "Why It Was Used"],
  ["Focal + Dice", "배경이 많은 이미지에서 작은 건물 픽셀 집중"],
  ["Flip TTA", "좌우/상하 방향성에 따른 예측 흔들림 감소"],
  ["Min-area filtering", "작은 점 형태의 오탐 제거"],
  ["Hole filling", "건물 내부 빈 영역 보정"],
  ["Threshold sweep", "고정 0.5 대신 validation 최적 cutoff 탐색"],
], 0.75, 1.95, 9.3, 0.58);
kpi(s, "0.30", "FINAL THRESHOLD", 10.45, 2.05, 2.0);

s = slideBase("CONFIG / 13", "Final Raw Training Config", "UNET++ PATCH V1");
table(s, [
  ["Parameter", "Value"],
  ["Model", "UNet++ / ResNet34 encoder"],
  ["Image size", "256"],
  ["Crop size", "384"],
  ["Loss", "Focal + Dice"],
  ["Epochs", "10"],
  ["TTA / postprocess", "flip TTA / min_area=16 / hole filling"],
], 0.9, 1.9, 6.1, 0.55);
kpi(s, "0.7991", "RAW HOLDOUT DICE", 7.8, 2.0, 2.5);
kpi(s, "10", "BEST EPOCH", 10.55, 2.0, 1.5);
kpi(s, "0.30", "THRESHOLD", 9.0, 3.3, 1.9);

s = slideBase("RESULT / 14", "Epoch 1-10 Training Curve", "RAW DACON HOLDOUT");
image(s, chart, 0.85, 1.72, 11.65, 5.4);

s = slideBase("RESULT / 15", "Epoch Table", "NUMERIC TRACE");
table(s, [
  ["Epoch", "Train Loss", "Val Dice", "Threshold"],
  ["1", "0.2172", "0.6935", "0.75"],
  ["2", "0.1685", "0.7430", "0.25"],
  ["3", "0.1532", "0.7529", "0.50"],
  ["4", "0.1447", "0.7568", "0.25"],
  ["5", "0.1362", "0.7669", "0.25"],
  ["6", "0.1320", "0.7705", "0.25"],
  ["7", "0.1247", "0.7872", "0.35"],
  ["8", "0.1224", "0.7929", "0.40"],
  ["9", "0.1153", "0.7956", "0.30"],
  ["10", "0.1157", "0.7991", "0.30"],
], 0.95, 1.55, 7.4, 0.43);
body(s, ["성능은 epoch 1 이후 꾸준히 상승", "epoch 10에서 최고 validation Dice 0.7991 기록", "learning rate는 cosine schedule로 후반부 수렴"], 9.0, 2.0, 3.2, 2.0);

s = slideBase("QUAL / 16", "Qualitative Validation Results", "SATELLITE / GT / PRED / OVERLAY");
image(s, contact, 0.75, 1.55, 11.9, 5.65);

s = slideBase("QUAL / 17", "Strong Case", "HIGH OVERLAP EXAMPLE");
image(s, panels[6], 0.75, 2.1, 7.2, 2.35);
kpi(s, "0.9181", "CROP DICE", 8.45, 2.1, 2.2);
body(s, ["건물 외곽선과 내부 영역이 안정적으로 맞음", "GT와 prediction이 대부분 겹쳐 정성 평가용 대표 이미지로 적합"], 8.45, 3.45, 3.7, 1.5);

s = slideBase("QUAL / 18", "Average Case", "BOUNDARY IS MOSTLY ALIGNED");
image(s, panels[3], 0.75, 2.1, 7.2, 2.35);
kpi(s, "0.7921", "CROP DICE", 8.45, 2.1, 2.2);
body(s, ["전반적인 건물 위치는 맞지만 일부 경계에서 오차 발생", "포트폴리오에서는 모델의 현실적인 성능을 보여주는 샘플로 사용"], 8.45, 3.45, 3.7, 1.5);

s = slideBase("QUAL / 19", "Failure Signal", "FALSE POSITIVE / BOUNDARY NOISE");
image(s, panels[5], 0.75, 2.1, 7.2, 2.35);
kpi(s, "0.6528", "CROP DICE", 8.45, 2.1, 2.2);
body(s, ["오탐과 경계 확장이 남아 있음", "추가 개선은 connected component tuning과 test-time postprocess 조정이 유효"], 8.45, 3.45, 3.7, 1.5);

s = slideBase("ISSUE / 20", "Inference Issue Found", "TEST IMAGE IS 224x224");
body(s, ["학습/검증은 384 crop 기반으로 완료", "하지만 DACON test 이미지는 224x224라서 동일 crop을 적용하면 CropSizeError 발생", "해결 방향은 train/val transform과 test transform을 분리하는 것"], 0.85, 2.05, 6.0, 2.4);
table(s, [
  ["Phase", "Transform"],
  ["Train/Val", "384 crop → 256 resize"],
  ["Test", "224 image → resize-only inference"],
], 7.4, 2.15, 4.4, 0.65);
kpi(s, "FIX", "SEPARATE INFERENCE TRANSFORM", 8.05, 4.55, 3.2);

s = slideBase("CLAIM / 21", "Safe Portfolio Claim", "WHAT CAN BE WRITTEN");
body(s, ["쓸 수 있는 표현", "원본 DACON 데이터를 holdout으로 분리해 UNet++ patch 학습을 10 epoch 수행했고, validation Dice 0.7991을 기록했다.", "", "피해야 할 표현", "공식 Private leaderboard 점수 0.7991이라고 쓰면 안 됨. 해당 수치는 holdout validation 기준이다."], 0.9, 1.9, 8.2, 3.6);
kpi(s, "RAW", "DACON DATA", 9.65, 2.0, 1.8);
kpi(s, "HOLDOUT", "VALIDATION SCORE", 9.65, 3.2, 2.1);

s = slideBase("EVAL / 22", "Evaluation Criteria Mapping", "MODEL · DATA · VALIDATION · APPLICABILITY");
table(s, [
  ["Criterion", "Evidence in Project"],
  ["모델 성능", "UNet++ patch 10 epoch, val Dice 0.7991"],
  ["데이터 분석", "RLE 구조, train/test 해상도 차이, holdout split"],
  ["모델 검증", "threshold sweep, epoch curve, qualitative validation"],
  ["알고리즘", "patch training, focal+dice, TTA, postprocess"],
  ["적용 가능성", "건물 지도 갱신, 재난 분석, 도시 변화 탐지"],
], 0.75, 1.9, 10.8, 0.62);

s = slideBase("ROLE / 23", "My Contribution", "END-TO-END EXPERIMENT DESIGN");
table(s, [
  ["Area", "Contribution"],
  ["Data", "원본 데이터 경로 정리, holdout split 생성"],
  ["Code", "RLE 처리, Dataset, patch transform, resume logic"],
  ["Model", "UNet++ 선택, focal+dice, TTA/postprocess 적용"],
  ["Evaluation", "epoch별 Dice 분석, 정성 결과 생성"],
  ["Documentation", "PPT/포트폴리오용 문장과 시각화 정리"],
], 0.85, 1.9, 8.6, 0.62);
kpi(s, "E2E", "PIPELINE OWNERSHIP", 10.0, 2.2, 2.2);

s = slideBase("ROADMAP / 24", "Next Improvement Roadmap", "FROM 0.7991 TO STABLE 0.8+");
table(s, [
  ["Next Step", "Expected Gain"],
  ["test transform 분리", "submission 생성 가능"],
  ["epoch 12~15 재실험", "0.8+ 안정화 가능성"],
  ["U-Net / DeepLabV3+ patch long-run", "앙상블 후보 확보"],
  ["seed/fold validation", "점수 신뢰도 강화"],
  ["component threshold tuning", "오탐 감소"],
], 0.85, 1.9, 9.2, 0.62);
kpi(s, "0.8+", "TARGET BAND", 10.35, 2.1, 1.8);

s = slideBase("PRESENT / 25", "One-Minute Explanation", "INTERVIEW SCRIPT");
body(s, ["이 프로젝트는 DACON 위성영상 건물 분할 문제를 원본 데이터 기준으로 재현하고, 성능 병목을 분석해 개선한 실험입니다. 초기 baseline은 224 resize 구조라 작은 건물 경계가 손실되는 문제가 있었습니다. 그래서 384 crop 기반 patch training으로 전환했고, UNet++와 Focal+Dice, TTA, 후처리를 적용했습니다. 최종적으로 10 epoch 학습에서 holdout validation Dice 0.7991을 기록했으며, 정량 결과와 함께 예측 마스크 시각화까지 정리했습니다."], 0.95, 1.85, 10.7, 3.1);

s = slideBase("APPENDIX / 26", "Code References", "FILES TO OPEN IN VS CODE");
table(s, [
  ["File", "Purpose"],
  ["prepare_dacon_raw_holdout.py", "원본 DACON train.csv를 train/holdout/test 구조로 변환"],
  ["train_segmentation_pipeline.py", "UNet++ patch 학습, TTA, postprocess, resume"],
  ["run_raw_patch_until_complete.sh", "epoch 10 자동 재개 러너"],
  ["epoch_1_10_results.png", "학습 성능 그래프"],
  ["qualitative_results/*.png", "정성 예측 결과"],
], 0.75, 1.9, 10.7, 0.58);

s = slideBase("OUTRO / 27", "Final Takeaway", "FROM BASELINE REPRODUCTION TO ENGINEERED RESULT");
body(s, ["핵심 성과는 단순히 모델을 돌린 것이 아니라, 데이터 구조와 해상도 병목을 분석하고 코드 수준의 개선으로 성능을 끌어올린 과정입니다.", "이 프로젝트는 데이터 이해, 모델링, 검증 설계, 에러 분석, 결과 시각화까지 AI/데이터 직무에서 필요한 실험 설계 역량을 보여줍니다."], 0.9, 2.1, 8.0, 2.2);
kpi(s, "0.7991", "FINAL RAW HOLDOUT DICE", 9.2, 2.1, 2.6);
kpi(s, "28", "SLIDES UNDER 40", 9.2, 3.35, 2.6);

pptx.writeFile({ fileName: PPTX_PATH });
console.log(PPTX_PATH);
