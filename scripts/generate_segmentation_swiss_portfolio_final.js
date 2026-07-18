const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.PROJECT_ROOT || process.cwd();
const OUT_DIR = process.env.PORTFOLIO_OUTPUT_DIR || path.join(ROOT, "output", "portfolio");
const RUN_DIR = path.join(ROOT, "runs", "dacon_raw_patch_unetpp_v1");
const QUAL_DIR = path.join(RUN_DIR, "qualitative_results");
const CHART_DIR = "/tmp/segmentation_swiss_final_assets";
const SAFE_ASSET_DIR = "/tmp/segmentation_swiss_final_ppt_assets";
const EXPLAINER_DIR = "/tmp/segmentation_data_explainer_assets";
const PPTX_PATH = path.join(OUT_DIR, "satellite_building_segmentation_portfolio_swiss_final_v2.pptx");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(SAFE_ASSET_DIR, { recursive: true });

function safeImage(name, sourcePath) {
  const destPath = path.join(SAFE_ASSET_DIR, name);
  if (fs.existsSync(sourcePath)) fs.copyFileSync(sourcePath, destPath);
  return destPath;
}

const img = {
  trajectory: safeImage("holdout_dice_trajectory.png", path.join(CHART_DIR, "holdout_dice_trajectory.png")),
  scoreBar: safeImage("score_movement_bar.png", path.join(CHART_DIR, "score_movement_bar.png")),
  splitDonut: safeImage("train_holdout_donut.png", path.join(CHART_DIR, "train_holdout_donut.png")),
  diceVisual: safeImage("dice_overlap_visual.png", path.join(CHART_DIR, "dice_overlap_visual.png")),
  contact: safeImage("validation_contact_sheet.png", path.join(QUAL_DIR, "segmentation_validation_contact_sheet.png")),
  cover: safeImage("cover_case.png", path.join(QUAL_DIR, "02_TRAIN_6115_segmentation.png")),
  strong: safeImage("strong_case.png", path.join(QUAL_DIR, "07_TRAIN_6013_segmentation.png")),
  average: safeImage("average_case.png", path.join(QUAL_DIR, "04_TRAIN_2657_segmentation.png")),
  failure: safeImage("failure_case.png", path.join(QUAL_DIR, "06_TRAIN_1274_segmentation.png")),
  extra: safeImage("extra_case.png", path.join(QUAL_DIR, "03_TRAIN_1002_segmentation.png")),
  datasetExplainer: safeImage("dataset_inventory_explainer.png", path.join(EXPLAINER_DIR, "dataset_inventory_explainer.png")),
  csvExplainer: safeImage("csv_structure_explainer.png", path.join(EXPLAINER_DIR, "csv_structure_explainer.png")),
  rleExplainer: safeImage("mask_rle_explainer.png", path.join(EXPLAINER_DIR, "mask_rle_explainer.png")),
};

const pptx = new pptxgen();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
pptx.author = "hamdodam";
pptx.subject = "Satellite Image Building Area Segmentation Portfolio";
pptx.title = "Satellite Image Building Area Segmentation Portfolio";
pptx.company = "Personal Portfolio";
pptx.lang = "ko-KR";
pptx.theme = { headFontFace: "Arial", bodyFontFace: "Arial", lang: "ko-KR" };

// Swiss International style palette
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

function col(n) {
  return M + COL_W * n;
}

function exists(p) {
  return fs.existsSync(p);
}

function addBase(slide, section = "SATELLITE SEGMENTATION") {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: BAR, h: H, fill: { color: C.red }, line: { color: C.red } });
  slide.addShape(pptx.ShapeType.line, { x: M, y: 1.44, w: W - M * 2, h: 0, line: { color: C.light, width: 1 } });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 11.56,
    y: 6.12,
    w: 0.74,
    h: 0.74,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.red, width: 1.2 },
  });
  slide.addText(section, {
    x: M,
    y: 6.88,
    w: 5.5,
    h: 0.18,
    fontFace: "Space Mono",
    fontSize: 7.2,
    color: C.gray,
    charSpace: 2.6,
    margin: 0,
  });
  slide.addText("HOLDOUT VALIDATION · RULE-COMPLIANT EXPERIMENT", {
    x: 6.45,
    y: 0.45,
    w: 6.05,
    h: 0.2,
    fontFace: "Space Mono",
    fontSize: 7.0,
    color: C.gray,
    charSpace: 1.5,
    margin: 0,
    align: "right",
  });
}

function title(slide, text, subtitle = "") {
  slide.addText(text, {
    x: M,
    y: 0.66,
    w: 9.3,
    h: 0.6,
    fontFace: "Arial",
    bold: true,
    fontSize: 24.5,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 9.4,
      y: 0.78,
      w: 3.05,
      h: 0.22,
      fontFace: "Space Mono",
      fontSize: 7.0,
      color: C.red,
      charSpace: 1.6,
      margin: 0,
      align: "right",
      fit: "shrink",
    });
  }
}

function base(section, heading, subtitle = "") {
  const slide = pptx.addSlide();
  addBase(slide, section);
  title(slide, heading, subtitle);
  return slide;
}

function body(slide, lines, x, y, w, h, size = 12.2, color = C.gray) {
  slide.addText(lines.join("\n"), {
    x,
    y,
    w,
    h,
    fontFace: "Arial",
    fontSize: size,
    color,
    margin: 0,
    paraSpaceAfterPt: 6,
    fit: "shrink",
  });
}

function label(slide, text, x, y, w, color = C.red) {
  slide.addText(text, {
    x,
    y,
    w,
    h: 0.18,
    fontFace: "Space Mono",
    fontSize: 7.1,
    color,
    charSpace: 2.2,
    margin: 0,
    fit: "shrink",
  });
}

function kpi(slide, value, text, x, y, w = 2.2) {
  slide.addShape(pptx.ShapeType.line, { x, y: y + 0.02, w, h: 0, line: { color: C.red, width: 2.0 } });
  slide.addText(value, {
    x,
    y: y + 0.17,
    w,
    h: 0.54,
    fontFace: "Arial",
    bold: true,
    fontSize: 24.5,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(text, {
    x,
    y: y + 0.76,
    w,
    h: 0.28,
    fontFace: "Space Mono",
    fontSize: 6.5,
    color: C.gray,
    charSpace: 1.1,
    margin: 0,
    fit: "shrink",
  });
}

function image(slide, imgPath, x, y, w, h) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: C.pale }, line: { color: C.light, width: 0.8 } });
  if (exists(imgPath)) slide.addImage({ path: imgPath, x, y, w, h });
  else slide.addText("IMAGE MISSING", { x, y: y + h / 2 - 0.1, w, h: 0.2, fontFace: "Space Mono", fontSize: 8, color: C.red, align: "center", margin: 0 });
}

function table(slide, rows, x, y, w, rowH = 0.46, header = true, widths = null) {
  const colCount = rows[0].length;
  const colWs = widths || Array(colCount).fill(w / colCount);
  rows.forEach((row, i) => {
    const yy = y + i * rowH;
    slide.addShape(pptx.ShapeType.line, { x, y: yy, w, h: 0, line: { color: i === 0 && header ? C.black : C.light, width: i === 0 && header ? 1.15 : 0.7 } });
    let xx = x;
    row.forEach((cell, j) => {
      slide.addText(String(cell), {
        x: xx + 0.05,
        y: yy + 0.105,
        w: colWs[j] - 0.1,
        h: rowH - 0.08,
        fontFace: i === 0 && header ? "Space Mono" : "Arial",
        bold: i === 0 && header,
        fontSize: i === 0 && header ? 7.1 : 8.85,
        color: i === 0 && header ? C.black : C.gray,
        margin: 0,
        fit: "shrink",
      });
      xx += colWs[j];
    });
  });
  slide.addShape(pptx.ShapeType.line, { x, y: y + rows.length * rowH, w, h: 0, line: { color: C.black, width: 0.9 } });
}

function node(slide, text, x, y, w, h = 0.56, accent = false) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: accent ? C.red : C.bg, transparency: accent ? 0 : 100 },
    line: { color: accent ? C.red : C.black, width: 1.05 },
  });
  slide.addText(text, {
    x: x + 0.07,
    y: y + 0.135,
    w: w - 0.14,
    h: h - 0.14,
    fontFace: "Arial",
    bold: accent,
    fontSize: 9.2,
    color: accent ? C.bg : C.black,
    margin: 0,
    align: "center",
    fit: "shrink",
  });
}

function arrow(slide, x1, y1, x2, y2, color = C.red) {
  slide.addShape(pptx.ShapeType.line, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color, width: 1.15, endArrowType: "triangle" } });
}

function codeBlock(slide, code, x, y, w, h, size = 8.5) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: C.off }, line: { color: C.light, width: 0.8 } });
  slide.addText(code, {
    x: x + 0.15,
    y: y + 0.15,
    w: w - 0.3,
    h: h - 0.3,
    fontFace: "Space Mono",
    fontSize: size,
    color: C.black,
    margin: 0,
    fit: "shrink",
    breakLine: false,
  });
}

function step(slide, num, text, x, y, w = 4.2) {
  slide.addText(num, { x, y, w: 0.55, h: 0.42, fontFace: "Arial", bold: true, fontSize: 21, color: C.red, margin: 0 });
  slide.addText(text, { x: x + 0.65, y: y + 0.055, w, h: 0.32, fontFace: "Arial", bold: true, fontSize: 12.8, color: C.black, margin: 0, fit: "shrink" });
}

let s;

// 1
s = base("PORTFOLIO", "Satellite Image Building Area Segmentation", "01");
body(s, ["위성영상에서 건물 영역을 픽셀 단위로 분할하는 AI/데이터 프로젝트", "데이터 구조 분석부터 모델 개선, 검증 설계, 결과 해석까지 end-to-end로 수행"], col(0), 1.85, col(5.8) - col(0), 1.25, 14, C.black);
kpi(s, "0.8007", "BEST RECORDED HOLDOUT DICE", col(0), 5.1, 2.9);
kpi(s, "0.7998", "LATEST RERUN HOLDOUT DICE", col(3.1), 5.1, 2.9);
kpi(s, "UNet++", "FINAL MODEL FAMILY", col(6.2), 5.1, 2.1);
image(s, img.cover, col(7.2), 1.78, 4.65, 2.62);
body(s, ["점수 표기 기준: 공식 Private Score가 아니라 자체 holdout validation 결과"], col(7.2), 4.6, 4.5, 0.5, 9.2, C.gray);

// 2
s = base("SUMMARY", "Executive Snapshot", "02");
table(s, [
  ["ITEM", "SUMMARY"],
  ["Problem", "위성 이미지에서 건물 영역을 semantic segmentation으로 추출"],
  ["Data", "train 7,140장, test 60,640장 구조 분석"],
  ["Validation", "train 5,712장 / holdout 1,428장 split"],
  ["Method", "UNet++ + patch training + Focal/Dice + TTA/post-process"],
  ["Result", "best recorded 0.8007, latest rerun 0.7998"],
], col(0), 1.82, col(7.2) - col(0), 0.56);
image(s, img.scoreBar, col(7.65), 1.95, 4.25, 2.45);
kpi(s, "0.37", "BEST RECORDED THRESHOLD", col(8), 5.15, 2.6);

// 3
s = base("ROADMAP", "Portfolio Reading Guide", "03");
step(s, "01", "문제 정의와 데이터 구조", col(0), 1.95);
step(s, "02", "RLE, mask, holdout, Dice 개념", col(0), 2.75);
step(s, "03", "Baseline 병목과 모델 선정", col(0), 3.55);
step(s, "04", "Patch training과 코드 개선", col(0), 4.35);
step(s, "05", "실험 결과와 정성 분석", col(0), 5.15);
node(s, "Problem", col(6.6), 2.2, 1.5);
node(s, "Data", col(8.4), 2.2, 1.25);
node(s, "Model", col(9.95), 2.2, 1.35);
node(s, "Result", col(11.65), 2.2, 1.1, 0.56, true);
arrow(s, col(8.1), 2.48, col(8.4), 2.48);
arrow(s, col(9.65), 2.48, col(9.95), 2.48);
arrow(s, col(11.3), 2.48, col(11.65), 2.48);

// 4
s = base("PROBLEM", "What The Model Predicts", "04");
node(s, "Satellite Image", col(0), 2.35, 1.95);
node(s, "UNet++", col(3), 2.35, 1.6, 0.56, true);
node(s, "Building Probability Map", col(5.5), 2.35, 2.4);
node(s, "Threshold", col(8.7), 2.35, 1.5);
node(s, "Binary Mask", col(10.9), 2.35, 1.55);
arrow(s, col(2.05), 2.63, col(3), 2.63);
arrow(s, col(4.7), 2.63, col(5.5), 2.63);
arrow(s, col(7.95), 2.63, col(8.7), 2.63);
arrow(s, col(10.25), 2.63, col(10.9), 2.63);
body(s, ["단순히 이미지 전체를 분류하는 것이 아니라, 각 픽셀이 건물인지 배경인지 판단한다.", "건물 경계와 작은 객체를 동시에 맞추는 것이 핵심 난점이다."], col(0), 4.05, col(8) - col(0), 1.1, 13);
kpi(s, "PIXEL", "LEVEL TASK", col(9), 4.05, 1.65);

// 5
s = base("VALUE", "Why This Problem Matters", "05");
step(s, "01", "지도 갱신과 신규 건물 변화 탐지", col(0), 1.95, 4.7);
step(s, "02", "재난 피해 지역 건물 변화 분석", col(0), 2.85, 4.7);
step(s, "03", "도시 개발과 토지 이용 모니터링", col(0), 3.75, 4.7);
step(s, "04", "스마트시티 공간정보 데이터 구축", col(0), 4.65, 4.7);
image(s, img.extra, col(6.8), 1.85, 4.85, 3.05);

// 6
s = base("RULES", "Competition Context And Score Boundary", "06");
table(s, [
  ["RULE", "POSITION"],
  ["Metric", "Dice Coefficient"],
  ["External data", "사용하지 않음"],
  ["Test label", "사용하지 않음"],
  ["Validation", "train에서 holdout 분리"],
  ["Score claim", "공식 점수와 내부 검증 점수 구분"],
], col(0), 1.82, col(7.4) - col(0), 0.56);
body(s, ["이 포트폴리오의 점수는 자체 holdout validation 기준이다.", "공식 Private Score는 대회 제출을 통해서만 확인 가능하다."], col(8), 2.0, 3.7, 1.4, 14, C.red);
kpi(s, "NO", "PRIVATE SCORE CLAIM", col(8), 4.5, 2.5);

// 7
s = base("DATA", "Dataset Inventory: files become a pipeline", "07");
image(s, img.datasetExplainer, col(0), 1.68, 8.15, 4.76);
kpi(s, "7,140", "TRAIN IMAGES", col(8.75), 1.95, 2.25);
kpi(s, "60,640", "TEST IMAGES", col(8.75), 3.2, 2.25);
body(s, ["평가자에게 보여줄 핵심은 파일명을 나열하는 것이 아니라, CSV와 이미지 폴더가 Dataset Class를 거쳐 학습/추론 입력으로 바뀌는 구조다."], col(8.75), 4.58, 3.15, 1.0, 11.5, C.gray);

// 8
s = base("CSV", "CSV Structure: one row is one sample", "08");
image(s, img.csvExplainer, col(0), 1.68, 8.15, 4.76);
table(s, [
  ["COLUMN", "ROLE IN TRAINING"],
  ["img_id", "sample tracking"],
  ["img_path", "image loading"],
  ["mask_rle", "label restoration"],
], col(8.75), 1.95, 3.15, 0.48, true, [1.25, 1.9]);
body(s, ["CSV 한 행은 모델이 읽을 이미지와 그 이미지의 정답 mask를 연결하는 학습 단위다. 따라서 CSV 구조를 이해하면 Dataset 코드와 RLE decode 코드의 필요성이 자연스럽게 설명된다."], col(8.75), 4.58, 3.15, 1.2, 11.4, C.gray);

// 9
s = base("MASK", "Mask And RLE: bridge between model and submission", "09");
image(s, img.rleExplainer, col(0), 1.68, 8.15, 4.76);
node(s, "TRAIN\nRLE decode\nstring → mask", col(8.75), 2.0, 2.65, 0.78, true);
node(s, "SUBMIT\nRLE encode\nmask → string", col(8.75), 3.12, 2.65, 0.78);
node(s, "EMPTY MASK\n-1 처리", col(8.75), 4.24, 2.65, 0.78);
body(s, ["모델은 픽셀 단위 mask로 학습하지만 제출 파일은 RLE 문자열을 요구한다. 건물이 없다고 판단되는 예측은 대회 양식에 맞춰 -1로 처리한다."], col(8.75), 5.35, 3.15, 0.9, 11.1, C.gray);

// 10
s = base("PIPELINE", "RLE Processing Pipeline", "10");
node(s, "mask_rle", col(0), 2.35, 1.35);
node(s, "decode", col(2.1), 2.35, 1.25, 0.56, true);
node(s, "binary mask", col(4.1), 2.35, 1.65);
node(s, "model training", col(6.7), 2.35, 1.85);
node(s, "prediction mask", col(9.35), 2.35, 1.9);
node(s, "encode / -1", col(11.45), 2.35, 1.15, 0.56, true);
arrow(s, col(1.45), 2.63, col(2.1), 2.63);
arrow(s, col(3.45), 2.63, col(4.1), 2.63);
arrow(s, col(5.85), 2.63, col(6.7), 2.63);
arrow(s, col(8.65), 2.63, col(9.35), 2.63);
arrow(s, col(11.25), 2.63, col(11.45), 2.63);
body(s, ["학습 전에는 RLE를 mask로 복원하고, 제출 전에는 예측 mask를 다시 RLE로 변환한다."], col(0), 4.0, 8.8, 0.8, 13);

// 11
s = base("SPLIT", "Holdout Validation Design", "11");
image(s, img.splitDonut, col(0), 1.75, 4.6, 4.1);
table(s, [
  ["SPLIT", "COUNT", "ROLE"],
  ["Train", "5,712", "모델 학습"],
  ["Holdout", "1,428", "성능 검증"],
  ["Test", "60,640", "제출 대상"],
], col(5.4), 1.95, 5.45, 0.64);
body(s, ["공식 test 정답이 공개되지 않기 때문에 train 일부를 검증용으로 남겨 모델 성능을 측정했다."], col(5.4), 4.7, 4.8, 0.9, 13);

// 12
s = base("METRIC", "Dice Score Concept", "12");
image(s, img.diceVisual, col(0), 1.85, 5.65, 3.65);
table(s, [
  ["DICE", "INTERPRETATION"],
  ["1.0", "예측과 정답이 완전히 일치"],
  ["0.8", "상당히 높은 overlap"],
  ["0.5", "절반 수준 overlap"],
  ["0.0", "겹침 없음"],
], col(6.4), 1.95, 4.65, 0.6);
kpi(s, "0.80", "TARGET REGION", col(6.4), 5.2, 2.2);

// 13
s = base("BASELINE", "Baseline Setup", "13");
table(s, [
  ["COMPONENT", "BASELINE"],
  ["Model", "U-Net"],
  ["Input", "224 resize"],
  ["Loss", "BCE + Dice"],
  ["Purpose", "비교 기준 확보"],
], col(0), 1.9, 4.7, 0.62);
node(s, "1024×1024", col(5.7), 2.35, 1.75);
node(s, "224×224", col(8), 2.35, 1.55, 0.56, true);
node(s, "boundary loss", col(10.2), 2.35, 1.85);
arrow(s, col(7.45), 2.63, col(8), 2.63);
arrow(s, col(9.65), 2.63, col(10.2), 2.63);

// 14
s = base("BOTTLENECK", "Why Baseline Was Limited", "14");
body(s, ["원본 이미지를 224로 직접 축소하면 작은 건물과 얇은 경계가 흐려진다.", "성능 개선의 핵심은 모델을 무작정 키우는 것보다 입력 정보 손실을 줄이는 것이었다."], col(0), 1.95, col(5.6) - col(0), 1.4, 14, C.black);
image(s, img.failure, col(6.4), 1.85, 4.8, 2.6);
kpi(s, "SMALL", "BUILDING BOUNDARY ISSUE", col(0), 4.6, 3.2);

// 15
s = base("DESIGN", "Experiment Design Overview", "15");
node(s, "Baseline", col(0), 2.1, 1.45);
node(s, "Bottleneck\nanalysis", col(2.1), 2.1, 1.65);
node(s, "Patch\ntraining", col(4.5), 2.1, 1.55, 0.56, true);
node(s, "UNet++", col(6.8), 2.1, 1.45);
node(s, "TTA / Post", col(8.9), 2.1, 1.65);
node(s, "Fine-tune", col(11.2), 2.1, 1.35, 0.56, true);
[1.5, 3.8, 6.1, 8.25, 10.6].forEach((x) => arrow(s, col(x), 2.38, col(x + 0.6), 2.38));
body(s, ["실험은 한 번에 많은 기법을 넣는 방식이 아니라, 병목을 확인하고 필요한 개선을 단계적으로 추가하는 방식으로 진행했다."], col(0), 4.0, 8.6, 1.0, 13);

// 16
s = base("MODEL", "Model Selection Matrix", "16");
table(s, [
  ["MODEL", "ROLE", "WHY"],
  ["U-Net", "baseline", "가장 기본적인 segmentation 구조"],
  ["DeepLabV3+", "candidate", "넓은 문맥 정보 반영 가능"],
  ["UNet++", "final", "강화된 skip connection으로 경계 복원에 유리"],
], col(0), 1.9, col(9.1) - col(0), 0.68);
kpi(s, "UNet++", "SELECTED", col(9.5), 2.05, 2.05);
kpi(s, "ResNet34", "ENCODER", col(9.5), 3.4, 2.05);

// 17
s = base("ARCHITECTURE", "UNet++ Boundary Rationale", "17");
node(s, "Encoder\nfeatures", col(0), 2.25, 1.75);
node(s, "Nested skip\nconnections", col(3.0), 2.25, 2.0, 0.56, true);
node(s, "Decoder\nfeatures", col(6.3), 2.25, 1.75);
node(s, "Refined\nmask", col(9.4), 2.25, 1.55);
arrow(s, col(1.85), 2.55, col(3.0), 2.55);
arrow(s, col(5.1), 2.55, col(6.3), 2.55);
arrow(s, col(8.15), 2.55, col(9.4), 2.55);
body(s, ["건물 영역 분할은 경계 복원이 중요하다.", "UNet++는 encoder와 decoder 사이의 feature 전달을 강화해 작은 구조와 경계 복원에 유리하다."], col(0), 4.2, 8.8, 1.2, 13);

// 18
s = base("PATCH", "Patch-Based Training", "18");
node(s, "1024 tile", col(0), 2.35, 1.55);
node(s, "384 crop", col(2.5), 2.35, 1.55, 0.56, true);
node(s, "256 input", col(5.0), 2.35, 1.55);
node(s, "UNet++", col(7.5), 2.35, 1.45);
node(s, "mask", col(9.8), 2.35, 1.3);
arrow(s, col(1.7), 2.63, col(2.5), 2.63);
arrow(s, col(4.2), 2.63, col(5.0), 2.63);
arrow(s, col(6.7), 2.63, col(7.5), 2.63);
arrow(s, col(9.05), 2.63, col(9.8), 2.63);
body(s, ["전체 이미지를 직접 축소하지 않고 지역 patch를 잘라 학습함으로써 작은 건물 정보 손실을 줄였다."], col(0), 4.15, 7.8, 0.9, 13);
kpi(s, "384 → 256", "CROP / INPUT", col(8.4), 4.1, 2.6);

// 19
s = base("TRAINING", "Training Components", "19");
table(s, [
  ["TECHNIQUE", "PURPOSE"],
  ["Focal + Dice", "작은 건물 픽셀과 mask overlap 동시 최적화"],
  ["Flip TTA", "방향 변화에 따른 예측 흔들림 완화"],
  ["Min-area filtering", "작은 false positive 제거"],
  ["Hole filling", "건물 내부 빈 영역 보정"],
  ["Threshold sweep", "확률맵을 binary mask로 바꾸는 최적 기준 탐색"],
], col(0), 1.82, col(9.1) - col(0), 0.56);
kpi(s, "0.37", "BEST RECORDED THRESHOLD", col(9.5), 2.0, 2.5);

// 20
s = base("THRESHOLD", "Threshold Explained", "20");
table(s, [
  ["PIXEL PROB.", "THRESHOLD 0.37", "RESULT"],
  ["0.82", "> 0.37", "건물"],
  ["0.45", "> 0.37", "건물"],
  ["0.20", "<= 0.37", "배경"],
], col(0), 1.9, col(6.5) - col(0), 0.62);
body(s, ["threshold는 모델이 출력한 건물 확률을 최종 건물/배경 mask로 변환하는 기준값이다.", "낮추면 건물 예측이 늘고, 높이면 확실한 건물만 남는다."], col(7.1), 2.05, 4.0, 1.35, 13);
kpi(s, "0.37", "CUTOFF", col(8), 4.75, 1.75);

// 21
s = base("CODE", "Threshold Sweep Logic", "21");
codeBlock(s, `thresholds = np.arange(0.20, 0.50, 0.01)\n\nfor threshold in thresholds:\n    pred = (prob_map > threshold)\n    pred = postprocess_mask(pred)\n    score = dice_score(pred, target_mask)\n\nbest_threshold = threshold_with_max_dice`, col(0), 1.8, 6.35, 3.0, 8.2);
body(s, ["0.05 간격은 0.8 근처의 최적점을 놓칠 수 있어 0.01 간격으로 탐색했다.", "검증 데이터 기준으로 Dice가 가장 높은 threshold를 선택했다."], col(7.0), 2.0, 4.2, 1.35, 13);
kpi(s, "0.01", "SEARCH STEP", col(7.2), 4.55, 1.9);

// 22
s = base("TRANSFORM", "Train/Test Transform Split", "22");
table(s, [
  ["PHASE", "IMAGE SIZE", "TRANSFORM"],
  ["Train", "1024×1024", "RandomCrop 384 → Resize 256"],
  ["Validation", "1024×1024", "CenterCrop 384 → Resize 256"],
  ["Test", "224×224", "Resize-only, no 384 crop"],
], col(0), 1.9, col(8.8) - col(0), 0.68);
body(s, ["test 이미지는 224×224이므로 train과 같은 384 crop을 적용하면 오류가 발생한다.", "따라서 train/validation과 test transform을 분리했다."], col(9.2), 2.1, 2.55, 1.45, 12.5, C.red);

// 23
s = base("FINE-TUNE", "Fine-Tuning Problem", "23");
node(s, "10 epoch best\nDice 0.7991", col(0), 2.25, 2.2);
node(s, "scheduler LR\nreached 0.0", col(3.2), 2.25, 2.1, 0.56, true);
node(s, "simple resume\nnot enough", col(6.4), 2.25, 2.05);
arrow(s, col(2.35), 2.55, col(3.2), 2.55);
arrow(s, col(5.45), 2.55, col(6.4), 2.55);
body(s, ["기존 checkpoint는 이미 0.8에 가까웠지만, scheduler가 종료되어 단순 resume으로는 추가 학습 효과가 제한적이었다."], col(0), 4.2, 8.2, 1.0, 13);

// 24
s = base("FINE-TUNE", "Fine-Tuning Strategy", "24");
node(s, "load best\nweights only", col(0), 2.2, 2.05, 0.64, true);
node(s, "reset optimizer\nand scheduler", col(3.0), 2.2, 2.15);
node(s, "LR 3e-5", col(6.15), 2.2, 1.6);
node(s, "1 epoch\nfine-tune", col(8.65), 2.2, 1.8);
node(s, "evaluate\nthreshold", col(11.25), 2.2, 1.35, 0.64, true);
arrow(s, col(2.15), 2.52, col(3.0), 2.52);
arrow(s, col(5.25), 2.52, col(6.15), 2.52);
arrow(s, col(7.8), 2.52, col(8.65), 2.52);
arrow(s, col(10.55), 2.52, col(11.25), 2.52);
body(s, ["기존 표현력을 유지하면서 과적합 위험을 줄이기 위해 낮은 learning rate로 짧게 미세 조정했다."], col(0), 4.2, 8.4, 0.9, 13);

// 25
s = base("CONFIG", "Final Experiment Configuration", "25");
table(s, [
  ["PARAMETER", "VALUE"],
  ["Model", "UNet++ / ResNet34 encoder"],
  ["Crop / Input", "384 / 256"],
  ["Loss", "Focal + Dice"],
  ["Fine-tuning", "1 epoch, lr 3e-5"],
  ["Batch size", "16"],
  ["TTA / Post-process", "flip TTA, min-area, hole filling"],
], col(0), 1.82, col(7.1) - col(0), 0.52);
kpi(s, "MPS", "LOCAL DEVICE", col(7.8), 2.0, 1.85);
kpi(s, "1", "FINE-TUNE EPOCH", col(9.9), 2.0, 2.0);
kpi(s, "16", "BATCH SIZE", col(7.8), 3.35, 1.85);

// 26
s = base("RESULT", "Training Curve", "26");
image(s, img.trajectory, col(0), 1.68, 11.35, 4.9);

// 27
s = base("RESULT", "Score Movement", "27");
image(s, img.scoreBar, col(0), 1.78, 6.55, 3.55);
table(s, [
  ["RUN", "DICE", "THRESHOLD"],
  ["10 epoch base", "0.799052", "0.30"],
  ["threshold re-eval", "0.799162", "0.27"],
  ["best recorded fine-tune", "0.800705", "0.37"],
  ["latest rerun", "0.799779", "0.41"],
], col(7.05), 1.95, 4.6, 0.58);

// 28
s = base("RESULT", "Reproducibility Note", "28");
body(s, ["Fine-tuning은 random crop, MPS 연산, 1 epoch 미세 조정의 영향으로 재실행 시 소폭 변동이 발생할 수 있다.", "따라서 포트폴리오에는 최고 기록과 최신 재실행 결과를 함께 구분해 적는 것이 안전하다."], col(0), 1.95, col(7.2) - col(0), 1.6, 14, C.black);
table(s, [
  ["CLAIM", "SAFE WORDING"],
  ["Best recorded", "자체 holdout validation 최고 기록 Dice 0.8007"],
  ["Latest rerun", "최신 재실행 결과 Dice 0.7998"],
  ["Official score", "DACON 제출 전까지 미확인"],
], col(0), 4.0, col(9.2) - col(0), 0.56);
kpi(s, "HONEST", "SCORE BOUNDARY", col(9.6), 2.1, 2.1);

// 29
s = base("VISUAL", "Qualitative Overview", "29");
image(s, img.contact, col(0), 1.62, 11.55, 5.2);

// 30
s = base("CASE", "Strong Case", "30");
image(s, img.strong, col(0), 1.95, 7.25, 2.4);
kpi(s, "0.9181", "CROP DICE", col(8), 2.0, 2.0);
body(s, ["건물 위치와 외곽선이 안정적으로 일치한다.", "Patch training과 UNet++의 경계 복원 장점이 잘 드러나는 사례다."], col(8), 3.45, 3.2, 1.1, 13);

// 31
s = base("CASE", "Average Case", "31");
image(s, img.average, col(0), 1.95, 7.25, 2.4);
kpi(s, "0.7921", "CROP DICE", col(8), 2.0, 2.0);
body(s, ["대부분의 건물은 맞지만 일부 경계 오차가 남는다.", "실제 성능 수준을 균형 있게 보여주는 사례다."], col(8), 3.45, 3.2, 1.1, 13);

// 32
s = base("CASE", "Failure Signal", "32");
image(s, img.failure, col(0), 1.95, 7.25, 2.4);
kpi(s, "0.6528", "CROP DICE", col(8), 2.0, 2.0);
body(s, ["작은 오탐과 경계 확장이 남은 사례다.", "후처리 튜닝과 fold validation으로 개선 여지가 있다."], col(8), 3.45, 3.2, 1.1, 13);

// 33
s = base("ANALYSIS", "Failure Analysis", "33");
table(s, [
  ["OBSERVED ERROR", "LIKELY CAUSE", "NEXT ACTION"],
  ["Small false positives", "도로/그림자 혼동", "min-area grid search"],
  ["Boundary expansion", "threshold 민감도", "threshold/fold 검증"],
  ["Missed small buildings", "해상도 및 crop 위치", "multi-scale inference"],
  ["Split sensitivity", "single holdout", "K-fold validation"],
], col(0), 1.9, col(10.6) - col(0), 0.62);

// 34
s = base("CODE", "Final Code Structure", "34");
table(s, [
  ["COMPONENT", "ROLE"],
  ["Dataset class", "CSV row를 image/mask tensor로 변환"],
  ["RLE functions", "mask_rle decode / prediction encode"],
  ["Transforms", "train/val/test 입력 변환 분리"],
  ["Model factory", "U-Net, UNet++, DeepLabV3+ 선택"],
  ["Evaluation", "threshold sweep + Dice 계산"],
  ["Checkpoint", "best/last 모델 저장 및 재시작"],
], col(0), 1.8, col(10.4) - col(0), 0.53);

// 35
s = base("CODE", "RLE Decode Function", "35");
codeBlock(s, `def rle_decode(mask_rle, shape):\n    s = mask_rle.split()\n    starts, lengths = ...\n    starts -= 1\n    ends = starts + lengths\n\n    mask = np.zeros(shape[0] * shape[1])\n    for lo, hi in zip(starts, ends):\n        mask[lo:hi] = 1\n    return mask.reshape(shape)`, col(0), 1.8, 5.65, 3.3, 8.1);
body(s, ["CSV에 저장된 RLE 문자열을 실제 0/1 binary mask로 복원한다.", "모델 학습은 문자열이 아니라 이미지 형태의 mask가 필요하기 때문에 필수 전처리 단계다."], col(6.4), 2.0, 4.3, 1.35, 13);

// 36
s = base("CODE", "Fine-Tuning Checkpoint Logic", "36");
codeBlock(s, `if init_checkpoint_dir is not None:\n    checkpoint = torch.load(best_checkpoint)\n    model.load_state_dict(checkpoint[\"model_state_dict\"])\n    # optimizer / scheduler are reset\n\noptimizer = AdamW(model.parameters(), lr=3e-5)`, col(0), 1.9, 6.05, 2.55, 8.3);
body(s, ["기존 best weight만 가져오고 optimizer와 scheduler는 새로 시작한다.", "마지막 learning rate가 0에 가까워진 상태에서 단순 resume하는 문제를 피하기 위한 변경이다."], col(6.7), 2.05, 4.4, 1.45, 13);

// 37
s = base("CODE", "Validation And Best Threshold", "37");
codeBlock(s, `for threshold in thresholds:\n    dices = []\n    for prob, mask in validation_outputs:\n        pred = prob > threshold\n        pred = postprocess_mask(pred)\n        dices.append(dice_score(pred, mask))\n\nbest_threshold = threshold_with_max_mean_dice`, col(0), 1.85, 6.25, 3.0, 8.1);
body(s, ["threshold를 고정하지 않고 validation Dice가 가장 높은 값을 선택했다.", "이 과정이 최종 mask 품질과 score에 직접적인 영향을 준다."], col(7.0), 2.05, 4.2, 1.3, 13);

// 38
s = base("DEBUG", "Issues And Fixes", "38");
table(s, [
  ["ISSUE", "CAUSE", "FIX"],
  ["Package missing", "실행 환경에 torch/albumentations 없음", "필요 패키지 설치"],
  ["Numpy conflict", "numpy 2.x 호환 문제", "numpy 1.26.4 복구"],
  ["Crop error", "test image 224×224", "test transform 분리"],
  ["LR reached 0", "scheduler 종료", "weight-only init"],
  ["Slow threshold sweep", "후처리 반복 계산", "eval-only 단계 분리"],
], col(0), 1.8, col(10.7) - col(0), 0.56);

// 39
s = base("EVALUATION", "Evaluation Criteria Mapping", "39");
table(s, [
  ["CRITERION", "EVIDENCE"],
  ["데이터 분석", "CSV, RLE, 해상도 차이, holdout split 분석"],
  ["모델 검증", "Dice, threshold sweep, 학습 curve, 정성 결과"],
  ["알고리즘", "UNet++, patch training, Focal+Dice, TTA"],
  ["적용 가능성", "지도 갱신, 재난 분석, 도시 변화 탐지"],
  ["전달력", "표, 그래프, 사례 이미지, 코드 snippet 활용"],
], col(0), 1.82, col(10.2) - col(0), 0.58);

// 40
s = base("ROLE", "Contribution Summary", "40");
table(s, [
  ["AREA", "CONTRIBUTION"],
  ["Data", "DACON 데이터 구조와 RLE mask 형식 분석"],
  ["Validation", "train/holdout split 기반 검증 체계 설계"],
  ["Modeling", "U-Net baseline, UNet++ patch training 구성"],
  ["Optimization", "Focal+Dice, TTA, 후처리, threshold sweep 적용"],
  ["Debugging", "환경 충돌, crop 오류, scheduler 문제 해결"],
  ["Communication", "정량/정성 결과를 포트폴리오 형태로 정리"],
], col(0), 1.8, col(10.2) - col(0), 0.52);

// 41
s = base("LIMITS", "Limitations And Ethical Claim", "41");
table(s, [
  ["LIMIT", "WHY IT MATTERS"],
  ["Not official Private Score", "대회 제출 전까지 공식 점수는 미확인"],
  ["Single holdout split", "split seed에 따른 점수 변동 가능"],
  ["Fine-tune variance", "random crop/MPS/짧은 학습으로 재실행 편차 가능"],
  ["Single final model", "앙상블 실험 여지 존재"],
], col(0), 1.9, col(8.2) - col(0), 0.64);
body(s, ["안전한 표현: 자체 holdout validation 기준 최고 기록 Dice 0.8007, 최신 재실행 Dice 0.7998"], col(8.6), 2.0, 2.95, 1.35, 12.5, C.red);

// 42
s = base("NEXT", "Next Experiments", "42");
step(s, "01", "DACON submission으로 공식 점수 확인", col(0), 1.9, 5.2);
step(s, "02", "K-fold validation으로 split 민감도 검증", col(0), 2.8, 5.2);
step(s, "03", "Seed ensemble로 예측 안정성 개선", col(0), 3.7, 5.2);
step(s, "04", "UNet++ + DeepLabV3+ soft voting 비교", col(0), 4.6, 5.2);
step(s, "05", "Threshold/post-processing grid search 고도화", col(0), 5.5, 5.2);
node(s, "Current\n0.7998~0.8007", col(7.5), 2.35, 2.1, 0.75, true);
node(s, "Official\nsubmission", col(10.2), 2.35, 1.85);
arrow(s, col(9.65), 2.72, col(10.2), 2.72);

// 43
s = base("INTERVIEW", "One-Minute Interview Script", "43");
body(s, ["이 프로젝트는 위성 이미지에서 건물 영역을 픽셀 단위로 분할하는 semantic segmentation 프로젝트입니다. 데이터의 CSV 구조와 RLE 마스크 형식을 분석하고, train 데이터를 holdout으로 분리해 자체 검증 체계를 만들었습니다. 초기 U-Net baseline에서는 1024 이미지를 224로 줄이면서 작은 건물 경계가 손실되는 문제가 있었고, 이를 해결하기 위해 UNet++ 기반 patch training을 적용했습니다. 이후 Focal+Dice loss, TTA, 후처리, threshold sweep을 적용했고, 기존 best checkpoint에서 낮은 learning rate로 fine-tuning해 0.8 수준의 holdout Dice를 기록했습니다."], col(0), 1.85, col(9.5) - col(0), 3.0, 13.5, C.black);
node(s, "Data", col(0), 5.35, 1.2);
node(s, "Model", col(2), 5.35, 1.25);
node(s, "Validation", col(4.05), 5.35, 1.55);
node(s, "Result", col(6.55), 5.35, 1.25, 0.56, true);
arrow(s, col(1.25), 5.63, col(2), 5.63);
arrow(s, col(3.25), 5.63, col(4.05), 5.63);
arrow(s, col(5.65), 5.63, col(6.55), 5.63);

// 44
s = base("CLOSING", "Final Takeaway", "44");
body(s, ["핵심 성과는 모델을 단순히 실행한 것이 아니라, 데이터 구조와 평가 기준을 이해하고 성능 병목을 찾아 코드와 실험 설계를 개선한 과정이다.", "이 프로젝트는 데이터 이해, 전처리, 모델링, 검증 설계, 디버깅, 결과 해석 역량을 함께 보여준다."], col(0), 2.05, col(7.3) - col(0), 1.7, 16, C.black);
kpi(s, "0.8007", "BEST RECORDED HOLDOUT DICE", col(8), 2.05, 2.8);
kpi(s, "0.7998", "LATEST RERUN HOLDOUT DICE", col(8), 3.45, 2.8);
kpi(s, "44", "SLIDES", col(10.7), 3.45, 1.45);

pptx.writeFile({ fileName: PPTX_PATH });
console.log(PPTX_PATH);
