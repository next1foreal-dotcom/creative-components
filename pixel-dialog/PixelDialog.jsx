import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import SFX_DATA from './pixel-dialog-sfx.js';
// ---- sprites (pixel maps)
// Pixel sprites as character maps. '.' = transparent. Rendered as merged-run SVG rects.
const PAL = {
  K: '#1b1030', P: '#7b4cf2', p: '#5230b8', Y: '#ffd23f', y: '#d69a12', S: '#ffd2a6', s: '#eaa577',
  W: '#ffffff', E: '#1b1030', M: '#a8323a', G: '#e4e6f2', g: '#a7a9c4', R: '#e8322b', O: '#ff8a1f',
  N: '#b0642f', n: '#6e3416', D: '#3a1d0e', L: '#fff6c9', B: '#59d8ff', b: '#1f8fd6', C: '#ff6fae',
  Z: '#2a2a3a', z: '#5a5a74', Q: '#9be7ff', T: '#cfd3ea', t: '#8a8fb0', A: '#ff4d4d', a: '#b0151d',
};

// Mage portrait, 16x16. The agent is a little wizard who casts your message.
const MAGE_BASE = [
  '.........KK.....',
  '........KPPK....',
  '.......KPPPK....',
  '......KPPYPPK...',
  '......KPYYYPK...',
  '.....KPPPYPPPK..',
  '.....KPPPPPPpK..',
  '....KPPPPPPPPpK.',
  '..KKYYYYYYYYYYKK',
  '.KpPPPPPPPPPPPPK',
  '..KKSSSSSSSSSKK.',
  '...KSWESSSWESK..',
  '...KsSSSSSSSsK..',
  '...KGGSSSSSGGK..',
  '...KGGGGGGGGGK..',
  '....KKGGGGGKK...',
];
const rows = (base, patch) => base.map((r, i) => (patch[i] != null ? patch[i] : r));
const MAGE = {
  idle: MAGE_BASE,
  blink: rows(MAGE_BASE, { 11: '...KSKKSSSKKSK..' }),
  talk: rows(MAGE_BASE, { 13: '...KGGSMMMSGGK..', 14: '...KGGGMMMGGGK..' }),
  charge: rows(MAGE_BASE, { 4: '......KPYWYPK...', 11: '...KSYYSSSYYSK..', 13: '...KGGSMMMSGGK..' }),
  cool: rows(MAGE_BASE, { 11: '...KKKKKSKKKKK..', 12: '...KsKKSSSKKsK..', 13: '...KGGSSMSSGGK..' }),
  coolTalk: rows(MAGE_BASE, { 11: '...KKKKKSKKKKK..', 12: '...KsKKSSSKKsK..', 13: '...KGGSMMMSGGK..', 14: '...KGGGMMMGGGK..' }),
};
// sunglasses glint pixel (drawn on top of cool frames)
const GLINT = ['W'];

const FIREBALL = [
  [
    '.......RRRR..',
    '..R..RROOOOR.',
    '.R..RROOYYOOR',
    'RR.RROOYYWYOR',
    'RROOOOYYWWYOR',
    '.RR.RROOYYOOR',
    '..R..RROOOOR.',
    '.......RRRR..',
  ],
  [
    '.......RRRR..',
    'R...RRROOOOR.',
    '..RRROOOYYOOR',
    '.RROOOOYYWYOR',
    'RR.RROYYYWWYOR'.slice(0, 13),
    '..RRROOOYYOOR',
    'R...RRROOOOR.',
    '.......RRRR..',
  ],
];

const CHEST_LID = [
  '..KKKKKKKKKK..',
  '.KNNNNNNNNNNK.',
  'KNNNNNNNNNNNNK',
  'KYYYYYYYYYYYYK',
  'KnnnnnYYnnnnnK',
];
const CHEST_BODY = [
  'KKKKKKYYKKKKKK',
  'KNNNNKyyKNNNNK',
  'KNNNNNKKNNNNNK',
  'KYYYYYYYYYYYYK',
  'KNNNNNNNNNNNNK',
  'KnnnnnnnnnnnnK',
  'KKKKKKKKKKKKKK',
];
const CHEST_INSIDE = ['KDDDDDDDDDDDDK'];

const CHEST_ICON = [
  '.KKKKKKKK.',
  'KNNNNNNNNK',
  'KYYYYYYYYK',
  'KKKKYYKKKK',
  'KNNNKKNNNK',
  'KYYYYYYYYK',
  'KnnnnnnnnK',
  'KKKKKKKKKK',
];

const SCROLL = [
  'KKKKKK..',
  'KWWWWKK.',
  'KWttWKWK',
  'KWWWWWWK',
  'KWttttWK',
  'KWWWWWWK',
  'KWttttWK',
  'KWWWWWWK',
  'KKKKKKKK',
];

const HOURGLASS = [
  'KKKKKKK',
  'KTTTTTK',
  '.KYYYK.',
  '..KYK..',
  '...K...',
  '..KTK..',
  '.KTYTK.',
  'KTYYYTK',
  'KKKKKKK',
];

const BUTTON = (c, d) => [
  '....KKKKKK....',
  '..KKccccccKK..',
  '.KccLLccccccK.',
  '.KcLLccccccdK.',
  'KccLcccccccddK',
  'KcccccccccccdK',
  'KcccccccccccdK',
  'KcccccccccccdK',
  'KccccccccccddK',
  '.KccccccccddK.',
  '.KdcccccccddK.',
  '..KKddddddKK..',
  '....KKKKKK....',
].map((r) => r.replace(/c/g, c).replace(/d/g, d));

function spriteRects(map, pal = PAL) {
  const out = [];
  map.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') { x++; continue; }
      let w = 1;
      while (row[x + w] === ch) w++;
      out.push({ x, y, w, fill: pal[ch] || ch });
      x += w;
    }
  });
  return out;
}

// ---- v2 sprites
MAGE.nerd = rows(MAGE_BASE, { 11: '...KKWKKSKKWKK..', 12: '...KsKKSSSKKsK..' });
MAGE.nerdTalk = rows(MAGE_BASE, { 11: '...KKWKKSKKWKK..', 12: '...KsKKSSSKKsK..', 13: '...KGGSMMMSGGK..', 14: '...KGGGMMMGGGK..' });
MAGE.shock = rows(MAGE_BASE, { 11: '...KSWWSSSWWSK..', 12: '...KsWESSSEWsK..', 13: '...KGGSMMMSGGK..', 14: '...KGGGMMMGGGK..' });
MAGE.happy = rows(MAGE_BASE, { 11: '...KSKSKSKSKSK..', 12: '...KCSSSSSSSCK..' });
MAGE.puzzled = rows(MAGE_BASE, { 11: '...KSWESSSKKSK..', 13: '...KGGSSMMSGGK..' });
MAGE.dizzy = rows(MAGE_BASE, { 11: '...KSKSKSKSKSK..', 12: '...KsSKSSSKSsK..', 13: '...KGGSMMMSGGK..' });

const METEOR = [
  '.....KKKKK......',
  '...KKzzzzzKK....',
  '..KzzZZzzzzzK...',
  '.KzZZzzzzZzzzK..',
  '.KzzzzzZZzzzzK..',
  'KzzZzzzzzzzZzzK.',
  'KzzzzZZzzzzzzzK.',
  'KzZzzzzzzZZzzzK.',
  'KzzzzzzzzzzzzzK.',
  '.KzzZZzzzzzZzK..',
  '.KzzzzzzZzzzzK..',
  '..KzzzzzzzzzK...',
  '...KKzzzzzKK....',
  '.....KKKKK......',
];
const SHIELD = [
  'KKKKKKK',
  'KTTTTtK',
  'KTYYTtK',
  'KTYTTtK',
  'KTTTttK',
  '.KTTtK.',
  '..KtK..',
  '...K...',
];
const BUBBLE_Q = [
  '.KKKKKKK.',
  'KWWWWWWWK',
  'KWWKKKWWK',
  'KWWWWKWWK',
  'KWWWKKWWK',
  'KWWWWWWWK',
  'KWWWKWWWK',
  'KWWWWWWWK',
  '.KKKWKKK.',
  '...KWK...',
  '....K....',
];
const BUBBLE_X = [
  '.KKKKKKK.',
  'KWWWWWWWK',
  'KWWWAWWWK',
  'KWWWAWWWK',
  'KWWWAWWWK',
  'KWWWWWWWK',
  'KWWWAWWWK',
  'KWWWWWWWK',
  '.KKKWKKK.',
  '...KWK...',
  '....K....',
];
const HEART = [
  '.KK.KK.',
  'KCCKCCK',
  'KCWCCCK',
  'KCCCCCK',
  '.KCCCK.',
  '..KCK..',
  '...K...',
];
const SMOKE = [
  '..TTT...',
  '.TTTTT.T',
  'TTtTTTTT',
  '.TTTttT.',
  '..TT.T..',
];
const ORB = [
  ['.KK.', 'KOYK', 'KYOK', '.KK.'],
  ['..KK..', '.KRRK.', 'KROYRK', 'KRYWRK', '.KRRK.', '..KK..'],
  ['..KKKK..', '.KPPPPK.', 'KPCWWCPK', 'KPWWWWPK', 'KPWWWWPK', 'KPCWWCPK', '.KPPPPK.', '..KKKK..'],
];
// attachment rarity palettes for the chest (swap the wood)
const RARITY = {
  common:    { label: 'ITEM', color: '#ffffff', beam: 'rgba(255,255,255,.85)', pal: {} },
  rare:      { label: 'RARE ITEM', color: '#59d8ff', beam: 'rgba(89,216,255,.9)', pal: { N: '#7fa8c9', n: '#3e5f7d' } },
  epic:      { label: 'EPIC ITEM', color: '#c77dff', beam: 'rgba(199,125,255,.9)', pal: { N: '#8a4fd6', n: '#4f2690' } },
  legendary: { label: 'LEGENDARY!', color: '#ffd23f', beam: 'rgba(255,210,63,.95)', pal: { N: '#f2b33a', n: '#a8681a', Y: '#fff1a8' } },
};

// ---- v3: voice
// mage cups a hand to his ear (ear toward the mic on the right), eyes glance right
MAGE.listen = rows(MAGE_BASE, { 11: '...KSSWESSSWEK..', 13: '...KGGSSKSSGGK..' });
MAGE.listenBlink = rows(MAGE.listen, { 11: '...KSSKKSSSKKK..' });
// brass ear trumpet the mage holds to his ear, bell facing the mic
const HORN = [
  '.......KKK',
  '.....KKYLK',
  'KKKKKYYYLK',
  'KSYYYyyyYK',
  'KKKKKYyyYK',
  '.....KKyYK',
  '.......KKK',
];
const MIC_ICON = [
  '..KKKKK..',
  '.KGWGgGK.',
  '.KgGgGgK.',
  '.KGgGgGK.',
  '.KYYYYYK.',
  'K.KgggK.K',
  'KK.KKK.KK',
  '.KKKKKKK.',
  '....K....',
  '..KKKKK..',
];
const MIC_REC = MIC_ICON.map((r) => r.replace(/[Gg]/g, (c) => (c === 'G' ? 'A' : 'a')));
const NOTE = [
  '..KKKK',
  '..KYYK',
  '..KYKK',
  '..KK..',
  'KKKK..',
  'KYYK..',
  'KYYK..',
  'KKKK..',
];
const NOTE2 = [
  '..KKKKKK',
  '..KBBBBK',
  '..KKKKKK',
  '..K...K.',
  'KKKK.KKKK',
  'KBBKKKBBK',
  'KBBK.KBBK',
  'KKKK.KKKK',
];

// ---- v4: party (models as job classes) + MP (thinking effort)
// A job swaps the hat (rows 0-9) and recolours the beard/collar rows (13-15) of every mage frame,
// so all moods (talk, blink, listen, charge...) work for every class.
const JOBS = {
  mage: { label: 'MAGE' },
  sage: {
    label: 'SAGE',
    hat: [
      '.......KKK......',
      '......KWYWK.....',
      '......KWYWK.....',
      '.....KWWYWWK....',
      '.....KWYYYWK....',
      '.....KWWYWWK....',
      '....KWWWYWWWK...',
      '....KWWWYWWWgK..',
      '..KKYYYYYYYYYYKK',
      '.KyYYYYYYYYYYYYK',
    ],
    low: { G: 'W' },
  },
  knight: {
    label: 'KNIGHT',
    hat: [
      '..........KK....',
      '.........KRRK...',
      '........KRRK....',
      '......KKKRKKK...',
      '.....KTTTTTTTK..',
      '....KTTWTTTTTtK.',
      '....KTWTTTTTTtK.',
      '....KTTTTTTTTtK.',
      '...KTTTTTTTTTTtK',
      '..KtTTTTTTTTTTtK',
    ],
    rowsLow: { 13: { G: 'S' }, 14: { G: 's' }, 15: { G: 'T' } },
  },
  ninja: {
    label: 'NINJA',
    hat: [
      '................',
      '................',
      '......KKKKK.....',
      '.....KZZZZZK....',
      '....KZZZZZZZK...',
      '....KZZZZZZZZK..',
      '...KZZZZZZZZZK..',
      '...KZZZZZZZZZZK.',
      '..KKRRRRRRRRRRKK',
      '.KaRRRRRRRRRRRRK',
    ],
    low: { G: 'Z', S: 'z' },
  },
};
function jobMap(map, job) {
  const j = JOBS[job] || JOBS.mage;
  if (!j.hat && !j.low && !j.rowsLow) return map;
  return map.map((r, i) => {
    if (i < 10 && j.hat) return j.hat[i];
    const lo = j.rowsLow ? j.rowsLow[i] : i >= 13 ? j.low : null;
    return lo ? r.replace(/[A-Za-z]/g, (c) => lo[c] || c) : r;
  });
}
// headband tail for the ninja (drawn beside the portrait)
const TAIL = ['KK..', 'KRK.', '.KRK', '..KK'];
const ZZZ = ['KKKKK', '...K.', '..K..', '.K...', 'KKKKK'];
const BUTTON_MIC = BUTTON('B', 'b');
const BUTTON_REC = BUTTON('A', 'a');
// ---- end sprites


/*
  PixelDialog — an Agent Input that is a 16-bit RPG dialogue box.
  A little mage reads what you type, casts it as a fireball when you press A,
  drops a treasure chest when you attach a file, and has a Konami-code secret.
*/

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

function Sprite({ map, pal = PAL, className, style, title }) {
  const rects = useMemo(() => spriteRects(map, pal), [map, pal]);
  const w = Math.max(...map.map((r) => r.length)), h = map.length;
  return (
    <svg className={className} style={{ '--sw': w, '--sh': h, ...style }} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />)}
    </svg>
  );
}

// ---- rules: what you type decides the spell
export function estimateTokens(text) {
  if (!text) return 0;
  const cjk = (text.match(/[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/g) || []).length;
  const rest = text.length - cjk;
  return cjk + Math.ceil(rest / 4);
}
const SPELLS = ['FIRE', 'FIRA', 'FIRAGA'];
export function spellTier(tokens, tiers = [12, 60]) { return tokens <= tiers[0] ? 0 : tokens <= tiers[1] ? 1 : 2; }
const TIMING = [{ charge: 170, fly: 430, boom: 420 }, { charge: 260, fly: 620, boom: 460 }, { charge: 480, fly: 430, boom: 700 }];
const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };
export function rarityOf(name = '') {
  const ext = (String(name).split('.').pop() || '').toLowerCase();
  if (/^(zip|rar|7z|tar|gz|tgz|bz2|xz)$/.test(ext)) return 'legendary';
  if (/^(pdf|doc|docx|key|ppt|pptx|xls|xlsx|fig|psd)$/.test(ext)) return 'epic';
  if (/^(png|jpe?g|gif|webp|svg|heic|avif|bmp|mp4|mov|webm|mp3|wav)$/.test(ext)) return 'rare';
  return 'common';
}
export function moodOf(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const codey = /```/.test(text) || lines.filter((l) => /[{};]\s*$|^\s*(const|let|function|def|import|return|class)\b|=>/.test(l)).length >= 2;
  if (codey) return 'code';
  const t = text.trimEnd();
  if (/[!！]$/.test(t)) return 'shout';
  if (/[?？]$/.test(t)) return 'ask';
  if (/\b(please|pls|thanks|thank you|thx|ty)\b|谢谢|请|拜托|感谢/i.test(text)) return 'nice';
  return null;
}

// party: each model is a job class (hat + beard colour on the same little face)
export const DEFAULT_MODELS = [
  { id: 'claude-opus', name: 'OPUS', job: 'sage' },
  { id: 'claude-sonnet', name: 'SONNET', job: 'mage' },
  { id: 'gpt', name: 'GPT', job: 'knight' },
  { id: 'deepseek', name: 'DEEPSEEK', job: 'ninja' },
];
// thinking effort is MP: more effort spends more MP and the spell charges longer
export const DEFAULT_EFFORTS = [
  { id: 'low', label: 'LOW' }, { id: 'medium', label: 'MED' }, { id: 'high', label: 'HIGH' }, { id: 'max', label: 'MAX' },
];
const EFFORT_K = [0.7, 1, 1.4, 1.9];
const A_MAP = BUTTON('A', 'a');
const B_MAP = BUTTON('T', 't');

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---- 8-bit SFX (opt-in): the showcase video's chiptune sounds as tiny embedded samples,
// with oscillator bleeps as a fallback while they decode (or where decoding is unavailable)
let AC = null, OUT = null;
const BUFS = {};
function ctx() {
  if (typeof window === 'undefined') return null;
  if (AC) return AC;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    OUT = AC.createGain(); OUT.gain.value = 0.8; OUT.connect(AC.destination);
    for (const [k, url] of Object.entries(SFX_DATA)) {
      fetch(url).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => AC.decodeAudioData(ab, res, rej))).then((buf) => { BUFS[k] = buf; }).catch(() => {});
    }
  } catch (_) { AC = null; }
  return AC;
}
function play(k, at = 0, rate = 1) {
  const c = ctx(); if (!c || !BUFS[k]) return false;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const src = c.createBufferSource(); src.buffer = BUFS[k]; src.playbackRate.value = rate;
  src.connect(OUT); src.start(c.currentTime + Math.max(0, at)); return true;
}
function tone(seq) {
  const c = ctx(); if (!c) return;
  try {
    let t = c.currentTime;
    for (const [f, d, type = 'square', vol = 0.05, f2] of seq) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.9;
    }
  } catch (_) { /* audio unavailable */ }
}
const BLEEP = {
  type: () => tone([[1320 + Math.random() * 200, 0.025, 'square', 0.025]]),
  send: () => tone([[220, 0.08, 'square', 0.05, 440], [440, 0.22, 'sawtooth', 0.05, 1600]]),
  chest: () => tone([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.2]]),
  clear: () => tone([[600, 0.25, 'square', 0.04, 80]]),
  fizzle: () => tone([[300, 0.06, 'square', 0.04, 200], [160, 0.18, 'triangle', 0.05, 90]]),
  meteor: () => tone([[1400, 0.4, 'sawtooth', 0.04, 120], [60, 0.4, 'square', 0.07, 30]]),
  party: () => tone([[523, 0.06], [784, 0.06], [1047, 0.12]]),
  mpup: () => tone([[660, 0.05, 'square', 0.04], [990, 0.07, 'square', 0.04]]),
  mpdown: () => tone([[660, 0.05, 'square', 0.04], [440, 0.07, 'square', 0.04]]),
  listen: () => tone([[880, 0.06, 'square', 0.04], [1320, 0.1, 'square', 0.04]]),
  heard: () => tone([[1320, 0.06, 'square', 0.04], [988, 0.06, 'square', 0.04], [1568, 0.14, 'square', 0.04]]),
  konami: () => tone([[784, 0.07], [988, 0.07], [1175, 0.07], [1568, 0.07], [1175, 0.07], [1568, 0.3]]),
};

let TYPE_N = 0;
const SFX = {
  warm: () => { ctx(); },
  type: () => { TYPE_N = (TYPE_N + 1) % 3; play('type' + TYPE_N) || BLEEP.type(); },
  menu: () => { play('menu') || BLEEP.type(); },
  // a spell: charge (stretched to the effort's charge time), flight, impact, timed to the cast's phases
  cast: ({ tier, charge, fly }) => {
    const base = [170, 260, 480][tier];
    if (!play('charge' + tier, 0, Math.min(2, Math.max(0.5, base / charge)))) { (tier === 2 ? BLEEP.meteor : BLEEP.send)(); return; }
    play('fly' + tier, charge / 1000); play(tier === 2 ? 'boom2' : 'boom', (charge + fly) / 1000);
  },
  mp: (n) => { play('mp' + Math.min(3, Math.max(0, n))) || BLEEP.mpup(); },
};
for (const k of ['chest', 'clear', 'fizzle', 'party', 'listen', 'heard', 'konami']) SFX[k] = () => { play(k) || BLEEP[k](); };
SFX.send = () => SFX.cast({ tier: 0, charge: 170, fly: 430 });
SFX.meteor = () => SFX.cast({ tier: 2, charge: 480, fly: 430 });
SFX.mpup = BLEEP.mpup; SFX.mpdown = BLEEP.mpdown;

const PixelDialog = forwardRef(function PixelDialog(props, ref) {
  const {
    value: valueProp, defaultValue = '', onChange, onSend, onClear, onAttach,
    name = 'AGENT', placeholder = 'PRESS START', busy = false, disabled = false,
    models = DEFAULT_MODELS, model: modelProp, defaultModel, onModelChange,
    efforts = DEFAULT_EFFORTS, effort: effortProp, defaultEffort = 'medium', onEffortChange,
    size = 'md', sound = false, spellTiers = [12, 60], voice = true, lang, onListen, accept, maxRows = 4, className = '', ariaLabel = 'Message the agent',
  } = props;
  const controlled = valueProp !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const value = controlled ? valueProp : inner;
  const [files, setFiles] = useState([]);
  const [focused, setFocused] = useState(false);
  const [talk, setTalk] = useState(false);
  const [blink, setBlink] = useState(false);
  const [pop, setPop] = useState(-1);          // index of the newest char
  const [cast, setCast] = useState(null);      // {text, id} while the fireball flies
  const [charge, setCharge] = useState(false);
  const [pressA, setPressA] = useState(false);
  const [pressB, setPressB] = useState(false);
  const [shatter, setShatter] = useState(null); // {text, id, phase}
  const [chest, setChest] = useState(null);     // {name, id}
  const [shaking, setShaking] = useState(false);
  const shakeT = useRef(null);
  const setShake = () => { setShaking(false); clearTimeout(shakeT.current); later(() => setShaking(true), 0); shakeT.current = later(() => setShaking(false), 300); };
  const [gold, setGold] = useState(false);
  const [banner, setBanner] = useState(null);
  const [announce, setAnnounce] = useState('');
  const [toast, setToast] = useState(null);     // {text, id}
  const [smoke, setSmoke] = useState(0);
  const taRef = useRef(null), mirrorRef = useRef(null), fileRef = useRef(null), rootRef = useRef(null);
  const timers = useRef(new Set());
  const konami = useRef([]);
  const idc = useRef(0);
  const later = useCallback((fn, ms) => { const t = setTimeout(() => { timers.current.delete(t); fn(); }, ms); timers.current.add(t); return t; }, []);
  useEffect(() => () => { for (const t of timers.current) clearTimeout(t); }, []);
  const sfx = (k, arg) => { if (sound) SFX[k](arg); };
  useEffect(() => {   // decode the samples once the user gets near, so the first keystroke already plays the real sound
    const el = rootRef.current; if (!sound || !el) return;
    const evs = ['pointerenter', 'pointerdown', 'focusin'];
    evs.forEach((e) => el.addEventListener(e, SFX.warm, { once: true, passive: true }));
    return () => evs.forEach((e) => el.removeEventListener(e, SFX.warm));
  }, [sound]);

  const setValue = (v) => { if (!controlled) setInner(v); onChange && onChange(v); };

  // ---- party (model) + MP (effort)
  const party = Array.isArray(models) && models.length ? models : null;
  const [innerModel, setInnerModel] = useState(defaultModel || (party ? (party.find((m) => m.id === 'claude-sonnet') || party[0]).id : null));
  const modelId = modelProp !== undefined ? modelProp : innerModel;
  const cur = party ? party.find((m) => m.id === modelId) || party[0] : null;
  const job = cur ? cur.job || 'mage' : 'mage';
  const [menu, setMenu] = useState(false);
  const [joined, setJoined] = useState(0);
  const menuRef = useRef(null);
  const pickModel = useCallback((mid, focusBack = true) => {
    setMenu(false);
    const m = party && party.find((x) => x.id === mid);
    if (!m) return;
    if (focusBack) later(() => taRef.current && taRef.current.focus(), 0);
    if (m.id === (cur && cur.id)) return;
    if (modelProp === undefined) setInnerModel(m.id);
    onModelChange && onModelChange(m.id, m);
    sfx('party');
    const id = ++idc.current; setJoined(id); later(() => setJoined((x) => (x === id ? 0 : x)), 1300);
    if (!valueRef.current) { setToast({ text: `${m.name} joined the party!`, id }); later(() => setToast((t) => (t && t.id === id ? null : t)), 1500); }
    setAnnounce(`${m.name} selected`);
  }, [party, cur, modelProp, onModelChange, later, sound]);
  useEffect(() => {
    if (!menu) return;
    const el = menuRef.current; const on = el && el.querySelector('[aria-selected="true"]'); on && on.focus();
    const away = (e) => { const r = rootRef.current; const path = e.composedPath ? e.composedPath() : [e.target]; if (r && !path.includes(r)) setMenu(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [menu]);
  const onMenuKey = (e) => {
    const items = [...menuRef.current.querySelectorAll('[role="option"]')];
    const root = rootRef.current && rootRef.current.getRootNode ? rootRef.current.getRootNode() : document;
    const i = items.indexOf(root.activeElement || document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]; n && n.focus(); sfx('type'); }
    else if (e.key === 'Escape') { e.preventDefault(); setMenu(false); taRef.current && taRef.current.focus(); }
  };
  const efs = Array.isArray(efforts) && efforts.length ? efforts : null;
  const [innerEffort, setInnerEffort] = useState(defaultEffort);
  const effortId = effortProp !== undefined ? effortProp : innerEffort;
  const ei = efs ? Math.max(0, efs.findIndex((x) => x.id === effortId)) : 1;
  const effortRef = useRef(ei); effortRef.current = ei;
  const [mp, setMp] = useState(null);   // {id, phase: 'spend'|'refill', cost}
  const pickEffort = useCallback((i) => {
    if (!efs) return;
    const n = Math.max(0, Math.min(efs.length - 1, i));
    if (n === effortRef.current) return;
    if (effortProp === undefined) setInnerEffort(efs[n].id);
    onEffortChange && onEffortChange(efs[n].id, efs[n]);
    sfx('mp', n);
    setAnnounce(`Thinking effort ${efs[n].label}`);
  }, [efs, effortProp, onEffortChange, sound]);

  // ---- voice: hold the mic, the mage cups his ear, your voice floats in as notes
  const [listen, setListen] = useState(null);   // {id}
  const [level, setLevel] = useState(0);
  const [notes, setNotes] = useState([]);       // [{id, y, k}]
  const vr = useRef({});                          // recognition, stream, raf, base
  const valueRef = useRef(value); valueRef.current = value;
  const levelRef = useRef(0);
  const noteLoop = useCallback((id) => {
    const tick = () => {
      if (vr.current.id !== id) return;
      const lv = levelRef.current;
      if (lv > 0.08) {
        const nid = ++idc.current;
        setNotes((n) => [...n.slice(-7), { id: nid, y: Math.round(lv * 10), k: nid % 2 }]);
        later(() => setNotes((n) => n.filter((x) => x.id !== nid)), 1100);
      }
      vr.current.nt = later(tick, 170 - Math.round(lv * 60));
    };
    tick();
  }, [later]);
  const pushLevel = (lv) => { levelRef.current = lv; setLevel((p) => (Math.abs(p - lv) > 0.06 ? lv : p)); };
  const heard = (text) => {
    const base = vr.current.base || '';
    const sep = base && text && !/\s$/.test(base) ? ' ' : '';
    const v = base + sep + text;
    if (v === valueRef.current) return;
    setValue(v); setPop([...v].length - 1);
    setTalk(true); clearTimeout(talkT.current); talkT.current = later(() => setTalk(false), 200);
  };
  const stopListening = useCallback(() => {
    const st = vr.current; if (!st.id) return;
    vr.current = {};
    try { st.rec && st.rec.stop(); } catch (_) {}
    if (st.stream) st.stream.getTracks().forEach((t) => t.stop());
    if (st.raf) cancelAnimationFrame(st.raf);
    clearTimeout(st.nt); clearInterval(st.sim);
    pushLevel(0); setListen(null); setNotes([]);
    sfx('heard');
    onListen && onListen(false);
    setAnnounce('Stopped listening');
    taRef.current && taRef.current.focus();
  }, [onListen, sound]);
  const startListening = useCallback(() => {
    if (disabled || busy || cast || vr.current.id) return;
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      const id = ++idc.current;
      setToast({ text: 'You have not learned this spell yet.', id }); later(() => setToast((t) => (t && t.id === id ? null : t)), 1900);
      sfx('fizzle'); return;
    }
    const id = ++idc.current;
    vr.current = { id, base: valueRef.current };
    const rec = new SR(); rec.continuous = true; rec.interimResults = true; if (lang) rec.lang = lang;
    rec.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; heard(t.trim()); if (!vr.current.stream) { pushLevel(0.7); later(() => pushLevel(0.25), 160); } };
    rec.onend = () => { if (vr.current.id === id) stopListening(); };
    rec.onerror = () => { if (vr.current.id === id) stopListening(); };
    vr.current.rec = rec;
    try { rec.start(); } catch (_) { vr.current = {}; return; }
    // mic level for the floating notes (optional; falls back to result pulses)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        if (vr.current.id !== id) { stream.getTracks().forEach((t) => t.stop()); return; }
        AC = AC || new (window.AudioContext || window.webkitAudioContext)();
        const an = AC.createAnalyser(); an.fftSize = 512; AC.createMediaStreamSource(stream).connect(an);
        const buf = new Uint8Array(an.fftSize); vr.current.stream = stream;
        const loop = () => { if (vr.current.id !== id) return; an.getByteTimeDomainData(buf); let s = 0; for (const b of buf) s += (b - 128) ** 2; pushLevel(Math.min(1, Math.sqrt(s / buf.length) / 28)); vr.current.raf = requestAnimationFrame(loop); };
        loop();
      }).catch(() => {});
    }
    setListen({ id }); sfx('listen'); noteLoop(id);
    onListen && onListen(true);
    setAnnounce('Listening');
  }, [disabled, busy, cast, lang, onListen, noteLoop, stopListening, later, sound]);
  // deterministic voice for demos and recordings: types `text` in as if spoken over `ms`
  const simulateVoice = useCallback((text, ms = 2200) => {
    if (vr.current.id) return;
    const id = ++idc.current; vr.current = { id, base: valueRef.current };
    setListen({ id }); sfx('listen'); noteLoop(id);
    const words = text.split(/(\s+)/); let i = 0, k = 0;
    const step = ms / Math.max(1, words.length);
    vr.current.sim = setInterval(() => {
      if (vr.current.id !== id) return;
      k++; pushLevel(0.35 + 0.6 * Math.abs(Math.sin(k * 1.7)));
      if (k % 2 === 0 && i < words.length) { i += 2; heard(words.slice(0, i).join('').trim()); }
      if (i >= words.length && k % 2 === 1) { later(() => { if (vr.current.id === id) stopListening(); }, 380); clearInterval(vr.current.sim); pushLevel(0.1); }
    }, step / 2);
  }, [noteLoop, stopListening, later, sound]);
  useEffect(() => () => { const st = vr.current; try { st.rec && st.rec.abort(); } catch (_) {} if (st.stream) st.stream.getTracks().forEach((t) => t.stop()); clearInterval(st.sim); }, []);


  // idle blink
  useEffect(() => {
    let t;
    const loop = () => { t = later(() => { setBlink(true); later(() => setBlink(false), 130); loop(); }, 2600 + ((idc.current * 977) % 1400)); };
    loop();
    return () => clearTimeout(t);
  }, [later]);

  // auto-grow the textarea (rows) by measuring the mirror
  const [rowsN, setRowsN] = useState(1);
  const castOn = !!cast;
  useEffect(() => {
    const m = mirrorRef.current; if (!m || castOn) return;
    const lh = parseFloat(getComputedStyle(m).lineHeight) || 20;
    m.style.bottom = 'auto'; m.style.height = 'auto';
    const h = m.offsetHeight;
    m.style.bottom = ''; m.style.height = '';
    const n = Math.max(1, Math.min(maxRows, Math.round(h / lh)));
    setRowsN(n);
  }, [value, maxRows, size, castOn]);

  const talkT = useRef(null);
  const onInput = (e) => {
    const v = e.target.value;
    const grew = v.length > value.length;
    setValue(v);
    if (grew) {
      setPop(Math.max(0, (e.target.selectionStart || v.length) - 1));
      setTalk(true); clearTimeout(talkT.current); talkT.current = later(() => setTalk(false), 260);
      sfx('type');
    }
  };

  const send = useCallback(() => {
    if (vr.current.id) stopListening();
    const text = valueRef.current;
    if (disabled || busy || cast) return;
    if (!text.trim() && files.length === 0) {
      // nothing to cast: the mage swings, a puff of smoke, the classic line
      const id = ++idc.current;
      setPressA(true); later(() => setPressA(false), 140);
      setCharge(true); later(() => setCharge(false), 180);
      setSmoke(id); later(() => setSmoke((x) => (x === id ? 0 : x)), 700);
      setToast({ text: 'But nothing happened...', id }); later(() => setToast((t) => (t && t.id === id ? null : t)), 1700);
      sfx('fizzle');
      return;
    }
    const id = ++idc.current;
    const tokens = estimateTokens(text), tier = spellTier(tokens, spellTiers), T0 = TIMING[tier];
    const ek = EFFORT_K[Math.min(3, effortRef.current)] || 1;
    const T = { ...T0, charge: Math.round(T0.charge * ek) };
    if (efs) { setMp({ id, phase: 'spend', cost: effortRef.current + 1 }); later(() => setMp((m) => (m && m.id === id ? { ...m, phase: 'refill' } : m)), T.charge + T.fly + T.boom); later(() => setMp((m) => (m && m.id === id ? null : m)), T.charge + T.fly + T.boom + 520); }
    onSend && onSend(text, files.map((f) => f.file || f));
    setPressA(true); later(() => setPressA(false), 140);
    sfx('cast', { tier, charge: T.charge, fly: T.fly });
    if (reducedMotion()) { setValue(''); setFiles([]); setAnnounce('Message sent'); return; }
    setCharge(true);
    setCast({ text, id, files: files.length, phase: 'charge', tier, tokens, effort: effortRef.current });
    setValue(''); setFiles([]);
    later(() => { setCharge(false); setCast((c) => (c && c.id === id ? { ...c, phase: 'fly' } : c)); }, T.charge);
    later(() => { if (tier === 2) setShake(); setCast((c) => (c && c.id === id ? { ...c, phase: 'boom' } : c)); }, T.charge + T.fly);
    later(() => setCast((c) => (c && c.id === id ? null : c)), T.charge + T.fly + T.boom + 500);
    setAnnounce('Message sent');
  }, [value, files, disabled, busy, cast, onSend, later]);

  const clear = useCallback(() => {
    if (!value && files.length === 0) return;
    const text = value; const id = ++idc.current;
    onClear && onClear();
    setPressB(true); later(() => setPressB(false), 140);
    sfx('clear');
    setValue(''); setFiles([]);
    if (reducedMotion()) return;
    setShatter({ text, id, phase: 'blink' });
    later(() => setShatter((s) => (s && s.id === id ? { ...s, phase: 'burst' } : s)), 420);
    later(() => setShatter((s) => (s && s.id === id ? null : s)), 420 + 760);
    later(() => setToast({ text: 'Got away safely!', id }), 420 + 560);
    later(() => setToast((t) => (t && t.id === id ? null : t)), 420 + 560 + 1300);
    taRef.current && taRef.current.focus();
  }, [value, files, onClear, later]);

  const addFiles = useCallback((list) => {
    const arr = [...list].map((f) => { const name = f.name || String(f); return { name, file: f, id: ++idc.current, rarity: rarityOf(name) }; });
    if (!arr.length) return;
    onAttach && onAttach(arr.map((a) => a.file));
    const first = arr[0];
    setAnnounce(`Got item: ${arr.map((a) => a.name).join(', ')}`);
    if (reducedMotion()) { setFiles((f) => [...f, ...arr]); return; }
    sfx('chest');
    const best = arr.reduce((a, b) => (RANK[b.rarity] > RANK[a.rarity] ? b : a), arr[0]);
    setChest({ name: arr.length > 1 ? `${best.name} +${arr.length - 1}` : best.name, id: first.id, phase: 'drop', rarity: best.rarity });
    later(() => { setShake(); setChest((c) => (c && c.id === first.id ? { ...c, phase: 'land' } : c)); }, 380);
    later(() => setChest((c) => (c && c.id === first.id ? { ...c, phase: 'open' } : c)), 560);
    later(() => { setChest((c) => (c && c.id === first.id ? { ...c, phase: 'stow' } : c)); setFiles((f) => [...f, ...arr]); }, 1700);
    later(() => setChest((c) => (c && c.id === first.id ? null : c)), 2050);
  }, [onAttach, later, sound]);

  const toggleGold = useCallback(() => {
    setGold((g) => !g);
    sfx('konami');
    setBanner({ id: ++idc.current });
    later(() => setBanner(null), 1600);
  }, [later, sound]);

  useImperativeHandle(ref, () => ({
    send, clear, focus: () => taRef.current && taRef.current.focus(),
    attach: (list) => addFiles(Array.isArray(list) ? list : [list]),
    konami: toggleGold,
    listen: startListening, stopListening, simulateVoice,
    setModel: (id) => pickModel(id, false), openParty: () => setMenu(true), setEffort: (id) => efs && pickEffort(efs.findIndex((x) => x.id === id)),
    get value() { return value; },
  }), [send, clear, addFiles, toggleGold, value, startListening, stopListening, simulateVoice, pickModel, pickEffort, efs]);

  const onKeyDown = (e) => {
    // Konami sequence (works while the box has focus)
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const seq = [...konami.current, k].slice(-KONAMI.length);
    konami.current = seq;
    if (seq.length === KONAMI.length && seq.every((x, i) => x === KONAMI[i])) {
      e.preventDefault(); konami.current = [];
      if (value.endsWith('b') || value.endsWith('B')) setValue(value.slice(0, -1));
      toggleGold(); return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
    else if (e.key === 'Escape') { e.preventDefault(); clear(); }
  };

  const onPaste = (e) => { if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length) { e.preventDefault(); addFiles(e.clipboardData.files); } };
  const onDrop = (e) => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); addFiles(e.dataTransfer.files); } };

  const mood = busy || cast || listen ? null : moodOf(value);
  const dozing = efs && ei === 0 && !value && !cast && !busy && !listen && !focused && !mood;
  const limit = efs && ei === efs.length - 1;
  const tokens = estimateTokens(value);
  const tier = spellTier(tokens, spellTiers);
  const mageMap = listen ? (blink ? MAGE.listenBlink : MAGE.listen)
    : gold ? (talk ? MAGE.coolTalk : MAGE.cool)
    : charge ? MAGE.charge
    : busy ? (blink ? MAGE.blink : MAGE.idle)
    : mood === 'code' ? (talk ? MAGE.nerdTalk : MAGE.nerd)
    : mood === 'shout' ? MAGE.shock
    : mood === 'ask' ? MAGE.puzzled
    : mood === 'nice' ? MAGE.happy
    : talk ? MAGE.talk : blink || dozing ? MAGE.blink : MAGE.idle;
  const faceMap = jobMap(mageMap, job);
  const empty = !value;
  const chars = [...value];
  const showPh = empty && !cast && !shatter && !busy && !toast && !listen;
  const cls = ['pd', `pd-${size === 'lg' ? 'lg' : 'md'}`, 'pd-job-' + job, limit && 'pd-limit', menu && 'pd-menu-open', gold && 'pd-gold', focused && 'pd-focus', busy && 'pd-busy', listen && 'pd-listening', disabled && 'pd-disabled', className].filter(Boolean).join(' ');

  const chestPal = useMemo(() => ({ ...PAL, ...(chest ? RARITY[chest.rarity].pal : {}) }), [chest && chest.rarity]);
  return (
    <div ref={rootRef} className={cls} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <div className={'pd-frame' + (shaking ? ' pd-shaking' : '')}>
        {party ? (
          <button type="button" className="pd-plate pd-plate-btn" aria-haspopup="listbox" aria-expanded={menu} aria-label={`Model: ${cur.name}. Change party member`} disabled={disabled}
            onClick={() => { setMenu((o) => !o); sfx(menu ? 'type' : 'menu'); }}>{cur.name}<span className="pd-caret" aria-hidden="true">▾</span></button>
        ) : <span className="pd-plate" aria-hidden="true">{name}</span>}
        {menu && party ? (
          <div className="pd-menu" ref={menuRef} role="listbox" aria-label="Party" onKeyDown={onMenuKey}>
            <span className="pd-menu-title" aria-hidden="true">PARTY</span>
            {party.map((m) => (
              <button type="button" role="option" aria-selected={m.id === cur.id} key={m.id} className={'pd-member' + (m.id === cur.id ? ' pd-member-on' : '')} onClick={() => pickModel(m.id)}>
                <span className="pd-hand" aria-hidden="true">▶</span>
                <span className="pd-member-face"><Sprite map={jobMap(MAGE.idle, m.job || 'mage')} /></span>
                <span className="pd-member-name">{m.name}</span>
                <span className="pd-member-job">{(JOBS[m.job] || JOBS.mage).label}</span>
              </button>
            ))}
          </div>
        ) : null}
        {efs ? (
          <div className={'pd-mp' + (mp ? ' pd-mp-' + mp.phase : '')} role="slider" tabIndex={disabled ? -1 : 0} aria-label="Thinking effort" aria-valuemin={0} aria-valuemax={efs.length - 1} aria-valuenow={ei} aria-valuetext={efs[ei].label}
            onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); pickEffort(ei + 1); } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); pickEffort(ei - 1); } else if (e.key === 'Home') pickEffort(0); else if (e.key === 'End') pickEffort(efs.length - 1); }}>
            <span className="pd-mp-l" aria-hidden="true">MP</span>
            <span className="pd-pips">
              {efs.map((x, i) => (
                <button type="button" tabIndex={-1} key={x.id} aria-label={x.label} disabled={disabled}
                  className={'pd-pip' + (i <= ei ? ' on' : '') + (mp && mp.phase === 'spend' && i <= ei ? ' spend' : '')} style={{ '--k': ei - i }}
                  onClick={() => pickEffort(i === ei && i > 0 ? i - 1 : i)} />
              ))}
            </span>
            <span className="pd-mp-v" aria-hidden="true">{efs[ei].label}</span>
            {mp && mp.phase === 'spend' ? <span className="pd-mp-cost" key={mp.id} aria-hidden="true">-{mp.cost * 25} MP</span> : null}
          </div>
        ) : null}
        {listen ? <span className="pd-tag pd-tag-listen" aria-hidden="true">LISTEN<span className="pd-vu">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={level * 5 > i + 0.3 ? 'on' : ''} />)}</span></span>
          : busy ? <span className="pd-tag pd-tag-enemy" aria-hidden="true">ENEMY TURN</span>
          : value && !cast && !listen ? <span className={'pd-tag pd-tag-t' + tier} aria-hidden="true">{SPELLS[tier]}<b>{tokens}</b></span> : null}
        <i className="pd-rivet pd-r1" /><i className="pd-rivet pd-r2" /><i className="pd-rivet pd-r3" /><i className="pd-rivet pd-r4" />
        <div className={'pd-portrait' + (charge ? ' pd-charging' : '')}>
          <Sprite map={faceMap} className="pd-mage" key={'m' + job + (joined ? joined : '')} />
          {job === 'ninja' ? <span className="pd-tail"><Sprite map={TAIL} /></span> : null}
          {dozing ? <span className="pd-zzz"><Sprite map={ZZZ} /><Sprite map={ZZZ} /></span> : null}
          {limit && !cast && !busy ? <i className="pd-limit-aura" /> : null}
          {joined ? <span className="pd-joined" key={'j' + joined}>✦</span> : null}
          {gold ? <i className="pd-glint" /> : null}
          {charge ? <><i className="pd-aura" /><i className="pd-aura pd-aura2" /></> : null}
          {value && !cast && !busy && !listen ? <span className={'pd-orb pd-orb' + tier} key={'o' + tier}><Sprite map={ORB[tier]} /></span> : null}
          {cast && cast.phase === 'charge' ? <span className={'pd-orb pd-orb' + cast.tier + ' pd-orb-go'}><Sprite map={ORB[cast.tier]} /></span> : null}
          {listen ? <span className="pd-horn"><Sprite map={HORN} /></span> : null}
          {busy ? <span className="pd-shield"><Sprite map={SHIELD} /></span> : null}
          {mood === 'ask' ? <span className="pd-mood pd-mood-q" key="q"><Sprite map={BUBBLE_Q} /></span> : null}
          {mood === 'shout' ? <span className="pd-mood pd-mood-x" key="x"><Sprite map={BUBBLE_X} /></span> : null}
          {mood === 'nice' ? <span className="pd-hearts" key="h"><Sprite map={HEART} /><Sprite map={HEART} /><Sprite map={HEART} /></span> : null}
          {smoke ? <span className="pd-smoke" key={'sm' + smoke}><Sprite map={SMOKE} /><Sprite map={SMOKE} /></span> : null}
        </div>

        <div className="pd-body">
          {files.length ? (
            <div className="pd-items">
              {files.map((f) => (
                <span className={'pd-item pd-rar-' + f.rarity} key={f.id}>
                  <Sprite map={SCROLL} className="pd-scroll" />
                  <span className="pd-item-name">{f.name}</span>
                  <button type="button" className="pd-item-x" aria-label={`Remove ${f.name}`} onClick={() => setFiles((l) => l.filter((x) => x.id !== f.id))}>×</button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="pd-field" style={{ '--rows': rowsN }}>
            <span className="pd-cue" aria-hidden="true">▶</span>
            <div className="pd-mirror" ref={mirrorRef} aria-hidden="true">
              {chars.map((c, i) => <span key={i + ':' + c} className={i === pop ? 'pd-ch pd-pop' : 'pd-ch'}>{c}</span>)}
              <span className="pd-ch">{'\u200b'}</span>
            </div>
            <textarea
              ref={taRef} className="pd-input" rows={rowsN} value={value} disabled={disabled}
              aria-label={ariaLabel} spellCheck={false}
              onChange={onInput} onKeyDown={onKeyDown} onPaste={onPaste}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            />
            {showPh ? <span className={'pd-ph' + (focused ? ' pd-ph-focus' : '')} aria-hidden="true">{placeholder}</span> : null}
            {toast && !value ? <span className="pd-toast" key={toast.id} aria-hidden="true">{toast.text}</span> : null}
            {busy ? (
              <span className="pd-wait" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
            ) : null}
            {cast ? (
              <div className={'pd-cast pd-st-' + cast.phase + ' pd-t' + cast.tier} aria-hidden="true">
                <div className="pd-cast-text">
                  {(() => { const n = [...cast.text].length; let i = 0; return cast.text.split(/(\s+)/).map((w, k) => (
                    <span key={k} className="pd-word">{[...w].map((c) => { const j = i++; return (
                      <span key={j} className="pd-sw" style={{ '--i': j, '--n': n, '--r': ((j * 37) % 9) - 4, '--u': ((j * 53) % 7) }}>{c}</span>
                    ); })}</span>
                  )); })()}
                </div>
                {gold ? <i className="pd-beam" /> : cast.tier === 2 ? (
                  <span className="pd-meteor"><i className="pd-trail" /><Sprite map={METEOR} className="pd-rock" /><span className="pd-meteor-fire"><Sprite map={FIREBALL[0]} /></span></span>
                ) : (
                  <span className="pd-fireball"><Sprite map={FIREBALL[0]} className="pd-fb pd-fb0" /><Sprite map={FIREBALL[1]} className="pd-fb pd-fb1" /></span>
                )}
                {cast.phase !== 'boom' ? <span className="pd-callout">{gold ? 'ULTIMA' : SPELLS[cast.tier]}!</span> : null}
                {cast.phase === 'boom' ? <span className="pd-dmg">{cast.tier === 2 ? <em>CRITICAL!</em> : null}-{cast.tokens}</span> : null}
                {cast.phase === 'boom' && cast.tier === 2 ? <i className="pd-flash" /> : null}
                {cast.phase === 'boom' ? (
                  <span className="pd-boom">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--a': i * 36 + 'deg', '--d': 0.6 + (i % 3) * 0.25 }} />)}</span>
                ) : null}
              </div>
            ) : null}
            {shatter ? (
              <div className={'pd-shatter pd-st-' + shatter.phase} aria-hidden="true">
                {[...shatter.text].slice(0, 80).map((c, i) => (
                  <span key={i} className="pd-sh" style={{ '--i': i }}>
                    <span className="pd-sh-c">{c}</span>
                    {shatter.phase === 'burst' && c.trim() ? [0, 1, 2].map((j) => (
                      <i key={j} style={{ '--vx': (((i * 7 + j * 13) % 11) - 5) * 1.6, '--vy': -2 - ((i + j * 5) % 5), '--j': j }} />
                    )) : null}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="pd-pad">
          <button type="button" className="pd-chestbtn" aria-label="Attach file" disabled={disabled} onClick={() => fileRef.current && fileRef.current.click()}>
            <Sprite map={CHEST_ICON} className="pd-chesticon" />
          </button>
          {voice ? (
            <button type="button" className={'pd-btn pd-micbtn' + (listen ? ' pd-rec' : '')} aria-label={listen ? 'Stop voice input' : 'Voice input'} aria-pressed={!!listen} disabled={disabled || busy}
              onClick={() => (listen ? stopListening() : startListening())}>
              <Sprite map={listen ? BUTTON_REC : BUTTON_MIC} className="pd-btn-art" />
              <span className="pd-micglyph"><Sprite map={HORN} /></span>
            </button>
          ) : null}
          <button type="button" className={'pd-btn pd-b' + (pressB ? ' pd-down' : '')} aria-label="Clear" disabled={disabled} onClick={clear}>
            <Sprite map={B_MAP} className="pd-btn-art" /><span className="pd-btn-l">B</span>
          </button>
          <button type="button" className={'pd-btn pd-a' + (pressA ? ' pd-down' : '')} aria-label="Send" disabled={disabled || busy} onClick={send}>
            {busy ? (
              <Sprite map={HOURGLASS} className="pd-hourglass" />
            ) : (<><Sprite map={A_MAP} className="pd-btn-art" /><span className="pd-btn-l">A</span></>)}
          </button>
        </div>

        {chest ? (
          <div className={'pd-chest pd-c-' + chest.phase + ' pd-rar-' + chest.rarity} aria-hidden="true" style={{ '--beam': RARITY[chest.rarity].beam, '--rc': RARITY[chest.rarity].color }}>
            <span className="pd-pillar" />
            <span className="pd-chest-glow" />
            <span className="pd-chest-item"><Sprite map={SCROLL} className="pd-scroll-lg" /></span>
            <Sprite map={CHEST_BODY} pal={chestPal} className="pd-chest-body" />
            <Sprite map={CHEST_INSIDE} className="pd-chest-inside" />
            <Sprite map={CHEST_LID} pal={chestPal} className="pd-chest-lid" />
            <span className="pd-got">GOT {RARITY[chest.rarity].label}<b>{chest.name}</b></span>
          </div>
        ) : null}
        {notes.length ? <span className="pd-notes" aria-hidden="true">{notes.map((n) => <span key={n.id} className="pd-note" style={{ '--y': n.y }}><Sprite map={n.k ? NOTE2 : NOTE} /></span>)}</span> : null}
        {banner ? <span className="pd-banner" key={banner.id} aria-hidden="true">+30 LIVES</span> : null}
      </div>
      <input ref={fileRef} type="file" multiple accept={accept} hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      <span className="pd-sr" role="status" aria-live="polite">{announce}</span>
    </div>
  );
});

export default PixelDialog;
