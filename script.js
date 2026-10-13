"use strict";

const SHOTS = 4;
const PHOTO_W = 800;
const PHOTO_H = 600;

// Keep in sync with the swatch colors in index.html
const PAPERS = {
  white:  { bg: "#fbfaf7", fg: "#1b1b2f" },
  red:    { bg: "#c2334a", fg: "#fbfaf7" },
  yellow: { bg: "#ffd23f", fg: "#1b1b2f" },
  black:  { bg: "#1b1b2f", fg: "#fbfaf7" },
};

// Live preview filters (CSS). The saved photos use applyFilter() below.
const PREVIEW_FILTERS = {
  none:  "none",
  mono:  "grayscale(1) contrast(1.1)",
  sepia: "sepia(0.85)",
  vivid: "saturate(1.4) contrast(1.1)",
};

const $ = (sel) => document.querySelector(sel);
const video = $("#video");
const gate = $("#gate");
const gateMsg = $("#gateMsg");
const enableBtn = $("#enable");
const startBtn = $("#start");
const downloadBtn = $("#download");
const resetBtn = $("#reset");
const countdownEl = $("#countdown");
const flashEl = $("#flash");
const statusEl = $("#status");
const stripEl = $("#strip");
const captionEl = $("#caption");
const slots = [...document.querySelectorAll(".slot")];

let stream = null;
let busy = false;
let shots = []; // raw (unfiltered) canvases, so the filter can change afterwards

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const currentFilter = () => document.querySelector('input[name="filter"]:checked').value;
const currentPaper = () => document.querySelector('input[name="paper"]:checked').value;

/* Camera */

async function openCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showGate("This browser can't use a camera here. Open the site over https and try again.");
    return;
  }
  enableBtn.disabled = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    gate.hidden = true;
    startBtn.disabled = false;
    setStatus("Ready when you are.");
  } catch (err) {
    const messages = {
      NotAllowedError: "Camera access was blocked. Allow it in your browser's site settings, then try again.",
      NotFoundError: "No camera found. Connect one and try again.",
      NotReadableError: "Another app is using the camera. Close it and try again.",
    };
    showGate(messages[err.name] || "The camera couldn't start. Try again.");
  }
}

function showGate(message) {
  gateMsg.textContent = message;
  gate.hidden = false;
  enableBtn.disabled = false;
  enableBtn.textContent = "Try again";
}

/* Taking photos */

async function runSession() {
  if (busy) return;
  busy = true;
  clearStrip();
  setControls();

  for (let i = 0; i < SHOTS; i++) {
    setStatus(`Photo ${i + 1} of ${SHOTS}`);
    for (let n = 3; n > 0; n--) {
      countdownEl.textContent = n;
      await sleep(1000);
    }
    countdownEl.textContent = "";
    flash();
    shots.push(capture());
    render();
    slots[i].classList.add("fresh");
    await sleep(900);
  }

  captionEl.textContent = formatDate();
  setStatus("Your strip is ready.");
  busy = false;
  startBtn.textContent = "Take 4 more";
  setControls();
}

function capture() {
  // Crop the video to 4:3 around the center, and mirror it to match the preview
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  let sw = vw;
  let sh = (vw * 3) / 4;
  if (sh > vh) { sh = vh; sw = (vh * 4) / 3; }
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_W;
  canvas.height = PHOTO_H;
  const ctx = canvas.getContext("2d");
  ctx.translate(PHOTO_W, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PHOTO_W, PHOTO_H);
  return canvas;
}

function flash() {
  flashEl.classList.remove("pop");
  void flashEl.offsetWidth; // restart the animation
  flashEl.classList.add("pop");
}

/* Filters */

function applyFilter(src, name) {
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(src, 0, 0);
  if (name === "none") return canvas;

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data; // Uint8ClampedArray: values clamp to 0-255 on write

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;

    if (name === "mono") {
      const v = (y - 128) * 1.1 + 128;
      d[i] = d[i + 1] = d[i + 2] = v;
    } else if (name === "sepia") {
      d[i]     = 0.393 * r + 0.769 * g + 0.189 * b;
      d[i + 1] = 0.349 * r + 0.686 * g + 0.168 * b;
      d[i + 2] = 0.272 * r + 0.534 * g + 0.131 * b;
    } else if (name === "vivid") {
      d[i]     = (y + (r - y) * 1.4 - 128) * 1.1 + 128;
      d[i + 1] = (y + (g - y) * 1.4 - 128) * 1.1 + 128;
      d[i + 2] = (y + (b - y) * 1.4 - 128) * 1.1 + 128;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/* Rendering the strip on the page */

function render() {
  const filter = currentFilter();
  slots.forEach((slot, i) => {
    const img = slot.querySelector("img");
    if (shots[i]) {
      img.src = applyFilter(shots[i], filter).toDataURL("image/jpeg", 0.9);
      img.alt = `Photo ${i + 1} of ${SHOTS}`;
      img.hidden = false;
    } else {
      img.hidden = true;
      img.removeAttribute("src");
      img.alt = "";
    }
  });
}

function applyPaper() {
  const p = PAPERS[currentPaper()];
  stripEl.style.setProperty("--strip-bg", p.bg);
  stripEl.style.setProperty("--strip-fg", p.fg);
}

function clearStrip() {
  shots = [];
  captionEl.textContent = "";
  slots.forEach((s) => s.classList.remove("fresh"));
  render();
}

function setControls() {
  const hasStrip = shots.length === SHOTS && !busy;
  startBtn.disabled = busy || !stream;
  downloadBtn.disabled = !hasStrip;
  resetBtn.disabled = busy || shots.length === 0;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function formatDate() {
  return new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/* Download */

async function downloadStrip() {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  const paper = PAPERS[currentPaper()];
  const filter = currentFilter();
  const pad = 40, gap = 24, footer = 110;
  const photoW = 560;
  const photoH = (photoW * 3) / 4;
  const W = photoW + pad * 2;
  const H = pad + SHOTS * photoH + (SHOTS - 1) * gap + footer;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = paper.bg;
  ctx.fillRect(0, 0, W, H);

  shots.forEach((shot, i) => {
    const y = pad + i * (photoH + gap);
    ctx.drawImage(applyFilter(shot, filter), pad, y, photoW, photoH);
  });

  ctx.fillStyle = paper.fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '36px "Bowlby One", "Arial Black", sans-serif';
  ctx.fillText(captionEl.textContent || formatDate(), W / 2, H - footer / 2 + 6);

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    a.href = url;
    a.download = `photobooth-${stamp}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

/* Events */

enableBtn.addEventListener("click", openCamera);
startBtn.addEventListener("click", runSession);
downloadBtn.addEventListener("click", downloadStrip);
resetBtn.addEventListener("click", () => {
  clearStrip();
  startBtn.textContent = "Take 4 photos";
  setStatus("Ready when you are.");
  setControls();
});

document.querySelectorAll('input[name="filter"]').forEach((input) => {
  input.addEventListener("change", () => {
    video.style.filter = PREVIEW_FILTERS[currentFilter()];
    render();
  });
});

document.querySelectorAll('input[name="paper"]').forEach((input) => {
  input.addEventListener("change", applyPaper);
});

slots.forEach((slot) => {
  slot.addEventListener("animationend", () => slot.classList.remove("fresh"), true);
});

window.addEventListener("pagehide", () => {
  if (stream) stream.getTracks().forEach((t) => t.stop());
});

applyPaper();
