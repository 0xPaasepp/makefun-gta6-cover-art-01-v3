// Velvet Heat — Cover Studio: the cover renderer.
//
// Draws one cover at any size from a state object:
//   state = {
//     template, grade, sliders {contrast, saturation, brightness, temperature},
//     toggles {grain, vignette, halftone},
//     texts {title, subtitle, tagline, eyebrow, caption},
//     photos: [Image|null x9],          // the tray, in tray order
//     assign: [trayIndex per panel],    // which tray photo each panel shows
//     panel: [{ox, oy, zoom, rot, grade}] // per-panel crop / rotate / grade
//   }
// Panels are drawn photo-first (with their grade), then furniture
// (skyline, title band, starburst, stars, barcode, scrim, grain,
// vignette), so the lettering always sits on top of the art.

import { gradeFilter, inkify, grainPattern } from './grades.js';
import { TEMPLATES } from './templates.js';

// Deterministic pseudo-random, so the skyline is identical every render.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shrink a font until the text fits maxWidth; returns the size used.
function fitFont(ctx, text, maxWidth, startPx, family, weight = '') {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 10 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

function star(ctx, cx, cy, rOuter, rInner, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawStarburst(ctx, cx, cy, r, label, sub) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffd23e';
  ctx.strokeStyle = '#1c0b2e';
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.beginPath();
  const spikes = 14;
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1c0b2e';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${r * 0.34}px Anton, sans-serif`;
  ctx.fillText(label, 0, -r * 0.08);
  ctx.font = `${r * 0.22}px Anton, sans-serif`;
  ctx.fillText(sub, 0, r * 0.30);
  ctx.restore();
}

function drawHeatStars(ctx, cx, cy, size, filled, color = '#ffd23e') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  const gap = size * 1.25;
  const x0 = cx - (gap * 4) / 2;
  for (let i = 0; i < 5; i++) {
    const x = x0 + i * gap;
    if (i < Math.floor(filled)) {
      star(ctx, x, cy, size * 0.55, size * 0.24);
      ctx.fill(); ctx.stroke();
    } else if (i === Math.floor(filled) && filled % 1 !== 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - size * 0.6, cy - size * 0.6, size * 0.6, size * 1.2);
      ctx.clip();
      star(ctx, x, cy, size * 0.55, size * 0.24);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      star(ctx, x, cy, size * 0.55, size * 0.24);
      ctx.stroke();
    } else {
      star(ctx, x, cy, size * 0.55, size * 0.24);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Refined skyline: many narrow buildings with varied widths, stepped and
// pointed tops, antennas and lit windows — no chunky uniform blocks.
function drawSkyline(ctx, x, y, w, h, color) {
  const rnd = mulberry32(20260719);
  ctx.save();
  ctx.fillStyle = color;
  let bx = x;
  while (bx < x + w - 4) {
    const bw = w * (0.018 + rnd() * 0.030);
    const bh = h * (0.30 + rnd() * 0.68);
    const by = y + h - bh;
    ctx.fillRect(bx, by, bw, bh);
    // Stepped or pointed top.
    const top = rnd();
    if (top < 0.25) {
      ctx.fillRect(bx + bw * 0.2, by - h * 0.10, bw * 0.6, h * 0.10);
    } else if (top < 0.45) {
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + bw / 2, by - h * 0.16); ctx.lineTo(bx + bw, by);
      ctx.closePath(); ctx.fill();
    }
    // Antenna on the tall ones.
    if (bh > h * 0.8 && rnd() < 0.6) {
      ctx.fillRect(bx + bw / 2 - 1, by - h * 0.22, 2, h * 0.22);
      ctx.beginPath(); ctx.arc(bx + bw / 2, by - h * 0.22, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    // Lit windows: sparse, warm.
    ctx.fillStyle = 'rgba(255, 190, 90, 0.85)';
    const cols = Math.max(1, Math.floor(bw / 9));
    const rows = Math.max(1, Math.floor(bh / 14));
    for (let cxi = 0; cxi < cols; cxi++) {
      for (let ryi = 0; ryi < rows; ryi++) {
        if (rnd() < 0.16) {
          ctx.fillRect(bx + 3 + cxi * 9, by + 6 + ryi * 14, 3.5, 5);
        }
      }
    }
    ctx.fillStyle = color;
    bx += bw + w * 0.004;
  }
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  const rnd = mulberry32(77);
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 6, y - 6, w + 12, h + 22);
  ctx.fillStyle = '#111';
  let bx = x;
  while (bx < x + w - 2) {
    const bw = 1 + rnd() * 4;
    if (rnd() < 0.62) ctx.fillRect(bx, y, bw, h);
    bx += bw + 1 + rnd() * 3;
  }
  ctx.font = `${Math.max(9, h * 0.16)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('8 261119 202606', x + w / 2, y + h + 13);
  ctx.restore();
}

// Draw one photo into a panel rect, honouring its crop transform
// (ox/oy pan, zoom, rot) and its grade (or the cover grade when unset).
function drawPanel(ctx, img, rect, p, grade, sliders, toggles, W, H) {
  const px = rect.x * W, py = rect.y * H, pw = rect.w * W, ph = rect.h * H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  if (!img) {
    const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, '#3a1550'); g.addColorStop(1, '#1c0b2e');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
    ctx.restore();
    return;
  }
  // Render the photo to a panel-sized offscreen canvas, then grade it.
  const cw = Math.max(2, Math.round(pw)), ch = Math.max(2, Math.round(ph));
  const off = document.createElement('canvas');
  off.width = cw; off.height = ch;
  const o = off.getContext('2d');
  const zoom = p.zoom ?? 1;
  const base = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * base, dh = img.naturalHeight * base;
  // Pan is clamped to the image's slack, so a large default lift can never
  // expose background — the photo always covers its panel.
  const maxOx = Math.max(0, (dw - cw) / 2);
  const maxOy = Math.max(0, (dh - ch) / 2);
  const ox = Math.max(-maxOx, Math.min(maxOx, (p.ox ?? 0) * cw));
  const oy = Math.max(-maxOy, Math.min(maxOy, (p.oy ?? 0) * ch));
  o.save();
  o.translate(cw / 2 + ox, ch / 2 + oy);
  o.rotate(((p.rot ?? 0) * Math.PI) / 180);
  o.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  o.restore();
  const gname = p.grade && p.grade !== 'cover' ? p.grade : grade;
  if (gname === 'ink') {
    inkify(off, 0.78, toggles.halftone !== false);
  } else if (gname && gname !== 'photo') {
    const graded = document.createElement('canvas');
    graded.width = cw; graded.height = ch;
    const gc = graded.getContext('2d');
    gc.filter = gradeFilter(gname, sliders);
    gc.drawImage(off, 0, 0);
    o.clearRect(0, 0, cw, ch);
    o.drawImage(graded, 0, 0);
  } else {
    // Clean photo: sliders only.
    const graded = document.createElement('canvas');
    graded.width = cw; graded.height = ch;
    const gc = graded.getContext('2d');
    gc.filter = gradeFilter('photo', sliders);
    gc.drawImage(off, 0, 0);
    o.clearRect(0, 0, cw, ch);
    o.drawImage(graded, 0, 0);
  }
  // Panel border + inner edge light.
  ctx.drawImage(off, px, py, pw, ph);
  ctx.strokeStyle = 'rgba(28, 11, 46, 0.9)';
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.strokeRect(px, py, pw, ph);
  ctx.restore();
}

function drawTitleText(ctx, tb, texts, W, H, palette) {
  const x = tb.x * W, y = tb.y * H, w = tb.w * W, h = tb.h * H;
  const align = tb.align || 'left';
  ctx.save();
  if (tb.tilt) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((tb.tilt * Math.PI) / 180);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const cx = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
  if (tb.masthead) {
    // Magazine masthead: huge cream title on the cover's dark top edge.
    fitFont(ctx, texts.title, w, h * 0.92, 'Anton, sans-serif');
    ctx.fillStyle = '#fff3e0';
    ctx.fillText(texts.title, cx, y + h * 0.86);
    ctx.restore();
    return;
  }
  const titlePx = fitFont(ctx, texts.title, w, h * 0.40, 'Anton, sans-serif');
  // Sunset gradient fill for the title.
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, '#ffd23e');
  grad.addColorStop(0.45, '#ff7a3c');
  grad.addColorStop(1, '#ff2e88');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = titlePx * 0.12;
  ctx.shadowOffsetY = titlePx * 0.05;
  // Title sits below the eyebrow with clear air between them: the title's
  // cap height reaches up to ~0.52h - 0.29h = 0.23h, the eyebrow ends at 0.16h.
  // The centre title block (Palm Grid) is taller and stacks title/subtitle
  // higher so the heat stars fit underneath.
  const titleY = y + h * (tb.centre ? 0.36 : 0.52);
  ctx.fillText(texts.title, cx, titleY);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  // Eyebrow above the title (small, letterspaced).
  if (texts.eyebrow && !tb.centre) {
    ctx.font = `bold ${Math.max(10, h * 0.13)}px Anton, sans-serif`;
    ctx.fillStyle = palette.accent;
    ctx.fillText(texts.eyebrow, cx, y + h * 0.16);
  }
  // Script subtitle under the title.
  const subPx = fitFont(ctx, texts.subtitle, w, h * 0.26, 'Pacifico, cursive');
  ctx.fillStyle = palette.cream;
  ctx.fillText(texts.subtitle, cx, titleY + subPx * 1.15);
  if (tb.centre) {
    // Palm Grid centre block: heat stars + issue line under the subtitle.
    drawHeatStars(ctx, x + w / 2, y + h * 0.82, Math.max(7, h * 0.075), 4.5);
  }
  ctx.restore();
}

export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const tpl = TEMPLATES[state.template] || TEMPLATES.ink;
  const pal = tpl.palette;
  const s = state.sliders || {};
  const tog = state.toggles || {};
  const texts = state.texts || {};

  // Base.
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, W, H);

  // Panels.
  tpl.panels.forEach((rect, i) => {
    const trayIdx = (state.assign || [])[i] ?? i;
    const img = (state.photos || [])[trayIdx] || null;
    const p = (state.panel || [])[i] || {};
    if (rect.rot) {
      ctx.save();
      const cx = (rect.x + rect.w / 2) * W, cy = (rect.y + rect.h / 2) * H;
      ctx.translate(cx, cy);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.translate(-cx, -cy);
      drawPanel(ctx, img, rect, p, state.grade, s, tog, W, H);
      ctx.restore();
    } else {
      drawPanel(ctx, img, rect, p, state.grade, s, tog, W, H);
    }
  });

  // Hero scrim: dark gradient over the hero's lower third so the title
  // never sits on a bright face.
  if (tpl.furniture.includes('heroScrim')) {
    const g = ctx.createLinearGradient(0, H * 0.38, 0, H * 0.70);
    g.addColorStop(0, 'rgba(20,8,30,0)');
    g.addColorStop(1, 'rgba(20,8,30,0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.38, W, H * 0.32);
  }

  // Bottom band (full width) with its skyline on the top edge.
  if (tpl.band) {
    const b = tpl.band;
    const bg = ctx.createLinearGradient(0, b.y * H, 0, (b.y + b.h) * H);
    bg.addColorStop(0, pal.band2);
    bg.addColorStop(1, pal.band);
    ctx.save();
    if (b.tilt) {
      ctx.translate(W / 2, (b.y + b.h / 2) * H);
      ctx.rotate((b.tilt * Math.PI) / 180);
      ctx.translate(-W / 2, -(b.y + b.h / 2) * H);
    }
    ctx.fillStyle = bg;
    ctx.fillRect(b.x * W, b.y * H, b.w * W, b.h * H + 2);
    if (tpl.furniture.includes('skyline')) {
      drawSkyline(ctx, 0, b.y * H - H * 0.055, W, H * 0.055, '#12081f');
    }
    ctx.restore();
  }

  // Title + subtitle.
  if (tpl.titleBlock) {
    drawTitleText(ctx, tpl.titleBlock, texts, W, H, pal);
  }

  // Right block: starburst + heat meter + issue line — this fills the
  // title band's right side so there is no dead space.
  if (tpl.rightBlock) {
    const rb = tpl.rightBlock;
    const rx = rb.x * W, ry = rb.y * H, rw = rb.w * W, rh = rb.h * H;
    if (tpl.furniture.includes('starburst')) {
      drawStarburst(ctx, rx + rw * 0.24, ry + rh * 0.52, Math.min(rw * 0.30, rh * 0.46), 'EST.', '2026');
    }
    if (tpl.furniture.includes('heatStars')) {
      ctx.font = `bold ${Math.max(9, rh * 0.14)}px Anton, sans-serif`;
      ctx.fillStyle = pal.accent;
      ctx.textAlign = 'center';
      ctx.fillText('HEAT', rx + rw * 0.68, ry + rh * 0.30);
      drawHeatStars(ctx, rx + rw * 0.68, ry + rh * 0.56, Math.max(7, rh * 0.13), 4.5);
      ctx.font = `${Math.max(9, rh * 0.13)}px Anton, sans-serif`;
      ctx.fillStyle = pal.cream;
      ctx.fillText('SUMMER 2026', rx + rw * 0.68, ry + rh * 0.86);
    }
    if (tpl.furniture.includes('barcode')) {
      drawBarcode(ctx, rx + rw * 0.08, ry + rh * 0.18, rw * 0.84, rh * 0.52);
    }
  }

  // Magazine cover lines.
  if (tpl.furniture.includes('issueLine')) {
    ctx.save();
    ctx.font = `bold ${Math.max(10, H * 0.016)}px Anton, sans-serif`;
    ctx.fillStyle = pal.cream;
    ctx.textAlign = 'left';
    ctx.fillText('ISSUE 01 — SUMMER 2026', W * 0.03, H * 0.855);
    ctx.textAlign = 'right';
    ctx.fillText('COLLECTORS EDITION', W * 0.72, H * 0.855);
    if (texts.caption) {
      ctx.font = `${Math.max(10, H * 0.017)}px Anton, sans-serif`;
      ctx.textAlign = 'left';
      const cap = texts.caption.length > 42 ? texts.caption.slice(0, 42) + '…' : texts.caption;
      ctx.fillText(cap, W * 0.03, H * 0.955);
    }
    ctx.restore();
  }

  // Tagline bar: black strip, squeezed (never overflowing) text.
  if (tpl.furniture.includes('taglineBar') && texts.tagline) {
    const barH = H * 0.032;
    const barY = H - barH;
    ctx.fillStyle = '#0d0518';
    ctx.fillRect(0, barY, W, barH);
    ctx.save();
    ctx.fillStyle = '#fff3e0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitFont(ctx, texts.tagline, W * 0.92, barH * 0.62, 'Anton, sans-serif');
    ctx.fillText(texts.tagline, W / 2, barY + barH / 2);
    ctx.restore();
  }

  // Grain + vignette over everything.
  if (tog.grain !== false) {
    const pat = ctx.createPattern(grainPattern(), 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (tog.vignette !== false) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(10,4,20,0)');
    vg.addColorStop(1, 'rgba(10,4,20,0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}
