// Fixed scenes for screenshots: ?shot=cover shows the hero cover alone;
// ?shot=dual shows ink vs photo side by side; ?shot=editor shows the
// editor with a panel mid-crop; ?shot=export shows the three exported
// PNGs with their sizes. window.__shotReady is set once painted.
import { drawCover } from './cover.js';

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export async function runShot(shot, query, api) {
  const canvas = document.getElementById('cover');
  const { state, photos } = api;

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    state.template = 'ink';
    state.grade = 'ink';
    state.assign = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    api.setSize(2); // 1920 x 1080 landscape hero
    ready();
    return;
  }

  if (shot === 'dual') {
    document.body.classList.add('shot-dual');
    canvas.width = 1920; canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#160a24';
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = '#fff3e0';
    ctx.textAlign = 'center';
    ctx.font = '72px Anton, sans-serif';
    ctx.fillText('VELVET HEAT — TWO ENGINES, ONE COVER', 960, 78);
    const off = document.createElement('canvas');
    off.width = 880; off.height = 880;
    drawCover(off, { ...state, photos, template: 'ink', grade: 'ink', assign: [0, 1, 2, 3, 4, 5, 6, 7, 8] });
    ctx.drawImage(off, 40, 110, 880, 880);
    drawCover(off, { ...state, photos, template: 'ink', grade: 'sunset', assign: [0, 1, 2, 3, 4, 5, 6, 7, 8] });
    ctx.drawImage(off, 1000, 110, 880, 880);
    ctx.font = '34px Anton, sans-serif';
    ctx.fillStyle = '#ffb020';
    ctx.fillText('INK ENGINE — posterize + halftone', 480, 1045);
    ctx.fillText('PHOTO ENGINE — clean Sunset grade', 1440, 1045);
    ready();
    return;
  }

  if (shot === 'editor') {
    state.template = 'ink';
    state.grade = 'ink';
    state.panel[0] = { ox: 0.14, oy: 0.06, zoom: 1.45, rot: 0, grade: 'cover' };
    api.setSize(2);
    api.selectPanel(0);
    // Scroll the sidebar so Undo / Redo and "Export all 3 sizes" are in frame.
    const panel = document.querySelector('.panel');
    if (panel) panel.scrollTop = panel.scrollHeight;
    ready();
    return;
  }

  if (shot === 'export') {
    document.body.classList.add('shot-export');
    const host = document.getElementById('export-proof');
    const sizes = [
      { w: 1080, h: 1080, label: '1080 × 1080 PNG' },
      { w: 1080, h: 1350, label: '1080 × 1350 PNG' },
      { w: 1920, h: 1080, label: '1920 × 1080 PNG' },
    ];
    const off = document.createElement('canvas');
    for (const s of sizes) {
      off.width = s.w; off.height = s.h;
      drawCover(off, { ...state, photos, template: 'ink', grade: 'ink', assign: [0, 1, 2, 3, 4, 5, 6, 7, 8] });
      const fig = document.createElement('figure');
      const img = document.createElement('img');
      img.src = off.toDataURL('image/png');
      img.alt = `Velvet Heat cover exported at ${s.label}`;
      const cap = document.createElement('figcaption');
      cap.textContent = s.label;
      fig.appendChild(img);
      fig.appendChild(cap);
      host.appendChild(fig);
    }
    ready();
    return;
  }

  ready();
}
