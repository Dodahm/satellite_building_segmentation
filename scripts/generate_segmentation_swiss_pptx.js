const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.PROJECT_ROOT || process.cwd();
const OUT_DIR = path.join(ROOT, "output", "portfolio");
const RUN_DIR = path.join(ROOT, "runs", "dacon_raw_patch_unetpp_v1");
const FINAL_DIR = path.join(ROOT, "runs", "dacon_raw_patch_unetpp_finetune_v3_e1");
const ASSET_DIR = path.join(FINAL_DIR, "portfolio_assets");
const QUAL_DIR = path.join(RUN_DIR, "qualitative_results");
const PPTX_PATH = path.join(OUT_DIR, "segmentation_portfolio_swiss_international.pptx");
const SAFE_ASSET_DIR = "/tmp/swiss_portfolio_assets";

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(SAFE_ASSET_DIR, { recursive: true });

const pptx = new pptxgen();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
pptx.author = "hamdodam";
pptx.subject = "Satellite Image Building Area Segmentation Portfolio";
pptx.title = "Segmentation Portfolio - Swiss International";
pptx.company = "Personal Portfolio";
pptx.lang = "ko-KR";
pptx.theme = {
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  lang: "ko-KR",
};

// Style 07: Swiss International
const C = {
  bg: "FFFFFF",
  off: "FAFAFA",
  black: "111111",
  gray: "444444",
  light: "DDDDDD",
  red: "E8000D",
  pale: "F4F4F4",
};

const W = 13.333;
const H = 7.5;
const M = 0.78;
const BAR = 0.11;
const COL_W = (W - M * 2) / 12;

function safeImage(name, sourcePath) {
  const destPath = path.join(SAFE_ASSET_DIR, name);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
  }
  return destPath;
}

const img = {
  curve: safeImage("validation_dice_trajectory.png", path.join(ASSET_DIR, "swiss_validation_dice_trajectory.png")),
  scoreBar: safeImage("score_lift_bar.png", path.join(ASSET_DIR, "swiss_score_lift_bar.png")),
  contact: safeImage("segmentation_validation_contact_sheet.png", path.join(QUAL_DIR, "segmentation_validation_contact_sheet.png")),
  cover: safeImage("cover_segmentation.png", path.join(QUAL_DIR, "02_TRAIN_6115_segmentation.png")),
  strong: safeImage("strong_case_segmentation.png", path.join(QUAL_DIR, "07_TRAIN_6013_segmentation.png")),
  average: safeImage("average_case_segmentation.png", path.join(QUAL_DIR, "04_TRAIN_2657_segmentation.png")),
  failure: safeImage("failure_case_segmentation.png", path.join(QUAL_DIR, "06_TRAIN_1274_segmentation.png")),
  extra: safeImage("extra_segmentation.png", path.join(QUAL_DIR, "03_TRAIN_1002_segmentation.png")),
};

function exists(p) {
  return fs.existsSync(p);
}

function col(n) {
  return M + COL_W * n;
}

function addBase(slide, label = "SATELLITE SEGMENTATION") {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: BAR,
    h: H,
    fill: { color: C.red },
    line: { color: C.red },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: M,
    y: 1.44,
    w: W - M * 2,
    h: 0,
    line: { color: C.light, width: 1.0 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 11.55,
    y: 6.12,
    w: 0.74,
    h: 0.74,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.red, width: 1.2 },
  });
  slide.addText(label, {
    x: M,
    y: 6.87,
    w: 5.5,
    h: 0.18,
    fontFace: "Space Mono",
    fontSize: 7.5,
    color: C.gray,
    charSpace: 2.8,
    margin: 0,
  });
  slide.addText("HOLDOUT VALIDATION · DACON RULE-COMPLIANT STUDY", {
    x: 6.55,
    y: 0.45,
    w: 5.95,
    h: 0.2,
    fontFace: "Space Mono",
    fontSize: 7.2,
    color: C.gray,
    charSpace: 1.6,
    margin: 0,
    align: "right",
  });
}

function title(slide, text, subtitle = "") {
  slide.addText(text, {
    x: M,
    y: 0.68,
    w: 8.9,
    h: 0.58,
    fontFace: "Arial",
    bold: true,
    fontSize: 25,
    color: C.black,
    margin: 0,
    breakLine: false,
    fit: "shrink",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 9.35,
      y: 0.78,
      w: 3.1,
      h: 0.26,
      fontFace: "Space Mono",
      fontSize: 7.3,
      color: C.red,
      charSpace: 1.7,
      margin: 0,
      align: "right",
      fit: "shrink",
    });
  }
}

function base(label, heading, subtitle = "") {
  const slide = pptx.addSlide();
  addBase(slide, label);
  title(slide, heading, subtitle);
  return slide;
}

function body(slide, lines, x, y, w, h, size = 12.4, color = C.gray) {
  slide.addText(lines.join("\n"), {
    x,
    y,
    w,
    h,
    fontFace: "Arial",
    fontSize: size,
    color,
    margin: 0,
    paraSpaceAfterPt: 7,
    fit: "shrink",
    breakLine: false,
  });
}

function label(slide, text, x, y, w, color = C.red) {
  slide.addText(text, {
    x,
    y,
    w,
    h: 0.18,
    fontFace: "Space Mono",
    fontSize: 7.2,
    color,
    charSpace: 2.2,
    margin: 0,
    fit: "shrink",
  });
}

function kpi(slide, value, text, x, y, w = 2.1) {
  slide.addShape(pptx.ShapeType.line, { x, y: y + 0.02, w, h: 0, line: { color: C.red, width: 2 } });
  slide.addText(value, {
    x,
    y: y + 0.18,
    w,
    h: 0.55,
    fontFace: "Arial",
    bold: true,
    fontSize: 25,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(text, {
    x,
    y: y + 0.78,
    w,
    h: 0.24,
    fontFace: "Space Mono",
    fontSize: 6.7,
    color: C.gray,
    charSpace: 1.2,
    margin: 0,
    fit: "shrink",
  });
}

function image(slide, imgPath, x, y, w, h) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.pale },
    line: { color: C.light, width: 0.8 },
  });
  if (exists(imgPath)) {
    slide.addImage({ path: imgPath, x, y, w, h });
  } else {
    slide.addText("IMAGE MISSING", { x, y: y + h / 2 - 0.1, w, h: 0.2, fontFace: "Space Mono", fontSize: 8, color: C.red, align: "center", margin: 0 });
  }
}

function table(slide, rows, x, y, w, rowH = 0.42, header = true) {
  const colCount = rows[0].length;
  const colW = w / colCount;
  rows.forEach((row, i) => {
    const yy = y + i * rowH;
    slide.addShape(pptx.ShapeType.line, { x, y: yy, w, h: 0, line: { color: i === 0 && header ? C.black : C.light, width: i === 0 && header ? 1.2 : 0.7 } });
    row.forEach((cell, j) => {
      slide.addText(String(cell), {
        x: x + colW * j + 0.05,
        y: yy + 0.11,
        w: colW - 0.1,
        h: rowH - 0.1,
        fontFace: i === 0 && header ? "Space Mono" : "Arial",
        bold: i === 0 && header,
        fontSize: i === 0 && header ? 7.3 : 9.0,
        color: i === 0 && header ? C.black : C.gray,
        margin: 0,
        fit: "shrink",
      });
    });
  });
  slide.addShape(pptx.ShapeType.line, { x, y: y + rows.length * rowH, w, h: 0, line: { color: C.black, width: 0.9 } });
}

function node(slide, text, x, y, w, h = 0.58, accent = false) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: accent ? C.red : C.bg, transparency: accent ? 0 : 100 },
    line: { color: accent ? C.red : C.black, width: 1.1 },
  });
  slide.addText(text, {
    x: x + 0.08,
    y: y + 0.16,
    w: w - 0.16,
    h: h - 0.18,
    fontFace: "Arial",
    bold: accent,
    fontSize: 9.8,
    color: accent ? C.bg : C.black,
    margin: 0,
    align: "center",
    fit: "shrink",
  });
}

function arrow(slide, x1, y1, x2, y2, color = C.red) {
  slide.addShape(pptx.ShapeType.line, {
    x: x1,
    y: y1,
    w: x2 - x1,
    h: y2 - y1,
    line: { color, width: 1.15, endArrowType: "triangle" },
  });
}

function redBlock(slide, num, labelText, x, y) {
  slide.addText(num, {
    x,
    y,
    w: 0.72,
    h: 0.56,
    fontFace: "Arial",
    bold: true,
    fontSize: 24,
    color: C.red,
    margin: 0,
  });
  slide.addText(labelText, {
    x: x + 0.76,
    y: y + 0.08,
    w: 3.7,
    h: 0.42,
    fontFace: "Arial",
    bold: true,
    fontSize: 13.5,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
}

let s;

s = base("PORTFOLIO 01", "Satellite Image Building Area Segmentation", "SWISS 07");
body(s, ["DACON 위성영상 건물 영역 분할 프로젝트", "데이터 구조 분석, 모델 학습, 검증 설계, fine-tuning, 결과 시각화까지 수행"], col(0), 1.88, col(5) - col(0), 1.05, 14, C.black);
kpi(s, "0.8007", "HOLDOUT VALIDATION DICE", col(0), 5.32, 2.75);
kpi(s, "0.37", "BEST THRESHOLD", col(3), 5.32, 2.25);
kpi(s, "UNet++", "FINAL MODEL", col(5.5), 5.32, 2.35);
image(s, img.cover, col(7), 1.86, 4.15, 2.35);

s = base("EXECUTIVE", "Project Summary", "01 / 32");
table(s, [
  ["ITEM", "SUMMARY"],
  ["Problem", "위성 이미지에서 건물 영역을 pixel-level binary mask로 분할"],
  ["Data", "DACON train 7,140장 / test 60,640장 구조 분석"],
  ["Validation", "train 5,712장 / holdout 1,428장 자체 검증"],
  ["Model", "UNet++ ResNet34 encoder + patch training"],
  ["Result", "Holdout Dice 0.8007, threshold 0.37"],
], col(0), 1.86, col(7) - col(0), 0.58);
image(s, img.scoreBar, col(7.6), 2.0, 3.85, 2.22);
kpi(s, "NO", "OFFICIAL PRIVATE SCORE CLAIM", col(8), 5.55, 3.2);

s = base("PROBLEM", "What Is Being Predicted?", "02 / 32");
node(s, "Satellite Image", col(0), 2.38, 2.05);
node(s, "UNet++", col(3), 2.38, 1.75, 0.58, true);
node(s, "Building Probability Map", col(5.6), 2.38, 2.5);
node(s, "Binary Mask", col(9.2), 2.38, 1.9);
arrow(s, col(2.2), 2.67, col(3), 2.67);
arrow(s, col(4.8), 2.67, col(5.6), 2.67);
arrow(s, col(8.15), 2.67, col(9.2), 2.67);
body(s, ["각 픽셀이 건물인지 배경인지 판단한다.", "핵심은 건물 위치와 경계를 동시에 맞추는 것이다."], col(0), 3.88, col(8) - col(0), 1.0, 13);
kpi(s, "PIXEL", "LEVEL TASK", col(9), 4.35, 1.6);

s = base("APPLICATION", "Why It Matters", "03 / 32");
redBlock(s, "01", "지도 갱신 및 건물 변화 탐지", col(0), 2.0);
redBlock(s, "02", "재난 피해 지역 건물 손상 분석", col(0), 3.0);
redBlock(s, "03", "도시 개발·토지 이용 모니터링", col(0), 4.0);
redBlock(s, "04", "스마트시티 공간정보 데이터 구축", col(0), 5.0);
image(s, img.extra, col(6.8), 1.9, 4.6, 2.95);

s = base("RULES", "DACON Evaluation Context", "04 / 32");
table(s, [
  ["RULE", "PROJECT POSITION"],
  ["Metric", "Dice Coefficient"],
  ["External data", "사용하지 않음"],
  ["Train/Test leakage", "test label 사용하지 않음"],
  ["Public/Private", "공식 점수는 제출해야 확인 가능"],
  ["Portfolio claim", "자체 holdout validation 기준으로만 표기"],
], col(0), 1.85, col(7.2) - col(0), 0.58);
body(s, ["중요: 0.8007은 공식 Private Score가 아니라, train split에서 만든 holdout validation 성능이다."], col(8), 2.15, 3.3, 1.3, 15, C.red);
kpi(s, "70%", "PRIVATE TEST PORTION", col(8), 4.5, 2.7);

s = base("DATA", "Dataset Structure", "05 / 32");
table(s, [
  ["FILE", "CONTENT", "ROLE"],
  ["train_img", "1024x1024 images", "학습 입력"],
  ["train.csv", "img_path + mask_rle", "정답 mask 복원"],
  ["test_img", "224x224 images", "추론 대상"],
  ["sample_submission", "img_id + mask_rle", "제출 형식"],
], col(0), 1.88, col(8) - col(0), 0.58);
kpi(s, "7,140", "TRAIN IMAGES", col(8.7), 2.0, 2.1);
kpi(s, "60,640", "TEST IMAGES", col(8.7), 3.35, 2.1);
kpi(s, "RLE", "MASK FORMAT", col(8.7), 4.7, 2.1);

s = base("ENCODING", "RLE to Mask Pipeline", "06 / 32");
node(s, "mask_rle string", col(0), 2.35, 1.95);
node(s, "RLE decode", col(2.7), 2.35, 1.75);
node(s, "binary mask", col(5.2), 2.35, 1.75);
node(s, "model output", col(7.8), 2.35, 1.75);
node(s, "RLE encode / -1", col(10.2), 2.35, 1.75, 0.58, true);
arrow(s, col(2.0), 2.64, col(2.7), 2.64);
arrow(s, col(4.45), 2.64, col(5.2), 2.64);
arrow(s, col(7.0), 2.64, col(7.8), 2.64);
arrow(s, col(9.55), 2.64, col(10.2), 2.64);
body(s, ["학습 시에는 RLE를 mask로 복원하고, 제출 시에는 예측 mask를 다시 RLE로 변환한다.", "건물이 없는 예측은 DACON 제출 규칙에 맞춰 -1로 처리한다."], col(0), 4.1, col(9) - col(0), 1.1, 13);

s = base("DIFFICULTY", "Core Data Difficulties", "07 / 32");
table(s, [
  ["DIFFICULTY", "EFFECT", "RESPONSE"],
  ["Small buildings", "resize에서 경계 손실", "patch training"],
  ["Road / shadow", "false positive 증가", "post-processing"],
  ["Class imbalance", "배경 중심 학습", "Focal + Dice"],
  ["Train/test size gap", "crop 오류 가능", "test transform 분리"],
], col(0), 1.9, col(7.4) - col(0), 0.62);
image(s, img.failure, col(7.9), 1.95, 3.95, 2.2);

s = base("VALIDATION", "Holdout Split Design", "08 / 32");
node(s, "train.csv 7,140", col(0), 2.25, 2.1);
node(s, "train 5,712", col(3.3), 1.9, 1.85, 0.58, true);
node(s, "holdout 1,428", col(3.3), 3.05, 2.05);
arrow(s, col(2.2), 2.53, col(3.3), 2.18);
arrow(s, col(2.2), 2.53, col(3.3), 3.34);
body(s, ["공식 test 정답이 없기 때문에 train 일부를 validation 시험지처럼 보관했다.", "모델 변경은 holdout Dice로 비교했다."], col(6.4), 2.05, 4.35, 1.3, 13);
kpi(s, "80:20", "TRAIN / HOLDOUT SPLIT", col(7), 4.4, 3.0);

s = base("BASELINE", "Baseline and First Bottleneck", "09 / 32");
table(s, [
  ["BASELINE", "VALUE"],
  ["Model", "U-Net"],
  ["Input", "224 resize"],
  ["Loss", "BCE + Dice"],
  ["Role", "비교 기준"],
], col(0), 1.9, col(4.5) - col(0), 0.58);
node(s, "1024x1024", col(5.3), 2.35, 1.7);
node(s, "224x224", col(7.8), 2.35, 1.7, 0.58, true);
node(s, "boundary loss", col(10.2), 2.35, 1.75);
arrow(s, col(7.0), 2.64, col(7.8), 2.64);
arrow(s, col(9.5), 2.64, col(10.2), 2.64);
body(s, ["작은 건물과 얇은 경계가 축소 과정에서 흐려지는 것이 핵심 병목이었다."], col(5.3), 4.1, 5.4, 0.8, 13);

s = base("MODEL", "Model Selection Rationale", "10 / 32");
table(s, [
  ["MODEL", "ROLE", "RATIONALE"],
  ["U-Net", "baseline", "기본 segmentation 구조"],
  ["DeepLabV3+", "comparison", "넓은 문맥 반영 가능"],
  ["UNet++", "final", "강화된 skip connection으로 경계 복원에 유리"],
], col(0), 1.95, col(9) - col(0), 0.68);
kpi(s, "UNet++", "FINAL MODEL", col(9.3), 2.05, 2.1);
kpi(s, "ResNet34", "ENCODER", col(9.3), 3.42, 2.1);

s = base("METHOD", "Patch-Based Training", "11 / 32");
node(s, "1024 tile", col(0), 2.38, 1.65);
node(s, "384 crop", col(2.6), 2.38, 1.65, 0.58, true);
node(s, "256 input", col(5.2), 2.38, 1.65);
node(s, "UNet++", col(7.8), 2.38, 1.55);
node(s, "mask", col(10.3), 2.38, 1.3);
arrow(s, col(1.8), 2.67, col(2.6), 2.67);
arrow(s, col(4.4), 2.67, col(5.2), 2.67);
arrow(s, col(7.0), 2.67, col(7.8), 2.67);
arrow(s, col(9.55), 2.67, col(10.3), 2.67);
body(s, ["원본 이미지를 한 번에 축소하지 않고 patch 단위로 학습해 작은 건물과 지역 경계 정보를 보존했다."], col(0), 4.2, col(8) - col(0), 1.0, 13);
kpi(s, "384 → 256", "CROP / INPUT", col(8.5), 4.1, 2.55);

s = base("OPTIMIZATION", "Loss, TTA, Post-Processing", "12 / 32");
table(s, [
  ["TECHNIQUE", "WHY IT WAS USED"],
  ["Focal + Dice", "작은 건물 픽셀과 mask overlap을 함께 최적화"],
  ["Flip TTA", "방향 변화에 따른 예측 흔들림 완화"],
  ["Min-area filtering", "작은 false positive 제거"],
  ["Hole filling", "건물 내부 빈 영역 보정"],
], col(0), 1.95, col(8.2) - col(0), 0.62);
node(s, "probability", col(8.8), 2.35, 1.55);
node(s, "threshold", col(10.5), 2.35, 1.45, 0.58, true);
arrow(s, col(10.2), 2.64, col(10.5), 2.64);
kpi(s, "0.37", "FINAL THRESHOLD", col(9.0), 4.4, 2.4);

s = base("THRESHOLD", "What Threshold Means", "13 / 32");
table(s, [
  ["PIXEL PROB.", "THRESHOLD 0.37", "RESULT"],
  ["0.82", "> 0.37", "건물"],
  ["0.45", "> 0.37", "건물"],
  ["0.20", "<= 0.37", "배경"],
], col(0), 1.92, col(6.8) - col(0), 0.62);
body(s, ["threshold는 확률맵을 binary mask로 자르는 기준값이다.", "낮으면 건물 예측이 늘고, 높으면 확실한 건물만 남는다."], col(7.4), 2.05, 3.6, 1.25, 13);
kpi(s, "0.37", "BEST DICE CUTOFF", col(8), 4.6, 2.3);

s = base("CODE", "Code Changes That Improved Score", "14 / 32");
table(s, [
  ["CHANGE", "REASON"],
  ["--init-checkpoint-dir", "best weight만 불러오고 optimizer/scheduler 재시작"],
  ["--threshold-step 0.01", "0.8 근처의 미세 cutoff 탐색"],
  ["--eval-only", "학습 없이 checkpoint 재평가"],
  ["test transform split", "224x224 test crop 오류 방지"],
], col(0), 1.88, col(9.2) - col(0), 0.62);
kpi(s, "+0.00165", "DICE LIFT FROM 0.7991", col(9.5), 2.0, 2.1);

s = base("FINE-TUNE", "Why Fine-Tuning Was Needed", "15 / 32");
node(s, "10 epoch best\nDice 0.7991", col(0), 2.18, 2.2);
node(s, "LR reached 0.0", col(3.1), 2.18, 1.95);
node(s, "reset optimizer\nLR 3e-5", col(5.9), 2.18, 2.05, 0.58, true);
node(s, "1 epoch fine-tune\nDice 0.8007", col(8.9), 2.18, 2.35);
arrow(s, col(2.3), 2.47, col(3.1), 2.47);
arrow(s, col(5.1), 2.47, col(5.9), 2.47);
arrow(s, col(8.05), 2.47, col(8.9), 2.47);
body(s, ["단순 resume은 scheduler까지 이어받아 추가 학습 효과가 작았다.", "따라서 weight만 유지하고 낮은 LR로 optimizer를 새로 시작했다."], col(0), 4.25, col(8) - col(0), 1.1, 13);

s = base("CONFIG", "Final Training Configuration", "16 / 32");
table(s, [
  ["PARAMETER", "VALUE"],
  ["Data", "DACON raw train split only"],
  ["Model", "UNet++ / ResNet34"],
  ["Crop / Input", "384 / 256"],
  ["Loss", "Focal + Dice"],
  ["Fine-tuning", "1 epoch, lr 3e-5"],
  ["TTA / Post", "flip TTA, min-area, hole filling"],
], col(0), 1.85, col(7.3) - col(0), 0.54);
kpi(s, "0.8007", "HOLDOUT DICE", col(8), 2.0, 2.55);
kpi(s, "0.37", "THRESHOLD", col(8), 3.35, 2.1);

s = base("RESULT", "Score Lift Around 0.8", "17 / 32");
image(s, img.scoreBar, col(0), 1.82, 6.3, 3.45);
table(s, [
  ["STEP", "DICE", "THRESHOLD"],
  ["10 epoch base", "0.799052", "0.30"],
  ["threshold re-eval", "0.799162", "0.27"],
  ["fine-tuning", "0.800705", "0.37"],
], col(7), 1.96, 4.25, 0.62);

s = base("TRACE", "Epoch 1-10 + Fine-Tune", "18 / 32");
image(s, img.curve, col(0), 1.7, 11.25, 4.85);

s = base("NUMERIC", "Training Trace", "19 / 32");
table(s, [
  ["EPOCH", "VAL DICE", "THRESHOLD"],
  ["1", "0.6935", "0.75"],
  ["2", "0.7430", "0.25"],
  ["5", "0.7669", "0.25"],
  ["8", "0.7929", "0.40"],
  ["10", "0.7991", "0.30"],
  ["10+FT", "0.8007", "0.37"],
], col(0), 1.85, col(5.8) - col(0), 0.54);
body(s, ["epoch 10에서 이미 0.8에 근접했고, best checkpoint에서 낮은 LR fine-tuning 1 epoch 후 목표선을 넘겼다."], col(6.5), 2.15, 4.4, 1.35, 14, C.black);
kpi(s, "10 + 1", "BASE EPOCH + FINE-TUNE", col(6.5), 4.4, 3.2);

s = base("VISUAL", "Qualitative Validation Results", "20 / 32");
image(s, img.contact, col(0), 1.65, 11.45, 5.2);

s = base("CASE A", "Strong Case", "21 / 32");
image(s, img.strong, col(0), 2.0, 7.15, 2.35);
kpi(s, "0.9181", "CROP DICE", col(8), 2.05, 2.0);
body(s, ["건물 위치와 외곽선이 안정적으로 일치한다.", "정성 결과에서 모델 강점을 보여주는 대표 사례다."], col(8), 3.55, 3.2, 1.0, 13);

s = base("CASE B", "Average Case", "22 / 32");
image(s, img.average, col(0), 2.0, 7.15, 2.35);
kpi(s, "0.7921", "CROP DICE", col(8), 2.05, 2.0);
body(s, ["대부분의 건물은 맞지만 일부 경계 오차가 남는다.", "실제 성능 수준을 균형 있게 보여주는 사례다."], col(8), 3.55, 3.2, 1.0, 13);

s = base("CASE C", "Failure Signal", "23 / 32");
image(s, img.failure, col(0), 2.0, 7.15, 2.35);
kpi(s, "0.6528", "CROP DICE", col(8), 2.05, 2.0);
body(s, ["작은 오탐과 경계 확장이 남은 사례다.", "후처리 튜닝과 fold validation으로 개선 여지가 있다."], col(8), 3.55, 3.2, 1.0, 13);

s = base("DEBUG", "Issues and Fixes", "24 / 32");
table(s, [
  ["ISSUE", "CAUSE", "FIX"],
  ["package missing", "환경 패키지 없음", "torch/albumentations 설치"],
  ["numpy conflict", "numpy 2.x 충돌", "numpy 1.26.4 복구"],
  ["crop error", "test 224x224", "test transform 분리"],
  ["lr=0.0", "scheduler 종료", "init checkpoint 방식"],
  ["slow sweep", "후처리 반복", "eval-only로 판단 분리"],
], col(0), 1.85, col(10.2) - col(0), 0.56);

s = base("EVALUATION", "Evaluation Criteria Mapping", "25 / 32");
table(s, [
  ["CRITERION", "EVIDENCE"],
  ["데이터 분석", "RLE, 해상도 차이, holdout split 분석"],
  ["모델 검증", "Dice, threshold sweep, epoch curve"],
  ["알고리즘", "UNet++, patch training, Focal+Dice"],
  ["적용 가능성", "지도 갱신, 재난 분석, 도시 변화 탐지"],
  ["전달력", "정량 그래프와 정성 이미지"],
], col(0), 1.85, col(9.2) - col(0), 0.58);
kpi(s, "5", "EVALUATION AREAS", col(9.6), 2.0, 2.0);

s = base("CONTRIBUTION", "My Contribution", "26 / 32");
table(s, [
  ["AREA", "CONTRIBUTION"],
  ["Data", "DACON 원본 데이터 구조 분석 및 holdout split 구성"],
  ["Modeling", "UNet++ patch training 파이프라인 구성"],
  ["Optimization", "Focal+Dice, TTA, 후처리, threshold sweep"],
  ["Fine-tuning", "best checkpoint 기반 0.8+ 미세 조정"],
  ["Visualization", "학습 곡선, 정성 결과, 발표 자료 구성"],
], col(0), 1.85, col(9.2) - col(0), 0.58);
image(s, img.cover, col(9.7), 2.0, 1.95, 1.25);

s = base("LIMITS", "Limitations", "27 / 32");
table(s, [
  ["LIMIT", "WHY IT MATTERS"],
  ["Not official Private Score", "DACON 제출 전까지 공식 점수 아님"],
  ["Single holdout split", "분할 seed에 따라 점수 변동 가능"],
  ["Local Mac training", "장기 학습 및 다중 seed 실험 비용 큼"],
  ["Single final model", "앙상블 검증 여지 남음"],
], col(0), 1.9, col(8.4) - col(0), 0.64);
kpi(s, "HONEST", "CLAIM BOUNDARY", col(8.8), 2.0, 2.5);

s = base("NEXT", "Next Experiments", "28 / 32");
redBlock(s, "01", "DACON submission으로 공식 Private Score 확인", col(0), 1.95);
redBlock(s, "02", "K-fold validation으로 split 민감도 확인", col(0), 2.95);
redBlock(s, "03", "seed ensemble로 예측 안정성 개선", col(0), 3.95);
redBlock(s, "04", "UNet++ + DeepLabV3+ soft voting 비교", col(0), 4.95);
node(s, "Current\n0.8007", col(7.2), 2.4, 1.65, 0.75, true);
node(s, "Official\nsubmission", col(9.5), 2.4, 1.75);
arrow(s, col(8.85), 2.77, col(9.5), 2.77);

s = base("PORTFOLIO", "Portfolio-Ready Sentence", "29 / 32");
body(s, ["DACON 위성영상 건물 분할 데이터를 활용해 UNet++ 기반 semantic segmentation 모델을 구축했다. 원본 train 데이터를 holdout으로 분리해 검증 체계를 만들고, patch training과 낮은 learning rate fine-tuning을 통해 자체 holdout validation Dice 0.8007을 기록했다. 공식 Private Score와 내부 validation score는 명확히 구분해 관리했다."], col(0), 1.95, col(8.4) - col(0), 2.1, 15, C.black);
kpi(s, "0.8007", "HOLDOUT, NOT PRIVATE", col(9), 2.05, 2.45);

s = base("INTERVIEW", "One-Minute Explanation", "30 / 32");
body(s, ["이 프로젝트는 위성 이미지에서 건물 영역을 픽셀 단위로 분할하는 문제입니다. 저는 DACON 데이터의 RLE 마스크 구조와 train/test 해상도 차이를 분석한 뒤, U-Net baseline의 224 resize 방식이 작은 건물 경계를 손상시킨다고 판단했습니다. 이를 개선하기 위해 UNet++ 기반 patch training, Focal+Dice loss, TTA, 후처리를 적용했습니다. 마지막으로 기존 best checkpoint에서 optimizer를 새로 초기화한 낮은 learning rate fine-tuning을 수행해 자체 holdout validation Dice 0.8007을 기록했습니다."], col(0), 1.9, col(9.2) - col(0), 2.8, 14, C.black);
node(s, "Problem", col(0), 5.1, 1.45);
node(s, "Analysis", col(2.0), 5.1, 1.45);
node(s, "Method", col(4.0), 5.1, 1.45);
node(s, "Result", col(6.0), 5.1, 1.45, 0.58, true);
arrow(s, col(1.48), 5.39, col(2.0), 5.39);
arrow(s, col(3.48), 5.39, col(4.0), 5.39);
arrow(s, col(5.48), 5.39, col(6.0), 5.39);

s = base("FILES", "Code and Output References", "31 / 32");
table(s, [
  ["FILE", "ROLE"],
  ["train_segmentation_pipeline.py", "학습/검증/추론 메인 코드"],
  ["run_dacon_rule_compliant_080_final.sh", "0.8+ 재현 실행 스크립트"],
  ["summary.json", "최종 성능 기록"],
  ["unetplusplus_best.pt", "최종 best checkpoint"],
  ["qualitative_results/*.png", "정성 결과 이미지"],
], col(0), 1.86, col(9.6) - col(0), 0.58);
kpi(s, "REPRO", "RUN SCRIPT AVAILABLE", col(9.8), 4.55, 2.2);

s = base("TAKEAWAY", "Final Takeaway", "32 / 32");
body(s, ["핵심 성과는 모델을 단순 실행한 것이 아니라, 데이터 구조와 평가 기준을 해석하고 성능 병목을 찾아 코드 수준에서 개선한 과정이다.", "이 프로젝트는 AI/데이터 직무에서 요구되는 데이터 처리, 모델링, 검증 설계, 디버깅, 결과 시각화 역량을 함께 보여준다."], col(0), 2.0, col(7.2) - col(0), 1.8, 16, C.black);
kpi(s, "0.8007", "FINAL HOLDOUT DICE", col(8), 2.05, 2.7);
kpi(s, "33", "SLIDES", col(8), 3.45, 1.75);
kpi(s, "SWISS", "STYLE 07", col(10), 3.45, 1.75);

pptx.writeFile({ fileName: PPTX_PATH });
console.log(PPTX_PATH);
