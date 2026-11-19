// Velvet Heat — Cover Studio: the editor.
//
// State: a 9-slot tray (9 fresh sample photos by default), per-panel
// crop / rotate / grade, template switching that preserves photos,
// editable lettering, undo/redo (Ctrl+Z / Ctrl+Y), and one-click
// "Export all 3 sizes" as PNG. `?shot=` scenes live in shots.js and
// drive the deterministic screenshots.

import { drawCover } from './cover.js';
import { GRADES, GRADE_NAMES } from './grades.js';
import { TEMPLATES, TEMPLATE_NAMES } from './templates.js';
import { runShot } from './shots.js';

// Nine fresh photos, one per tray slot; the kit's boulevard.jpg / pier.jpg
// stay on disk as alternates only, never heroes.
export const SAMPLE_FILES = [
  'boombox.jpg', 'jetski.jpg', 'rooftop.jpg', 'convertible.jpg',
  'skate.jpg', 'palmroad.jpg', 'neonstreet.jpg', 'marina.jpg',
  'portrait.jpg',
];

export const EXPORT_SIZES = [
  { w: 1080, h: 1080, label: '1080 × 1080' },
  { w: 1080, h: 1350, label: '1080 × 1350' },
  { w: 1920, h: 1080, label: '1920 × 1080' },
];

export function defaultState() {
  return {
    template: 'ink',
    grade: 'ink',
    sliders: { contrast: 1, saturation: 1, brightness: 1, temperature: 0 },
    toggles: { grain: true, vignette: true, halftone: true },
    texts: {
      title: 'VELVET HEAT',
      subtitle: 'Miramar nights',
      tagline: 'ONE CITY. EVERY SUMMER ENDS.',
      eyebrow: 'WELCOME TO MIRAMAR',
      caption: 'One last summer in Miramar',
    },
    // assign[i] = tray index shown in panel i; Ink Heat shows 9 distinct photos.
    assign: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    // Bottom-row panels hold portrait photos whose faces sit above the
    // centred crop; lift each crop just enough to frame its face. The
    // lift is clamped to each photo's slack in drawPanel, so it is safe
    // in every template.
    panel: Array.from({ length: 9 }, (_, i) => (
      { ox: 0, oy: [0, 0, 0, 0, 0, 0, 0.3, 0.15, 0.2][i], zoom: 1, rot: 0, grade: 'cover' }
    )),
  };
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts; the cover still draws */ }
}

const $ = (id) => document.getElementById(id);

export function createEditor(canvas) {
  const state = defaultState();
  const photos = Array(9).fill(null); // tray images, in tray order
  let selected = 0;                    // selected panel index
  let undoStack = [];
  let redoStack = [];
  let sizeIndex = 2;                   // preview size: landscape by default
  let fillOne = false;                 // one-photo-fill mode

  function snapshot() {
    return JSON.stringify({ state, assignFill: fillOne });
  }
  let preEdit = null; // snapshot taken BEFORE an edit starts; committed when it ends
  function capturePreEdit() { preEdit = snapshot(); }
  function commitEdit() {
    if (preEdit === null) return;
    undoStack.push(preEdit);
    preEdit = null;
    if (undoStack.length > 60) undoStack.shift();
    redoStack = [];
    syncUndoButtons();
  }
  // Synchronous one-shot edit: snapshot, mutate, push.
  function withUndo(fn) {
    const pre = snapshot();
    fn();
    undoStack.push(pre);
    if (undoStack.length > 60) undoStack.shift();
    redoStack = [];
    syncUndoButtons();
  }
  function restore(json) {
    const d = JSON.parse(json);
    Object.assign(state, d.state);
    fillOne = d.assignFill;
    syncAllControls();
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
    syncUndoButtons();
    render();
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
    syncUndoButtons();
    render();
  }
  function syncUndoButtons() {
    const u = $('undo'), r = $('redo');
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }

  function panelCount() {
    return TEMPLATES[state.template].panels.length;
  }
  function ensurePanels() {
    while (state.panel.length < 9) state.panel.push({ ox: 0, oy: 0, zoom: 1, rot: 0, grade: 'cover' });
  }

  function render() {
    ensurePanels();
    const size = EXPORT_SIZES[sizeIndex];
    canvas.width = size.w;
    canvas.height = size.h;
    drawCover(canvas, { ...state, photos });
    const sel = $('selected-panel');
    if (sel) sel.textContent = `Panel ${selected + 1} of ${panelCount()}`;
  }

  // ---- tray ---------------------------------------------------------------
  async function loadSamples() {
    const jobs = SAMPLE_FILES.map((f) => loadImage(`samples/${f}`).catch(() => null));
    const imgs = await Promise.all(jobs);
    for (let i = 0; i < 9; i++) photos[i] = imgs[i];
    renderTray();
    render();
  }
  function renderTray() {
    const tray = $('tray');
    if (!tray) return;
    tray.innerHTML = '';
    photos.forEach((img, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.title = `Tray slot ${i + 1} — click to put in selected panel`;
      if (img) {
        const c = document.createElement('canvas');
        c.width = 96; c.height = 96;
        const cc = c.getContext('2d');
        const sc = Math.max(96 / img.naturalWidth, 96 / img.naturalHeight);
        cc.drawImage(img, (96 - img.naturalWidth * sc) / 2, (96 - img.naturalHeight * sc) / 2, img.naturalWidth * sc, img.naturalHeight * sc);
        b.appendChild(c);
      } else {
        b.textContent = '—';
      }
      b.addEventListener('click', () => {
        withUndo(() => { state.assign[selected] = i; });
        render();
      });
      tray.appendChild(b);
    });
  }

  // ---- controls -----------------------------------------------------------
  function buildTemplateButtons() {
    const host = $('templates');
    if (!host) return;
    TEMPLATE_NAMES.forEach((key) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tpl';
      b.dataset.tpl = key;
      b.innerHTML = `<strong>${TEMPLATES[key].name}</strong><span>${TEMPLATES[key].tag}</span>`;
      b.addEventListener('click', () => {
        if (state.template === key) return;
        withUndo(() => {
          state.template = key;
          state.grade = TEMPLATES[key].defaultGrade === 'photo' ? state.grade : TEMPLATES[key].defaultGrade;
          state.assign = [...TEMPLATES[key].assign]; // photos preserved; mapping follows the template
          selected = 0;
        });
        syncTemplateButtons();
        syncGradeButtons();
        render();
      });
      host.appendChild(b);
    });
    syncTemplateButtons();
  }
  function syncTemplateButtons() {
    document.querySelectorAll('.tpl').forEach((b) => {
      b.classList.toggle('active', b.dataset.tpl === state.template);
    });
  }
  function buildGradeButtons() {
    const host = $('grades');
    if (!host) return;
    GRADE_NAMES.forEach((key) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'grade';
      b.dataset.grade = key;
      b.textContent = GRADES[key].label;
      b.title = GRADES[key].desc;
      b.addEventListener('click', () => {
        withUndo(() => { state.grade = key; });
        syncGradeButtons();
        render();
      });
      host.appendChild(b);
    });
    syncGradeButtons();
  }
  function syncGradeButtons() {
    document.querySelectorAll('.grade').forEach((b) => {
      b.classList.toggle('active', b.dataset.grade === state.grade);
    });
  }
  function bindSlider(id, key, fmt) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', () => {
      state.sliders[key] = Number(el.value);
      const out = $(`${id}-val`);
      if (out) out.textContent = fmt(Number(el.value));
      render();
    });
    el.addEventListener('pointerdown', capturePreEdit);
    el.addEventListener('keydown', capturePreEdit);
    el.addEventListener('change', commitEdit);
  }
  function bindToggle(id, key) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('mousedown', capturePreEdit);
    el.addEventListener('keydown', capturePreEdit);
    el.addEventListener('change', () => {
      commitEdit();
      state.toggles[key] = el.checked;
      render();
    });
  }
  function bindText(id, key) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('focus', capturePreEdit);
    el.addEventListener('input', () => {
      state.texts[key] = el.value;
      render();
    });
    el.addEventListener('change', commitEdit);
  }
  function syncAllControls() {
    syncTemplateButtons();
    syncGradeButtons();
    const map = { title: 'in-title', subtitle: 'in-subtitle', tagline: 'in-tagline', eyebrow: 'in-eyebrow', caption: 'in-caption' };
    Object.entries(map).forEach(([k, id]) => { const el = $(id); if (el) el.value = state.texts[k]; });
    const smap = { contrast: 'sl-contrast', saturation: 'sl-saturation', brightness: 'sl-brightness', temperature: 'sl-temperature' };
    Object.entries(smap).forEach(([k, id]) => { const el = $(id); if (el) el.value = state.sliders[k]; });
    const tmap = { grain: 'tg-grain', vignette: 'tg-vignette', halftone: 'tg-halftone' };
    Object.entries(tmap).forEach(([k, id]) => { const el = $(id); if (el) el.checked = state.toggles[k]; });
    const pg = $('panel-grade');
    if (pg) pg.value = state.panel[selected].grade || 'cover';
    const pr = $('panel-rot');
    if (pr) pr.value = state.panel[selected].rot || 0;
    const pz = $('panel-zoom');
    if (pz) pz.value = state.panel[selected].zoom || 1;
    renderTray();
  }

  // ---- panel editing: click to select, drag to pan, wheel to zoom --------
  function panelAt(mx, my) {
    const rect = canvas.getBoundingClientRect();
    const nx = (mx - rect.left) / rect.width;
    const ny = (my - rect.top) / rect.height;
    const panels = TEMPLATES[state.template].panels;
    for (let i = panels.length - 1; i >= 0; i--) {
      const p = panels[i];
      if (nx >= p.x && nx <= p.x + p.w && ny >= p.y && ny <= p.y + p.h) return i;
    }
    return -1;
  }
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const i = panelAt(e.clientX, e.clientY);
    if (i < 0) return;
    selected = i;
    syncAllControls();
    render();
    canvas.setPointerCapture(e.pointerId);
    capturePreEdit();
    drag = { x: e.clientX, y: e.clientY, moved: false, p: { ...state.panel[i] } };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - drag.x) / rect.width;
    const dy = (e.clientY - drag.y) / rect.height;
    if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
    const p = state.panel[selected];
    p.ox = Math.max(-1.5, Math.min(1.5, drag.p.ox + dx));
    p.oy = Math.max(-1.5, Math.min(1.5, drag.p.oy + dy));
    render();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && drag.moved) commitEdit();
    else preEdit = null;
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panel[selected];
    const next = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    if (next === p.zoom) return;
    withUndo(() => { p.zoom = next; });
    render();
  }, { passive: false });

  function bindPanelControls() {
    const pg = $('panel-grade');
    if (pg) {
      pg.addEventListener('change', () => {
        withUndo(() => { state.panel[selected].grade = pg.value; });
        render();
      });
    }
    const pr = $('panel-rot');
    if (pr) {
      pr.addEventListener('input', () => {
        state.panel[selected].rot = Number(pr.value);
        render();
      });
      pr.addEventListener('pointerdown', capturePreEdit);
      pr.addEventListener('keydown', capturePreEdit);
      pr.addEventListener('change', commitEdit);
    }
    const pz = $('panel-zoom');
    if (pz) {
      pz.addEventListener('input', () => {
        state.panel[selected].zoom = Number(pz.value);
        render();
      });
      pz.addEventListener('pointerdown', capturePreEdit);
      pz.addEventListener('keydown', capturePreEdit);
      pz.addEventListener('change', commitEdit);
    }
    const fill = $('fill-one');
    if (fill) {
      fill.addEventListener('click', () => {
        withUndo(() => {
          fillOne = !fillOne;
          if (fillOne) state.assign = state.assign.map(() => state.assign[selected]);
          else state.assign = [...TEMPLATES[state.template].assign];
        });
        fill.textContent = fillOne ? 'Multi-photo' : 'Fill one photo';
        render();
      });
    }
    const size = $('size');
    if (size) {
      size.addEventListener('change', () => {
        sizeIndex = Number(size.value);
        render();
      });
    }
  }

  // ---- export ---------------------------------------------------------------
  function downloadCanvas(c, name) {
    return new Promise((resolve) => {
      c.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        resolve();
      }, 'image/png');
    });
  }
  async function exportAll() {
    const status = $('status');
    const off = document.createElement('canvas');
    for (const size of EXPORT_SIZES) {
      off.width = size.w; off.height = size.h;
      drawCover(off, { ...state, photos });
      await downloadCanvas(off, `velvet-heat-${size.w}x${size.h}.png`);
    }
    if (status) status.textContent = 'Exported 3 PNGs — 1080×1080, 1080×1350, 1920×1080.';
    window.__exported = true;
  }
  const exp = $('export-all');
  if (exp) exp.addEventListener('click', exportAll);

  // ---- upload: bumps the oldest sample out of the 9-slot tray --------------
  const up = $('upload');
  if (up) {
    up.addEventListener('change', async (e) => {
      const files = [...e.target.files];
      for (const f of files) {
        const img = await loadImage(URL.createObjectURL(f)).catch(() => null);
        if (!img) continue;
        withUndo(() => {
          photos.shift();
          photos.push(img);
          // Re-point assignments: a photo that slid one slot left keeps its
          // panel; a panel whose photo was bumped out gets the new upload
          // (last slot), so panels never collapse onto one photo.
          state.assign = state.assign.map((a) => (a === 0 ? 8 : a - 1));
        });
        renderTray();
        render();
      }
      e.target.value = '';
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
  const un = $('undo'); if (un) un.addEventListener('click', undo);
  const re = $('redo'); if (re) re.addEventListener('click', redo);

  buildTemplateButtons();
  buildGradeButtons();
  bindSlider('sl-contrast', 'contrast', (v) => v.toFixed(2));
  bindSlider('sl-saturation', 'saturation', (v) => v.toFixed(2));
  bindSlider('sl-brightness', 'brightness', (v) => v.toFixed(2));
  bindSlider('sl-temperature', 'temperature', (v) => (v > 0 ? '+' : '') + Math.round(v));
  bindToggle('tg-grain', 'grain');
  bindToggle('tg-vignette', 'vignette');
  bindToggle('tg-halftone', 'halftone');
  bindText('in-title', 'title');
  bindText('in-subtitle', 'subtitle');
  bindText('in-tagline', 'tagline');
  bindText('in-eyebrow', 'eyebrow');
  bindText('in-caption', 'caption');
  bindPanelControls();
  syncUndoButtons();

  const shot = new URLSearchParams(location.search).get('shot');
  const api = {
    state, photos, render, renderTray, undo, redo, exportAll,
    setSize(i) { sizeIndex = i; render(); },
    selectPanel(i) { selected = i; syncAllControls(); render(); },
  };
  window.__editor = api;
  if (shot) {
    loadFonts().then(() => loadSamples()).then(() => {
      runShot(shot, new URLSearchParams(location.search), api);
    });
  } else {
    loadFonts().then(() => loadSamples()).then(() => render());
  }
  return api;
}
