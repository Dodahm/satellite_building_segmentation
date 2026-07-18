const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.PROJECT_ROOT || process.cwd();
const OUT_DIR = process.env.PORTFOLIO_OUTPUT_DIR || path.join(ROOT, "output", "portfolio");
const ASSET_DIR = path.join(OUT_DIR, "editable_slide_source_assets");
const PPTX_PATH = path.join(OUT_DIR, "satellite_segmentation_portfolio_reviewed_swiss_v3.pptx");
const GUIDE_PATH = path.join(OUT_DIR, "satellite_segmentation_portfolio_reviewed_swiss_v3_guide.md");

const RAW_HISTORY = path.join(ROOT, "runs/dacon_raw_patch_unetpp_v1/unetplusplus_history.csv");
const PROXY_HISTORY = path.join(ROOT, "runs/dacon_proxy_patch_v4/unetplusplus_history.csv");
const SPLIT_SUMMARY = path.join(ROOT, "data/dacon_236092_patch_ready/split_summary.json");
const FINETUNE_SUMMARY = path.join(ROOT, "runs/dacon_raw_patch_unetpp_finetune_v3_e1/summary.json");
const PROXY_SUMMARY = path.join(ROOT, "runs/dacon_proxy_patch_v4/summary.json");
const DETECTION_METRICS = path.join(ROOT, "runs/detectron2_spacenet_full_khartoum/metrics.json");
const DETECTION_VAL = path.join(ROOT, "data/spacenet_detectron2_full_khartoum/val_coco.json");
const DETECTION_PREDS = path.join(ROOT, "runs/detectron2_spacenet_full_khartoum/inference/coco_instances_results.json");

const pptx = new pptxgen();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
pptx.author = "hamdodam";
pptx.company = "Personal Portfolio";
pptx.subject = "Satellite Image Building Area Segmentation Portfolio";
pptx.title = "Satellite Image Building Area Segmentation Portfolio";
pptx.lang = "ko-KR";
pptx.theme = {
  headFontFace: "Arial",
  bodyFontFace: "Apple SD Gothic Neo",
  lang: "ko-KR",
};
pptx.margin = 0;
pptx.layout = "WIDE";

const C = {
  bg: "FFFFFF",
  off: "FAFAFA",
  black: "111111",
  gray: "444444",
  mid: "767676",
  light: "DDDDDD",
  pale: "F4F4F4",
  red: "E8000D",
  green: "00A650",
  blue: "2563EB",
  orange: "F97316",
  yellow: "F59E0B",
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

function fmt(num, digits = 4) {
  return Number(num).toFixed(digits);
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

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
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

function pngSize(file) {
  const buf = fs.readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function addContainedImage(s, imgPath, x, y, w, h) {
  if (!exists(imgPath)) {
    s.addText("IMAGE MISSING", {
      x,
      y: y + h / 2 - 0.12,
      w,
      h: 0.24,
      fontFace: mono,
      fontSize: 8,
      color: C.red,
      align: "center",
      margin: 0,
    });
    return;
  }
  const { width, height } = pngSize(imgPath);
  const r = Math.min(w / width, h / height);
  const iw = width * r;
  const ih = height * r;
  s.addImage({ path: imgPath, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih });
}

function addBase(slide, section = "SATELLITE SEGMENTATION") {
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
    x: 11.62,
    y: 6.18,
    w: 0.68,
    h: 0.68,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.red, width: 1.2 },
  });
  slide.addText(section, {
    x: M,
    y: 6.9,
    w: 6.2,
    h: 0.18,
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
    y: 0.56,
    w: 9.9,
    h: 0.62,
    fontFace: "Arial",
    bold: true,
    fontSize: 24,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
  if (page) {
    slide.addText(page, {
      x: 11.08,
      y: 0.72,
      w: 1.25,
      h: 0.22,
      fontFace: mono,
      fontSize: 8,
      color: C.red,
      charSpace: 1.5,
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

function text(s, lines, x, y, w, h, size = 12, color = C.gray, bold = false) {
  s.addText(Array.isArray(lines) ? lines.join("\n") : lines, {
    x,
    y,
    w,
    h,
    fontFace: ko,
    fontSize: size,
    bold,
    color,
    margin: 0,
    fit: "shrink",
    paraSpaceAfterPt: 5,
    breakLine: false,
  });
}

function eyebrow(s, label, x, y, w, color = C.red) {
  s.addText(label, {
    x,
    y,
    w,
    h: 0.18,
    fontFace: mono,
    fontSize: 7,
    color,
    bold: true,
    charSpace: 1.8,
    margin: 0,
    fit: "shrink",
  });
}

function node(s, label, x, y, w, h = 0.64, accent = false, size = 10) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: accent ? C.red : C.bg, transparency: accent ? 0 : 100 },
    line: { color: accent ? C.red : C.black, width: 1.05 },
  });
  s.addText(label, {
    x: x + 0.08,
    y: y + 0.08,
    w: w - 0.16,
    h: h - 0.16,
    fontFace: ko,
    fontSize: size,
    bold: accent,
    color: accent ? C.bg : C.black,
    align: "center",
    valign: "middle",
    margin: 0,
    fit: "shrink",
    breakLine: false,
  });
}

function pill(s, label, x, y, w, accent = false) {
  s.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h: 0.34,
    rectRadius: 0.04,
    fill: { color: accent ? C.red : C.pale },
    line: { color: accent ? C.red : C.light, width: 0.8 },
  });
  s.addText(label, {
    x: x + 0.08,
    y: y + 0.08,
    w: w - 0.16,
    h: 0.16,
    fontFace: mono,
    fontSize: 6.5,
    color: accent ? C.bg : C.black,
    bold: true,
    align: "center",
    margin: 0,
    fit: "shrink",
  });
}

function arrow(s, x1, y1, x2, y2, color = C.red, width = 1.1) {
  s.addShape(pptx.ShapeType.line, {
    x: x1,
    y: y1,
    w: x2 - x1,
    h: y2 - y1,
    line: { color, width, endArrowType: "triangle" },
  });
}

function kpi(s, value, label, x, y, w = 2.25, color = C.black) {
  s.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color: C.red, width: 1.8 } });
  s.addText(value, {
    x,
    y: y + 0.14,
    w,
    h: 0.48,
    fontFace: "Arial",
    bold: true,
    fontSize: 23,
    color,
    margin: 0,
    fit: "shrink",
  });
  s.addText(label, {
    x,
    y: y + 0.72,
    w,
    h: 0.28,
    fontFace: mono,
    fontSize: 6.4,
    color: C.gray,
    charSpace: 1,
    margin: 0,
    fit: "shrink",
  });
}

function callout(s, heading, body, x, y, w, h = 0.86, accent = false) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: accent ? C.red : C.off },
    line: { color: accent ? C.red : C.light, width: 0.8 },
  });
  s.addText(heading, {
    x: x + 0.14,
    y: y + 0.1,
    w: w - 0.28,
    h: 0.18,
    fontFace: ko,
    fontSize: 9.6,
    bold: true,
    color: accent ? C.bg : C.black,
    margin: 0,
    fit: "shrink",
  });
  s.addText(body, {
    x: x + 0.14,
    y: y + 0.34,
    w: w - 0.28,
    h: h - 0.42,
    fontFace: ko,
    fontSize: 7.8,
    color: accent ? C.bg : C.gray,
    margin: 0,
    fit: "shrink",
    breakLine: false,
  });
}

function codeBox(s, heading, code, x, y, w, h, accent = false) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: accent ? C.black : C.off },
    line: { color: accent ? C.black : C.light, width: 0.9 },
  });
  s.addText(heading, {
    x: x + 0.12,
    y: y + 0.1,
    w: w - 0.24,
    h: 0.18,
    fontFace: mono,
    fontSize: 6.6,
    bold: true,
    color: accent ? C.bg : C.red,
    charSpace: 1.1,
    margin: 0,
    fit: "shrink",
  });
  s.addText(code, {
    x: x + 0.12,
    y: y + 0.38,
    w: w - 0.24,
    h: h - 0.48,
    fontFace: "Courier New",
    fontSize: 6.8,
    color: accent ? C.bg : C.black,
    margin: 0,
    fit: "shrink",
    breakLine: false,
  });
}

function table(s, rows, x, y, w, rowH = 0.42, widths = null, fontSize = 8.2) {
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
    fontSize,
    color: C.gray,
    border: { type: "solid", color: C.light, pt: 0.65 },
    margin: 0.06,
    autoFit: false,
    fill: { color: C.bg },
    valign: "mid",
  });
  let xx = x;
  rows[0].forEach((cell, i) => {
    s.addShape(pptx.ShapeType.rect, {
      x: xx,
      y,
      w: colWs[i],
      h: rowH,
      fill: { color: C.pale },
      line: { color: C.black, width: 0.95 },
    });
    s.addText(String(cell), {
      x: xx + 0.06,
      y: y + 0.12,
      w: colWs[i] - 0.12,
      h: rowH - 0.08,
      fontFace: mono,
      fontSize: 6.8,
      bold: true,
      color: C.black,
      margin: 0,
      fit: "shrink",
    });
    xx += colWs[i];
  });
}

function imageFrame(s, imgPath, x, y, w, h, caption = "", note = "") {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.pale },
    line: { color: C.light, width: 0.8 },
  });
  addContainedImage(s, imgPath, x, y, w, h);
  if (caption) {
    s.addText(caption, {
      x,
      y: y + h + 0.07,
      w,
      h: 0.18,
      fontFace: ko,
      fontSize: 8.4,
      bold: true,
      color: C.black,
      align: "center",
      margin: 0,
      fit: "shrink",
    });
  }
  if (note) {
    s.addText(note, {
      x,
      y: y + h + 0.29,
      w,
      h: 0.3,
      fontFace: ko,
      fontSize: 6.7,
      color: C.gray,
      align: "center",
      margin: 0,
      fit: "shrink",
    });
  }
}

function chartFrame(s, label, x, y, w, h) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.light, width: 0.8 },
  });
  s.addText(label, {
    x: x + 0.12,
    y: y + 0.09,
    w: w - 0.24,
    h: 0.2,
    fontFace: ko,
    fontSize: 10,
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
    valGridLine: { color: C.light, transparency: 25 },
    catAxisLineColor: C.black,
    valAxisLineColor: C.black,
    lineSize: 2.2,
    lineDataSymbolSize: 5,
    chartColors: [C.red, C.blue, C.orange, C.green],
  };
}

function lineChart(s, x, y, w, h, data, min, max) {
  s.addChart(pptx.ChartType.line, data, chartOpts(x, y, w, h, min, max));
}

function barChart(s, x, y, w, h, data, min, max, horizontal = false) {
  s.addChart(pptx.ChartType.bar, data, {
    x,
    y,
    w,
    h,
    barDir: horizontal ? "bar" : "col",
    showTitle: false,
    showLegend: false,
    valAxisMinVal: min,
    valAxisMaxVal: max,
    valAxisMajorUnit: (max - min) / 4,
    catAxisLabelFontFace: ko,
    valAxisLabelFontFace: "Arial",
    catAxisLabelFontSize: 7,
    valAxisLabelFontSize: 7,
    valGridLine: { color: C.light, transparency: 25 },
    chartColors: [C.red],
    showValue: true,
    dataLabelPosition: "outEnd",
    dataLabelFormatCode: "0.0000",
  });
}

function addStep(s, num, heading, desc, x, y, w) {
  s.addShape(pptx.ShapeType.rect, { x, y, w: 0.54, h: 0.45, fill: { color: C.red }, line: { color: C.red } });
  s.addText(num, {
    x,
    y: y + 0.11,
    w: 0.54,
    h: 0.2,
    fontFace: "Arial",
    fontSize: 12,
    bold: true,
    color: C.bg,
    align: "center",
    margin: 0,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: x + 0.54,
    y,
    w: w - 0.54,
    h: 0.45,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.black, width: 0.85 },
  });
  s.addText(heading, {
    x: x + 0.68,
    y: y + 0.08,
    w: w - 0.82,
    h: 0.16,
    fontFace: ko,
    fontSize: 9.7,
    bold: true,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
  s.addText(desc, {
    x: x + 0.68,
    y: y + 0.28,
    w: w - 0.82,
    h: 0.14,
    fontFace: ko,
    fontSize: 6.8,
    color: C.gray,
    margin: 0,
    fit: "shrink",
  });
}

function drawMaskGrid(s, x, y, cell = 0.25) {
  const grid = [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1],
    [0, 0, 0, 0, 0, 1, 1],
    [0, 0, 1, 1, 0, 0, 0],
  ];
  grid.forEach((row, r) => {
    row.forEach((v, c) => {
      s.addShape(pptx.ShapeType.rect, {
        x: x + c * cell,
        y: y + r * cell,
        w: cell,
        h: cell,
        fill: { color: v ? C.red : C.off },
        line: { color: C.light, width: 0.6 },
      });
    });
  });
}

function caseCard(s, cfg, x, y, w, h) {
  s.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.light, width: 0.8 },
  });
  eyebrow(s, cfg.tag, x + 0.08, y + 0.08, w - 0.16, cfg.warning ? C.red : C.black);
  imageFrame(s, path.join(ASSET_DIR, `${cfg.prefix}_overlay.png`), x + 0.1, y + 0.35, 1.28, 1.28);
  s.addText(cfg.title, {
    x: x + 1.52,
    y: y + 0.34,
    w: w - 1.66,
    h: 0.22,
    fontFace: ko,
    fontSize: 9.4,
    bold: true,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
  s.addShape(pptx.ShapeType.line, {
    x: x + 1.52,
    y: y + 0.64,
    w: w - 1.7,
    h: 0,
    line: { color: cfg.warning ? C.red : C.black, width: 0.95 },
  });
  text(s, cfg.behavior, x + 1.52, y + 0.75, w - 1.66, 0.42, 7.1, C.gray);
  text(s, cfg.takeaway, x + 1.52, y + 1.22, w - 1.66, 0.3, 7, cfg.warning ? C.red : C.black, true);
}

function drawDetectionOverlay(s, imageId, x, y, size) {
  const val = readJson(DETECTION_VAL);
  const preds = readJson(DETECTION_PREDS);
  const img = val.images.find((row) => row.id === imageId);
  const anns = val.annotations.filter((row) => row.image_id === imageId);
  const predRows = preds
    .filter((row) => row.image_id === imageId && row.score >= 0.65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 16);
  const safeImg = path.join(ASSET_DIR, `${imageId}.png`);
  imageFrame(s, safeImg, x, y, size, size);
  const scale = size / 650;
  // Portfolio update:
  // Before: GT polygons were drawn as many short line segments. That made the
  // ground-truth boundary look "broken" when viewed in PowerPoint.
  // After: draw representative GT building footprints as translucent editable
  // custom-geometry shapes. This reads more like a real building footprint and
  // still remains editable as a PowerPoint object.
  const gtFootprints = anns
    .slice()
    .sort((a, b) => Number(b.area || 0) - Number(a.area || 0))
    .slice(0, 22);
  let gtFilledCount = 0;
  gtFootprints.forEach((ann) => {
    (ann.segmentation || []).forEach((seg) => {
      if (!Array.isArray(seg) || seg.length < 6) return;
      const pts = [];
      for (let i = 0; i < seg.length; i += 2) {
        pts.push({ x: x + seg[i] * scale, y: y + seg[i + 1] * scale });
      }
      const minX = Math.min(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y));
      const maxX = Math.max(...pts.map((p) => p.x));
      const maxY = Math.max(...pts.map((p) => p.y));
      const w = Math.max(maxX - minX, 0.01);
      const h = Math.max(maxY - minY, 0.01);
      const localPoints = pts.map((p, idx) => ({
        x: p.x - minX,
        y: p.y - minY,
        moveTo: idx === 0,
      }));
      localPoints.push({ close: true });
      s.addShape(pptx.ShapeType.custGeom, {
        x: minX,
        y: minY,
        w,
        h,
        points: localPoints,
        fill: { color: C.green, transparency: 54 },
        line: { color: C.green, width: 0.8, transparency: 4 },
      });
      gtFilledCount += 1;
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
      line: { color: C.red, width: idx < 6 ? 1.35 : 0.9, transparency: idx < 10 ? 0 : 25 },
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
  return { img, anns, predRows, gtFilledCount };
}

const rawHist = readCsv(RAW_HISTORY);
const proxyHist = readCsv(PROXY_HISTORY);
const split = readJson(SPLIT_SUMMARY);
const finetune = readJson(FINETUNE_SUMMARY);
const proxySummary = readJson(PROXY_SUMMARY);
const detRows = readJsonLines(DETECTION_METRICS);
const detTrainRows = detRows.filter((r) => typeof r.iteration === "number" && typeof r.loss_mask === "number" && r.total_loss);
const detFinal = detRows.find((r) => r.iteration === 200 && r["segm/AP"] !== undefined) || detRows[detRows.length - 1] || {};
const rawBest = rawHist.reduce((best, row) => (row.val_dice > best.val_dice ? row : best), rawHist[0]);
const rawFinal = rawHist[rawHist.length - 1];
const proxyBest = proxyHist.reduce((best, row) => (row.val_dice > best.val_dice ? row : best), proxyHist[0]);
const labels10 = rawHist.map((r) => String(r.epoch));
const finalRawDice = finetune.ensemble_val_dice || finetune.models?.[0]?.best_val_dice || rawFinal.val_dice;
const finalRawThreshold = finetune.ensemble_threshold || finetune.models?.[0]?.best_threshold || rawFinal.best_threshold_epoch;
const proxyDice = proxySummary.ensemble_val_dice || proxyBest.val_dice;
const proxyThreshold = proxySummary.ensemble_threshold || proxyBest.best_threshold_epoch;

const slides = [];
function remember(no, titleText, purpose) {
  slides.push({ no, title: titleText, purpose });
  if (s && typeof s.addNotes === "function") {
    s.addNotes(
      [
        `슬라이드 설계 의도: ${purpose}`,
        "왜 이렇게 구성했는가: 포트폴리오 심사자가 한 장 안에서 문제, 근거, 해석을 함께 볼 수 있도록 시각자료와 짧은 결론을 결합했다.",
        "발표 포인트: 보이는 숫자나 이미지를 단순히 읽지 말고, 이 증거가 어떤 의사결정이나 개선으로 이어졌는지 설명한다.",
        "편집 안내: 본문 텍스트, 도형, 표, 차트, 코드 박스, 범례는 PowerPoint에서 직접 수정 가능하다. 위성 사진과 mask 결과는 이미지 객체로 배치되어 위치와 크기 조정이 가능하다.",
      ].join("\n")
    );
  }
}

let s;

// 01
s = pptx.addSlide();
addBase(s, "PORTFOLIO CASE STUDY");
s.addText("Satellite Image\nBuilding Area\nSegmentation", {
  x: M,
  y: 0.72,
  w: 6.55,
  h: 2.25,
  fontFace: "Arial",
  bold: true,
  fontSize: 34,
  color: C.black,
  margin: 0,
  breakLine: false,
  fit: "shrink",
});
text(
  s,
  "위성 이미지에서 건물 영역을 픽셀 단위로 분할하고, RLE 제출 형식까지 연결한 AI/데이터 포트폴리오 프로젝트",
  col(0),
  3.25,
  5.8,
  0.58,
  13,
  C.black
);
imageFrame(s, path.join(ASSET_DIR, "strong_overlay.png"), col(7.1), 1.05, 2.35, 2.35, "Prediction overlay", "GT와 예측 mask가 겹치는 대표 사례");
imageFrame(s, path.join(ASSET_DIR, "failure_overlay.png"), col(9.65), 2.1, 2.35, 2.35, "Error case", "그림자·수목 혼재 장면의 실패 분석");
kpi(s, fmt(finalRawDice), "RAW HOLDOUT DICE", col(0), 4.75, 2.25);
kpi(s, fmt(proxyDice), "PROXY PATCH DICE", col(2.55), 4.75, 2.25);
kpi(s, "UNet++", "FINAL MAIN MODEL", col(5.1), 4.75, 2.25);
text(s, "공식 Private 점수는 제출 환경에서만 확인 가능하므로 내부 validation 결과와 분리해 표기했습니다.", col(0), 6.0, 7.1, 0.36, 8.5, C.gray);
remember("01", "Cover", "프로젝트 주제, 대표 이미지, 핵심 내부 검증 성능을 한눈에 제시");

// 02
s = slide("EXECUTIVE SUMMARY", "Project in one view", "02");
table(
  s,
  [
    ["구분", "핵심 내용"],
    ["문제", "위성 이미지에서 건물 영역을 0/1 mask로 분할"],
    ["데이터", "Train 7,140장(1024×1024), Test 60,640장(224×224), RLE mask"],
    ["베이스라인", "U-Net + RLE decode/encode + threshold 0.5"],
    ["개선", "UNet++ ResNet34, patch crop, Focal+Dice, TTA, threshold sweep, 후처리"],
    ["결과", `Raw holdout Dice ${fmt(finalRawDice)}, proxy patch Dice ${fmt(proxyDice)}`],
  ],
  col(0),
  1.78,
  7.55,
  0.52,
  [1.35, 6.2],
  8.6
);
kpi(s, "5", "MAJOR IMPROVEMENTS", col(8.25), 1.95, 2.2);
kpi(s, "0.41", "RAW BEST THRESHOLD", col(8.25), 3.05, 2.2);
kpi(s, "10", "EPOCH COMPARISON", col(8.25), 4.15, 2.2);
callout(s, "포트폴리오 메시지", "점수만 강조하지 않고 데이터 구조, 실험 설계, 오류 분석, 제출 포맷까지 연결한 프로젝트로 구성했습니다.", col(8.25), 5.25, 3.05, 0.96, true);
remember("02", "Executive summary", "문제·데이터·방법·결과를 평가자가 빠르게 파악하도록 요약");

// 03
s = slide("PROJECT FLOW", "From baseline to final validation result", "03");
const flow = [
  ["01", "Baseline", "U-Net, 224 resize, RLE pipeline 확인"],
  ["02", "Patch training", "1024 원본에서 384 crop으로 공간 정보 보존"],
  ["03", "Model upgrade", "UNet++ ResNet34 encoder 적용"],
  ["04", "Loss redesign", "Focal+Dice로 불균형과 overlap 동시 대응"],
  ["05", "Inference tuning", "TTA, threshold sweep, min-area, hole filling"],
  ["06", "Error analysis", "성공/실패 장면을 분리해 개선 방향 도출"],
];
flow.forEach((f, i) => {
  const x = col(0.15) + i * 1.88;
  node(s, `${f[0]}\n${f[1]}`, x, 2.0, 1.45, 0.74, i === 4, 8.3);
  text(s, f[2], x - 0.1, 3.0, 1.7, 0.6, 7.4, C.gray);
  if (i < flow.length - 1) arrow(s, x + 1.45, 2.37, x + 1.78, 2.37);
});
lineChart(
  s,
  col(0.1),
  4.4,
  5.6,
  1.55,
  [{ name: "Raw Dice", labels: labels10, values: rawHist.map((r) => r.val_dice) }],
  0.68,
  0.82
);
callout(s, "핵심 개선 흐름", "단순히 모델만 바꾸지 않고, 데이터 crop 방식과 threshold/post-processing까지 전체 파이프라인을 개선했습니다.", col(6.3), 4.35, 4.4, 1.12);
remember("03", "Project flow", "실험이 어떤 순서로 발전했는지 흐름도와 성능 곡선으로 설명");

// 04
s = slide("PROBLEM DEFINITION", "Pixel-level building segmentation task", "04");
node(s, "Satellite image\nRGB 입력", col(0.3), 2.0, 2.2, 0.72);
node(s, "Segmentation model\n픽셀별 건물 확률", col(4.0), 2.0, 2.55, 0.72, true);
node(s, "Binary mask\n0=배경, 1=건물", col(8.15), 2.0, 2.3, 0.72);
arrow(s, col(2.55), 2.36, col(4.0), 2.36);
arrow(s, col(6.55), 2.36, col(8.15), 2.36);
drawMaskGrid(s, col(8.45), 3.25, 0.25);
text(
  s,
  [
    "Semantic segmentation은 이미지 전체를 하나의 클래스 라벨로 분류하는 문제가 아닙니다.",
    "각 픽셀이 건물인지 아닌지를 판단하므로, 건물 경계와 작은 객체를 얼마나 정확히 잡는지가 핵심입니다.",
  ],
  col(0.3),
  3.45,
  6.6,
  0.9,
  12.2,
  C.black
);
callout(s, "왜 어려운가", "위성 이미지는 그림자, 수목, 도로, 밝은 지붕이 서로 비슷하게 보일 수 있어 경계 오류와 오탐이 쉽게 발생합니다.", col(0.3), 5.1, 8.1, 0.88);
remember("04", "Problem definition", "분류가 아니라 픽셀 단위 건물 검출이라는 점을 시각적으로 설명");

// 05
s = slide("EVALUATION BOUNDARY", "Dice score and official score boundary", "05");
text(s, "Dice = 2 × |Prediction ∩ Ground Truth| / (|Prediction| + |Ground Truth|)", col(0.2), 1.92, 6.6, 0.42, 13.5, C.black, true);
node(s, "Overlap이 클수록\nDice ↑", col(0.2), 2.75, 1.8, 0.78, true);
node(s, "False Positive\n배경을 건물로 예측", col(2.55), 2.75, 2.1, 0.78);
node(s, "False Negative\n건물을 놓침", col(5.1), 2.75, 2.1, 0.78);
arrow(s, col(2.0), 3.14, col(2.55), 3.14);
arrow(s, col(4.65), 3.14, col(5.1), 3.14);
table(
  s,
  [
    ["점수 종류", "의미", "포트폴리오 표기"],
    ["Raw holdout Dice", "원본 DACON train을 8:2로 나눈 내부 검증", fmt(finalRawDice)],
    ["Proxy patch Dice", "대체/patch 실험 환경에서의 내부 검증", fmt(proxyDice)],
    ["Official Private", "DACON 제출 후 서버에서 산출", "미제출/미확인"],
  ],
  col(0.2),
  4.25,
  8.6,
  0.48,
  [2.1, 4.6, 1.9],
  8
);
callout(s, "정직한 성과 표기", "공식 Private 점수처럼 보이게 쓰지 않고, 내부 validation 결과와 공식 제출 점수를 분리했습니다.", col(9.15), 2.0, 2.55, 1.55, true);
callout(s, "실험 조건", "최종 비교는 10 epoch 기준으로 정리하고, 2024년 이후 발표 모델은 사용하지 않는 조건으로 구성했습니다.", col(9.15), 4.05, 2.55, 1.35);
remember("05", "Evaluation boundary", "Dice 지표와 공식 제출 점수의 차이를 명확히 설명");

// 06
s = slide("DATASET INVENTORY", "Dataset files and model pipeline", "06");
node(s, "train_img\n7,140 images\n1024×1024", col(0.0), 1.95, 2.1, 0.9);
node(s, "train.csv\nimg_id / img_path / mask_rle", col(2.85), 1.95, 2.45, 0.9, true);
node(s, "test_img\n60,640 images\n224×224", col(5.95), 1.95, 2.1, 0.9);
node(s, "sample_submission\nimg_id / mask_rle", col(8.85), 1.95, 2.45, 0.9);
node(s, "Dataset class\n이미지 + mask 로드", col(1.1), 4.0, 2.55, 0.82);
node(s, "Train / validation\n학습과 threshold 선택", col(4.55), 4.0, 2.7, 0.82);
node(s, "Inference / submission\nmask → RLE 제출", col(8.1), 4.0, 2.75, 0.82);
arrow(s, col(1.0), 2.85, col(2.2), 4.0);
arrow(s, col(4.05), 2.85, col(2.65), 4.0);
arrow(s, col(6.95), 2.85, col(9.0), 4.0);
arrow(s, col(10.05), 2.85, col(9.45), 4.0);
arrow(s, col(3.65), 4.41, col(4.55), 4.41);
arrow(s, col(7.25), 4.41, col(8.1), 4.41);
kpi(s, "7,140", "TRAIN IMAGES", col(0.0), 5.45, 2.0);
kpi(s, "60,640", "TEST IMAGES", col(2.3), 5.45, 2.0);
kpi(s, "RLE", "SUBMISSION FORMAT", col(4.6), 5.45, 2.0);
callout(s, "이 슬라이드의 역할", "파일명을 나열하는 장표가 아니라, 데이터가 학습 입력과 제출 파일로 변환되는 경로를 보여줍니다.", col(7.05), 5.35, 4.2, 0.9);
remember("06", "Dataset inventory", "데이터 파일들이 모델 파이프라인에서 어떤 역할을 하는지 설명");

// 07
s = slide("CSV STRUCTURE", "One CSV row equals one training sample", "07");
table(
  s,
  [
    ["img_id", "img_path", "mask_rle"],
    ["TRAIN_0001", "./train_img/TRAIN_0001.png", "153 12 980 7 ..."],
    ["TRAIN_0002", "./train_img/TRAIN_0002.png", "220 5 400 10 ..."],
  ],
  col(0.0),
  1.85,
  10.2,
  0.58,
  [2.2, 4.0, 4.0],
  8.5
);
node(s, "img_id\n샘플 이름", col(0.3), 4.0, 2.0, 0.72);
node(s, "img_path\n이미지 위치", col(3.6), 4.0, 2.1, 0.72);
node(s, "mask_rle\n정답 mask 압축값", col(6.9), 4.0, 2.6, 0.72, true);
arrow(s, col(1.2), 3.52, col(1.2), 4.0);
arrow(s, col(4.55), 3.52, col(4.55), 4.0);
arrow(s, col(8.15), 3.52, col(8.15), 4.0);
callout(s, "왜 중요했나", "CSV가 이미지와 정답 mask를 연결하기 때문에 Dataset 코드에서 img_path를 읽고, mask_rle을 decode해 학습용 mask를 만들어야 했습니다.", col(0.3), 5.35, 7.9, 0.9);
callout(s, "테스트 데이터 차이", "test.csv에는 mask_rle이 없습니다. 모델이 예측한 mask를 다시 RLE로 변환해 제출 파일을 생성합니다.", col(8.6), 5.35, 2.8, 0.9, true);
remember("07", "CSV structure", "train.csv와 test.csv가 모델 코드와 어떻게 연결되는지 설명");

// 08
s = slide("MASK / RLE", "Why decode before training and encode before submission", "08");
drawMaskGrid(s, col(0.4), 2.0, 0.28);
text(s, "Binary mask\n0=background, 1=building", col(0.4), 3.95, 2.4, 0.42, 10.5, C.black, true);
node(s, "Decode\nRLE → mask", col(3.9), 2.18, 2.1, 0.72, true);
node(s, "Train model\nmask로 loss 계산", col(3.9), 3.32, 2.1, 0.72);
node(s, "Encode\nmask → RLE", col(7.1), 2.18, 2.1, 0.72, true);
node(s, "Submission\n건물 없음은 -1", col(7.1), 3.32, 2.1, 0.72);
node(s, "mask_rle string\n8 3 14 3 23 2 ...", col(9.75), 2.75, 2.25, 0.78);
arrow(s, col(2.65), 2.76, col(3.9), 2.54);
arrow(s, col(6.0), 2.54, col(7.1), 2.54);
arrow(s, col(9.2), 2.54, col(9.75), 3.04);
arrow(s, col(9.2), 3.68, col(9.75), 3.18);
callout(s, "학습 전", "모델은 문자열을 직접 학습할 수 없기 때문에 RLE를 2D mask 배열로 복원해야 합니다.", col(0.4), 5.25, 3.5, 0.88);
callout(s, "제출 전", "제출 양식은 mask_rle 컬럼을 요구하므로, 예측 mask를 다시 RLE 문자열로 압축합니다.", col(4.25), 5.25, 3.5, 0.88);
callout(s, "건물 없음", "추론 이미지에는 건물이 없을 수 있어 빈 mask는 반드시 -1로 처리합니다.", col(8.1), 5.25, 3.5, 0.88, true);
remember("08", "Mask/RLE", "RLE와 mask 변환이 왜 필요한지 학습/제출 관점에서 설명");

// 09
s = slide("VALIDATION DESIGN", "Train/holdout split and resolution mismatch", "09");
kpi(s, String(split.train_size), "TRAIN SPLIT", col(0.2), 1.9, 2.1);
kpi(s, String(split.holdout_size), "HOLDOUT SPLIT", col(2.6), 1.9, 2.1);
kpi(s, String(split.test_size), "TEST SAMPLES", col(5.0), 1.9, 2.1);
node(s, "Train image\n1024×1024\n0.5m/pixel", col(0.4), 3.75, 2.4, 0.92);
node(s, "Patch crop\n384×384", col(4.1), 3.75, 2.1, 0.92, true);
node(s, "Model input\n256×256", col(7.25), 3.75, 2.1, 0.92);
node(s, "Test image\n224×224", col(10.05), 3.75, 1.8, 0.92);
arrow(s, col(2.8), 4.21, col(4.1), 4.21);
arrow(s, col(6.2), 4.21, col(7.25), 4.21);
arrow(s, col(9.35), 4.21, col(10.05), 4.21);
callout(s, "검증 설계", "train 전체를 그대로 검증하면 성능을 과대평가할 수 있어 seed 42, 8:2 holdout split으로 내부 검증을 구성했습니다.", col(0.4), 5.6, 5.1, 0.9);
callout(s, "해상도 차이", "train은 1024×1024, test는 224×224라서 원본 정보를 살리는 patch 기반 학습과 추론 크기 분리가 필요했습니다.", col(6.0), 5.6, 5.1, 0.9, true);
remember("09", "Validation design", "검증 데이터 구성과 train/test 해상도 차이를 설명");

// 10
s = slide("BASELINE", "Baseline setup: simple U-Net pipeline", "10");
node(s, "Image load", col(0.4), 2.0, 1.5, 0.64);
node(s, "RLE decode", col(2.35), 2.0, 1.7, 0.64);
node(s, "U-Net", col(4.55), 2.0, 1.5, 0.64, true);
node(s, "Threshold 0.5", col(6.5), 2.0, 1.9, 0.64);
node(s, "RLE encode", col(8.9), 2.0, 1.7, 0.64);
arrow(s, col(1.9), 2.32, col(2.35), 2.32);
arrow(s, col(4.05), 2.32, col(4.55), 2.32);
arrow(s, col(6.05), 2.32, col(6.5), 2.32);
arrow(s, col(8.4), 2.32, col(8.9), 2.32);
table(
  s,
  [
    ["항목", "베이스라인 설정", "확인 목적"],
    ["모델", "U-Net", "segmentation 학습 루프 확인"],
    ["입력", "224 resize", "test 크기와 맞춘 최소 구현"],
    ["Loss", "BCE + Dice", "픽셀 분류와 overlap 동시 확인"],
    ["후처리", "threshold 0.5", "기본 mask 이진화"],
  ],
  col(0.4),
  3.35,
  7.9,
  0.44,
  [1.5, 3.0, 3.4],
  7.8
);
callout(s, "베이스라인의 역할", "최종 성능용 모델이라기보다 데이터 로딩, RLE 변환, 학습/검증/제출 파이프라인이 정상 작동하는지 확인하는 기준점입니다.", col(8.8), 3.48, 2.75, 1.25, true);
remember("10", "Baseline", "처음 기준 모델과 그 목적을 파이프라인 형태로 설명");

// 11
s = slide("BASELINE LIMITS", "What the baseline could not handle well", "11");
imageFrame(s, path.join(ASSET_DIR, "case04_suburban_trees_overlay.png"), col(0.4), 1.82, 1.85, 1.85, "Trees + roof");
imageFrame(s, path.join(ASSET_DIR, "case03_sparse_object_overlay.png"), col(2.55), 1.82, 1.85, 1.85, "Sparse buildings");
imageFrame(s, path.join(ASSET_DIR, "case06_shadow_sportsfield_overlay.png"), col(4.7), 1.82, 1.85, 1.85, "Shadow / field");
table(
  s,
  [
    ["문제점", "원인", "개선 방향"],
    ["작은 건물 누락", "resize로 세부 정보 손실", "patch crop + encoder 강화"],
    ["그림자/수목 오탐", "건물과 유사한 색/질감", "Focal loss + hard case 확인"],
    ["경계가 둥글게 번짐", "단순 decoder와 threshold 고정", "UNet++ + threshold sweep"],
    ["빈 mask 처리 누락 위험", "test에는 건물이 없을 수 있음", "min-area + -1 rule"],
  ],
  col(0.4),
  4.35,
  8.9,
  0.42,
  [2.1, 3.2, 3.6],
  7.6
);
callout(s, "핵심 판단", "성능 개선은 단일 모델 교체보다 데이터 crop, loss, inference 후처리를 함께 다루는 것이 더 현실적이라고 판단했습니다.", col(9.65), 2.08, 2.35, 1.25, true);
remember("11", "Baseline limits", "베이스라인의 약점을 장면별 이미지와 개선 방향으로 연결");

// 12
s = slide("IMPROVEMENT MAP", "Five changes added to improve validation performance", "12");
const improvements = [
  ["01", "Patch-based training", "1024 원본에서 384 crop으로 작은 건물 정보 보존"],
  ["02", "UNet++ encoder", "dense skip connection과 ResNet34 encoder로 경계·작은 구조 보강"],
  ["03", "Focal + Dice loss", "건물/배경 불균형과 mask overlap을 동시에 최적화"],
  ["04", "TTA inference", "flip 예측 평균으로 추론 안정성 확보"],
  ["05", "Threshold/postprocess", "최적 threshold, 작은 component 제거, hole filling"],
];
improvements.forEach((it, i) => {
  const x = i < 3 ? col(0.2) + i * 3.75 : col(2.05) + (i - 3) * 3.75;
  const y = i < 3 ? 1.9 : 4.05;
  addStep(s, it[0], it[1], it[2], x, y, 3.25);
});
callout(s, "SR 모델 검토 결과", "SwinIR 같은 초해상도 전처리는 보조로 검토할 수 있지만, 본 실험에서는 데이터 규모·검증 안정성 측면에서 segmentation pipeline 개선을 우선했습니다.", col(0.2), 5.9, 8.8, 0.85);
remember("12", "Improvement map", "성능을 올리기 위해 코드와 실험에서 바꾼 다섯 가지를 요약");

// 13
s = slide("MODEL SELECTION", "UNet++ was selected because building masks need boundary detail", "13");
table(
  s,
  [
    ["모델", "판단 기준", "채택 여부"],
    ["U-Net", "빠르고 단순하지만 복잡한 경계와 작은 건물에서 한계", "Baseline"],
    ["DeepLabV3+", "context 포착은 강하지만 작은 footprint 경계가 뭉개질 수 있음", "비교 후보"],
    ["UNet++ ResNet34", "nested dense skip으로 세부 경계와 multi-scale feature 결합", "최종 주 모델"],
    ["Detectron2", "bbox/instance 관점의 객체 단위 분석 가능", "보조 실험"],
  ],
  col(0.1),
  1.78,
  6.8,
  0.45,
  [1.55, 3.95, 1.3],
  7.0
);
callout(
  s,
  "논문 근거",
  "UNet++ 논문은 U-Net의 단순 skip connection이 encoder와 decoder feature 간 semantic gap을 만들 수 있다고 보고, nested dense skip pathway로 이를 완화한다고 설명합니다.",
  col(7.45),
  1.85,
  3.65,
  1.2,
  true
);
node(s, "Encoder\nResNet34\npretrained", col(0.35), 4.55, 1.95, 0.72, true);
node(s, "Nested dense\nskip pathway", col(3.0), 4.55, 2.05, 0.72);
node(s, "Decoder\nboundary recovery", col(5.75), 4.55, 2.15, 0.72);
arrow(s, col(2.3), 4.91, col(3.0), 4.91);
arrow(s, col(5.05), 4.91, col(5.75), 4.91);
codeBox(
  s,
  "MODEL IMPLEMENTATION",
  [
    'if name == "unetplusplus":',
    "    return smp.UnetPlusPlus(",
    '        encoder_name="resnet34",',
    '        encoder_weights="imagenet",',
    "        in_channels=3, classes=1)",
  ].join("\n"),
  col(8.45),
  4.15,
  2.95,
  1.35,
  false
);
callout(s, "프로젝트 연결", "건물 mask는 작은 지붕과 외곽선이 Dice를 좌우하므로, feature 결합 구조가 강한 UNet++를 최종 주 모델로 선택했습니다.", col(0.35), 5.8, 7.6, 0.75, false);
callout(s, "주의", "논문의 deep supervision 성능을 그대로 주장하지 않고, 본 프로젝트에서는 UNet++ 구조적 장점을 근거로 사용했다고 표현합니다.", col(8.45), 5.8, 2.95, 0.75, true);
remember("13", "Model selection", "모델 후보를 비교하고 최종 UNet++ 선택 이유를 설명");

// 14
s = slide("PATCH TRAINING", "Patch-based training keeps local detail", "14");
s.addShape(pptx.ShapeType.rect, { x: col(0.4), y: 1.9, w: 3.0, h: 3.0, fill: { color: C.off }, line: { color: C.black, width: 1.1 } });
s.addText("1024×1024\noriginal image", { x: col(0.4), y: 2.95, w: 3.0, h: 0.6, fontFace: mono, fontSize: 12, bold: true, align: "center", color: C.black, margin: 0 });
s.addShape(pptx.ShapeType.rect, { x: col(1.15), y: 2.45, w: 1.2, h: 1.2, fill: { color: C.red, transparency: 72 }, line: { color: C.red, width: 1.6 } });
node(s, "Random crop\n384×384", col(4.25), 2.25, 2.1, 0.72, true);
node(s, "Resize\n256×256 model input", col(7.0), 2.25, 2.35, 0.72);
node(s, "Test inference\n224×224 no crop", col(9.85), 2.25, 2.0, 0.72);
arrow(s, col(3.4), 3.0, col(4.25), 2.61);
arrow(s, col(6.35), 2.61, col(7.0), 2.61);
arrow(s, col(9.35), 2.61, col(9.85), 2.61);
table(
  s,
  [
    ["구분", "설정", "이유"],
    ["Train crop", "384×384", "원본 고해상도에서 건물 세부 정보 유지"],
    ["Model input", "256×256", "메모리와 학습 속도 균형"],
    ["Test input", "224×224", "대회 test 이미지 크기 유지"],
  ],
  col(0.4),
  5.05,
  8.2,
  0.43,
  [1.8, 2.2, 4.2],
  7.8
);
callout(s, "개선 효과", "단순 224 resize보다 건물 경계와 작은 객체 정보를 학습 데이터 안에 더 많이 남길 수 있습니다.", col(9.1), 5.05, 2.6, 0.95, true);
remember("14", "Patch training", "원본 이미지를 crop해 학습한 이유와 입력 크기 설정을 설명");

// 15
s = slide("PREPROCESSING", "Augmentation and normalization strategy", "15");
node(s, "RandomCrop 384", col(0.3), 2.0, 2.0, 0.62, true);
node(s, "Resize 256", col(2.85), 2.0, 1.7, 0.62);
node(s, "Flip / Rotate90", col(5.1), 2.0, 2.0, 0.62);
node(s, "Normalize", col(7.65), 2.0, 1.7, 0.62);
node(s, "Tensor", col(9.85), 2.0, 1.4, 0.62);
arrow(s, col(2.3), 2.31, col(2.85), 2.31);
arrow(s, col(4.55), 2.31, col(5.1), 2.31);
arrow(s, col(7.1), 2.31, col(7.65), 2.31);
arrow(s, col(9.35), 2.31, col(9.85), 2.31);
table(
  s,
  [
    ["처리", "목적", "포트폴리오에서 강조할 점"],
    ["Crop", "고해상도 공간정보 보존", "데이터 이해 기반 전처리"],
    ["Horizontal / Vertical Flip", "방향 변화에 대한 일반화", "위성 이미지 방향 불변성 반영"],
    ["RandomRotate90", "격자형 도시 구조의 방향 다양성 확보", "과적합 완화"],
    ["Normalize", "pretrained encoder 입력 분포 정렬", "모델 안정성 향상"],
  ],
  col(0.3),
  3.35,
  9.3,
  0.43,
  [2.0, 3.05, 4.25],
  7.7
);
callout(s, "검증 transform", "Validation은 random augmentation 없이 center crop/resize로 고정해 threshold 비교가 흔들리지 않도록 구성했습니다.", col(9.95), 3.45, 1.9, 1.2, true);
remember("15", "Preprocessing", "augmentation과 normalization이 왜 필요한지 설명");

// 16
s = slide("LOSS / OPTIMIZATION", "Focal + Dice loss for imbalanced building masks", "16");
node(s, "Focal loss\nhard pixel에 가중", col(0.5), 2.1, 2.2, 0.78, true);
node(s, "Dice loss\noverlap 최적화", col(4.0), 2.1, 2.2, 0.78);
node(s, "Focal + Dice\n불균형과 mask 품질 동시 개선", col(7.55), 2.1, 2.85, 0.78, true);
arrow(s, col(2.7), 2.49, col(4.0), 2.49);
arrow(s, col(6.2), 2.49, col(7.55), 2.49);
text(
  s,
  [
    "건물 영역은 이미지 전체에서 차지하는 비율이 작아 배경 픽셀이 loss를 지배하기 쉽습니다.",
    "Focal loss는 맞추기 쉬운 배경보다 어려운 건물/경계 픽셀에 학습을 더 집중시킵니다.",
    "Dice loss는 픽셀별 정답뿐 아니라 예측 mask와 정답 mask의 겹침 정도를 직접 반영합니다.",
  ],
  col(0.5),
  3.55,
  7.4,
  1.1,
  11.3,
  C.black
);
callout(s, "구현상 처리", "MPS 환경에서 일부 focal loss 구현의 dtype 이슈가 있어, 학습 안정성을 위해 focal component를 직접 계산하는 방식으로 구성했습니다.", col(8.3), 3.5, 3.0, 1.05, true);
callout(s, "성능 해석", "Loss 설계는 작은 건물과 경계 픽셀을 더 적극적으로 학습하게 만들어 Dice 개선에 기여했습니다.", col(8.3), 4.9, 3.0, 0.9);
remember("16", "Loss/optimization", "Focal+Dice loss를 선택한 이유와 구현상 고려점을 설명");

// 17
s = slide("INFERENCE", "TTA and post-processing before submission", "17");
node(s, "Original prediction", col(0.4), 1.95, 2.2, 0.64);
node(s, "H-flip prediction", col(0.4), 2.85, 2.2, 0.64);
node(s, "V-flip prediction", col(0.4), 3.75, 2.2, 0.64);
node(s, "HV-flip prediction", col(0.4), 4.65, 2.2, 0.64);
node(s, "Average probability", col(4.1), 3.25, 2.35, 0.76, true);
node(s, "Threshold", col(7.15), 3.25, 1.75, 0.76);
node(s, "Post-process\nmin area + fill holes", col(9.55), 3.25, 2.35, 0.76, true);
[2.27, 3.17, 4.07, 4.97].forEach((yy) => arrow(s, col(2.6), yy, col(4.1), 3.63, C.red, 0.9));
arrow(s, col(6.45), 3.63, col(7.15), 3.63);
arrow(s, col(8.9), 3.63, col(9.55), 3.63);
table(
  s,
  [
    ["기법", "설정", "목적"],
    ["TTA", "원본/좌우/상하/좌우상하 flip 평균", "예측 안정화"],
    ["Threshold", `${fmt(finalRawThreshold, 2)} raw, ${fmt(proxyThreshold, 2)} proxy`, "확률 mask를 0/1로 변환"],
    ["Post-process", "min_area 16, hole filling", "작은 잡음 제거와 내부 구멍 보정"],
  ],
  col(0.4),
  5.5,
  9.3,
  0.42,
  [1.8, 4.2, 3.3],
  7.5
);
callout(s, "제출 연결", "후처리된 binary mask는 마지막 단계에서 RLE로 변환되고, 빈 mask는 -1로 기록됩니다.", col(10.05), 5.5, 1.9, 0.9, true);
remember("17", "Inference", "TTA, threshold, 후처리, 제출 변환까지 inference 흐름을 설명");

// 18
s = slide("THRESHOLD SWEEP", "Choosing threshold by validation Dice", "18");
chartFrame(s, "Best threshold by epoch", col(0.2), 1.78, 5.9, 3.25);
lineChart(
  s,
  col(0.35),
  2.13,
  5.55,
  2.75,
  [
    { name: "Raw threshold", labels: labels10, values: rawHist.map((r) => r.best_threshold_epoch) },
    { name: "Proxy threshold", labels: labels10, values: proxyHist.map((r) => r.best_threshold_epoch) },
  ],
  0.15,
  0.8
);
node(s, "낮은 threshold\n검출 증가\nFP 증가 가능", col(6.65), 2.02, 2.15, 0.86, true);
node(s, "높은 threshold\n보수적 예측\nFN 증가 가능", col(9.35), 2.02, 2.15, 0.86);
arrow(s, col(8.8), 2.45, col(9.35), 2.45);
text(
  s,
  [
    "Threshold는 모델 출력 확률을 binary mask로 바꾸는 기준값입니다.",
    "최종 fine-tune 검증에서는 0.20~0.50 범위를 0.01 간격으로 탐색했습니다.",
    `Raw holdout 기준 best threshold는 ${fmt(finalRawThreshold, 2)}로 정리했습니다.`,
  ],
  col(6.65),
  3.55,
  4.6,
  1.0,
  11.2,
  C.black
);
callout(s, "포트폴리오 포인트", "threshold sweep은 모델 학습 이후에도 검증 기준으로 성능을 조정했다는 실험 설계 역량을 보여줍니다.", col(6.65), 5.25, 4.4, 0.9, true);
remember("18", "Threshold sweep", "threshold의 의미와 best threshold 선택 과정을 설명");

// 19
s = slide("TRAINING PERFORMANCE", "Epoch-wise Dice and loss changes", "19");
chartFrame(s, "Validation Dice", col(0.15), 1.72, 5.45, 2.45);
lineChart(
  s,
  col(0.3),
  2.06,
  5.1,
  2.0,
  [
    { name: "Raw holdout", labels: labels10, values: rawHist.map((r) => r.val_dice) },
    { name: "Proxy patch", labels: labels10, values: proxyHist.map((r) => r.val_dice) },
  ],
  0.68,
  0.82
);
chartFrame(s, "Train loss", col(6.0), 1.72, 5.45, 2.45);
lineChart(
  s,
  col(6.15),
  2.06,
  5.1,
  2.0,
  [
    { name: "Raw loss", labels: labels10, values: rawHist.map((r) => r.train_loss) },
    { name: "Proxy loss", labels: labels10, values: proxyHist.map((r) => r.train_loss) },
  ],
  0.1,
  0.26
);
chartFrame(s, "Best internal scores", col(0.15), 4.55, 5.45, 1.7);
barChart(
  s,
  col(0.3),
  4.9,
  5.1,
  1.28,
  [
    {
      name: "Dice",
      labels: ["Raw e10", "Fine-tune", "Proxy best"],
      values: [rawFinal.val_dice, finalRawDice, proxyDice],
    },
  ],
  0.78,
  0.805
);
codeBox(
  s,
  "TERMINAL LOG EVIDENCE",
  [
    `epoch 01 | loss 0.2172 | val_dice 0.6935 | th 0.75`,
    `epoch 05 | loss 0.1362 | val_dice 0.7669 | th 0.25`,
    `epoch 10 | loss 0.1157 | val_dice ${fmt(rawFinal.val_dice)} | th ${fmt(rawFinal.best_threshold_epoch, 2)}`,
    `fine-tune check | val_dice ${fmt(finalRawDice)} | th ${fmt(finalRawThreshold, 2)}`,
    `proxy patch best | val_dice ${fmt(proxyDice)} | th ${fmt(proxyThreshold, 2)}`,
  ].join("\n"),
  col(6.1),
  4.55,
  4.8,
  1.35,
  true
);
text(
  s,
  "차트는 성능 흐름을, 로그 박스는 실제 실행 결과의 핵심 값을 보여줍니다. 공식 Private Score는 제출 서버에서만 산출되므로 포함하지 않았습니다.",
  col(6.1),
  6.08,
  4.8,
  0.46,
  9.4,
  C.gray
);
remember("19", "Training performance", "epoch별 성능과 loss 감소를 수정 가능한 PowerPoint 차트로 제시");

// 20
s = slide("RESULT SUMMARY", "Final score summary with interpretation boundary", "20");
table(
  s,
  [
    ["실험", "데이터 기준", "Epoch", "Best Dice", "Threshold", "해석"],
    ["UNet++ raw patch", "원본 holdout", "10", fmt(rawFinal.val_dice), fmt(rawFinal.best_threshold_epoch, 2), "10 epoch 기준 내부 검증"],
    ["UNet++ fine-tune check", "원본 holdout", "1", fmt(finalRawDice), fmt(finalRawThreshold, 2), "best weight 재평가/저LR 확인"],
    ["UNet++ proxy patch", "proxy patch", "10", fmt(proxyDice), fmt(proxyThreshold, 2), "대체 patch 환경에서 0.8 이상"],
    ["Official Private", "DACON 서버", "-", "미확인", "-", "제출을 통해서만 확인 가능"],
  ],
  col(0.05),
  1.75,
  11.2,
  0.49,
  [2.1, 1.9, 0.9, 1.25, 1.2, 3.85],
  7.0
);
kpi(s, fmt(finalRawDice), "RAW HOLDOUT BEST", col(0.3), 4.8, 2.35);
kpi(s, fmt(proxyDice), "PROXY PATCH BEST", col(3.0), 4.8, 2.35);
kpi(s, "Not claimed", "OFFICIAL PRIVATE", col(5.7), 4.8, 2.65, C.red);
callout(s, "성과 문장", "내부 검증 기준으로 0.8에 근접한 원본 holdout 성능과 proxy patch 기준 0.8 이상의 결과를 확보했으며, 공식 점수와는 분리해 해석했습니다.", col(8.7), 4.7, 2.9, 1.0, true);
remember("20", "Result summary", "최종 성능을 과장 없이 원본 holdout/proxy/공식 제출 기준으로 구분");

// 21
s = slide("QUALITATIVE GUIDE", "How to read segmentation result images", "21");
imageFrame(s, path.join(ASSET_DIR, "case01_urban_mixed_satellite.png"), col(0.35), 1.82, 1.8, 1.8, "Satellite");
imageFrame(s, path.join(ASSET_DIR, "case01_urban_mixed_ground_truth.png"), col(2.55), 1.82, 1.8, 1.8, "Ground Truth");
imageFrame(s, path.join(ASSET_DIR, "case01_urban_mixed_prediction.png"), col(4.75), 1.82, 1.8, 1.8, "Prediction");
imageFrame(s, path.join(ASSET_DIR, "case01_urban_mixed_overlay.png"), col(6.95), 1.82, 1.8, 1.8, "Overlay");
node(s, "Green / GT\n정답 건물 영역", col(9.45), 1.95, 2.2, 0.7);
node(s, "Red / Prediction\n모델 예측 영역", col(9.45), 2.95, 2.2, 0.7, true);
callout(s, "확인 기준 1", "GT와 Prediction이 겹치면 올바르게 예측한 영역입니다.", col(0.35), 4.85, 3.2, 0.78);
callout(s, "확인 기준 2", "빨간색만 보이면 오탐, 초록색만 보이면 미탐 가능성이 있습니다.", col(3.9), 4.85, 3.2, 0.78);
callout(s, "확인 기준 3", "경계가 얼마나 깔끔한지, 작은 건물을 얼마나 놓치는지 같이 확인합니다.", col(7.45), 4.85, 3.2, 0.78, true);
remember("21", "Qualitative guide", "위성 이미지, 정답, 예측, overlay를 읽는 방법을 안내");

// 22
s = slide("STRONG CASE", "Successful prediction: repeated residential roofs", "22");
["satellite", "ground_truth", "prediction", "overlay"].forEach((name, i) => {
  const caps = ["Satellite crop", "Ground Truth", "Prediction", "Overlay"];
  const notes = ["반복적인 건물 패턴", "정답 건물 mask", "모델 예측 mask", "겹침 정도 확인"];
  imageFrame(s, path.join(ASSET_DIR, `strong_${name}.png`), col(0.05) + i * 2.9, 1.82, 2.36, 2.36, caps[i], notes[i]);
});
callout(s, "이미지가 보여주는 내용", "지붕의 색과 형태가 비교적 일정하고 도로·배경과 경계가 명확해 모델이 건물 footprint를 안정적으로 따라간 사례입니다.", col(0.15), 5.25, 5.1, 0.9);
callout(s, "해석 포인트", "overlay에서 GT와 Prediction이 넓게 겹치므로, patch 기반 학습과 UNet++ 구조가 반복 주거지 패턴에 잘 반응한 것으로 해석했습니다.", col(5.75), 5.25, 5.1, 0.9, true);
remember("22", "Strong case", "성공 사례를 4패널 이미지와 해석 문장으로 제시");

// 23
s = slide("FAILURE CASE", "Difficult scene: shadow and confusing background", "23");
["satellite", "ground_truth", "prediction", "overlay"].forEach((name, i) => {
  const caps = ["Satellite crop", "Ground Truth", "Prediction", "Overlay"];
  const notes = ["그림자·수목 혼재", "정답 건물 mask", "모델 예측 mask", "오탐/미탐 비교"];
  imageFrame(s, path.join(ASSET_DIR, `failure_${name}.png`), col(0.05) + i * 2.9, 1.82, 2.36, 2.36, caps[i], notes[i]);
});
callout(s, "이미지가 보여주는 내용", "그림자, 수목, 넓은 비건물 구조가 건물과 유사한 색/질감을 만들어 예측이 흔들리는 장면입니다.", col(0.15), 5.25, 5.1, 0.9);
callout(s, "개선 방향", "hard negative sample 확대, boundary-aware loss, AOI별 threshold, morphology 후처리 세분화를 다음 실험으로 제안할 수 있습니다.", col(5.75), 5.25, 5.1, 0.9, true);
remember("23", "Failure case", "실패 사례를 통해 한계와 개선 방향을 구체화");

// 24
s = slide("REPRESENTATIVE CASES", "Model behavior across different scenes", "24");
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
    tag: "LARGE ROOF",
    title: "대형 지붕",
    behavior: "큰 건물 footprint는 잘 포착하지만, 인접 구조물에서 경계가 번질 수 있습니다.",
    takeaway: "관찰: 큰 객체는 유리, 경계 보정 필요",
  },
  {
    prefix: "case03_sparse_object",
    tag: "SPARSE OBJECT",
    title: "희소 건물",
    behavior: "건물이 적거나 작을수록 예측 면적이 흔들리고 false positive가 일부 발생합니다.",
    takeaway: "개선: threshold와 min-area 후처리",
    warning: true,
  },
  {
    prefix: "case04_suburban_trees",
    tag: "TREES / SHADOW",
    title: "수목 혼재 주거지",
    behavior: "나무 그림자와 지붕 색이 섞인 영역에서 누락과 과검출이 동시에 나타납니다.",
    takeaway: "난점: vegetation / shadow confusion",
    warning: true,
  },
  {
    prefix: "case05_residential_blocks",
    tag: "CURVED ROAD",
    title: "곡선 도로 주변",
    behavior: "도로를 따라 배치된 건물은 비교적 잘 잡지만 roof edge가 둥글게 예측됩니다.",
    takeaway: "개선: boundary-aware loss 검토",
  },
  {
    prefix: "case06_shadow_sportsfield",
    tag: "SPORTS FIELD",
    title: "그림자와 운동장",
    behavior: "운동장·그림자·작은 구조물이 건물처럼 보이는 경우 오탐이 증가합니다.",
    takeaway: "실패 분석: hard negative 필요",
    warning: true,
  },
];
representativeCases.forEach((cfg, i) => {
  const x = i % 2 === 0 ? col(0) : col(6.05);
  const y = 1.7 + Math.floor(i / 2) * 1.7;
  caseCard(s, cfg, x, y, 5.55, 1.45);
});
text(s, "대표 장면을 조건별로 나눠 보여주면 모델의 강점과 약점을 한 장에서 설명할 수 있습니다.", col(0), 6.74, 9.6, 0.24, 8.2, C.gray);
remember("24", "Representative cases", "다양한 장면에서 모델이 어떻게 예측했는지 대표 사례 카드로 정리");

// 25
s = slide("FULL CONTACT SHEET", "Validation contact sheet for portfolio appendix", "25");
imageFrame(s, path.join(ASSET_DIR, "01_dacon_segmentation_validation_contact_sheet.png"), col(0.0), 1.7, 4.15, 5.15);
text(
  s,
  [
    "이 이미지는 validation sample의 satellite / ground truth / prediction / overlay를 한 번에 확인하기 위한 contact sheet입니다.",
    "본문 발표에서는 대표 사례를 크게 보여주고, 이 슬라이드는 Q&A나 부록에서 근거 자료로 활용하는 것이 좋습니다.",
  ],
  col(4.65),
  1.95,
  4.05,
  1.0,
  11.2,
  C.black
);
node(s, "Satellite", col(9.05), 2.05, 1.8, 0.52);
node(s, "Ground Truth", col(9.05), 2.8, 1.8, 0.52);
node(s, "Prediction", col(9.05), 3.55, 1.8, 0.52, true);
node(s, "Overlay", col(9.05), 4.3, 1.8, 0.52);
callout(s, "설명 방법", "성공 사례와 실패 사례를 함께 집어 설명하면 단순 결과 나열보다 모델 해석 능력이 더 잘 드러납니다.", col(4.65), 5.45, 5.0, 0.88, true);
remember("25", "Full contact sheet", "전체 정성 결과를 부록형 근거 이미지로 제공");

// 26
s = slide("DETECTION BRANCH", "Detectron2 as an auxiliary instance-level experiment", "26");
node(s, "SpaceNet / COCO format\nbuilding polygons", col(0.25), 2.0, 2.7, 0.82);
node(s, "Detectron2\nMask R-CNN style training", col(4.0), 2.0, 2.55, 0.82, true);
node(s, "bbox + instance mask\nobject-level analysis", col(7.6), 2.0, 2.75, 0.82);
arrow(s, col(2.95), 2.41, col(4.0), 2.41);
arrow(s, col(6.55), 2.41, col(7.6), 2.41);
table(
  s,
  [
    ["구분", "Segmentation 주 실험", "Detection 보조 실험"],
    ["목표", "픽셀 단위 건물 영역 mask", "건물 객체 단위 bbox/instance 확인"],
    ["출력", "binary mask / RLE", "bbox, score, instance mask"],
    ["포트폴리오 역할", "최종 성능 중심", "객체 단위 해석 보강"],
  ],
  col(0.25),
  3.75,
  8.9,
  0.48,
  [1.8, 3.5, 3.6],
  7.8
);
callout(s, "주의할 점", "Detection 결과는 semantic segmentation 제출 점수를 대체하지 않습니다. 보조 실험으로 분리해 설명해야 합니다.", col(9.55), 3.85, 2.1, 1.1, true);
remember("26", "Detection branch", "Detectron2를 주 결과가 아닌 보조 instance 분석으로 설명");

// 27
s = slide("DETECTION OVERLAY", "Editable GT footprint fill and prediction bbox overlay", "27");
const overlayInfo = drawDetectionOverlay(s, "AOI_5_Khartoum_img1210", col(0.1), 1.72, 4.85);
node(s, "GT footprint\n초록 반투명 면", col(5.45), 1.95, 2.1, 0.68);
node(s, "Predicted bbox\n빨간 박스 + score", col(5.45), 2.9, 2.4, 0.68, true);
text(
  s,
  [
    "이 슬라이드의 초록 footprint 면과 빨간 bbox는 PowerPoint 도형입니다.",
    "면 색상, 투명도, 박스 위치, score label을 직접 수정할 수 있어 발표용 설명에 맞게 조정 가능합니다.",
    `표시된 예측 bbox: ${overlayInfo.predRows.length}개, GT footprint: ${overlayInfo.gtFilledCount}개`,
  ],
  col(8.25),
  1.95,
  3.2,
  1.15,
  10.6,
  C.black
);
callout(s, "이미지 설명", "초록 반투명 면은 정답 건물 footprint이고, 빨간 박스는 모델이 건물 후보로 잡은 위치입니다. 둘이 얼마나 겹치는지 비교해 detection branch의 동작을 설명합니다.", col(5.45), 4.1, 5.9, 0.9, true);
remember("27", "Detection overlay", "Detectron2 예측 bbox와 정답 building footprint를 편집 가능한 도형으로 시각화");

// 28
s = slide("DETECTION METRICS", "Auxiliary detection training metrics", "28");
const detLabels = detTrainRows.map((r) => String(r.iteration));
chartFrame(s, "Detection loss trend", col(0.1), 1.72, 5.4, 2.6);
lineChart(
  s,
  col(0.25),
  2.05,
  5.05,
  2.08,
  [
    { name: "Total loss", labels: detLabels, values: detTrainRows.map((r) => r.total_loss) },
    { name: "Mask loss", labels: detLabels, values: detTrainRows.map((r) => r.loss_mask) },
  ],
  0,
  Math.max(...detTrainRows.map((r) => r.total_loss)) * 1.1
);
chartFrame(s, "Final AP metrics", col(6.0), 1.72, 5.4, 2.6);
barChart(
  s,
  col(6.15),
  2.05,
  5.05,
  2.08,
  [
    {
      name: "AP",
      labels: ["bbox/AP", "bbox/AP50", "segm/AP", "segm/AP50"],
      values: [
        Number(detFinal["bbox/AP"] || 0),
        Number(detFinal["bbox/AP50"] || 0),
        Number(detFinal["segm/AP"] || 0),
        Number(detFinal["segm/AP50"] || 0),
      ],
    },
  ],
  0,
  25
);
table(
  s,
  [
    ["Metric", "Value", "해석"],
    ["bbox/AP", fmt(detFinal["bbox/AP"] || 0, 2), "bbox 평균 정밀도"],
    ["bbox/AP50", fmt(detFinal["bbox/AP50"] || 0, 2), "IoU 0.5 기준 bbox 성능"],
    ["segm/AP", fmt(detFinal["segm/AP"] || 0, 2), "instance mask 평균 정밀도"],
    ["segm/AP50", fmt(detFinal["segm/AP50"] || 0, 2), "IoU 0.5 기준 mask 성능"],
  ],
  col(0.1),
  4.75,
  5.55,
  0.38,
  [1.4, 1.0, 3.15],
  7.4
);
codeBox(
  s,
  "TERMINAL AP OUTPUT",
  [
    "iteration: 200",
    `bbox/AP   ${fmt(detFinal["bbox/AP"] || 0, 4)}`,
    `bbox/AP50 ${fmt(detFinal["bbox/AP50"] || 0, 4)}`,
    `segm/AP   ${fmt(detFinal["segm/AP"] || 0, 4)}`,
    `segm/AP50 ${fmt(detFinal["segm/AP50"] || 0, 4)}`,
  ].join("\n"),
  col(6.05),
  4.72,
  2.65,
  1.55,
  true
);
callout(s, "발표 기준", "이 지표는 최종 DACON score가 아니라 instance-level 보조 분석입니다. AP가 낮아도 bbox/mask 관점까지 확장해 검증했다는 근거로 제시합니다.", col(9.05), 4.78, 2.55, 1.12, true);
remember("28", "Detection metrics", "Detectron2 결과를 보조 실험으로 해석할 수 있게 수치와 한계를 함께 제시");

// 29
s = slide("CODE ARCHITECTURE", "Training code modules and responsibilities", "29");
const modules = [
  ["RLE utils", "decode_rle_to_mask / encode_mask_to_rle", "CSV와 mask 배열 사이 변환"],
  ["Dataset", "SatelliteDataset", "이미지, mask, transform을 학습 batch로 구성"],
  ["Transforms", "build_train_transform / build_val_transform", "crop, resize, flip, normalize 관리"],
  ["Model", "build_model", "UNet++ ResNet34 encoder 생성"],
  ["Train loop", "train_one_epoch", "loss 계산, optimizer step"],
  ["Validation", "validate_and_sweep_threshold", "Dice 계산과 best threshold 선택"],
  ["Inference", "predict_with_tta / postprocess_mask", "TTA, threshold, 후처리, 제출 mask 생성"],
];
table(
  s,
  [["모듈", "대표 함수", "역할"], ...modules],
  col(0.05),
  1.72,
  6.25,
  0.38,
  [1.25, 2.55, 2.45],
  6.3
);
codeBox(
  s,
  "KEY PIPELINE FUNCTIONS",
  [
    "mask = decode_rle(mask_rle)",
    "image, mask = transform(image, mask)",
    'model = smp.UnetPlusPlus("resnet34")',
    "logits = model(image)",
    "loss = focal_loss + dice_loss",
    "best_th = sweep_threshold(val_preds)",
    "rle = encode_mask_to_rle(mask)",
  ].join("\n"),
  col(6.7),
  1.72,
  4.2,
  2.55,
  true
);
callout(s, "설명 방식", "코드 전체를 나열하지 않고, RLE 변환부터 threshold 선택과 제출 변환까지 이어지는 핵심 함수 흐름만 보여줍니다.", col(0.2), 5.45, 5.4, 0.86, true);
node(s, "CSV", col(6.8), 5.5, 0.9, 0.45);
node(s, "Dataset", col(8.0), 5.5, 1.15, 0.45, true, 8);
node(s, "Model", col(9.45), 5.5, 0.95, 0.45);
node(s, "RLE", col(10.7), 5.5, 0.75, 0.45);
arrow(s, col(7.7), 5.73, col(8.0), 5.73);
arrow(s, col(9.15), 5.73, col(9.45), 5.73);
arrow(s, col(10.4), 5.73, col(10.7), 5.73);
remember("29", "Code architecture", "학습 코드의 구성 요소와 각 함수의 역할을 요약");

// 30
s = slide("CODE CHANGES", "What changed from baseline and why it mattered", "30");
table(
  s,
  [
    ["변경 내용", "기존 접근", "개선 접근", "이유"],
    ["입력 처리", "224 resize", "384 crop → 256 input", "작은 건물과 경계 정보 보존"],
    ["모델", "U-Net", "UNet++ ResNet34", "multi-scale feature와 pretrained encoder 활용"],
    ["Loss", "BCE + Dice", "Focal + Dice", "class imbalance와 hard pixel 대응"],
    ["검증", "고정 threshold", "threshold sweep", "validation Dice 기준 이진화 최적화"],
    ["추론", "single prediction", "flip TTA 평균", "예측 variance 완화"],
    ["후처리", "raw mask", "min-area + fill holes + -1 rule", "잡음 제거와 제출 규칙 대응"],
  ],
  col(0.05),
  1.72,
  11.2,
  0.43,
  [2.0, 2.15, 2.85, 4.2],
  6.8
);
codeBox(
  s,
  "BEFORE",
  ['model = Unet()', 'loss = BCE + Dice', 'threshold = 0.5', 'pred = model(image)'].join("\n"),
  col(0.2),
  5.55,
  2.75,
  1.0,
  false
);
codeBox(
  s,
  "AFTER",
  ['model = UnetPlusPlus(resnet34)', 'loss = Focal + Dice', 'threshold = sweep(val_dice)', 'pred = mean(TTA_preds)'].join("\n"),
  col(3.3),
  5.55,
  3.3,
  1.0,
  true
);
callout(s, "핵심 메시지", "성능 개선은 모델 교체 하나가 아니라 데이터 처리, loss, 검증, inference 후처리를 함께 개선한 결과입니다.", col(7.0), 5.6, 4.0, 0.82, false);
remember("30", "Code changes", "베이스라인 대비 변경된 코드와 성능 개선 이유를 표로 정리");

// 31
s = slide("LIMITATIONS / NEXT STEPS", "Current limitations and next experiments", "31");
table(
  s,
  [
    ["한계", "현재 영향", "다음 개선 방향"],
    ["공식 Private 미확인", "내부 검증 성능만 보유", "제출 후 private/public gap 분석"],
    ["도메인 차이", "train/test 해상도와 촬영 조건 차이", "AOI별 split, domain-specific threshold"],
    ["경계 오류", "지붕 edge가 둥글거나 번짐", "boundary loss, CRF/morphology 비교"],
    ["그림자/수목 오탐", "hard negative에서 FP 증가", "hard example mining, class-balanced sampling"],
    ["단일 holdout", "split에 따른 변동 가능", "K-fold ensemble, seed robustness 확인"],
  ],
  col(0.1),
  1.75,
  10.7,
  0.48,
  [2.0, 3.4, 5.3],
  7.5
);
node(s, "제출 검증", col(0.45), 5.7, 1.65, 0.55, true);
node(s, "K-fold", col(2.65), 5.7, 1.35, 0.55);
node(s, "Boundary loss", col(4.55), 5.7, 1.85, 0.55);
node(s, "AOI threshold", col(6.95), 5.7, 1.85, 0.55);
node(s, "Ensemble", col(9.35), 5.7, 1.55, 0.55);
arrow(s, col(2.1), 5.98, col(2.65), 5.98);
arrow(s, col(4.0), 5.98, col(4.55), 5.98);
arrow(s, col(6.4), 5.98, col(6.95), 5.98);
arrow(s, col(8.8), 5.98, col(9.35), 5.98);
remember("31", "Limitations / next steps", "현재 결과의 한계와 다음 실험 계획을 구체적으로 정리");

// 32
s = slide("CONTRIBUTION", "Portfolio-ready contribution and 1-minute pitch", "32");
table(
  s,
  [
    ["역량", "프로젝트에서 드러난 근거"],
    ["데이터 이해", "CSV/RLE 구조를 분석하고 학습용 mask와 제출용 RLE 변환 파이프라인을 구성"],
    ["모델링", "U-Net baseline에서 UNet++ ResNet34 encoder 기반 구조로 개선"],
    ["실험 설계", "holdout split, threshold sweep, TTA, 후처리 기준을 검증 성능으로 비교"],
    ["결과 해석", "성공/실패 장면을 분리해 오탐·미탐 원인을 분석"],
    ["실무 연결", "제출 포맷, 건물 없음 -1 처리, detection 보조 실험까지 end-to-end로 정리"],
  ],
  col(0.05),
  1.72,
  10.8,
  0.46,
  [1.8, 9.0],
  7.5
);
callout(
  s,
  "1분 소개 문장",
  `이 프로젝트는 위성 이미지에서 건물 영역을 픽셀 단위로 분할하는 과제입니다. U-Net baseline으로 RLE 변환과 학습 파이프라인을 먼저 검증했고, 이후 UNet++ ResNet34 encoder, patch-based training, Focal+Dice loss, TTA, threshold sweep, 후처리를 적용해 내부 holdout Dice ${fmt(finalRawDice)}까지 개선했습니다. 공식 Private 점수는 별도로 주장하지 않고, 성공/실패 사례 분석을 통해 모델이 강한 장면과 어려운 장면을 구분해 개선 방향까지 도출했습니다.`,
  col(0.25),
  5.35,
  10.7,
  1.05,
  true
);
remember("32", "Contribution / pitch", "본인의 기여도와 면접용 1분 설명을 바로 사용할 수 있게 정리");

function buildGuide() {
  const rows = slides.map((item) => `| ${item.no} | ${item.title} | ${item.purpose} |`).join("\n");
  return `# Satellite Image Building Area Segmentation Portfolio Guide

이 문서는 PPT 슬라이드별 설명 가이드입니다. PPT의 텍스트, 도형, 표, 차트, 코드 박스, 범례, 주석은 PowerPoint에서 직접 수정할 수 있습니다. 위성 이미지와 mask 결과 이미지는 실험 결과 증거 자료이므로 위치와 크기는 수정 가능하지만 이미지 내부 픽셀은 이미지 편집 도구에서 수정해야 합니다.

## 이번 버전에서 보강한 점

- UNet++ 선택 이유를 논문 근거, 프로젝트 문제, 실제 구현 코드와 연결했습니다.
- 학습 성능 슬라이드에 epoch별 터미널 로그 형태의 실행 결과를 추가했습니다.
- Detectron2 보조 실험 슬라이드에 AP 지표와 터미널 출력 형태의 근거를 함께 넣었습니다.
- 코드 구조와 코드 변경 슬라이드에 실제 함수 흐름과 before/after 코드 박스를 추가했습니다.
- 모든 슬라이드에 발표자 노트를 추가해 해당 슬라이드를 왜 그렇게 구성했는지 설명했습니다.

## 슬라이드 구성

| No. | Slide | 설명 목적 |
|---|---|---|
${rows}

## 성능 표기 기준

- Raw holdout Dice: 원본 학습 데이터를 내부 holdout으로 나누어 검증한 결과입니다.
- Proxy patch Dice: 대체 patch 실험 환경에서 얻은 내부 검증 결과입니다.
- Official Private Score: DACON 제출 서버에서만 확인 가능한 점수이므로, 본 PPT에서는 미확인으로 분리했습니다.

## 발표 팁

- 결과 슬라이드에서는 숫자만 말하지 말고, 어떤 코드 변경이 어떤 문제를 해결했는지 같이 설명하세요.
- 이미지 슬라이드는 성공 사례와 실패 사례를 함께 보여주며, 모델이 잘하는 조건과 어려워하는 조건을 구분해 말하세요.
- Detection 슬라이드는 최종 segmentation 성능 근거가 아니라 객체 단위 보조 분석으로 설명하는 것이 안전합니다.
`;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(GUIDE_PATH, buildGuide(), "utf8");
  await pptx.writeFile({ fileName: PPTX_PATH });
  console.log(JSON.stringify({ pptx: PPTX_PATH, guide: GUIDE_PATH, slides: slides.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
