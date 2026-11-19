// Velvet Heat — Cover Studio: the six templates.
//
// Each layout is genuinely different: different panel counts, different
// arrangements, different typography and palette. All rects are normalized
// (0..1 of the cover), so one layout renders at 1080x1080, 1080x1350 and
// 1920x1080 alike. `panels` are photo slots; `titleBlock` is where the
// title furniture goes; `band` (when present) is the full-width bottom
// title band with the skyline silhouette on its top edge.
//
// Faces stay clear of seams: tilted panels rotate about their own
// centres and overlap slightly, so seams fall in the gaps between
// panels, never across a panel's middle.

export const TEMPLATES = {
  ink: {
    name: 'Ink Heat',
    tag: '9-panel poster grid',
    defaultGrade: 'ink',
    palette: { band: '#1c0b2e', band2: '#4a1042', accent: '#ffb020', pink: '#ff2e88', cream: '#fff3e0' },
    panels: [
      { x: 0.000, y: 0.000, w: 0.333, h: 0.260 },
      { x: 0.333, y: 0.000, w: 0.334, h: 0.260 },
      { x: 0.667, y: 0.000, w: 0.333, h: 0.260 },
      { x: 0.000, y: 0.260, w: 0.333, h: 0.260 },
      { x: 0.333, y: 0.260, w: 0.334, h: 0.260 },
      { x: 0.667, y: 0.260, w: 0.333, h: 0.260 },
      { x: 0.000, y: 0.520, w: 0.333, h: 0.260 },
      { x: 0.333, y: 0.520, w: 0.334, h: 0.260 },
      { x: 0.667, y: 0.520, w: 0.333, h: 0.260 },
    ],
    assign: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    band: { x: 0, y: 0.780, w: 1, h: 0.220 },
    titleBlock: { x: 0.035, y: 0.800, w: 0.62, h: 0.180, align: 'left' },
    rightBlock: { x: 0.700, y: 0.800, w: 0.265, h: 0.180 },
    furniture: ['skyline', 'starburst', 'heatStars', 'taglineBar'],
  },
  hero: {
    name: 'Golden Hour Hero',
    tag: 'Full-bleed hero + filmstrip',
    defaultGrade: 'golden',
    palette: { band: '#241207', band2: '#5c2a10', accent: '#ffd23e', pink: '#ff7a3c', cream: '#fff6e6' },
    panels: [
      { x: 0.000, y: 0.000, w: 1.000, h: 0.700 },
      { x: 0.000, y: 0.700, w: 0.333, h: 0.160 },
      { x: 0.333, y: 0.700, w: 0.334, h: 0.160 },
      { x: 0.667, y: 0.700, w: 0.333, h: 0.160 },
    ],
    assign: [1, 0, 2, 3],
    band: { x: 0, y: 0.860, w: 1, h: 0.140 },
    titleBlock: { x: 0.04, y: 0.500, w: 0.92, h: 0.180, align: 'left', scrim: true },
    rightBlock: null,
    furniture: ['heroScrim', 'starburst', 'taglineBar'],
  },
  tilt: {
    name: 'Neon Tilt',
    tag: 'Tilted diagonal panels',
    defaultGrade: 'neon',
    palette: { band: '#12082e', band2: '#2a0f4d', accent: '#22e6ff', pink: '#ff2ea6', cream: '#eafcff' },
    panels: [
      { x: -0.015, y: 0.015, w: 0.520, h: 0.430, rot: -3.5 },
      { x: 0.515, y: -0.010, w: 0.500, h: 0.400, rot: 2.5 },
      { x: -0.010, y: 0.455, w: 0.360, h: 0.330, rot: 4.0 },
      { x: 0.370, y: 0.440, w: 0.330, h: 0.345, rot: -2.5 },
      { x: 0.715, y: 0.430, w: 0.300, h: 0.355, rot: 3.0 },
    ],
    assign: [0, 1, 2, 3, 4],
    band: { x: 0, y: 0.800, w: 1, h: 0.200, tilt: -2 },
    titleBlock: { x: 0.04, y: 0.815, w: 0.60, h: 0.165, align: 'left', tilt: -2 },
    rightBlock: { x: 0.700, y: 0.815, w: 0.265, h: 0.165 },
    furniture: ['starburst', 'heatStars', 'taglineBar'],
  },
  sleeve: {
    name: 'Sunset Sleeve',
    tag: 'Asymmetric hero + strip',
    defaultGrade: 'sunset',
    palette: { band: '#2b0a24', band2: '#57183f', accent: '#ffb020', pink: '#ff5c8a', cream: '#fff3e0' },
    panels: [
      { x: 0.000, y: 0.000, w: 0.580, h: 0.620 },
      { x: 0.580, y: 0.000, w: 0.420, h: 0.310 },
      { x: 0.580, y: 0.310, w: 0.420, h: 0.310 },
      { x: 0.000, y: 0.620, w: 1.000, h: 0.200 },
    ],
    assign: [0, 1, 2, 5],
    band: { x: 0, y: 0.820, w: 1, h: 0.180 },
    titleBlock: { x: 0.035, y: 0.838, w: 0.62, h: 0.145, align: 'left' },
    rightBlock: { x: 0.700, y: 0.838, w: 0.265, h: 0.145 },
    furniture: ['skyline', 'starburst', 'heatStars', 'taglineBar'],
  },
  palm: {
    name: 'Palm Grid',
    tag: '9-panel, centre title',
    defaultGrade: 'sunset',
    palette: { band: '#1d0b33', band2: '#3d1450', accent: '#ffb020', pink: '#ff2e88', cream: '#fff3e0' },
    panels: [
      { x: 0.000, y: 0.000, w: 0.333, h: 0.260 },
      { x: 0.333, y: 0.000, w: 0.334, h: 0.260 },
      { x: 0.667, y: 0.000, w: 0.333, h: 0.260 },
      { x: 0.000, y: 0.260, w: 0.333, h: 0.260 },
      // centre cell is the title block, not a photo
      { x: 0.667, y: 0.260, w: 0.333, h: 0.260 },
      { x: 0.000, y: 0.520, w: 0.333, h: 0.260 },
      { x: 0.333, y: 0.520, w: 0.334, h: 0.260 },
      { x: 0.667, y: 0.520, w: 0.333, h: 0.260 },
    ],
    assign: [0, 1, 2, 3, 4, 5, 6, 7],
    band: { x: 0, y: 0.780, w: 1, h: 0.220 },
    titleBlock: { x: 0.333, y: 0.260, w: 0.334, h: 0.260, align: 'center', centre: true },
    rightBlock: null,
    furniture: ['skyline', 'heatStars', 'taglineBar'],
  },
  magazine: {
    name: 'Vice Magazine',
    tag: 'Masthead + hero + barcode',
    defaultGrade: 'photo',
    palette: { band: '#f5ead6', band2: '#1c0b2e', accent: '#ff2e88', pink: '#ff2e88', cream: '#1c0b2e' },
    panels: [
      { x: 0.000, y: 0.120, w: 0.620, h: 0.700 },
      { x: 0.620, y: 0.120, w: 0.380, h: 0.350 },
      { x: 0.620, y: 0.470, w: 0.380, h: 0.350 },
    ],
    assign: [0, 1, 2],
    band: { x: 0, y: 0.820, w: 1, h: 0.180 },
    titleBlock: { x: 0.03, y: 0.008, w: 0.94, h: 0.105, align: 'center', masthead: true },
    rightBlock: { x: 0.760, y: 0.840, w: 0.210, h: 0.140 },
    furniture: ['masthead', 'barcode', 'issueLine', 'taglineBar'],
  },
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);
