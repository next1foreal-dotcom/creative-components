// ModelSlotCabinet — a model picker that IS a miniature casino slot machine.
// Red-enamel cabinet, chrome arch with chasing bulbs + JACKPOT plate, a recessed glass reel window,
// a side lever with a glossy red ball (drag it down to spin), and a coin tray.
// Default (compact) size is its own simplified drawing for a composer's bottom row: ~120x36 CSS px, 9 bulbs,
// no JACKPOT plate, a coin tray that only pops out on a jackpot. size="lg" is the full 153x48 drawing at 3x for showcases.
// One rAF loop drives the reel, the lever spring and the coin physics; React only re-renders on commits.
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useImperativeHandle, forwardRef, useId, useMemo } from 'react';
// ---- inlined from src/logos.js
// Hand-drawn pixel brand marks for the slot reel (no official files shipped).
// 20x20 grids, 1 cell = 1 CSS px in the 28px chip. '.' = transparent.
// Claude 12-ray spark: reused from model-select/src/sprites.js (v2). DeepSeek whale: re-sampled for this
// component (wider body, belly cut, flipper, eye, raised tail).
// OpenAI blossom: redrawn for this component. Built by sampling an outline reconstruction
// at 20px with a sub-pixel offset/scale search that keeps every link on whole pixels,
// then hand-cleaned so the six links + hexagonal hole stay crisp when enlarged.
const GRIDS = {
  deepseek: [
    '....................',
    '....................',
    '....................',
    '.......BBB...B......',
    '..BBBBBBBBB..BB....B',
    '.BBBBBBBBBB..BBBBBBB',
    'BBBBBBBBBBBB..BBBBB.',
    'BBBBBBBBBBBBB.BBB...',
    'B....BBBBBBBBBBB....',
    'B.....BBBBB..BBB....',
    'B......BBBBBBBBB....',
    'BB......BBBBBBB.....',
    'BB.......BBBBBB.....',
    '.BB...B...BBBB......',
    '..BB..BBB..BBB......',
    '...BBBBBBBBBBBB.....',
    '....BBBBBBB.........',
    '....................',
    '....................',
    '....................',
  ],
  claude: [
    '....................',
    '......OO...OO.......',
    '......OO...O........',
    '.......O..OO...OO...',
    '....O..OO.OO..OO....',
    '...OOO..O.OO.OO.....',
    '....OOO.OOO.OO......',
    '......OOOOOOO....OO.',
    '..OOO..OOOOO.OOOOOO.',
    '..OOOOOOOOOOOOO.....',
    '........OOOOOOOOOOO.',
    '......OOOOOOO...OOO.',
    '.....OOOOOOOOOO.....',
    '....OO.OOOO.OOOO....',
    '....O.OO.OO.OO.OO...',
    '......OO.OO..OO.O...',
    '......O..OO..OO.....',
    '.........OO.........',
    '....................',
    '....................',
  ],
  openai: [
    '....................',
    '....................',
    '......KKKKK.........',
    '.....KK...KKKKK.....',
    '....KK...KKK..KK....',
    '...KK..KKK.....KK...',
    '..K.K..K...KK...K...',
    '.K..K..K.KK..KK.K...',
    '.K..K..KKKK...KKK...',
    '.K..K..K...KK...KK..',
    '.K..KK.K...K.KK..K..',
    '.KK...KK...K..K..K..',
    '..KKK...KKKK..K..K..',
    '..K.KK..KK.K..K..K..',
    '..K...KK...K..K.K...',
    '..KK.....KKK..KK....',
    '...KK..KKK...KK.....',
    '....KKKKK...KK......',
    '........KKKKK.......',
    '....................',
  ],
};
// Large OpenAI blossom (32x32) used when a logo is drawn at >= 32px, so enlarged marks keep 2px links
// and clean gaps instead of scaling up the 20px chip version.
const GRIDS_LG = {
  openai: [
    '................................',
    '...........KKKKKKK..............',
    '..........KKKKKKKKK.............',
    '.........KKK.....KKKKKKK........',
    '........KK.......KKKKKKKKK......',
    '........KK.....KKKK.....KKK.....',
    '......KKK.....KKK........KKK....',
    '....KKKKK...KKKK..........KK....',
    '...KKK.KK..KKK.....KKK.....KK...',
    '...KK..KK..KK....KKKKKKK...KK...',
    '..KK...KK..KK...KKK..KKKK..KK...',
    '..KK...KK..KK.KKKK.....KKKKKK...',
    '..KK...KK..KKKK..KKK.....KKKK...',
    '..KK...KK..KKK....KKKK....KKK...',
    '..KK...KK..KK......KKKK....KKK..',
    '..KK...KKK.KK......KK.KKK...KK..',
    '..KKK....KKKK......KK..KK...KK..',
    '...KKK....KKKK....KKK..KK...KK..',
    '...KKKK.....KKK..KKKK..KK...KK..',
    '...KKKKKK.....KKKK.KK..KK...KK..',
    '...KK..KKKK..KKK...KK..KK...KK..',
    '...KK...KKKKKKK....KK..KK..KK...',
    '...KK.....KKK.....KKK..KK.KKK...',
    '....KK..........KKKK...KKKKK....',
    '....KKK........KKK.....KKK......',
    '.....KKK.....KKKK.....KK........',
    '......KKKKKKKKK.......KK........',
    '........KKKKKKK.....KKK.........',
    '.............KKKKKKKKK..........',
    '..............KKKKKKK...........',
    '................................',
    '................................',
  ],
};
// ---- end logos.js

// ---- inlined from src/fx.js
// Pixel FX sprites + palettes for the slot cabinet (coins, sparkles). Plain data, SSR-safe.
// 6x6 coin: 1 cell = 1 CSS px compact (3 device px on a 3x phone), 3 CSS px in size="lg".
const COIN = {
  size: 6,
  pal: { O: '#8a520b', Y: '#f9cd4a', W: '#fff6c2', D: '#d8901a' },
  rows: [
    '.OOOO.',
    'OWYYYO',
    'OWYYDO',
    'OYYYDO',
    'OYYDDO',
    '.OOOO.',
  ],
};
// Finer round pixel coin for size="lg" (n x n cells, same footprint as the 6px coin): rim, face, ring, highlight.
function coinRows(n = 12) {
  const c = (n - 1) / 2, R = n / 2, rows = [];
  for (let y = 0; y < n; y++) {
    let row = '';
    for (let x = 0; x < n; x++) {
      const dx = x - c, dy = y - c, d = Math.hypot(dx, dy);
      if (d > R - 0.15) row += '.';
      else if (d > R - 1.2) row += 'O';
      else if (Math.abs(d - R * 0.55) < 0.55) row += (dx + dy > 0 ? 'W' : 'D');
      else if (dx + dy < -R * 0.9 && d > R * 0.62) row += 'W';
      else if (dx + dy > R * 0.9 && d > R * 0.62) row += 'D';
      else row += 'Y';
    }
    rows.push(row);
  }
  return rows;
}
const SPARK = {
  size: 7,
  pal: { W: '#ffffff', Y: '#ffd95a' },
  rows: [
    '...W...',
    '...W...',
    '..WYW..',
    'WWYYYWW',
    '..WYW..',
    '...W...',
    '...W...',
  ],
};
// rows -> {colour: pathData}
function toPaths(rows, pal) {
  const out = {};
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === '.') { x++; continue; }
      let w = 1; while (row[x + w] === c) w++;
      const col = pal[c]; out[col] = (out[col] || '') + `M${x} ${y}h${w}v1h-${w}z`;
      x += w;
    }
  });
  return out;
}
// Astra jackpot: silver/white star-coins and blue-white sparkles (Opus keeps the gold coins).
const STAR_PAL = { O: '#4f5d78', Y: '#dfe8f6', W: '#ffffff', D: '#9eb0cc' };
const SPARK_STAR = { pal: { W: '#ffffff', Y: '#9fd2ff' } };
// n x n five-point star: dark rim, silver face, white upper-left highlight, shaded lower-right.
function starRows(n = 12) {
  const c = (n - 1) / 2, R = n / 2 - 0.1, r = R * 0.58, pts = [];
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r : R; pts.push([c + rr * Math.cos(a), c + 0.6 + rr * Math.sin(a)]); }
  const inside = (x, y) => { let o = false; for (let i = 0, j = 9; i < 10; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) o = !o; } return o; };
  const rows = [];
  for (let y = 0; y < n; y++) {
    let row = '';
    for (let x = 0; x < n; x++) {
      if (!inside(x, y)) { row += '.'; continue; }
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const dx = x - c, dy = y - c;
      row += edge ? 'O' : (dx + dy < -n * 0.12 ? 'W' : dx + dy > n * 0.18 ? 'D' : 'Y');
    }
    rows.push(row);
  }
  return rows;
}
// ---- end fx.js


export const DEFAULT_MODELS = [
  { id: 'deepseek', name: 'DeepSeek', short: 'DeepSeek', brand: 'deepseek', face: 'deepseek' },
  { id: 'claude-sonnet', name: 'Claude Sonnet', short: 'Sonnet', brand: 'claude', face: 'sonnet' },
  { id: 'claude-opus', name: 'Claude Opus', short: 'Opus', brand: 'claude', face: 'opus', premium: true, jackpot: 'gold' },
  { id: 'gpt-6-sol', name: 'GPT-6 Sol', short: 'Sol', brand: 'openai', face: 'sol' },
  { id: 'gpt-6-astra', name: 'GPT-6 Astra', short: 'Astra', brand: 'openai', face: 'astra', premium: true, jackpot: 'star' },
];

const BRAND_COLOR = { deepseek: '#4d6bfe', claude: '#d97757', openai: 'currentColor' };
const runsD = (rows) => {
  let d = '';
  rows.forEach((row, y) => { let x = 0; while (x < row.length) { if (row[x] === '.') { x++; continue; } let w = 1; while (row[x + w] && row[x + w] !== '.') w++; d += `M${x} ${y}h${w}v1h-${w}z`; x += w; } });
  return d;
};
const LOGO_D = {}, LOGO_LG = {};
for (const [id, rows] of Object.entries(GRIDS)) LOGO_D[id] = runsD(rows);
for (const [id, rows] of Object.entries(GRIDS_LG)) LOGO_LG[id] = { d: runsD(rows), n: rows.length };
export const LOGOS = Object.fromEntries(Object.keys(GRIDS).map((k) => [k, { d: LOGO_D[k], rows: GRIDS[k], color: BRAND_COLOR[k], large: GRIDS_LG[k] || null }]));

// On the reel a logo is 20 cells at 1 CSS px per cell (x3 in lg). The OpenAI blossom uses its 32-cell grid
// at 2/3 px per cell, i.e. exactly 2 device px per cell on a 3x phone, so its links stay crisp.
export function PixelLogo({ brand, size = 20, scale = 1, className = '', chip = false, compact = false }) {
  if (compact) {
    const d = LOGO_D[brand]; if (!d) return null; const px = 40 / 3;
    return (
      <svg className={'msc-logo msc-logo-sm ' + className} width={px} height={px} viewBox="0 0 20 20" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
        <path d={d} fill={BRAND_COLOR[brand] || 'currentColor'} />
      </svg>
    );
  }
  if (chip && LOGO_LG[brand]) {
    const lg = LOGO_LG[brand]; const px = (64 / 3) * scale;
    return (
      <svg className={'msc-logo msc-logo-lg ' + className} width={px} height={px} viewBox={`0 0 ${lg.n} ${lg.n}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
        <path d={lg.d} fill={BRAND_COLOR[brand] || 'currentColor'} />
      </svg>
    );
  }
  const px = chip ? 20 * scale : size;
  const lg = px >= 32 && LOGO_LG[brand];
  const d = lg ? lg.d : LOGO_D[brand]; if (!d) return null;
  const n = lg ? lg.n : 20;
  return (
    <svg className={'msc-logo ' + className} width={px} height={px} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path d={d} fill={BRAND_COLOR[brand] || 'currentColor'} />
    </svg>
  );
}
function PixelSprite({ rows, pal, w, h }) {
  const paths = toPaths(rows, pal);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {Object.entries(paths).map(([c, d]) => <path key={c} d={d} fill={c} />)}
    </svg>
  );
}

// ---------- size="lg" cabinet geometry (lg units; x3 on screen). Unchanged from the original 153x48 drawing.
const CW = 153, CH = 48;                        // layout box (body + lever)
const BX0 = 2, BX1 = 138, BMID = 70;             // body
const ARC_EDGE = 13;                             // arch meets the body sides at y=13, top at y=0
const ARC_R = ((BX1 - BX0) / 2) ** 2 / (2 * ARC_EDGE) + ARC_EDGE / 2;
const WIN = { x: 14, y: 17, w: 112, h: 24 };     // reel window opening
const BEZ = { x: 11, y: 14.5, w: 118, h: 28 };
const TRAY = { x0: 45, x1: 95, top: 42.4, floor: 47.6 };
const LV = { x: 147.5, pivot: 28, rest: -1.5, pulled: 46, r: 4.2 };
const NB = 15;                                   // marquee bulbs
const BULBS = (() => {
  const rb = ARC_R - 4.2, cy = ARC_R; const a0 = Math.asin((8.5 - BMID) / rb), a1 = -a0;
  return Array.from({ length: NB }, (_, i) => { const a = a0 + (a1 - a0) * i / (NB - 1); return [BMID + rb * Math.sin(a), cy - rb * Math.cos(a)]; });
})();
const arcPath = (inset) => {
  const r = ARC_R - inset, cy = ARC_R; const half = BMID - BX0 - inset; const dy = Math.sqrt(r * r - half * half);
  return { d: `M${BX0 + inset} ${(cy - dy).toFixed(3)}A${r.toFixed(3)} ${r.toFixed(3)} 0 0 1 ${BX1 - inset} ${(cy - dy).toFixed(3)}`, y: cy - dy };
};

// ---------- compact cabinet geometry (CSS px): ~120x36, simplified for a composer row
const SG = (() => {
  const CW = 120, CH = 36, BX0 = 1, BX1 = 107, BMID = 54, ARC_EDGE = 7;
  const ARC_R = ((BX1 - BX0) / 2) ** 2 / (2 * ARC_EDGE) + ARC_EDGE / 2;
  const NB = 9, rb = ARC_R - 3;
  // 9 bulbs at equal angles on a circular arc = equal arc-length spacing
  const a0 = Math.asin((9.5 - BMID) / rb);
  const BULBS = Array.from({ length: NB }, (_, i) => { const a = a0 + (-2 * a0) * i / (NB - 1); return [BMID + rb * Math.sin(a), ARC_R - rb * Math.cos(a)]; });
  const arc = (inset) => { const r = ARC_R - inset, half = BMID - BX0 - inset, dy = Math.sqrt(r * r - half * half);
    return `M${BX0 + inset} ${(ARC_R - dy).toFixed(3)}A${r.toFixed(3)} ${r.toFixed(3)} 0 0 1 ${BX1 - inset} ${(ARC_R - dy).toFixed(3)}`; };
  return {
    CW, CH, BX0, BX1, BMID, ARC_EDGE, ARC_R, NB, BULBS, arc,
    WIN: { x: 10, y: 11.5, w: 88, h: 17 }, BEZ: { x: 8, y: 9.6, w: 92, h: 20.8 },
    PLINTH: 32.2,
    TRAY: { x0: 40, x1: 68, floor: 35.8 },          // floor = when popped out
    LV: { x: 114, pivot: 20, rest: -0.6, pulled: 31.4, r: 3.1 },
  };
})();
// Per-size numbers used by the loop (coins, lever, reel pitch), in that size's own units.
const GEO = {
  lg: { item: 24, CH, BMID, BX1, TRAY: { x0: TRAY.x0, x1: TRAY.x1, floor: TRAY.floor }, plinth: 44.6, LV, lvMax: Infinity, lvNeg: 1,
    coin: 6, stack: 1, spawnY: 42.6, vyIn: [60, 72], vyOut: [140, 22], vxOut: [74, 22], outX: 8, spread: 8,
    sparks: { x: [40, 104, 22, 118, 70], y: [8, 7, 12, 12, 3] } },
  sm: { item: SG.WIN.h, CH: SG.CH, BMID: SG.BMID, BX1: SG.BX1, TRAY: SG.TRAY, plinth: SG.PLINTH, LV: SG.LV, lvMax: 1.02, lvNeg: 0.1,
    coin: 5, stack: 0.5, spawnY: 31.2, vyIn: [26, 34], vyOut: [78, 14], vxOut: [70, 18], outX: 6, spread: 6,
    sparks: { x: [30, 80, 14, 95, 54], y: [6, 5, 10, 10, 2] } },
};

// ---------- tuning
const STEP_K = 520, STEP_C = 25;          // step spring: ζ≈0.55 → ~12% overshoot
const LAND_K = 280, LAND_C = 12;          // landing spring after a spin: visible overshoot
const LEV_K = 230, LEV_C = 13;            // lever return spring (springs back with a little bounce)
const FLICK = 900;                        // px/s release speed (compact) that turns a swipe into a spin
const COINS = 18, SPARKS = 5, G = 760;

const mod = (a, n) => ((a % n) + n) % n;
const wrapd = (d, n) => mod(d + n / 2, n) - n / 2;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// ---------- tiny WebAudio blips (muted unless `sound`)
function makeAudio() {
  let ctx = null;
  const get = () => {
    if (ctx) return ctx;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try { ctx = new AC(); } catch (_) { ctx = null; }
    return ctx;
  };
  const tone = (f, dur, type, gain, at = 0, f2) => {
    const c = get(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  return {
    tick: () => tone(1900, 0.018, 'square', 0.03),
    ding: () => { tone(1760, 0.32, 'sine', 0.12); tone(2637, 0.22, 'sine', 0.05, 0.004); },
    coins: () => { for (let i = 0; i < 9; i++) tone(988 * (i % 2 ? 1.335 : 1) * (1 + (i % 3) * 0.06), 0.07, 'square', 0.03, 0.12 + i * 0.07); tone(2093, 0.3, 'triangle', 0.05, 0.05); },
    clunk: () => { tone(140, 0.09, 'triangle', 0.1, 0, 70); tone(420, 0.03, 'square', 0.03); },
  };
}

// ---------- the cabinet drawing (static; lights are animated by CSS, lever + coins by the loop)
function CabinetArtLg({ u, lever = true }) {
  const g = (n) => `msc-${n}-${u}`;
  const rim = arcPath(0.9), band = arcPath(4.2);
  const body = `M${BX0} 44V${ARC_EDGE}A${ARC_R.toFixed(3)} ${ARC_R.toFixed(3)} 0 0 1 ${BX1} ${ARC_EDGE}V44Q${BX1} 46.5 ${BX1 - 2.5} 46.5H${BX0 + 2.5}Q${BX0} 46.5 ${BX0} 44Z`;
  return (
    <svg className="msc-art" viewBox={`-1 -8 ${CW + 2} ${CH + 14}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={g('red')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6b6b" /><stop offset=".22" stopColor="#e8212e" /><stop offset=".7" stopColor="#b3101d" /><stop offset="1" stopColor="#6e0710" />
        </linearGradient>
        <linearGradient id={g('side')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a0005" stopOpacity=".55" /><stop offset=".07" stopColor="#2a0005" stopOpacity="0" />
          <stop offset=".16" stopColor="#fff" stopOpacity=".22" /><stop offset=".24" stopColor="#fff" stopOpacity="0" />
          <stop offset=".88" stopColor="#2a0005" stopOpacity="0" /><stop offset="1" stopColor="#2a0005" stopOpacity=".6" />
        </linearGradient>
        <linearGradient id={g('chrome')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".3" stopColor="#d4d7de" /><stop offset=".52" stopColor="#7c818c" />
          <stop offset=".62" stopColor="#a9aeb8" /><stop offset=".85" stopColor="#f2f3f6" /><stop offset="1" stopColor="#8d929c" />
        </linearGradient>
        <linearGradient id={g('chromeH')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7c818c" /><stop offset=".35" stopColor="#ffffff" /><stop offset=".6" stopColor="#b9bdc6" /><stop offset="1" stopColor="#5d626c" />
        </linearGradient>
        <linearGradient id={g('band')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b0a10" /><stop offset="1" stopColor="#1c0306" />
        </linearGradient>
        <linearGradient id={g('plate')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b0b10" /><stop offset="1" stopColor="#120205" />
        </linearGradient>
        <linearGradient id={g('gold')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" /><stop offset=".45" stopColor="#ffd34d" /><stop offset=".55" stopColor="#e6a51c" /><stop offset="1" stopColor="#ffe48a" />
        </linearGradient>
        <linearGradient id={g('tray')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0c10" /><stop offset="1" stopColor="#3a3d46" />
        </linearGradient>
        <radialGradient id={g('bOff')} cx=".38" cy=".34" r=".7">
          <stop offset="0" stopColor="#d9a35e" /><stop offset=".55" stopColor="#8a5420" /><stop offset="1" stopColor="#4a260b" />
        </radialGradient>
        <radialGradient id={g('bOn')} cx=".4" cy=".36" r=".7">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#fff2b8" /><stop offset="1" stopColor="#ffb636" />
        </radialGradient>
        <radialGradient id={g('bGold')} cx=".4" cy=".36" r=".7">
          <stop offset="0" stopColor="#fffbe0" /><stop offset=".4" stopColor="#ffd84a" /><stop offset="1" stopColor="#d98a00" />
        </radialGradient>
        <radialGradient id={g('halo')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffe9a6" stopOpacity=".95" /><stop offset=".45" stopColor="#ffc95c" stopOpacity=".45" /><stop offset="1" stopColor="#ffb02e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('bStar')} cx=".4" cy=".36" r=".7">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#e4f2ff" /><stop offset="1" stopColor="#6fa8ff" />
        </radialGradient>
        <radialGradient id={g('haloS')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".95" /><stop offset=".45" stopColor="#a9d2ff" stopOpacity=".5" /><stop offset="1" stopColor="#5a96ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('knob')} cx=".38" cy=".32" r=".75">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#b8bcc6" /><stop offset="1" stopColor="#5b6070" />
        </radialGradient>
        <linearGradient id={g('shine')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* drop shadow on the "table" */}
      <ellipse cx={BMID} cy="47.4" rx="70" ry="1.6" fill="#1a0b14" opacity=".22" />
      {/* body */}
      <path d={body} fill={`url(#${g('red')})`} />
      <path d={body} fill={`url(#${g('side')})`} />
      {/* chrome side moldings + a darker kick band at the foot */}
      <rect x={BX0 + 0.9} y={ARC_EDGE + 1.2} width="1.1" height={44.6 - ARC_EDGE - 1.2} rx=".55" fill={`url(#${g('chromeH')})`} opacity=".9" />
      <rect x={BX1 - 2} y={ARC_EDGE + 1.2} width="1.1" height={44.6 - ARC_EDGE - 1.2} rx=".55" fill={`url(#${g('chromeH')})`} opacity=".9" />
      <rect x={BX0} y="42.6" width={BX1 - BX0} height="2.4" fill="#3a0006" opacity=".35" />
      {/* enamel highlight just under the arch */}
      <path d={`M${BX0 + 6} 15.2Q${BMID} 9.5 ${BX1 - 6} 15.2`} fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth=".8" strokeLinecap="round" />
      {/* marquee light board + chrome rim */}
      <path d={band.d} fill="none" stroke={`url(#${g('band')})`} strokeWidth="5.6" strokeLinecap="round" />
      <path d={rim.d} fill="none" stroke={`url(#${g('chrome')})`} strokeWidth="1.8" strokeLinecap="round" />
      <path d={rim.d} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth=".35" strokeLinecap="round" transform="translate(0 -.55)" />
      {/* bulbs */}
      <g className="msc-bulbs">
        {BULBS.map(([x, y], i) => (
          <g key={i} className="msc-bulb" style={{ '--k': i % 3, '--p': i % 2 }} transform={`translate(${x.toFixed(3)} ${y.toFixed(3)})`}>
            <circle r="1.95" fill="#24060a" />
            <circle r="1.55" fill={`url(#${g('bOff')})`} />
            <g className="msc-lit"><circle r="3.6" fill={`url(#${g('halo')})`} /><circle r="1.55" fill={`url(#${g('bOn')})`} /></g>
            <g className="msc-gold"><circle r="4.2" fill={`url(#${g('halo')})`} /><circle r="1.6" fill={`url(#${g('bGold')})`} /></g>
            <g className="msc-star"><circle r="4.4" fill={`url(#${g('haloS')})`} /><circle r="1.6" fill={`url(#${g('bStar')})`} /></g>
            <circle cx="-.5" cy="-.55" r=".45" fill="#fff" opacity=".85" />
          </g>
        ))}
      </g>
      {/* JACKPOT plate */}
      <g className="msc-plate">
        <rect x={BMID - 17.5} y="6.4" width="35" height="7" rx="1.6" fill={`url(#${g('gold')})`} />
        <rect className="msc-plate-bg" x={BMID - 16.7} y="7.2" width="33.4" height="5.4" rx="1.1" fill={`url(#${g('plate')})`} />
        <text className="msc-plate-txt" x={BMID} y="11.62" textAnchor="middle" fontSize="4.6" fontWeight="900" letterSpacing=".32"
          fontFamily='"Arial Black","Helvetica Neue",Arial,sans-serif' fill={`url(#${g('gold')})`}>JACKPOT</text>
      </g>
      {/* window bezel */}
      <rect x={BEZ.x - 0.4} y={BEZ.y + 0.4} width={BEZ.w + 0.8} height={BEZ.h + 0.4} rx="4" fill="#3b0006" opacity=".45" />
      <rect x={BEZ.x} y={BEZ.y} width={BEZ.w} height={BEZ.h} rx="3.6" fill={`url(#${g('chrome')})`} />
      <rect x={BEZ.x + 0.35} y={BEZ.y + 0.35} width={BEZ.w - 0.7} height={BEZ.h - 0.7} rx="3.3" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth=".4" />
      <rect x={WIN.x - 0.7} y={WIN.y - 0.7} width={WIN.w + 1.4} height={WIN.h + 1.4} rx="2.6" fill="#101014" />
      {/* payline markers */}
      <path d={`M${BEZ.x + 0.6} ${WIN.y + WIN.h / 2 - 1.9}l2.3 1.9l-2.3 1.9z`} fill="#d4141f" stroke="#5a0008" strokeWidth=".25" />
      <path d={`M${BEZ.x + BEZ.w - 0.6} ${WIN.y + WIN.h / 2 - 1.9}l-2.3 1.9l2.3 1.9z`} fill="#d4141f" stroke="#5a0008" strokeWidth=".25" />
      {/* chrome plinth + coin tray (interior; the front lip is drawn over the coins) */}
      <rect x={BX0 - 0.5} y="44.6" width={BX1 - BX0 + 1} height="3.2" rx="1.4" fill={`url(#${g('chrome')})`} />
      <path d={`M${TRAY.x0} ${TRAY.top}H${TRAY.x1}V${TRAY.floor - 1.6}Q${TRAY.x1} ${TRAY.floor} ${TRAY.x1 - 1.8} ${TRAY.floor}H${TRAY.x0 + 1.8}Q${TRAY.x0} ${TRAY.floor} ${TRAY.x0} ${TRAY.floor - 1.6}Z`} fill={`url(#${g('tray')})`} />
      <rect x={BMID - 9} y={TRAY.top + 0.25} width="18" height="1.1" rx=".55" fill="#000" />
      {/* lever hub (side mount) */}
      {lever && <>
      <rect x="135.5" y="21.5" width="11" height="13" rx="2.6" fill={`url(#${g('chromeH')})`} />
      <rect x="135.5" y="21.5" width="11" height="13" rx="2.6" fill={`url(#${g('shine')})`} opacity=".6" />
      <circle cx="138.6" cy="24.4" r=".55" fill="#6b7080" /><circle cx="138.6" cy="31.6" r=".55" fill="#6b7080" />
      </>}
    </svg>
  );
}

// tray front lip + the lever: drawn above the coins
function FrontArtLg({ u, stickRef, ballRef }) {
  const g = (n) => `msc-${n}-${u}`;
  return (
    <svg className="msc-front" viewBox={`-1 -8 ${CW + 2} ${CH + 14}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={g('lip')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#c3c7cf" /><stop offset="1" stopColor="#6d727c" />
        </linearGradient>
        <linearGradient id={g('rod')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5d626c" /><stop offset=".4" stopColor="#ffffff" /><stop offset=".7" stopColor="#b5b9c2" /><stop offset="1" stopColor="#535863" />
        </linearGradient>
        <radialGradient id={g('ball')} cx=".36" cy=".3" r=".78">
          <stop offset="0" stopColor="#ffb3ad" /><stop offset=".28" stopColor="#ff3b3f" /><stop offset=".7" stopColor="#c10f1c" /><stop offset="1" stopColor="#6a0309" />
        </radialGradient>
        <radialGradient id={g('knob2')} cx=".38" cy=".32" r=".75">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#b8bcc6" /><stop offset="1" stopColor="#4f5463" />
        </radialGradient>
      </defs>
      <path d={`M${TRAY.x0 - 0.6} 44.9H${TRAY.x1 + 0.6}V46.2Q${TRAY.x1 + 0.6} 48.5 ${TRAY.x1 - 1.8} 48.5H${TRAY.x0 + 1.8}Q${TRAY.x0 - 0.6} 48.5 ${TRAY.x0 - 0.6} 46.2Z`} fill={`url(#${g('lip')})`} />
      <path d={`M${TRAY.x0 - 0.6} 44.9H${TRAY.x1 + 0.6}`} stroke="#4b505a" strokeWidth=".3" />
      <path d={`M${TRAY.x0 + 0.6} 45.35H${TRAY.x1 - 0.6}`} stroke="#fff" strokeWidth=".4" strokeOpacity=".95" strokeLinecap="round" />
      <path d={`M${TRAY.x0 + 3} 48.05H${TRAY.x1 - 3}`} stroke="#3c4049" strokeWidth=".3" strokeOpacity=".6" />
      {/* lever: stick from the pivot to the ball, chrome pivot cap, then the ball (comes toward you when pulled) */}
      {stickRef && <>
      <rect ref={stickRef} x={LV.x - 1.15} y={LV.rest} width="2.3" height={LV.pivot - LV.rest} rx="1.1" fill={`url(#${g('rod')})`} />
      <circle cx={LV.x} cy={LV.pivot} r="2.9" fill="#3a3d46" />
      <circle cx={LV.x} cy={LV.pivot} r="2.5" fill={`url(#${g('knob2')})`} />
      <g ref={ballRef} transform={`translate(${LV.x} ${LV.rest})`}>
        <ellipse cx=".5" cy="1" rx={LV.r} ry={LV.r * 0.9} fill="#300" opacity=".25" />
        <circle r={LV.r} fill={`url(#${g('ball')})`} />
        <circle r={LV.r - 0.15} fill="none" stroke="#5a0007" strokeOpacity=".45" strokeWidth=".3" />
        <ellipse cx="-1.35" cy="-1.6" rx="1.35" ry=".95" fill="#fff" opacity=".9" transform="rotate(-30 -1.35 -1.6)" />
        <circle cx="1.7" cy="2" r=".5" fill="#fff" opacity=".3" />
      </g>
      </>}
    </svg>
  );
}


// ---------- compact drawing (CSS px). Same materials, fewer parts: 9 bulbs, no plate, thin tray lip.
function CabinetArtSm({ u, lever = true }) {
  const g = (n) => `msc-${n}-${u}`;
  const { BX0, BX1, BMID, ARC_EDGE, ARC_R, BULBS, WIN, BEZ, PLINTH, TRAY, CW, CH } = SG;
  const bot = PLINTH + 1.2;
  const body = `M${BX0} ${bot - 2}V${ARC_EDGE}A${ARC_R.toFixed(3)} ${ARC_R.toFixed(3)} 0 0 1 ${BX1} ${ARC_EDGE}V${bot - 2}Q${BX1} ${bot} ${BX1 - 2} ${bot}H${BX0 + 2}Q${BX0} ${bot} ${BX0} ${bot - 2}Z`;
  return (
    <svg className="msc-art" viewBox={`-1 -6 ${CW + 2} ${CH + 8}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={g('red')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6b6b" /><stop offset=".22" stopColor="#e8212e" /><stop offset=".7" stopColor="#b3101d" /><stop offset="1" stopColor="#6e0710" />
        </linearGradient>
        <linearGradient id={g('side')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a0005" stopOpacity=".55" /><stop offset=".06" stopColor="#2a0005" stopOpacity="0" />
          <stop offset=".9" stopColor="#2a0005" stopOpacity="0" /><stop offset="1" stopColor="#2a0005" stopOpacity=".6" />
        </linearGradient>
        <linearGradient id={g('chrome')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".3" stopColor="#d4d7de" /><stop offset=".52" stopColor="#7c818c" />
          <stop offset=".62" stopColor="#a9aeb8" /><stop offset=".85" stopColor="#f2f3f6" /><stop offset="1" stopColor="#8d929c" />
        </linearGradient>
        <linearGradient id={g('chromeH')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7c818c" /><stop offset=".35" stopColor="#ffffff" /><stop offset=".6" stopColor="#b9bdc6" /><stop offset="1" stopColor="#5d626c" />
        </linearGradient>
        <linearGradient id={g('band')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b0a10" /><stop offset="1" stopColor="#1c0306" />
        </linearGradient>
        <linearGradient id={g('tray')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#07080b" /><stop offset="1" stopColor="#3a3d46" />
        </linearGradient>
        <radialGradient id={g('bOff')} cx=".38" cy=".34" r=".7">
          <stop offset="0" stopColor="#d9a35e" /><stop offset=".55" stopColor="#8a5420" /><stop offset="1" stopColor="#4a260b" />
        </radialGradient>
        <radialGradient id={g('bOn')} cx=".4" cy=".36" r=".7">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#fff2b8" /><stop offset="1" stopColor="#ffb636" />
        </radialGradient>
        <radialGradient id={g('bGold')} cx=".4" cy=".36" r=".7">
          <stop offset="0" stopColor="#fffbe0" /><stop offset=".4" stopColor="#ffd84a" /><stop offset="1" stopColor="#d98a00" />
        </radialGradient>
        <radialGradient id={g('halo')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffe9a6" stopOpacity=".9" /><stop offset=".45" stopColor="#ffc95c" stopOpacity=".4" /><stop offset="1" stopColor="#ffb02e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('bStar')} cx=".4" cy=".36" r=".7">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#e4f2ff" /><stop offset="1" stopColor="#6fa8ff" />
        </radialGradient>
        <radialGradient id={g('haloS')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".95" /><stop offset=".45" stopColor="#a9d2ff" stopOpacity=".5" /><stop offset="1" stopColor="#5a96ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g('shine')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx={BMID} cy={PLINTH + 3} rx={BMID - 2} ry="1.1" fill="#1a0b14" opacity=".22" />
      <path d={body} fill={`url(#${g('red')})`} />
      <path d={body} fill={`url(#${g('side')})`} />
      <rect x={BX0 + 0.8} y={ARC_EDGE + 1.4} width=".9" height={PLINTH - ARC_EDGE - 2} rx=".45" fill={`url(#${g('chromeH')})`} opacity=".9" />
      <rect x={BX1 - 1.7} y={ARC_EDGE + 1.4} width=".9" height={PLINTH - ARC_EDGE - 2} rx=".45" fill={`url(#${g('chromeH')})`} opacity=".9" />
      {/* marquee board + chrome rim */}
      <path d={SG.arc(3)} fill="none" stroke={`url(#${g('band')})`} strokeWidth="4.4" strokeLinecap="round" />
      <path d={SG.arc(0.7)} fill="none" stroke={`url(#${g('chrome')})`} strokeWidth="1.4" strokeLinecap="round" />
      <path d={SG.arc(0.7)} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth=".3" strokeLinecap="round" transform="translate(0 -.45)" />
      <g className="msc-bulbs">
        {BULBS.map(([x, y], i) => (
          <g key={i} className="msc-bulb" style={{ '--k': i % 3, '--p': i % 2 }} transform={`translate(${x.toFixed(3)} ${y.toFixed(3)})`}>
            <circle r="1.7" fill="#24060a" />
            <circle r="1.35" fill={`url(#${g('bOff')})`} />
            <g className="msc-lit"><circle r="2.9" fill={`url(#${g('halo')})`} /><circle r="1.35" fill={`url(#${g('bOn')})`} /></g>
            <g className="msc-gold"><circle r="3.4" fill={`url(#${g('halo')})`} /><circle r="1.4" fill={`url(#${g('bGold')})`} /></g>
            <g className="msc-star"><circle r="3.6" fill={`url(#${g('haloS')})`} /><circle r="1.4" fill={`url(#${g('bStar')})`} /></g>
            <circle cx="-.42" cy="-.46" r=".38" fill="#fff" opacity=".85" />
          </g>
        ))}
      </g>
      {/* window bezel */}
      <rect x={BEZ.x - 0.3} y={BEZ.y + 0.35} width={BEZ.w + 0.6} height={BEZ.h + 0.3} rx="3.2" fill="#3b0006" opacity=".45" />
      <rect x={BEZ.x} y={BEZ.y} width={BEZ.w} height={BEZ.h} rx="2.9" fill={`url(#${g('chrome')})`} />
      <rect x={BEZ.x + 0.3} y={BEZ.y + 0.3} width={BEZ.w - 0.6} height={BEZ.h - 0.6} rx="2.6" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth=".35" />
      <rect x={WIN.x - 0.6} y={WIN.y - 0.6} width={WIN.w + 1.2} height={WIN.h + 1.2} rx="2.1" fill="#101014" />
      <path d={`M${BEZ.x + 0.45} ${WIN.y + WIN.h / 2 - 1.5}l1.7 1.5l-1.7 1.5z`} fill="#d4141f" stroke="#5a0008" strokeWidth=".2" />
      <path d={`M${BEZ.x + BEZ.w - 0.45} ${WIN.y + WIN.h / 2 - 1.5}l-1.7 1.5l1.7 1.5z`} fill="#d4141f" stroke="#5a0008" strokeWidth=".2" />
      {/* coin chute + chrome plinth */}
      <rect x={BMID - 6} y={BEZ.y + BEZ.h + 0.45} width="12" height=".95" rx=".47" fill="#14020a" opacity=".85" />
      <rect x={BX0 - 0.5} y={PLINTH} width={BX1 - BX0 + 1} height="2.6" rx="1.2" fill={`url(#${g('chrome')})`} />
      {/* tray interior: hidden at rest, drops open on a jackpot */}
      <rect className="msc-tray-in" x={TRAY.x0 + 0.5} y={PLINTH - 0.4} width={TRAY.x1 - TRAY.x0 - 1} height="4.6" rx=".8" fill={`url(#${g('tray')})`} />
      {lever && <>
      <rect x="105.4" y="15" width="8.4" height="10" rx="2.1" fill={`url(#${g('chromeH')})`} />
      <rect x="105.4" y="15" width="8.4" height="10" rx="2.1" fill={`url(#${g('shine')})`} opacity=".6" />
      <circle cx="107.8" cy="17.3" r=".45" fill="#6b7080" /><circle cx="107.8" cy="22.7" r=".45" fill="#6b7080" />
      </>}
    </svg>
  );
}

function FrontArtSm({ u, stickRef, ballRef }) {
  const g = (n) => `msc-${n}-${u}`;
  const { TRAY, PLINTH, LV, CW, CH } = SG;
  const t = PLINTH - 0.25, b = t + 1.9, x0 = TRAY.x0 - 0.6, x1 = TRAY.x1 + 0.6;
  return (
    <svg className="msc-front" viewBox={`-1 -6 ${CW + 2} ${CH + 8}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={g('lip')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#c3c7cf" /><stop offset="1" stopColor="#6d727c" />
        </linearGradient>
        <linearGradient id={g('rod')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5d626c" /><stop offset=".4" stopColor="#ffffff" /><stop offset=".7" stopColor="#b5b9c2" /><stop offset="1" stopColor="#535863" />
        </linearGradient>
        <radialGradient id={g('ball')} cx=".36" cy=".3" r=".78">
          <stop offset="0" stopColor="#ffb3ad" /><stop offset=".28" stopColor="#ff3b3f" /><stop offset=".7" stopColor="#c10f1c" /><stop offset="1" stopColor="#6a0309" />
        </radialGradient>
        <radialGradient id={g('knob2')} cx=".38" cy=".32" r=".75">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#b8bcc6" /><stop offset="1" stopColor="#4f5463" />
        </radialGradient>
      </defs>
      {/* thin chrome tray lip; slides down/out on a jackpot */}
      <g className="msc-tray-lip">
        <path d={`M${x0} ${t}H${x1}V${b - 0.9}Q${x1} ${b} ${x1 - 1.1} ${b}H${x0 + 1.1}Q${x0} ${b} ${x0} ${b - 0.9}Z`} fill={`url(#${g('lip')})`} stroke="#4b505a" strokeWidth=".25" />
        <path d={`M${x0 + 0.7} ${t + 0.4}H${x1 - 0.7}`} stroke="#fff" strokeWidth=".35" strokeOpacity=".95" strokeLinecap="round" />
      </g>
      {stickRef && <>
      <rect ref={stickRef} x={LV.x - 0.85} y={LV.rest} width="1.7" height={LV.pivot - LV.rest} rx=".85" fill={`url(#${g('rod')})`} />
      <circle cx={LV.x} cy={LV.pivot} r="2.2" fill="#3a3d46" />
      <circle cx={LV.x} cy={LV.pivot} r="1.85" fill={`url(#${g('knob2')})`} />
      <g ref={ballRef} transform={`translate(${LV.x} ${LV.rest})`}>
        <circle cx=".35" cy=".7" r={LV.r} fill="#300" opacity=".22" />
        <circle r={LV.r} fill={`url(#${g('ball')})`} />
        <circle r={LV.r - 0.12} fill="none" stroke="#5a0007" strokeOpacity=".45" strokeWidth=".25" />
        <ellipse cx="-1" cy="-1.2" rx="1" ry=".7" fill="#fff" opacity=".9" transform="rotate(-30 -1 -1.2)" />
        <circle cx="1.3" cy="1.5" r=".38" fill="#fff" opacity=".3" />
      </g>
      </>}
    </svg>
  );
}

const ModelSlotCabinet = forwardRef(function ModelSlotCabinet(props, ref) {
  const {
    models = DEFAULT_MODELS, value, defaultValue, onChange, sound = false, lever = true, size = 'sm',
    label = 'Model', disabled = false, rng, className = '', style, id,
  } = props;
  const N = models.length;
  const S = size === 'lg' ? 3 : 1;
  const GM = GEO[S === 3 ? 'lg' : 'sm'];
  const ITEM = GM.item * S;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const controlled = value !== undefined;
  const idxOf = (v) => Math.max(0, models.findIndex((m) => m.id === v));
  const [inner, setInner] = useState(() => idxOf(defaultValue));
  const current = controlled ? idxOf(value) : inner;
  const [announce, setAnnounce] = useState('');

  const rootRef = useRef(null), reelRef = useRef(null), blurRef = useRef(null), stripRef = useRef(null);
  const stickRef = useRef(null), ballRef = useRef(null);
  const itemRefs = useRef([]);
  const coinRefs = useRef([]), sparkRefs = useRef([]);

  const S_ = useRef(null);
  if (!S_.current) S_.current = { pos: current, vel: 0, mode: 'rest', target: current, peek: 0, raf: 0, last: 0, cross: 0, spin: null, landing: null, drag: null, face: current, tickAt: 0, lastCell: current, coins: [], sparks: [], fxUntil: 0, fxT0: 0, reduced: false, wheel: 0, ding: false, lv: { p: 0, v: 0, drag: null, auto: 0, clunked: false }, lvShown: null };
  const P = useRef(props); P.current = props;
  const D = useRef({ ITEM, S, G: GM }); D.current = { ITEM, S, G: GM };
  const cur = useRef(current); cur.current = current;
  const audio = useRef(null);
  const snd = (k) => { if (!P.current.sound) return; if (!audio.current) audio.current = makeAudio(); audio.current[k](); };

  const commit = useCallback((i, reason) => {
    const m = models[i];
    if (!controlled) setInner(i);
    if (reason === 'spin') setAnnounce(`${m.name}`);
    if (i !== cur.current && P.current.onChange) P.current.onChange(m.id, m, { reason });
    cur.current = i;
  }, [models, controlled]);

  const setLights = (mode, ms) => {
    const root = rootRef.current; if (!root) return; const s = S_.current;
    root.setAttribute('data-lights', mode);
    clearTimeout(s.lt); if (ms) s.lt = setTimeout(() => { if (rootRef.current) rootRef.current.setAttribute('data-lights', 'idle'); }, ms);
  };
  const pulse = (cls, ms) => {
    const root = rootRef.current; if (!root) return; const s = S_.current;
    root.classList.remove(cls); void root.offsetWidth; root.classList.add(cls);
    clearTimeout(s['t_' + cls]); s['t_' + cls] = setTimeout(() => root.classList.remove(cls), ms);
  };

  // ---------- paint the reel
  const paint = useCallback(() => {
    const s = S_.current; const layers = itemRefs.current; const IT = D.current.ITEM;
    const v = s.vel, speed = Math.abs(v);
    const moving = s.mode !== 'rest';
    const trail = clamp(speed * 0.02, 0, 0.5);
    const echoA = moving ? clamp((speed - 0.6) / 5, 0, 1) : 0;
    const wantPeek = s.mode === 'spin' ? 1 : s.mode === 'land' ? clamp(speed / 4, 0, 1) : 0;
    s.peek += (wantPeek - s.peek) * 0.3; if (Math.abs(s.peek - wantPeek) < 0.01) s.peek = wantPeek;
    const sq = 1 - 0.2 * s.peek, pitch = IT * sq;
    for (let L = 0; L < layers.length; L++) {
      const row = layers[L]; if (!row) continue;
      const off = L === 0 ? 0 : Math.sign(v) * trail * L;
      for (let k = 0; k < N; k++) {
        const el = row[k]; if (!el) continue;
        const d = wrapd(k - s.pos, N) + off;
        const vis = Math.abs(d) < 1.6 && (L === 0 || echoA > 0.02);
        if (!vis) { if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden'; continue; }
        el.style.visibility = 'visible';
        el.style.transform = sq === 1 ? `translate3d(0,${(d * IT).toFixed(2)}px,0)` : `translate3d(0,${(d * pitch).toFixed(2)}px,0) scaleY(${sq.toFixed(3)})`;
        if (L > 0) el.style.opacity = (echoA * (L === 1 ? 0.38 : 0.17)).toFixed(3);
      }
    }
    if (blurRef.current) {
      const b = speed > 4 ? clamp((speed - 4) * 0.075, 0, 2.6) * D.current.S : 0;
      blurRef.current.setAttribute('stdDeviation', `0 ${b.toFixed(2)}`);
      const on = b > 0.05;
      if (stripRef.current && on !== s.blurOn) { s.blurOn = on; stripRef.current.style.filter = on ? `url(#msc-b-${uid})` : ''; }
    }
    const f = mod(Math.round(s.pos), N);
    if (f !== s.face && rootRef.current) { s.face = f; rootRef.current.setAttribute('data-face', models[f].face || models[f].id); }
  }, [N, models, uid]);

  const paintLever = () => {
    const s = S_.current, p0 = s.lv.p; if (s.lvShown === p0) return; s.lvShown = p0;
    const { LV, lvMax, lvNeg } = D.current.G;
    const p = p0 < 0 ? p0 * lvNeg : Math.min(p0, lvMax);   // compact: the ball never dips below the cabinet or jumps far above the row
    const y = LV.rest + (LV.pulled - LV.rest) * p;
    const sc = 1 + 0.16 * Math.sin(Math.PI * clamp(p, 0, 1));
    if (ballRef.current) ballRef.current.setAttribute('transform', `translate(${LV.x} ${y.toFixed(3)}) scale(${sc.toFixed(3)})`);
    if (stickRef.current) { const a = Math.min(y, LV.pivot), h = Math.abs(LV.pivot - y); stickRef.current.setAttribute('y', a.toFixed(3)); stickRef.current.setAttribute('height', Math.max(0.01, h).toFixed(3)); }
  };

  // ---------- jackpot: coins pour from the chute into the tray, a few bounce out to the right
  const jackpot = (now, theme) => {
    const s = S_.current; const r = P.current.rng || Math.random; const G_ = D.current.G;
    s.coins = Array.from({ length: COINS }, (_, i) => {
      const out = i % 6 === 2;
      return {
        t0: now + 120 + i * 40, on: false, out, x: out ? G_.BMID + G_.outX + r() * 3 : G_.BMID + (r() - 0.5) * G_.spread, y: G_.spawnY,
        vx: out ? G_.vxOut[0] + r() * G_.vxOut[1] : (r() - 0.5) * 70, vy: out ? -(G_.vyOut[0] + r() * G_.vyOut[1]) : -(G_.vyIn[0] + r() * G_.vyIn[1]),
        ph: r() * 6, flip: 1, rest: false, stack: r() * G_.stack,
      };
    });
    s.sparks = Array.from({ length: SPARKS }, (_, i) => ({ t0: now + 60 + i * 110, life: 0.55, s: 0.7 + r() * 0.5, x: G_.sparks.x[i], y: G_.sparks.y[i] }));
    s.fxT0 = now; s.fxUntil = now + 2900;
    if (rootRef.current) rootRef.current.setAttribute('data-jp', theme === 'star' ? 'star' : 'gold');
    pulse('is-jackpot', 2000); pulse('is-tray', 2900); setLights('win', 2000);
    snd('coins');
  };

  const paintFx = (now, dt) => {
    const s = S_.current, Sc = D.current.S; const { TRAY, BX1, CH, plinth, coin: CS } = D.current.G; const hc = CS / 2;
    const fade = clamp((s.fxUntil - now) / 450, 0, 1);
    s.coins.forEach((c, i) => {
      const el = coinRefs.current[i]; if (!el) return;
      if (now < c.t0) { el.style.opacity = '0'; return; }
      if (!c.on) { c.on = true; }
      else if (!c.rest) {
        c.vy += G * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        const inTray = !c.out || c.x < TRAY.x1 + 1;
        let floor;
        if (!c.out) {
          floor = TRAY.floor - hc - c.stack;
          if (c.x < TRAY.x0 + hc) { c.x = TRAY.x0 + hc; c.vx = Math.abs(c.vx) * 0.5; }
          if (c.x > TRAY.x1 - hc) { c.x = TRAY.x1 - hc; c.vx = -Math.abs(c.vx) * 0.5; }
        } else floor = inTray ? TRAY.floor - hc : c.x < BX1 + 1 ? plinth - hc : CH - hc;
        if (c.out && c.vy === 0 && c.x < BX1 + 2 && Math.abs(c.vx) < 28) c.vx = 28;
        if (c.y > floor) {
          c.y = floor;
          if (Math.abs(c.vy) > 40) { c.vy = -Math.abs(c.vy) * 0.36; c.vx *= 0.82; }
          else { c.vy = 0; c.vx *= Math.max(0, 1 - (c.out ? 1.6 : 5) * dt); if (Math.abs(c.vx) < 4 && (!c.out || c.x > BX1 + 2)) c.rest = true; }
        }
        c.ph += dt * (c.vy === 0 ? 4 : 15);
      }
      const air = !c.rest && c.vy !== 0;
      c.flip = air ? Math.max(0.2, Math.abs(Math.cos(c.ph))) : c.flip + (1 - c.flip) * 0.3;
      el.style.opacity = fade.toFixed(2);
      el.style.transform = `translate3d(${((c.x - hc) * Sc).toFixed(2)}px,${((c.y - hc) * Sc).toFixed(2)}px,0) scaleX(${c.flip.toFixed(2)})`;
    });
    s.sparks.forEach((p, i) => {
      const el = sparkRefs.current[i]; if (!el) return;
      const t = (now - p.t0) / 1000;
      if (t < 0 || t > p.life) { el.style.opacity = '0'; return; }
      const u = t / p.life; const sc = u < 0.35 ? u / 0.35 : 1 - (u - 0.35) / 0.65;
      el.style.opacity = '1';
      el.style.transform = `translate3d(${((p.x - 3.5) * Sc).toFixed(2)}px,${((p.y - 3.5) * Sc).toFixed(2)}px,0) scale(${(sc * p.s).toFixed(2)})`;
    });
  };

  const dingFx = () => { pulse('is-ding', 260); snd('ding'); };
  const landed = (i, now) => {
    commit(i, 'spin');
    if (models[i].premium) jackpot(now, models[i].jackpot || (models[i].brand === 'openai' ? 'star' : 'gold')); else setLights('blink', 520);
  };

  // ---------- the loop
  const frame = useCallback((now) => {
    const s = S_.current;
    const dt = Math.min(1 / 30, Math.max(0, (now - (s.last || now)) / 1000)); s.last = now;
    if (s.mode === 'spring' || s.mode === 'land') {
      const k = s.mode === 'land' ? LAND_K : STEP_K, c = s.mode === 'land' ? LAND_C : STEP_C;
      const n = 4, h = dt / n;
      for (let i = 0; i < n; i++) { const a = -k * (s.pos - s.target) - c * s.vel; s.vel += a * h; s.pos += s.vel * h; }
      const sg = Math.sign(s.pos - s.target);
      if (!s.ding && sg !== 0 && sg !== s.cross) {
        s.ding = true; dingFx();
        if (s.mode === 'land' && s.landing) { s.landing = null; landed(mod(s.target, N), now); }
      }
      if (Math.abs(s.pos - s.target) < 0.002 && Math.abs(s.vel) < 0.03) {
        s.pos = s.target; s.vel = 0; s.mode = 'rest';
        if (!s.ding) { s.ding = true; dingFx(); }
        if (s.landing) { s.landing = null; landed(mod(s.target, N), now); }
        const want = models.findIndex((mm) => mm.id === P.current.value);
        if (P.current.value !== undefined && want >= 0 && mod(s.target, N) !== want) {
          s.target = Math.round(s.pos) + wrapd(want - mod(Math.round(s.pos), N), N); s.mode = 'spring'; s.cross = Math.sign(s.pos - s.target); s.ding = false;
        }
      }
    } else if (s.mode === 'spin') {
      const sp = s.spin; const u = clamp((now - sp.t0) / 1000 / sp.T, 0, 1);
      const p = sp.p, prev = s.pos;
      s.pos = sp.start + sp.D * (1 - Math.pow(1 - u, p));
      s.vel = sp.D * p * Math.pow(1 - u, p - 1) / sp.T;
      const rem = sp.start + sp.D - s.pos;
      if (Math.abs(rem) <= 0.6 || u >= 1) {
        s.mode = 'land'; s.target = sp.start + sp.D; s.cross = Math.sign(s.pos - s.target) || -Math.sign(sp.D); s.ding = false; s.landing = true;
        setLights('idle');
      }
      if (Math.floor(s.pos + 0.5) !== Math.floor(prev + 0.5) && now - s.tickAt > 28) { s.tickAt = now; snd('tick'); }
    }
    const cell = Math.floor(s.pos + 0.5);
    if (cell !== s.lastCell) { s.lastCell = cell; if (s.mode !== 'spin' && now - s.tickAt > 28) { s.tickAt = now; snd('tick'); } }
    // lever: scripted pull (key / tap / flick) → spring back; or follows the finger while dragged
    const lv = s.lv;
    if (lv.auto) {
      const t = (now - lv.auto) / 1000;
      if (t < 0.12) lv.p = (t / 0.12) ** 2;
      else if (t < 0.2) { lv.p = 1; if (!lv.clunked) { lv.clunked = true; } }
      else { lv.auto = 0; lv.p = 1; lv.v = 0; }
    } else if (!lv.drag && (lv.p !== 0 || lv.v !== 0)) {
      const n = 4, h = dt / n;
      for (let i = 0; i < n; i++) { const a = -LEV_K * lv.p - LEV_C * lv.v; lv.v += a * h; lv.p += lv.v * h; }
      if (lv.p < -0.1) { lv.p = -0.1; lv.v = Math.abs(lv.v) * 0.3; }
      if (Math.abs(lv.p) < 0.002 && Math.abs(lv.v) < 0.02) { lv.p = 0; lv.v = 0; }
    }
    paint(); paintLever();
    if (s.fxUntil) { paintFx(now, dt); if (now > s.fxUntil) { s.fxUntil = 0; s.coins = []; s.sparks = []; coinRefs.current.forEach((e) => e && (e.style.opacity = '0')); sparkRefs.current.forEach((e) => e && (e.style.opacity = '0')); } }
    const lvBusy = lv.auto || lv.drag || lv.p !== 0 || lv.v !== 0;
    if (s.mode !== 'rest' || s.fxUntil || lvBusy) s.raf = requestAnimationFrame(frame); else s.raf = 0;
  }, [N, models, paint, commit]);

  const kick = useCallback(() => {
    const s = S_.current;
    if (!s.raf && typeof requestAnimationFrame !== 'undefined') { s.last = 0; s.raf = requestAnimationFrame(frame); }
  }, [frame]);

  // ---------- actions
  const step = useCallback((dir, reason = 'step') => {
    const s = S_.current; if (P.current.disabled || s.mode === 'spin' || s.mode === 'land') return;
    const base = s.mode === 'spring' ? s.target : Math.round(s.pos);
    if (Math.abs(base + dir - Math.round(s.pos)) > 2) return;
    s.target = base + dir;
    const i = mod(s.target, N);
    if (s.reduced) { s.pos = s.target; s.vel = 0; s.mode = 'rest'; paint(); commit(i, reason); return; }
    if (s.mode !== 'drag') s.vel += dir * 1.5;
    s.mode = 'spring'; s.cross = Math.sign(s.pos - s.target) || -dir; s.ding = false;
    commit(i, reason); kick();
  }, [N, commit, kick, paint]);

  const spin = useCallback((opts = {}) => {
    const s = S_.current; if (P.current.disabled || s.mode === 'spin' || s.mode === 'land') return;
    const r = P.current.rng || Math.random;
    const from = mod(Math.round(s.pos), N);
    let to = opts.to != null ? (typeof opts.to === 'number' ? opts.to : models.findIndex((m) => m.id === opts.to)) : -1;
    if (to < 0) { to = Math.floor(r() * (N - 1)); if (to >= from) to++; }
    const dir = opts.dir < 0 ? -1 : 1;
    if (s.reduced) { s.pos = Math.round(s.pos) + wrapd(to - from, N); s.target = s.pos; s.vel = 0; s.mode = 'rest'; paint(); commit(to, 'spin'); return; }
    const rounds = opts.rounds != null ? opts.rounds : 3;
    const Dd = dir * (rounds * N + mod((to - from) * dir, N));
    const v0 = clamp(Math.abs(opts.velocity || 30), 18, 48);
    const p = 2.4;
    const start = s.pos, end = Math.round(s.pos) + Dd;
    s.spin = { t0: nowMs(), start, D: end - start, p, T: clamp(p * Math.abs(Dd) / v0, 1.1, 2.1) };
    s.mode = 'spin'; s.landing = true; s.ding = false;
    if (P.current.lever !== false && !s.lv.drag && !opts.fromLever) { s.lv.auto = nowMs() || 1e-6; s.lv.clunked = false; }
    setLights('spin');
    snd('clunk');
    kick();
  }, [N, models, commit, kick, paint]);

  const rollTo = useCallback((i, reason) => {
    const s = S_.current; if (s.mode === 'spin' || s.mode === 'land' || s.mode === 'drag') return;
    const base = s.mode === 'spring' ? s.target : Math.round(s.pos);
    const d = wrapd(i - mod(base, N), N); if (!d) return;
    s.target = base + d;
    if (s.reduced || typeof requestAnimationFrame === 'undefined') { s.pos = s.target; s.vel = 0; s.mode = 'rest'; paint(); }
    else { s.mode = 'spring'; s.cross = Math.sign(s.pos - s.target); s.ding = false; kick(); }
    if (reason) commit(i, reason);
  }, [N, commit, kick, paint]);

  useImperativeHandle(ref, () => ({ step, spin, get node() { return rootRef.current; }, get state() { const s = S_.current; return { pos: s.pos, vel: s.vel, mode: s.mode, lever: s.lv.p }; } }), [step, spin]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => { S_.current.reduced = mq.matches; };
    on(); mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, []);

  useIsoLayout(() => { paint(); }, [paint, ITEM]);
  useEffect(() => () => { const s = S_.current; if (s.raf) cancelAnimationFrame(s.raf); for (const k of Object.keys(s)) if (/^t_|^lt$|^wt$/.test(k)) clearTimeout(s[k]); }, []);
  useEffect(() => { rollTo(current, null); }, [current, rollTo]);

  // ---------- wheel
  useEffect(() => {
    const el = reelRef.current; if (!el) return;
    const onWheel = (e) => {
      if (P.current.disabled) return;
      e.preventDefault();
      const s = S_.current; const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY;
      s.wheel += dy;
      const now = nowMs();
      if (Math.abs(s.wheel) >= 30 && (!s.wheelAt || now - s.wheelAt > 90)) { s.wheelAt = now; const d = Math.sign(s.wheel); s.wheel = 0; step(d, 'wheel'); }
      clearTimeout(s.wt); s.wt = setTimeout(() => { s.wheel = 0; }, 160);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [step]);

  // ---------- reel pointer: tap = next, 1:1 drag with rubber-band, light swipe = step, hard flick = spin
  const onPointerDown = (e) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const s = S_.current; if (s.mode === 'spin' || s.mode === 'land') return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    s.drag = { id: e.pointerId, y0: e.clientY, base: s.mode === 'spring' ? s.target : Math.round(s.pos), pos0: s.pos, moved: false, samples: [[nowMs(), e.clientY]] };
  };
  const onPointerMove = (e) => {
    const s = S_.current, g = s.drag; if (!g || g.id !== e.pointerId) return;
    const dy = e.clientY - g.y0;
    if (!g.moved && Math.abs(dy) < 4) return;
    if (!g.moved) { g.moved = true; s.mode = 'drag'; s.vel = 0; }
    const a = Math.abs(dy), free = ITEM * 0.9;
    const eff = a <= free ? a : free + (a - free) * 0.4 / (1 + (a - free) / (ITEM * 1.4));
    s.pos = g.pos0 - Math.sign(dy) * eff / ITEM;
    g.samples.push([nowMs(), e.clientY]); if (g.samples.length > 8) g.samples.shift();
    paint();
  };
  const onPointerUp = (e) => {
    const s = S_.current, g = s.drag; if (!g || g.id !== e.pointerId) return;
    s.drag = null;
    if (!g.moved) { step(1, 'tap'); return; }
    g.samples.push([nowMs(), e.clientY]);
    const t1 = nowMs(); let k = g.samples.length - 1; while (k > 0 && t1 - g.samples[k - 1][0] < 90) k--;
    const [ta, ya] = g.samples[Math.max(0, k - 1)];
    const vpx = (e.clientY - ya) / Math.max(8, t1 - ta) * 1000;
    const vItems = -vpx / ITEM;
    if (Math.abs(vpx) >= FLICK * Math.sqrt(S)) { s.mode = 'drag'; spin({ dir: Math.sign(vItems), velocity: Math.abs(vItems) }); return; }
    const moved = s.pos - g.base;
    let dir = 0;
    const thr = 0.22 * 24 / GM.item;           // ~5.3 CSS px of travel at either size
    if (Math.abs(moved) > thr || Math.abs(vItems) > 3) dir = Math.sign(Math.abs(moved) > thr ? moved : vItems);
    s.vel = clamp(vItems, -14, 14); s.target = g.base; s.mode = 'spring';
    if (dir) step(dir, 'swipe');
    else { s.target = g.base; s.mode = 'spring'; s.cross = Math.sign(s.pos - s.target); s.ding = true; kick(); }
  };
  const onPointerCancel = () => { const s = S_.current; if (!s.drag) return; s.drag = null; s.target = Math.round(s.pos); s.mode = 'spring'; s.ding = true; kick(); };

  // ---------- lever pointer: pull it down; it fires at the bottom (or on release past halfway), then springs back
  const TRAVEL = (GM.LV.pulled - GM.LV.rest) * S * 0.8;
  const onLeverDown = (e) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const s = S_.current, lv = s.lv;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    lv.auto = 0; lv.drag = { id: e.pointerId, y0: e.clientY, p0: Math.max(0, lv.p), moved: false, fired: false }; lv.v = 0;
    kick();
  };
  const onLeverMove = (e) => {
    const s = S_.current, lv = s.lv, g = lv.drag; if (!g || g.id !== e.pointerId) return;
    const dy = e.clientY - g.y0; if (!g.moved && Math.abs(dy) < 3) return; g.moved = true;
    const raw = g.p0 + dy / TRAVEL;
    lv.p = raw < 0 ? Math.max(-0.08, raw * 0.25) : raw > 1 ? 1 + (raw - 1) * 0.08 : raw;
    if (!g.fired && lv.p >= 0.92 && !s.reduced) { g.fired = true; spin({ velocity: 34, fromLever: true }); }
    kick();
  };
  const onLeverUp = (e) => {
    const s = S_.current, lv = s.lv, g = lv.drag; if (!g || g.id !== e.pointerId) return;
    lv.drag = null;
    if (g.moved) { s.leverNoClick = true; if (!g.fired && lv.p > 0.5) spin({ velocity: 30, fromLever: true }); }
    kick();
  };
  const onLeverClick = () => { const s = S_.current; if (s.leverNoClick) { s.leverNoClick = false; return; } spin({ velocity: 30 }); };

  const onKeyDown = (e) => {
    if (disabled) return;
    const k = e.key;
    if (k === 'ArrowUp') { e.preventDefault(); step(1, 'key'); }
    else if (k === 'ArrowDown') { e.preventDefault(); step(-1, 'key'); }
    else if (k === 'Home' || k === 'End') { e.preventDefault(); rollTo(k === 'Home' ? 0 : N - 1, 'key'); }
    else if (k === 'Enter' || k === ' ' || k === 'Spacebar') { e.preventDefault(); if (!e.repeat) spin({ velocity: 30 }); }
  };

  const m = models[current] || models[0];
  const [face0] = useState(() => m.face || m.id);
  const [at0] = useState(current);
  const face = (mm, i, L) => (
    <div key={mm.id} className={'msc-item' + (L ? ' msc-echo' : '')} data-face={mm.face || mm.id} aria-hidden="true"
      ref={(el) => { (itemRefs.current[L] || (itemRefs.current[L] = []))[i] = el; }}
      style={{ transform: `translate3d(0,${(wrapd(i - at0, N) * ITEM)}px,0)`, visibility: (i === at0 && !L) ? 'visible' : 'hidden' }}>
      <span className="msc-face">{S === 1 ? <PixelLogo brand={mm.brand} compact /> : <PixelLogo brand={mm.brand} chip scale={S} />}<span className="msc-name">{S === 1 && mm.short ? mm.short : mm.name}</span></span>
    </div>
  );
  // compact coins: 5px drawn on a 15-cell grid (1 device px per cell on a 3x phone); lg: 18px on 12 cells
  const coinN = S === 1 ? 15 : 12, coinPx = GM.coin * S;
  const coinPaths = useMemo(() => toPaths(coinRows(coinN), COIN.pal), [coinN]);
  const starPaths = useMemo(() => toPaths(starRows(coinN), STAR_PAL), [coinN]);

  return (
    <div ref={rootRef} id={id} data-face={face0} data-lights="idle" data-jp="gold" data-size={S === 3 ? 'lg' : 'sm'}
      className={'msc' + (disabled ? ' is-disabled' : '') + (lever ? ' has-lever' : '') + (className ? ' ' + className : '')}
      style={{ '--u': S + 'px', ...style }}>
      <div className="msc-cab">
        {S === 3 ? <CabinetArtLg u={uid} lever={lever} /> : <CabinetArtSm u={uid} lever={lever} />}
        <div ref={reelRef} className="msc-reel" role="spinbutton" tabIndex={disabled ? -1 : 0}
          aria-label={label} aria-roledescription="model reel" aria-valuemin={1} aria-valuemax={N} aria-valuenow={current + 1} aria-valuetext={m.name}
          aria-disabled={disabled || undefined}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onKeyDown={onKeyDown}>
          <div className="msc-win">
            <div ref={stripRef} className="msc-strip">
              <div className="msc-layer msc-main">{models.map((mm, i) => face(mm, i, 0))}</div>
              {[1, 2].map((L) => <div key={L} className="msc-layer">{models.map((mm, i) => face(mm, i, L))}</div>)}
            </div>
          </div>
          <span className="msc-glass" aria-hidden="true" />
          <span className="msc-flash" aria-hidden="true" />
          <svg className="msc-defs" width="0" height="0" aria-hidden="true" focusable="false"><filter id={`msc-b-${uid}`} x="0" y="-20%" width="100%" height="140%"><feGaussianBlur ref={blurRef} stdDeviation="0 0" /></filter></svg>
        </div>
        <span className="msc-fx" aria-hidden="true">
          {Array.from({ length: COINS }, (_, i) => (
            <span key={'c' + i} className="msc-coin" ref={(el) => { coinRefs.current[i] = el; }}>
              <svg className="msc-c-gold" width={coinPx} height={coinPx} viewBox={`0 0 ${coinN} ${coinN}`} shapeRendering={S > 1 ? 'crispEdges' : 'geometricPrecision'}>{Object.entries(coinPaths).map(([c, d]) => <path key={c} d={d} fill={c} />)}</svg>
              <svg className="msc-c-star" width={coinPx} height={coinPx} viewBox={`0 0 ${coinN} ${coinN}`} shapeRendering={S > 1 ? 'crispEdges' : 'geometricPrecision'}>{Object.entries(starPaths).map(([c, d]) => <path key={c} d={d} fill={c} />)}</svg>
            </span>
          ))}
          {Array.from({ length: SPARKS }, (_, i) => <span key={'s' + i} className="msc-spark" ref={(el) => { sparkRefs.current[i] = el; }}><PixelSprite rows={SPARK.rows} pal={SPARK.pal} w={7 * S} h={7 * S} /><PixelSprite rows={SPARK.rows} pal={SPARK_STAR.pal} w={7 * S} h={7 * S} /></span>)}
        </span>
        {S === 3 ? (lever ? <FrontArtLg u={uid} stickRef={stickRef} ballRef={ballRef} /> : <FrontArtLg u={uid} />)
          : (lever ? <FrontArtSm u={uid} stickRef={stickRef} ballRef={ballRef} /> : <FrontArtSm u={uid} />)}
        {lever && (
          <button type="button" className="msc-lever" tabIndex={-1} aria-label={`Spin for a random ${label.toLowerCase()}`} disabled={disabled}
            onPointerDown={onLeverDown} onPointerMove={onLeverMove} onPointerUp={onLeverUp} onPointerCancel={onLeverUp} onClick={onLeverClick} />
        )}
      </div>
      <span className="msc-sr" aria-live="polite">{announce}</span>
    </div>
  );
});

export default ModelSlotCabinet;
