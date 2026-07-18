const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.PROJECT_ROOT || process.cwd();
const OUT_DIR = process.env.PORTFOLIO_OUTPUT_DIR || path.join(ROOT, "output", "portfolio");
const ASSET_DIR = process.env.PORTFOLIO_ASSET_DIR || path.join(OUT_DIR, "editable_slide_source_assets");
const PPTX_PATH = path.join(OUT_DIR, "segmentation_visual_editable_slides_v2.pptx");

const RAW_HISTORY = path.join(ROOT, "runs/dacon_raw_patch_unetpp_v1/unetplusplus_history.csv");
const PROXY_HISTORY = path.join(ROOT, "runs/dacon_proxy_patch_v4/unetplusplus_history.csv");
const DETECTION_METRICS = path.join(ROOT, "runs/detectron2_spacenet_full_khartoum/metrics.json");
const DETECTION_VAL = path.join(ROOT, "data/spacenet_detectron2_full_khartoum/val_coco.json");
const DETECTION_PREDS = path.join(ROOT, "runs/detectron2_spacenet_full_khartoum/inference/coco_instances_results.json");

const pptx = new pptxgen();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
pptx.author = "hamdodam";
pptx.company = "Personal Portfolio";
pptx.subject = "Editable Satellite Segmentation Visual Slides";
pptx.title = "Editable Satellite Segmentation Visual Slides";
pptx.lang = "ko-KR";
pptx.theme = {
  headFontFace: "Arial",
  bodyFontFace: "Apple SD Gothic Neo",
  lang: "ko-KR",
};

const C = {
  bg: "FFFFFF",
  off: "FAFAFA",
  black: "111111",
  gray: "444444",
  light: "DDDDDD",
  pale: "F4F4F4",
  red: "E8000D",
  green: "00A650",
  blue: "2563EB",
  orange: "F97316",
};

const W = 13.333;
const H = 7.5;
const M = 0.72;
const BAR = 0.12;
const COL = (W - M * 2) / 12;
const ko = "Apple SD Gothic Neo";
const mono = "Space Mono";

function col(n) {
  return M + COL * n;
}

function exists(p) {
  return fs.existsSync(p);
}

function readCsv(file) {
  const text = fs.readFileSync(file, "utf8").trim();
  const [header, ...lines] = text.split(/\r?\n/);
  const cols = header.split(",");
  return lines.map((line) => {
    const vals = line.split(",");
    const row = {};
    cols.forEach((c, i) => {
      const raw = vals[i];
      const num = Number(raw);
      row[c] = Number.isFinite(num) && raw !== "" ? num : raw;
    });
    return row;
  });
}

function readJsonLines(file) {
  if (!exists(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function addBase(slide, section = "EDITABLE VISUALS") {
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
    y: 1.42,
    w: W - M * 2,
    h: 0,
    line: { color: C.light, width: 1 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 11.6,
    y: 6.18,
    w: 0.68,
    h: 0.68,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.red, width: 1.2 },
  });
  slide.addText(section, {
    x: M,
    y: 6.9,
    w: 6,
    h: 0.2,
    fontFace: mono,
    fontSize: 7,
    color: C.gray,
    charSpace: 2,
    margin: 0,
  });
}

function title(slide, text, page) {
  slide.addText(text, {
    x: M,
    y: 0.6,
    w: 9.6,
    h: 0.58,
    fontFace: "Arial",
    bold: true,
    fontSize: 24,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
  if (page) {
    slide.addText(page, {
      x: 11.2,
      y: 0.72,
      w: 1.2,
      h: 0.24,
      fontFace: mono,
      fontSize: 8,
      color: C.red,
      charSpace: 1.6,
      align: "right",
      margin: 0,
    });
  }
}

function slide(section, heading, page) {
  const s = pptx.addSlide();
  addBase(s, section);
  title(s, heading, page);
  return s;
}

function body(s, lines, x, y, w, h, size = 12, color = C.gray) {
  s.addText(lines.join("\n"), {
    x,
    y,
    w,
    h,
    fontFace: ko,
    fontSize: size,
    color,
    margin: 0,
    breakLine: false,
    fit: "shrink",
    paraSpaceAfterPt: 6,
  });
}

function label(s, text, x, y, w, color = C.red) {
  s.addText(text, {
    x,
    y,
    w,
    h: 0.18,
    fontFace: mono,
    fontSize: 7,
    color,
    charSpace: 1.8,
    margin: 0,
    fit: "shrink",
  });
}

function node(s, text, x, y, w, h = 0.62, accent = false) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: accent ? C.red : C.bg, transparency: accent ? 0 : 100 },
    line: { color: accent ? C.red : C.black, width: 1.1 },
  });
  s.addText(text, {
    x: x + 0.08,
    y: y + 0.1,
    w: w - 0.16,
    h: h - 0.16,
    fontFace: ko,
    fontSize: 10.2,
    bold: accent,
    color: accent ? C.bg : C.black,
    align: "center",
    valign: "mid",
    margin: 0,
    fit: "shrink",
  });
}

function arrow(s, x1, y1, x2, y2, color = C.red, width = 1.2) {
  s.addShape(pptx.ShapeType.line, {
    x: x1,
    y: y1,
    w: x2 - x1,
    h: y2 - y1,
    line: { color, width, endArrowType: "triangle" },
  });
}

function kpi(s, value, text, x, y, w = 2.2) {
  s.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color: C.red, width: 1.8 } });
  s.addText(value, {
    x,
    y: y + 0.15,
    w,
    h: 0.5,
    fontFace: "Arial",
    bold: true,
    fontSize: 23,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
  s.addText(text, {
    x,
    y: y + 0.74,
    w,
    h: 0.25,
    fontFace: mono,
    fontSize: 6.5,
    color: C.gray,
    charSpace: 1,
    margin: 0,
    fit: "shrink",
  });
}

function table(s, rows, x, y, w, rowH = 0.44, widths = null) {
  const colCount = rows[0].length;
  const colWs = widths || Array(colCount).fill(w / colCount);
  s.addTable(rows, {
    x,
    y,
    w,
    h: rowH * rows.length,
    colW: colWs,
    rowH: Array(rows.length).fill(rowH),
    fontFace: ko,
    fontSize: 8.5,
    color: C.gray,
    border: { type: "solid", color: C.light, pt: 0.7 },
    margin: 0.06,
    autoFit: false,
    fill: { color: C.bg },
    valign: "mid",
  });
  // Header overlay makes the first row visually distinct while remaining editable.
  let xx = x;
  rows[0].forEach((cell, i) => {
    s.addShape(pptx.ShapeType.rect, {
      x: xx,
      y,
      w: colWs[i],
      h: rowH,
      fill: { color: C.pale },
      line: { color: C.black, width: 1 },
    });
    s.addText(String(cell), {
      x: xx + 0.06,
      y: y + 0.13,
      w: colWs[i] - 0.12,
      h: rowH - 0.08,
      fontFace: mono,
      fontSize: 7.3,
      bold: true,
      color: C.black,
      margin: 0,
      fit: "shrink",
    });
    xx += colWs[i];
  });
}

function addImageFrame(s, imgPath, x, y, w, h, caption = "") {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.pale },
    line: { color: C.light, width: 0.8 },
  });
  if (exists(imgPath)) {
    s.addImage({ path: imgPath, x, y, w, h });
  } else {
    s.addText("IMAGE MISSING", {
      x,
      y: y + h / 2 - 0.1,
      w,
      h: 0.2,
      fontFace: mono,
      fontSize: 8,
      color: C.red,
      align: "center",
      margin: 0,
    });
  }
  if (caption) {
    s.addText(caption, {
      x,
      y: y + h + 0.08,
      w,
      h: 0.2,
      fontFace: ko,
      fontSize: 9.2,
      color: C.black,
      align: "center",
      margin: 0,
    });
  }
}

function editNote(s, x, y, w, lines) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h: 0.82,
    fill: { color: C.off },
    line: { color: C.light, width: 0.8 },
  });
  body(s, lines, x + 0.14, y + 0.13, w - 0.28, 0.55, 9.4, C.gray);
}

function addChartFrame(s, titleText, x, y, w, h) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.light, width: 0.8 },
  });
  s.addText(titleText, {
    x: x + 0.1,
    y: y + 0.08,
    w: w - 0.2,
    h: 0.22,
    fontFace: ko,
    fontSize: 10.5,
    bold: true,
    color: C.black,
    margin: 0,
  });
}

function chartOpts(x, y, w, h, min, max) {
  return {
    x,
    y,
    w,
    h,
    showTitle: false,
    showLegend: true,
    legendPos: "b",
    valAxisMinVal: min,
    valAxisMaxVal: max,
    valAxisMajorUnit: (max - min) / 4,
    catAxisLabelFontFace: "Arial",
    valAxisLabelFontFace: "Arial",
    catAxisLabelFontSize: 7,
    valAxisLabelFontSize: 7,
    showValue: false,
    valGridLine: { color: C.light, transparency: 30 },
    catAxisLineColor: C.black,
    valAxisLineColor: C.black,
    lineSize: 2.2,
    lineDataSymbolSize: 5,
    chartColors: [C.blue, C.orange, C.green, C.red],
    showCatName: true,
  };
}

function addLineChart(s, x, y, w, h, data, min, max) {
  s.addChart(pptx.ChartType.line, data, chartOpts(x, y, w, h, min, max));
}

function addBarChart(s, x, y, w, h, data, min, max) {
  s.addChart(pptx.ChartType.bar, data, {
    x,
    y,
    w,
    h,
    barDir: "bar",
    showTitle: false,
    showLegend: false,
    valAxisMinVal: min,
    valAxisMaxVal: max,
    valAxisMajorUnit: (max - min) / 4,
    catAxisLabelFontFace: ko,
    valAxisLabelFontFace: "Arial",
    catAxisLabelFontSize: 8,
    valAxisLabelFontSize: 7,
    valGridLine: { color: C.light, transparency: 30 },
    chartColors: [C.red],
    showValue: true,
    dataLabelPosition: "outEnd",
    dataLabelFormatCode: "0.0000",
  });
}

function drawDetectionOverlay(s, imageId, x, y, size) {
  const val = JSON.parse(fs.readFileSync(DETECTION_VAL, "utf8"));
  const preds = JSON.parse(fs.readFileSync(DETECTION_PREDS, "utf8"));
  const img = val.images.find((row) => row.id === imageId);
  const anns = val.annotations.filter((row) => row.image_id === imageId);
  const predRows = preds
    .filter((row) => row.image_id === imageId && row.score >= 0.65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);
  const safeImg = path.join(ASSET_DIR, `${imageId}.png`);
  addImageFrame(s, safeImg, x, y, size, size, "");
  const scale = size / 650;
  anns.slice(0, 28).forEach((ann) => {
    (ann.segmentation || []).forEach((seg) => {
      for (let i = 0; i < seg.length; i += 2) {
        const x1 = x + seg[i] * scale;
        const y1 = y + seg[i + 1] * scale;
        const x2 = x + seg[(i + 2) % seg.length] * scale;
        const y2 = y + seg[(i + 3) % seg.length] * scale;
        s.addShape(pptx.ShapeType.line, {
          x: x1,
          y: y1,
          w: x2 - x1,
          h: y2 - y1,
          line: { color: C.green, width: 1.15, transparency: 12 },
        });
      }
    });
  });
  predRows.forEach((pred, idx) => {
    const [bx, by, bw, bh] = pred.bbox;
    s.addShape(pptx.ShapeType.rect, {
      x: x + bx * scale,
      y: y + by * scale,
      w: bw * scale,
      h: bh * scale,
      fill: { color: C.bg, transparency: 100 },
      line: { color: C.red, width: idx < 6 ? 1.4 : 0.9, transparency: idx < 10 ? 0 : 25 },
    });
    if (idx < 8) {
      s.addText(pred.score.toFixed(2), {
        x: x + bx * scale,
        y: Math.max(y, y + by * scale - 0.16),
        w: 0.35,
        h: 0.13,
        fontFace: "Arial",
        fontSize: 4.8,
        bold: true,
        color: C.red,
        margin: 0,
      });
    }
  });
  return { img, anns, predRows };
}

function addStep(s, num, heading, desc, x, y, w) {
  s.addShape(pptx.ShapeType.rect, { x, y, w: 0.62, h: 0.48, fill: { color: C.red }, line: { color: C.red } });
  s.addText(num, {
    x,
    y: y + 0.12,
    w: 0.62,
    h: 0.2,
    fontFace: "Arial",
    fontSize: 13,
    bold: true,
    color: C.bg,
    align: "center",
    margin: 0,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: x + 0.62,
    y,
    w: w - 0.62,
    h: 0.48,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.black, width: 0.9 },
  });
  s.addText(heading, {
    x: x + 0.78,
    y: y + 0.08,
    w: w - 0.9,
    h: 0.18,
    fontFace: ko,
    fontSize: 11,
    bold: true,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
  s.addText(desc, {
    x: x + 0.78,
    y: y + 0.29,
    w: w - 0.9,
    h: 0.16,
    fontFace: ko,
    fontSize: 7.4,
    color: C.gray,
    margin: 0,
    fit: "shrink",
  });
}

function representativeCaseCard(s, cfg, x, y, w, h) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.light, width: 0.8 },
  });
  s.addText(cfg.tag, {
    x: x + 0.08,
    y: y + 0.08,
    w: w - 0.16,
    h: 0.18,
    fontFace: mono,
    fontSize: 6.3,
    bold: true,
    color: cfg.warning ? C.red : C.black,
    charSpace: 1.1,
    margin: 0,
    fit: "shrink",
  });
  addImageFrame(s, path.join(ASSET_DIR, `${cfg.prefix}_overlay.png`), x + 0.1, y + 0.36, 1.34, 1.34, "");
  s.addText(cfg.title, {
    x: x + 1.58,
    y: y + 0.34,
    w: w - 1.72,
    h: 0.26,
    fontFace: ko,
    fontSize: 10.3,
    bold: true,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
  s.addShape(pptx.ShapeType.line, {
    x: x + 1.58,
    y: y + 0.67,
    w: w - 1.78,
    h: 0,
    line: { color: cfg.warning ? C.red : C.black, width: 1.0 },
  });
  s.addText(cfg.behavior, {
    x: x + 1.58,
    y: y + 0.78,
    w: w - 1.72,
    h: 0.44,
    fontFace: ko,
    fontSize: 7.6,
    color: C.gray,
    margin: 0,
    fit: "shrink",
  });
  s.addText(cfg.takeaway, {
    x: x + 1.58,
    y: y + 1.3,
    w: w - 1.72,
    h: 0.38,
    fontFace: ko,
    fontSize: 7.4,
    bold: true,
    color: cfg.warning ? C.red : C.black,
    margin: 0,
    fit: "shrink",
  });
}

// 1. Cover / edit boundary
let s = slide("GUIDE", "Editable Visual Slides", "01");
body(
  s,
  [
    "이 파일은 시각자료를 PowerPoint에서 직접 고칠 수 있도록 재구성한 편집용 덱입니다.",
    "텍스트, 박스, 화살표, 표, 성능 차트, detection bbox는 PPT 객체로 수정 가능합니다.",
  ],
  col(0),
  1.85,
  7.1,
  0.9,
  14,
  C.black
);
kpi(s, "14", "EDITABLE SLIDES", col(8.0), 1.95, 2.2);
kpi(s, "YES", "TEXT / SHAPES / CHARTS", col(8.0), 3.08, 2.8);
kpi(s, "RASTER", "SATELLITE IMAGE PIXELS", col(8.0), 4.22, 2.75);
table(
  s,
  [
    ["OBJECT", "PPT에서 수정 가능 여부"],
    ["제목 / 본문 / 주석", "가능"],
    ["도형 / 화살표 / 범례", "가능"],
    ["성능 그래프", "가능: PowerPoint 차트"],
    ["Detection bbox / polygon line", "가능: 도형 객체"],
    ["위성 사진 / mask overlay 픽셀", "불가: 이미지 자료"],
  ],
  col(0),
  3.28,
  6.8,
  0.42,
  [2.5, 4.3]
);

// 2. Dataset inventory flow
s = slide("DATA", "Dataset Inventory: editable pipeline view", "02");
node(s, "train_img\n1024×1024 학습 이미지", col(0), 1.95, 2.25, 0.85);
node(s, "train.csv\nimg_path + mask_rle", col(3.1), 1.95, 2.25, 0.85, true);
node(s, "test_img\n224×224 추론 이미지", col(6.2), 1.95, 2.25, 0.85);
node(s, "sample_submission\nimg_id + mask_rle", col(9.3), 1.95, 2.25, 0.85);
node(s, "Dataset Class\n이미지와 정답 mask를 묶어 로드", col(1.3), 4.0, 2.8, 0.9);
node(s, "Training / Inference\n학습, 검증, 제출 파일 생성", col(5.6), 4.0, 3.0, 0.9);
arrow(s, col(1.1), 2.8, col(2.2), 4.0);
arrow(s, col(4.2), 2.8, col(3.4), 4.0);
arrow(s, col(7.3), 2.8, col(6.8), 4.0);
arrow(s, col(10.45), 2.8, col(7.9), 4.0);
arrow(s, col(4.1), 4.45, col(5.6), 4.45);
editNote(s, col(0), 5.55, 8.1, ["파일명을 외우는 슬라이드가 아니라, 데이터가 모델 입력으로 바뀌는 경로를 설명하는 슬라이드입니다."]);
kpi(s, "7,140", "TRAIN IMAGES", col(9.2), 4.1, 2.1);
kpi(s, "60,640", "TEST IMAGES", col(9.2), 5.25, 2.1);

// 3. CSV structure
s = slide("CSV", "CSV Structure: one row is one training sample", "03");
table(
  s,
  [
    ["img_id", "img_path", "mask_rle"],
    ["TRAIN_0001", "./train_img/TRAIN_0001.png", "153 12 980 7 ..."],
    ["TRAIN_0002", "./train_img/TRAIN_0002.png", "220 5 400 10 ..."],
  ],
  col(0),
  1.85,
  10.8,
  0.55,
  [2.35, 4.1, 4.35]
);
node(s, "img_id\n샘플 구분", col(0.1), 4.0, 2.1, 0.75);
node(s, "img_path\n이미지 파일 위치", col(3.6), 4.0, 2.45, 0.75);
node(s, "mask_rle\n정답 mask 압축 문자열", col(7.35), 4.0, 2.65, 0.75, true);
arrow(s, col(1.1), 3.5, col(1.1), 4.0);
arrow(s, col(4.8), 3.5, col(4.8), 4.0);
arrow(s, col(8.7), 3.5, col(8.7), 4.0);
editNote(s, col(0), 5.35, 8.7, ["CSV 한 행은 모델이 읽을 이미지와 정답 mask를 연결하는 학습 단위입니다.", "그래서 Dataset 코드와 RLE decode 코드가 필요합니다."]);

// 4. Mask and RLE
s = slide("MASK", "Mask and RLE: editable conversion diagram", "04");
const gx = col(0.3);
const gy = 1.9;
const cell = 0.32;
const grid = [
  [0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 1],
  [0, 0, 0, 0, 1, 1],
];
grid.forEach((row, r) => {
  row.forEach((v, c) => {
    s.addShape(pptx.ShapeType.rect, {
      x: gx + c * cell,
      y: gy + r * cell,
      w: cell,
      h: cell,
      fill: { color: v ? C.red : C.off },
      line: { color: C.light, width: 0.7 },
    });
  });
});
s.addText("Binary mask\n0=배경, 1=건물", {
  x: gx,
  y: gy + 1.8,
  w: 2.3,
  h: 0.5,
  fontFace: ko,
  fontSize: 12,
  bold: true,
  color: C.black,
  margin: 0,
  fit: "shrink",
});
node(s, "RLE Decode\n문자열 → mask", col(4.1), 2.05, 2.2, 0.75, true);
node(s, "RLE Encode\nmask → 문자열", col(4.1), 3.7, 2.2, 0.75);
node(s, "mask_rle string\n8 3 14 3 23 2 29 2", col(8.0), 2.75, 2.7, 0.82);
arrow(s, col(8.0), 3.05, col(6.3), 2.4);
arrow(s, col(2.6), 2.75, col(4.1), 2.4);
arrow(s, col(2.6), 3.55, col(4.1), 4.08);
arrow(s, col(6.3), 4.08, col(8.0), 3.2);
editNote(s, col(0), 5.55, 8.9, ["모델은 픽셀별 0/1 mask로 학습하지만, 제출 파일은 RLE 문자열을 요구합니다.", "학습 전에는 decode, 제출 전에는 encode가 필요합니다."]);
node(s, "건물 없음 예측\nsample_submission에는 -1 처리", col(9.35), 4.75, 2.55, 0.78, true);

// 5. Training performance editable charts
s = slide("PERFORMANCE", "Training performance: editable PowerPoint charts", "05");
const rawHist = readCsv(RAW_HISTORY);
const proxyHist = readCsv(PROXY_HISTORY);
const labels10 = rawHist.map((r) => String(r.epoch));
addChartFrame(s, "Validation Dice 변화", col(0), 1.72, 5.5, 2.45);
addLineChart(
  s,
  col(0.15),
  2.05,
  5.15,
  2.05,
  [
    { name: "Raw holdout", labels: labels10, values: rawHist.map((r) => r.val_dice) },
    { name: "Proxy patch", labels: labels10, values: proxyHist.map((r) => r.val_dice) },
  ],
  0.68,
  0.82
);
addChartFrame(s, "Train Loss 감소", col(6.0), 1.72, 5.5, 2.45);
addLineChart(
  s,
  col(6.15),
  2.05,
  5.15,
  2.05,
  [
    { name: "Raw loss", labels: labels10, values: rawHist.map((r) => r.train_loss) },
    { name: "Proxy loss", labels: labels10, values: proxyHist.map((r) => r.train_loss) },
  ],
  0.1,
  0.26
);
addChartFrame(s, "실험 단계별 최고 Dice", col(0), 4.45, 7.4, 1.85);
addBarChart(
  s,
  col(0.15),
  4.76,
  7.05,
  1.45,
  [
    {
      name: "Dice",
      labels: ["Baseline/debug", "Proxy ensemble", "Patch v3", "Patch v4 best", "Raw holdout e10", "Fine-tune check"],
      values: [0.5, 0.6898, 0.7561, 0.8013, 0.7991, 0.7998],
    },
  ],
  0.45,
  0.84
);
kpi(s, "0.7991", "RAW HOLDOUT EPOCH 10", col(8.2), 4.68, 2.5);
kpi(s, "0.8013", "PROXY PATCH BEST", col(8.2), 5.82, 2.5);

// 6. Threshold trend
s = slide("THRESHOLD", "Threshold sweep: editable chart and interpretation", "06");
addChartFrame(s, "Best threshold by epoch", col(0), 1.72, 6.2, 3.7);
addLineChart(
  s,
  col(0.15),
  2.05,
  5.85,
  3.2,
  [
    { name: "Raw threshold", labels: labels10, values: rawHist.map((r) => r.best_threshold_epoch) },
    { name: "Proxy threshold", labels: labels10, values: proxyHist.map((r) => r.best_threshold_epoch) },
  ],
  0.15,
  0.8
);
body(
  s,
  [
    "Threshold는 모델이 출력한 확률을 이진 mask로 바꿀 때 사용하는 기준값입니다.",
    "낮추면 건물로 판단하는 픽셀이 늘어나 recall은 올라가지만 오탐이 늘 수 있습니다.",
    "높이면 예측이 보수적으로 바뀌어 false positive는 줄지만 작은 건물 미탐이 늘 수 있습니다.",
  ],
  col(6.8),
  2.0,
  4.4,
  1.7,
  12.5,
  C.black
);
node(s, "낮은 threshold\n더 많이 검출\nFP 증가 가능", col(6.8), 4.25, 2.1, 0.82, true);
node(s, "높은 threshold\n보수적 검출\nFN 증가 가능", col(9.2), 4.25, 2.1, 0.82);
arrow(s, col(8.9), 4.66, col(9.2), 4.66);
editNote(s, col(6.8), 5.6, 4.55, ["최종 threshold는 validation Dice 기준으로 선택했고, 공식 Private Score와는 구분해서 설명해야 합니다."]);

// 7. Visual check timeline
s = slide("VISUAL QA", "When to check images during training", "07");
const steps = [
  ["01", "EDA sample", "원본 밝기, 해상도, 건물 밀도 확인"],
  ["02", "RLE decode sanity", "RLE가 실제 mask로 맞게 복원되는지 확인"],
  ["03", "Crop / augmentation", "patch crop이 건물 경계를 과도하게 자르지 않는지 확인"],
  ["04", "Epoch 1", "배경만 예측하거나 전체를 건물로 예측하지 않는지 확인"],
  ["05", "Mid epoch 3-5", "loss 감소와 Dice 정체, 오탐 증가 여부 확인"],
  ["06", "Best checkpoint", "GT와 prediction overlap을 성공/실패 사례로 분리"],
  ["07", "Threshold sweep", "FP/FN trade-off 확인"],
  ["08", "Post-processing", "잡음 제거 후 경계가 망가지지 않는지 확인"],
  ["09", "Detection branch", "GT polygon과 bbox/score 비교"],
  ["10", "Final board", "포트폴리오용 strong/average/failure case 정리"],
];
steps.forEach((st, i) => {
  const x = i < 5 ? col(0.2) : col(6.2);
  const y = 1.75 + (i % 5) * 0.76;
  addStep(s, st[0], st[1], st[2], x, y, 5.2);
  if (i % 5 < 4) {
    s.addShape(pptx.ShapeType.line, { x: x + 0.31, y: y + 0.48, w: 0, h: 0.27, line: { color: C.red, width: 1.3 } });
  }
});
editNote(s, col(0.2), 5.86, 8.5, ["숫자만 제시하는 것보다, 언제 이미지를 확인했고 무엇을 고쳤는지 말하면 실험 설계력이 보입니다."]);

// 8. Segmentation strong case
s = slide("SEGMENTATION", "Strong case: editable labels + image panels", "08");
const strong = ["satellite", "ground_truth", "prediction", "overlay"];
const captions = ["Satellite crop", "Ground Truth", "Prediction", "GT + Pred"];
strong.forEach((name, i) => {
  const x = col(0.1) + i * 2.85;
  const img = path.join(ASSET_DIR, `strong_${name}.png`);
  addImageFrame(s, img, x, 1.92, 2.35, 2.35, captions[i]);
});
body(
  s,
  [
    "강한 사례는 건물이 반복적이고 도로/배경과 경계가 비교적 명확한 영역입니다.",
    "Prediction이 대부분의 건물 footprint를 따라가며, overlay에서 GT와 예측이 상당 부분 겹칩니다.",
  ],
  col(0.2),
  4.75,
  6.6,
  0.85,
  12,
  C.black
);
node(s, "포트폴리오 포인트\n성공 사례만 보여주지 말고 실패 사례와 함께 비교", col(7.4), 4.65, 3.5, 0.9, true);

// 9. Segmentation failure case
s = slide("SEGMENTATION", "Failure case: editable error analysis", "09");
["satellite", "ground_truth", "prediction", "overlay"].forEach((name, i) => {
  const x = col(0.1) + i * 2.85;
  const img = path.join(ASSET_DIR, `failure_${name}.png`);
  addImageFrame(s, img, x, 1.92, 2.35, 2.35, captions[i]);
});
body(
  s,
  [
    "실패 사례는 그림자, 수목, 운동장 주변 구조물처럼 건물과 유사한 색/형태가 섞인 영역입니다.",
    "이런 사례를 넣으면 단순히 점수만 제시하는 것이 아니라, 모델이 어려워하는 조건을 분석했다는 점을 보여줄 수 있습니다.",
  ],
  col(0.2),
  4.75,
  7.5,
  1.0,
  12,
  C.black
);
node(s, "개선 방향\nhard example mining\nthreshold/post-processing\nAOI별 검증", col(8.2), 4.65, 2.9, 1.0, true);

// 10. Contact sheet reference
s = slide("QUALITATIVE", "Representative cases: model behavior by scene", "10");
const representativeCases = [
  {
    prefix: "case07_dense_residential",
    tag: "DENSE RESIDENTIAL",
    title: "반복 주거지",
    behavior: "규칙적인 지붕 패턴에서는 예측 mask가 GT와 넓게 겹치며 안정적으로 동작합니다.",
    takeaway: "강점: 반복 구조와 명확한 경계",
  },
  {
    prefix: "case02_large_roof",
    tag: "LARGE ROOF / COMMERCIAL",
    title: "대형 지붕",
    behavior: "큰 건물 footprint는 잘 포착하지만, 그림자와 인접 구조물에서 경계가 번질 수 있습니다.",
    takeaway: "관찰: 큰 객체는 유리, 경계는 보정 필요",
  },
  {
    prefix: "case03_sparse_object",
    tag: "SPARSE / SMALL OBJECT",
    title: "희소 건물",
    behavior: "건물이 적거나 작을수록 예측 면적이 흔들리며 false positive가 일부 발생합니다.",
    takeaway: "개선: threshold와 min-area 후처리",
    warning: true,
  },
  {
    prefix: "case04_suburban_trees",
    tag: "SUBURBAN + TREES",
    title: "수목 혼재 주거지",
    behavior: "나무 그림자와 지붕 색이 섞인 영역에서 누락과 과검출이 동시에 나타납니다.",
    takeaway: "난점: vegetation / shadow confusion",
    warning: true,
  },
  {
    prefix: "case05_residential_blocks",
    tag: "CURVED ROAD BLOCKS",
    title: "곡선 도로 주변 주거지",
    behavior: "도로를 따라 배치된 건물은 비교적 잘 잡지만, roof edge가 둥글게 예측되는 경향이 있습니다.",
    takeaway: "개선: boundary-aware loss 검토",
  },
  {
    prefix: "case06_shadow_sportsfield",
    tag: "SHADOW / SPORTS FIELD",
    title: "그림자와 운동장",
    behavior: "운동장·그림자·작은 구조물이 건물처럼 보이는 경우 오탐이 증가합니다.",
    takeaway: "실패 분석: hard negative sample 필요",
    warning: true,
  },
];
representativeCases.forEach((cfg, i) => {
  const x = i % 2 === 0 ? col(0) : col(6.05);
  const y = 1.72 + Math.floor(i / 2) * 1.72;
  representativeCaseCard(s, cfg, x, y, 5.55, 1.48);
});
body(s, ["전체 contact sheet를 해석 가능한 대표 사례로 압축한 페이지입니다. 장면 조건별 예측 경향을 설명하면 결과 해석력이 더 잘 드러납니다."], col(0), 6.72, 10.4, 0.28, 9.2, C.gray);

// 11. Contact sheet reference
s = slide("REFERENCE", "Full qualitative contact sheet", "11");
addImageFrame(s, path.join(ASSET_DIR, "01_dacon_segmentation_validation_contact_sheet.png"), col(0), 1.72, 4.05, 5.0, "");
body(
  s,
  [
    "이 슬라이드는 전체 validation sample을 빠르게 훑는 참고용입니다.",
    "PPT 편집 가능 객체: 제목, 본문, 범례, 주석 박스",
    "이미지 내부 픽셀: 실험 결과 증거 자료로 유지",
  ],
  col(4.6),
  1.9,
  3.5,
  1.2,
  12,
  C.black
);
node(s, "초록 = Ground Truth", col(8.5), 2.05, 2.15, 0.55);
node(s, "빨강 = Prediction", col(8.5), 2.9, 2.15, 0.55, true);
kpi(s, "8", "VALIDATION CASES", col(4.6), 4.0, 2.3);
kpi(s, "4", "PANELS PER CASE", col(7.2), 4.0, 2.3);
editNote(s, col(4.6), 5.32, 5.8, ["본문 슬라이드에는 대표 2~3개 사례를 크게 보여주고, contact sheet는 appendix나 Q&A 대비 자료로 쓰는 것이 좋습니다."]);

// 11. Detection editable overlay
s = slide("DETECTION", "Detectron2: editable bbox and GT polygon overlay", "12");
const overlayInfo = drawDetectionOverlay(s, "AOI_5_Khartoum_img1210", col(0), 1.75, 4.95);
node(s, "GT polygon\n초록 선", col(5.55), 1.95, 2.0, 0.65);
node(s, "Prediction bbox\n빨간 박스 + score", col(5.55), 2.9, 2.45, 0.65, true);
body(
  s,
  [
    "이 슬라이드의 초록 polygon 선과 빨간 bbox는 PPT 도형입니다.",
    "따라서 박스 위치, 선 굵기, 색, score label을 직접 수정할 수 있습니다.",
    `표시 객체: GT polygon ${overlayInfo.anns.length}개 중 일부, 예측 bbox ${overlayInfo.predRows.length}개`,
  ],
  col(8.1),
  1.95,
  3.5,
  1.45,
  11.5,
  C.black
);
editNote(s, col(5.55), 4.1, 5.6, ["Detection은 segmentation 결과를 대체하기보다, 건물 객체 단위 분석을 보강하는 보조 실험으로 설명하는 편이 안전합니다."]);

// 12. Detection training metrics
s = slide("DETECTION", "Detectron2 training metrics: editable chart", "13");
const detRows = readJsonLines(DETECTION_METRICS).filter((r) => typeof r.iteration === "number" && typeof r.loss_mask === "number");
const detLabels = detRows.map((r) => String(r.iteration));
const totalLoss = detRows.map((r) => ["loss_cls", "loss_box_reg", "loss_mask", "loss_rpn_cls", "loss_rpn_loc"].reduce((sum, k) => sum + Number(r[k] || 0), 0));
addChartFrame(s, "Detection loss trend", col(0), 1.72, 5.4, 3.05);
addLineChart(
  s,
  col(0.15),
  2.05,
  5.05,
  2.55,
  [
    { name: "Total loss", labels: detLabels, values: totalLoss },
    { name: "Mask loss", labels: detLabels, values: detRows.map((r) => r.loss_mask) },
  ],
  0,
  Math.max(...totalLoss) * 1.1
);
addChartFrame(s, "Classification accuracy", col(6.0), 1.72, 5.4, 3.05);
addLineChart(
  s,
  col(6.15),
  2.05,
  5.05,
  2.55,
  [{ name: "fast_rcnn cls accuracy", labels: detLabels, values: detRows.map((r) => r["fast_rcnn/cls_accuracy"]) }],
  0.25,
  0.9
);
body(
  s,
  [
    "Detection branch에서는 loss 감소와 classification accuracy 변화를 함께 확인했습니다.",
    "다만 이 결과는 segmentation 주 실험을 보조하는 instance-level 확인 자료로 제시하는 것이 적절합니다.",
  ],
  col(0),
  5.25,
  9.2,
  0.9,
  12,
  C.black
);

// 13. Usage guide
s = slide("USAGE", "How to use these editable slides", "14");
table(
  s,
  [
    ["SLIDE", "어디에 넣을지", "역할"],
    ["02-04", "데이터 이해 파트", "파일 구조, CSV, RLE 설명"],
    ["05-06", "실험 결과 파트", "epoch별 성능, threshold 선택 근거"],
    ["07", "실험 진행 절차 파트", "언제 이미지를 확인했는지 설명"],
    ["08-11", "결과 해석 파트", "성공/실패/대표 장면과 contact sheet"],
    ["12-13", "보조 실험 파트", "Detectron2 기반 객체 단위 분석"],
  ],
  col(0),
  1.85,
  9.4,
  0.5,
  [1.4, 3.0, 5.0]
);
body(
  s,
  [
    "편집 팁: PowerPoint에서 도형을 클릭하면 색/선/텍스트를 바꿀 수 있습니다.",
    "차트는 우클릭 후 데이터 편집을 선택하면 epoch별 값도 수정할 수 있습니다.",
    "위성 이미지와 mask overlay는 실험 결과 이미지이므로, 위치·크기 조정은 가능하지만 내부 픽셀 편집은 이미지 편집 도구가 필요합니다.",
  ],
  col(0),
  5.1,
  10.2,
  1.0,
  12.2,
  C.black
);

pptx.writeFile({ fileName: PPTX_PATH });
console.log(PPTX_PATH);
