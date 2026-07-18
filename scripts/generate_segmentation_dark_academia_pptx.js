const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.PROJECT_ROOT || process.cwd();
const OUT_DIR = path.join(ROOT, "output", "portfolio");
const RUN_DIR = path.join(ROOT, "runs", "dacon_raw_patch_unetpp_v1");
const QUAL_DIR = path.join(RUN_DIR, "qualitative_results");
const PPTX_PATH = path.join(OUT_DIR, "segmentation_portfolio_dark_academia.pptx");

fs.mkdirSync(OUT_DIR, { recursive: true });

const pptx = new pptxgen();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
pptx.author = "hamdodam";
pptx.subject = "Satellite Image Building Area Segmentation Portfolio";
pptx.title = "Segmentation Portfolio - Dark Academia";
pptx.company = "Personal Portfolio";
pptx.lang = "ko-KR";
pptx.theme = {
  headFontFace: "Georgia",
  bodyFontFace: "Apple SD Gothic Neo",
  lang: "ko-KR",
};

const C = {
  bg: "1A1208",
  bgDeep: "0E0A05",
  gold: "C9A84C",
  parchment: "D4BF9A",
  border: "3D2E10",
  accent: "8A7340",
  red: "B15B46",
  black: "000000",
};

const W = 13.333;
const H = 7.5;

const chart = path.join(RUN_DIR, "epoch_1_10_results_dark_academia.png");
const contact = path.join(QUAL_DIR, "segmentation_validation_contact_sheet.png");
const panels = {
  strong: path.join(QUAL_DIR, "07_TRAIN_6013_segmentation.png"),
  average: path.join(QUAL_DIR, "04_TRAIN_2657_segmentation.png"),
  failure: path.join(QUAL_DIR, "06_TRAIN_1274_segmentation.png"),
  cover: path.join(QUAL_DIR, "02_TRAIN_6115_segmentation.png"),
  extra: path.join(QUAL_DIR, "03_TRAIN_1002_segmentation.png"),
};

function exists(p) {
  return fs.existsSync(p);
}

function addBackground(slide, section = "ARCHIVE") {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.bg }, line: { color: C.bg } });

  // Style 04 signature: double inset gold frame and quiet scholarly ornaments.
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.28,
    y: 0.28,
    w: W - 0.56,
    h: H - 0.56,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.gold, transparency: 35, width: 0.85 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.46,
    y: 0.46,
    w: W - 0.92,
    h: H - 0.92,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.border, transparency: 10, width: 0.9 },
  });
  slide.addShape(pptx.ShapeType.line, { x: 0.72, y: 1.62, w: 4.4, h: 0, line: { color: C.gold, transparency: 30, width: 0.8 } });
  slide.addShape(pptx.ShapeType.line, { x: 8.3, y: 6.82, w: 4.25, h: 0, line: { color: C.gold, transparency: 30, width: 0.8 } });
  slide.addText(section, {
    x: 0.72,
    y: 6.82,
    w: 3.6,
    h: 0.18,
    fontFace: "Space Mono",
    fontSize: 7.2,
    color: C.accent,
    charSpace: 2.5,
    margin: 0,
  });
  slide.addText("DACON BUILDING SEGMENTATION · HOLDOUT STUDY", {
    x: 7.0,
    y: 0.5,
    w: 5.4,
    h: 0.18,
    fontFace: "Space Mono",
    fontSize: 6.6,
    color: C.accent,
    charSpace: 1.8,
    margin: 0,
    align: "right",
  });
}

function title(slide, text, subtitle = "") {
  slide.addText(text, {
    x: 0.78,
    y: 0.78,
    w: 10.2,
    h: 0.58,
    fontFace: "Georgia",
    italic: true,
    fontSize: 25,
    color: C.gold,
    margin: 0,
    fit: "shrink",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.8,
      y: 1.37,
      w: 8.6,
      h: 0.25,
      fontFace: "Space Mono",
      fontSize: 7.3,
      color: C.accent,
      charSpace: 1.2,
      margin: 0,
      fit: "shrink",
    });
  }
}

function body(slide, lines, x, y, w, h, size = 12) {
  slide.addText(lines.join("\n"), {
    x,
    y,
    w,
    h,
    fontFace: "Apple SD Gothic Neo",
    fontSize: size,
    color: C.parchment,
    breakLine: false,
    fit: "shrink",
    margin: 0.04,
    paraSpaceAfterPt: 7,
  });
}

function frame(slide, x, y, w, h, alpha = 22) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.bgDeep, transparency: 15 },
    line: { color: C.gold, transparency: alpha, width: 0.8 },
  });
}

function image(slide, imgPath, x, y, w, h) {
  frame(slide, x - 0.04, y - 0.04, w + 0.08, h + 0.08, 25);
  if (exists(imgPath)) {
    slide.addImage({ path: imgPath, x, y, w, h });
  } else {
    slide.addText("Image missing", { x, y: y + h / 2, w, h: 0.25, fontFace: "Georgia", fontSize: 12, color: C.red, align: "center" });
  }
}

function kpi(slide, value, label, x, y, w = 2.2) {
  frame(slide, x, y, w, 0.92, 28);
  slide.addText(value, { x: x + 0.12, y: y + 0.12, w: w - 0.24, h: 0.4, fontFace: "Georgia", italic: true, fontSize: 20, color: C.gold, margin: 0 });
  slide.addText(label, { x: x + 0.12, y: y + 0.58, w: w - 0.24, h: 0.18, fontFace: "Space Mono", fontSize: 6.4, color: C.accent, charSpace: 1.1, margin: 0 });
}

function table(slide, rows, x, y, w, rowH = 0.48) {
  rows.forEach((row, i) => {
    frame(slide, x, y + i * rowH, w, rowH, i === 0 ? 12 : 58);
    const colW = w / row.length;
    row.forEach((cell, j) => {
      slide.addText(cell, {
        x: x + j * colW + 0.08,
        y: y + i * rowH + 0.12,
        w: colW - 0.16,
        h: rowH - 0.08,
        fontFace: i === 0 ? "Space Mono" : "Apple SD Gothic Neo",
        fontSize: i === 0 ? 7.0 : 9.1,
        color: i === 0 ? C.gold : C.parchment,
        bold: i === 0,
        fit: "shrink",
        margin: 0,
      });
    });
  });
}

function node(slide, text, x, y, w, h = 0.56) {
  frame(slide, x, y, w, h, 35);
  slide.addText(text, { x: x + 0.08, y: y + 0.15, w: w - 0.16, h: h - 0.18, fontFace: "Apple SD Gothic Neo", fontSize: 10.2, color: C.parchment, align: "center", margin: 0, fit: "shrink" });
}

function arrow(slide, x1, y1, x2, y2) {
  slide.addShape(pptx.ShapeType.line, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color: C.gold, transparency: 30, width: 1.1, endArrowType: "triangle" } });
}

function base(section, heading, subtitle) {
  const slide = pptx.addSlide();
  addBackground(slide, section);
  title(slide, heading, subtitle);
  return slide;
}

let s;

s = base("FOLIO I", "Satellite Image Building Area Segmentation", "DACON RAW HOLDOUT · UNET++ PATCH TRAINING");
body(s, ["위성영상에서 건물 영역을 픽셀 단위로 분할하는 AI 프로젝트", "데이터 구조 분석, 모델 학습, 검증 설계, 결과 시각화까지 end-to-end 수행"], 0.88, 2.0, 5.5, 1.8, 13);
kpi(s, "0.7991", "HOLDOUT VALIDATION DICE", 0.88, 5.35, 2.6);
kpi(s, "10", "EPOCHS", 3.74, 5.35, 1.55);
kpi(s, "0.30", "BEST THRESHOLD", 5.55, 5.35, 2.05);
image(s, panels.cover, 7.35, 2.0, 4.9, 1.6);

s = base("FOLIO II", "Project at a Glance", "PROBLEM · DATA · METHOD · RESULT");
table(s, [
  ["Item", "Summary"],
  ["Problem", "위성영상에서 건물 영역을 semantic segmentation으로 검출"],
  ["Data", "DACON raw train 7140장, test 60640장"],
  ["Validation", "train 5712 / holdout 1428 split"],
  ["Model", "UNet++ / ResNet34 encoder"],
  ["Result", "holdout Dice 0.7991"],
], 0.85, 1.95, 7.2, 0.58);
image(s, chart, 8.35, 2.0, 3.9, 2.55);

s = base("QUESTION", "What Is Being Predicted?", "IMAGE → BUILDING MASK");
node(s, "Satellite image", 1.0, 2.4, 2.3);
node(s, "UNet++ model", 4.0, 2.4, 2.1);
node(s, "Building mask", 6.85, 2.4, 2.25);
arrow(s, 3.35, 2.68, 4.0, 2.68);
arrow(s, 6.2, 2.68, 6.85, 2.68);
body(s, ["모델은 이미지 전체를 보고 각 픽셀이 건물인지 배경인지 판단한다.", "이 문제는 단순 분류가 아니라 픽셀 단위 위치와 경계를 맞추는 문제다."], 1.0, 3.75, 7.6, 1.5);
kpi(s, "PIXEL", "LEVEL TASK", 9.8, 2.38, 1.8);

s = base("DATA", "Original DACON Data", "RAW FILE STRUCTURE");
table(s, [
  ["File", "Meaning", "Why Needed"],
  ["train_img", "1024x1024 satellite images", "모델이 공부할 원본 이미지"],
  ["train.csv", "img path + mask_rle", "정답 마스크 복원"],
  ["test_img", "224x224 inference images", "제출용 예측 대상"],
  ["sample_submission", "img_id + mask_rle", "제출 형식 확인"],
], 0.85, 1.95, 9.2, 0.62);
kpi(s, "7140", "TRAIN IMAGES", 10.4, 2.0, 1.7);
kpi(s, "60640", "TEST IMAGES", 10.4, 3.15, 1.7);

s = base("SPLIT", "Holdout Validation Design", "WHY WE SPLIT TRAIN.CSV");
node(s, "raw train.csv", 1.0, 2.15, 2.1);
node(s, "train 5712", 4.0, 1.75, 1.8);
node(s, "holdout 1428", 4.0, 2.9, 2.1);
arrow(s, 3.25, 2.43, 4.0, 2.03);
arrow(s, 3.25, 2.43, 4.0, 3.18);
body(s, ["공식 test 정답은 없기 때문에 train 데이터 일부를 시험지처럼 남겨둔다.", "이 holdout 점수로 모델 변경이 실제로 좋아졌는지 확인한다."], 6.8, 2.0, 4.7, 1.8);
kpi(s, "0.2", "VALIDATION RATIO", 6.9, 4.45, 2.2);

s = base("ENCODING", "RLE Mask Processing", "STRING LABELS INTO BINARY MASKS");
node(s, "mask_rle", 0.95, 2.45, 1.7);
node(s, "decode", 3.0, 2.45, 1.5);
node(s, "binary mask", 5.0, 2.45, 1.9);
node(s, "model output", 7.45, 2.45, 2.0);
node(s, "encode / -1", 10.0, 2.45, 1.85);
[2.65, 4.6, 7.0, 9.55].forEach((x) => arrow(s, x, 2.73, x + 0.35, 2.73));
body(s, ["RLE는 마스크 이미지를 긴 그림 파일 대신 짧은 문자열로 저장하는 방식이다.", "학습할 때는 RLE를 mask로 복원하고, 제출할 때는 다시 RLE로 바꾼다."], 1.0, 3.75, 9.8, 1.5);

s = base("DIFFICULTY", "Why This Task Is Difficult", "SMALL OBJECTS · BOUNDARIES · IMBALANCE");
image(s, panels.failure, 0.85, 1.95, 5.55, 1.82);
table(s, [
  ["Difficulty", "Effect"],
  ["작은 건물", "resize에서 경계가 사라짐"],
  ["그림자/도로", "건물로 잘못 예측 가능"],
  ["배경 비율 큼", "loss가 배경 중심으로 치우침"],
], 7.0, 2.05, 4.6, 0.62);

s = base("BASELINE", "Baseline Setup", "STARTING POINT BEFORE IMPROVEMENT");
table(s, [
  ["Component", "Baseline"],
  ["Model", "U-Net"],
  ["Input", "224 resize"],
  ["Loss", "BCE + Dice"],
  ["Purpose", "비교 기준 확보"],
], 0.9, 1.95, 5.4, 0.62);
body(s, ["baseline은 최종 성능용 모델이 아니라 비교 기준이다.", "여기서 병목을 찾고 다음 실험 방향을 정했다."], 7.1, 2.15, 4.4, 1.4);
kpi(s, "224", "BASELINE INPUT", 7.1, 4.45, 1.8);

s = base("BOTTLENECK", "The Main Bottleneck", "1024 TILE SHRUNK TO 224");
node(s, "1024x1024", 1.1, 2.35, 1.8);
node(s, "224x224", 4.0, 2.35, 1.8);
node(s, "boundary loss", 6.95, 2.35, 2.2);
arrow(s, 3.15, 2.62, 4.0, 2.62);
arrow(s, 5.95, 2.62, 6.95, 2.62);
body(s, ["전체 위성 이미지를 작은 크기로 줄이면 작은 건물과 얇은 경계가 흐려진다.", "성능 개선의 핵심은 모델을 무작정 키우는 것보다 입력 정보를 덜 잃게 만드는 것이었다."], 1.1, 3.75, 9.5, 1.55);

s = base("MODEL", "Why UNet++ Was Selected", "BOUNDARY REFINEMENT MATTERS");
table(s, [
  ["Model", "Role", "Reason"],
  ["U-Net", "baseline", "가장 기본적인 segmentation 구조"],
  ["DeepLabV3+", "comparison", "넓은 문맥 정보를 반영"],
  ["UNet++", "final", "skip connection 강화로 경계 복원에 유리"],
], 0.85, 2.0, 9.25, 0.68);
kpi(s, "UNet++", "FINAL MODEL", 10.4, 2.0, 1.8);

s = base("METHOD", "Patch-Based Training", "384 CROP → 256 INPUT");
node(s, "1024 tile", 0.95, 2.35, 1.7);
node(s, "384 crop", 3.35, 2.35, 1.7);
node(s, "256 input", 5.75, 2.35, 1.75);
node(s, "UNet++", 8.15, 2.35, 1.55);
node(s, "mask", 10.35, 2.35, 1.3);
[2.9, 5.3, 7.75, 9.95].forEach((x) => arrow(s, x, 2.63, x + 0.4, 2.63));
body(s, ["원본 이미지를 한 번에 축소하지 않고 crop을 잘라 학습한다.", "작은 건물과 지역적 경계 정보를 더 잘 보존한다."], 0.95, 3.7, 8.7, 1.3);

s = base("LOSS", "Loss, TTA, Post-Processing", "SMALL BUILDING FOCUSED TRAINING");
table(s, [
  ["Technique", "Reason"],
  ["Focal + Dice", "어려운 픽셀과 mask overlap을 함께 최적화"],
  ["Flip TTA", "좌우/상하 방향 변화에 강한 예측"],
  ["Min-area filtering", "작은 오탐 제거"],
  ["Hole filling", "건물 내부 빈 공간 보정"],
  ["Threshold sweep", "validation에 맞는 cutoff 탐색"],
], 0.85, 1.85, 9.2, 0.58);
kpi(s, "0.30", "BEST THRESHOLD", 10.4, 2.0, 1.8);

s = base("CODE", "Code Improvements", "WHAT CHANGED IN THE PROJECT");
table(s, [
  ["Code Change", "Meaning"],
  ["holdout split", "원본 train에서 validation을 분리"],
  ["crop_size", "patch training 가능"],
  ["custom focal loss", "MPS 환경에서도 동작"],
  ["TTA/postprocess", "예측 mask 안정화"],
  ["resume runner", "학습 중단 후 재개"],
  ["test transform split", "224x224 test crop 오류 해결"],
], 0.85, 1.8, 10.0, 0.52);

s = base("CONFIG", "Final Training Configuration", "REPRODUCIBLE SETTINGS");
table(s, [
  ["Parameter", "Value"],
  ["Data", "DACON raw holdout"],
  ["Train / Val", "5712 / 1428"],
  ["Model", "UNet++ / ResNet34 encoder"],
  ["Crop / Input", "384 / 256"],
  ["Loss", "Focal + Dice"],
  ["Epochs", "10"],
], 0.9, 1.85, 6.2, 0.55);
kpi(s, "0.7991", "VALIDATION DICE", 7.7, 2.0, 2.2);
kpi(s, "10", "BEST EPOCH", 10.15, 2.0, 1.6);
kpi(s, "0.30", "THRESHOLD", 8.75, 3.25, 1.8);

s = base("RESULT", "Epoch 1-10 Result", "TRAIN LOSS AND VALIDATION DICE");
image(s, chart, 0.82, 1.78, 11.7, 5.15);

s = base("TRACE", "Numeric Training Trace", "EPOCH-BY-EPOCH RECORD");
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
], 0.9, 1.55, 7.4, 0.43);
body(s, ["epoch 1 이후 Dice가 꾸준히 상승했고, epoch 10에서 최고값을 기록했다.", "0.8에 매우 근접한 holdout validation 결과다."], 9.0, 2.0, 3.0, 1.6);

s = base("VISUAL", "Qualitative Validation Results", "ORIGINAL · GT · PREDICTION · OVERLAY");
image(s, contact, 0.75, 1.55, 11.85, 5.6);

s = base("CASE I", "Strong Case", "HIGH OVERLAP EXAMPLE");
image(s, panels.strong, 0.85, 2.05, 7.1, 2.32);
kpi(s, "0.9181", "CROP DICE", 8.55, 2.05, 2.0);
body(s, ["건물 위치와 외곽선이 안정적으로 맞는 대표 사례다.", "정성 결과 슬라이드에서 가장 강하게 보여줄 수 있는 이미지다."], 8.55, 3.4, 3.4, 1.35);

s = base("CASE II", "Average Case", "REALISTIC BOUNDARY ALIGNMENT");
image(s, panels.average, 0.85, 2.05, 7.1, 2.32);
kpi(s, "0.7921", "CROP DICE", 8.55, 2.05, 2.0);
body(s, ["대부분의 건물 영역은 맞지만 일부 경계 오차가 남는다.", "모델의 현실적인 성능을 보여주는 균형 잡힌 사례다."], 8.55, 3.4, 3.4, 1.35);

s = base("CASE III", "Failure Signal", "FALSE POSITIVE AND BOUNDARY NOISE");
image(s, panels.failure, 0.85, 2.05, 7.1, 2.32);
kpi(s, "0.6528", "CROP DICE", 8.55, 2.05, 2.0);
body(s, ["작은 오탐과 경계 확장이 남은 사례다.", "추가 개선은 후처리 튜닝과 fold validation이 유효하다."], 8.55, 3.4, 3.4, 1.35);

s = base("ISSUE", "Inference Issue and Fix", "TEST IMAGE SIZE IS DIFFERENT");
table(s, [
  ["Phase", "Before", "After"],
  ["Train/Val", "384 crop", "384 crop 유지"],
  ["Test", "384 crop 적용", "crop 없이 224 resize"],
  ["Problem", "CropSizeError", "크기 오류 해결"],
], 0.85, 2.0, 8.6, 0.68);
body(s, ["학습 이미지와 test 이미지 크기가 달라서 transform을 분리했다.", "이 수정은 제출 파일 생성 단계에서 필요하다."], 9.8, 2.15, 2.6, 1.4);

s = base("EVALUATION", "Evaluation Criteria Mapping", "WHY THIS PROJECT IS PORTFOLIO-READY");
table(s, [
  ["Criterion", "Evidence"],
  ["데이터 분석", "RLE, 해상도 차이, holdout split 분석"],
  ["모델 검증", "Dice, threshold sweep, epoch curve"],
  ["알고리즘", "UNet++, patch training, Focal+Dice"],
  ["적용 가능성", "건물 지도 갱신, 재난 분석, 도시 변화 탐지"],
  ["전달력", "정량 그래프와 정성 이미지로 설명"],
], 0.85, 1.9, 10.4, 0.62);

s = base("ROLE", "My Contribution", "WHAT I DIRECTLY BUILT");
table(s, [
  ["Area", "Contribution"],
  ["Data", "원본 DACON 데이터 정리와 holdout split 생성"],
  ["Training", "UNet++ patch 학습 파이프라인 구성"],
  ["Improvement", "Focal+Dice, TTA, 후처리, resume 추가"],
  ["Debugging", "test crop 오류와 validation limit 오류 수정"],
  ["Visualization", "학습 곡선, 정성 결과, PPT 자동 생성"],
], 0.85, 1.9, 10.1, 0.62);

s = base("LIMITS", "Limitations and Next Steps", "HONEST CLAIM, STRONG DIRECTION");
table(s, [
  ["Limitation", "Next Action"],
  ["공식 Private 점수 아님", "leaderboard 제출로 재검증"],
  ["holdout split 민감도", "seed/fold validation"],
  ["0.8 바로 아래", "12~15 epoch 및 앙상블"],
  ["test inference 분리 필요", "resize-only inference로 제출 생성"],
], 0.9, 1.95, 9.6, 0.65);
kpi(s, "0.8+", "NEXT TARGET", 10.75, 2.05, 1.5);

s = base("SCRIPT", "One-Minute Explanation", "INTERVIEW VERSION");
body(s, ["이 프로젝트는 DACON 위성영상 건물 분할 문제를 원본 데이터 기준으로 재현하고 개선한 실험입니다. 원본 train 데이터를 holdout으로 분리해 검증 체계를 만들었고, 초기 224 resize 방식이 작은 건물 경계를 손상시킨다고 판단했습니다. 이를 해결하기 위해 384 crop 기반 patch training과 UNet++를 적용했고, Focal+Dice loss, flip TTA, 후처리를 추가했습니다. 최종적으로 10 epoch 학습에서 holdout validation Dice 0.7991을 기록했습니다."], 0.9, 1.95, 10.8, 3.1, 13);

s = base("REFERENCE", "Code and Output References", "FILES USED IN THIS PORTFOLIO");
table(s, [
  ["File", "Meaning"],
  ["prepare_dacon_raw_holdout.py", "train/validation split"],
  ["train_segmentation_pipeline.py", "UNet++ patch training"],
  ["run_raw_patch_until_complete.sh", "epoch 10 auto-runner"],
  ["epoch_1_10_results_dark_academia.png", "training curve"],
  ["qualitative_results/*.png", "segmentation visual results"],
], 0.85, 1.9, 10.5, 0.6);

s = base("CONCLUSION", "Final Takeaway", "FROM BASELINE TO EXPERIMENT DESIGN");
body(s, ["핵심 성과는 단순히 segmentation 모델을 실행한 것이 아니라, 데이터 구조와 해상도 병목을 분석하고 코드 수준의 개선으로 성능을 끌어올린 과정이다.", "이 프로젝트는 AI/데이터 직무에서 요구되는 데이터 처리, 모델링, 검증 설계, 디버깅, 시각화 역량을 함께 보여준다."], 0.9, 2.0, 8.0, 2.2, 13);
kpi(s, "0.7991", "FINAL HOLDOUT DICE", 9.3, 2.05, 2.4);
kpi(s, "27", "SLIDES", 9.3, 3.35, 2.4);

pptx.writeFile({ fileName: PPTX_PATH });
console.log(PPTX_PATH);
