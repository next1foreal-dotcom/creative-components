// Clone Hairs (身外身法): a playful SUBAGENTS / parallel-runs component for agent UIs. v2.
// The host drives it: spawn(id,label,kind) -> the Monkey King plucks a hair, blows, POOF, a mini clone (with his golden-
// banded staff) hops out and works. progress(id, 0-1|null, step) -> panel rows show the step and a 金箍棒 progress rod.
// done(id) -> the clone poofs back into a hair that floats home onto his head. fail(id) -> faceplant (+ the rod snaps).
// finishAll() -> every hair comes home and he somersaults onto a cloud (panel: the rods merge into one, into his hand).
// stop() -> clones freeze mid-pose, then poof. The more clones at once, the worse his scalp: 3+ he sweats, then a bald
// patch (bare skin + stubble, drawn into the art) grows in 3 stages, 9+ he sees it in a mirror and screams while the
// clones snicker. Spawns beyond `max` wait in a queue. Idle too long -> the clones slack off on peaches.
// layout="strip": characters in a row above the Agent row. layout="panel": a right side panel, one row per subagent.
// Original chibi art (Journey to the West is public domain). Sound: real CC0 samples (Chinese opera percussion, a jaw-harp
// pluck, a toy glockenspiel...) + a processed TTS voice line 「去吧，孩儿们！」 (voiceLang="en": "Go, my little ones!").
// Sources + licenses: art/sfx/LICENSES.md. sound={false} mutes everything, voice={false} only the voice.
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { META, SPR_DARK, SPR_LIGHT } from './clone-hairs-sprites.js';
import { SFX_WEBM, SFX_MP3 } from './clone-hairs-sfx.js';

const isB = () => typeof window !== 'undefined' && typeof document !== 'undefined';
const SIZES = { xs: 1, sm: 1.4, lg: 2.1 };
const JOBS = ['c-pry', 'c-hammer', 'c-twirl', 'c-box', 'c-bundle', 'c-pick'];          // strip: mixed jobs, half with the staff
const KIND = { search: 'c-scope', code: 'c-brush', run: 'c-pick', staff: 'c-shoulder' }; // tool by kind (default = staff)
const SNICK = ['c-snicker', 'c-snick2', 'c-snick4', 'c-snick5', 'c-snick3'];         // mixed snicker poses
const now = () => (isB() && window.performance ? performance.now() : Date.now());
const TXT = {
  zh: { chip: '分身', done: '完成', q: '排队', aria: '分身', retry: '重试', queued: '排队中…', failed: '失败', stopped: '已停止',
    live: (a, q) => (a ? `${a} 个分身在干活` : '没有分身在干活') + (q ? `，${q} 个排队中` : '') },
  en: { chip: 'Clones', done: 'done', q: 'queued', aria: 'Clones', retry: 'Retry', queued: 'Queued…', failed: 'Failed', stopped: 'Stopped',
    live: (a, q) => (a ? `${a} clone${a > 1 ? 's' : ''} working` : 'No clones working') + (q ? `, ${q} queued` : '') },
};

/* ---------------- sound: one shared AudioContext playing real CC0 samples (clone-hairs-sfx.js) ----------------
   Buses: sfx (ducked under the voice) + voice -> master -> limiter. At most MAX_VOICES samples at once (the oldest
   is faded out), so a spree of spawns never clips. Module-level de-dupe: strip + panel driven by one run play once. */
let AC = null, MASTER = null, SFXBUS = null, VOXBUS = null, BUF = null;
let LIVE = [], VOX_END = 0;
const LAST = {}, LASTV = {};
const MAX_VOICES = 10;
const LV = { poof: 0.5, unpoof: 0.36, pluck: 0.46, blow: 0.7, ping: 0.3, whoosh: 0.42, gong: 0.36, gasp: 0.85, horror: 0.4, giggle: 0.6, snap: 0.55, thud: 0.5, freeze: 0.46, tick: 0.05 };
const VOX = { gain: 1.0, cool: { go: 4000, hair: 5000, hehe: 4000 } };
const st = (n) => Math.pow(2, n / 12);
function ctx() {
  if (!isB()) return null;
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try {
      AC = new C();
      const lim = AC.createDynamicsCompressor(); // a soft limiter on the very end of the chain
      lim.threshold.value = -9; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
      MASTER = AC.createGain(); MASTER.gain.value = 0.85; MASTER.connect(lim); lim.connect(AC.destination);
      SFXBUS = AC.createGain(); SFXBUS.connect(MASTER); VOXBUS = AC.createGain(); VOXBUS.gain.value = VOX.gain; VOXBUS.connect(MASTER);
      loadBufs(AC);
    } catch (_) { AC = null; return null; }
  }
  return AC;
}
function unlockAudio() { const c = ctx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
function b64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function dec(c, s) { return new Promise((res, rej) => { try { const p = c.decodeAudioData(b64(s), res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } }); }
// Opus first (small); MP3 when the browser can't decode Opus-in-WebM (older Safari)
function loadBufs(c) { if (BUF) return; BUF = {}; Object.keys(SFX_MP3).forEach((k) => { (SFX_WEBM[k] ? dec(c, SFX_WEBM[k]) : Promise.reject()).catch(() => dec(c, SFX_MP3[k])).then((b) => { BUF[k] = b; }, () => {}); }); }
function smp(c, name, { t = 0, rate = 1, gain = 1, glide } = {}) {
  const b = BUF && BUF[name]; if (!b) return;
  const T = c.currentTime + t;
  LIVE = LIVE.filter((v) => v.end > c.currentTime);
  if (LIVE.length >= MAX_VOICES) { const o = LIVE.shift(); try { o.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.012); o.s.stop(c.currentTime + 0.06); } catch (_) {} }
  const s = c.createBufferSource(), g = c.createGain();
  s.buffer = b; s.playbackRate.value = rate; s.playbackRate.setValueAtTime(rate, T); if (glide) s.playbackRate.linearRampToValueAtTime(rate * glide[0], T + glide[1]);
  g.gain.value = gain; s.connect(g); g.connect(SFXBUS); s.start(T);
  LIVE.push({ s, g, end: T + b.duration / rate + 0.03 });
}
// a voice line: once per cooldown, never on top of another line (waits up to 0.8s for it, else skips); ducks the SFX
function say(c, line, lang) {
  const b = BUF && BUF['v_' + line + '_' + (lang === 'en' ? 'en' : 'zh')]; if (!b) return;
  const t = now(); if (LASTV[line] && t - LASTV[line] < (VOX.cool[line] || 2500)) return;
  const T0 = Math.max(c.currentTime, VOX_END + 0.04); if (T0 - c.currentTime > 0.8) return;
  LASTV[line] = t;
  const s = c.createBufferSource(); s.buffer = b; s.connect(VOXBUS); s.start(T0); VOX_END = T0 + b.duration;
  const g = SFXBUS.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(g.value, c.currentTime);
  g.setTargetAtTime(0.5, T0, 0.02); g.setTargetAtTime(1, VOX_END, 0.12);
}
// de-dupe windows (ms) for beats both instances hit at slightly different moments (the panel lags the strip)
const DEDUPE = { poof: 420, unpoof: 420, whoosh: 900, gong: 900, merge: 900, horror: 900, gasp: 900, freeze: 600, tick: 380, ping: 330 };
const PENTA = [-5, -3, -1, 2, 4, 7]; // the hairs coming home walk up a pentatonic scale
export const SFX = {
  pluck: (c) => smp(c, 'pluck', { gain: LV.pluck }),                                    // tiny snap + jaw-harp "pwing"
  blow: (c) => smp(c, 'blow', { gain: LV.blow }),                                       // a puff of breath + airy whoosh
  poof: (c, i = 0) => smp(c, 'poof', { rate: st([0, 2, -1, 3, -2, 1, 4, -3, 0][i % 9]), gain: i ? LV.poof * 0.7 : LV.poof }), // 铙钹 "cha" + 堂鼓
  unpoof: (c, i = 0) => smp(c, 'unpoof', { rate: st([0, 2, 4, 7, 9][i % 5] - 2), gain: LV.unpoof }), // 木鱼 "klok": clone -> hair
  ping: (c, i = 0) => smp(c, 'ping', { rate: st(PENTA[i % PENTA.length]), gain: LV.ping }), // toy glockenspiel
  whoosh: (c) => smp(c, 'whoosh', { gain: LV.whoosh }),                                 // the somersault
  gong: (c) => smp(c, 'gong', { rate: st(-1), glide: [st(2), 0.22], gain: LV.gong }),   // 小锣: the pitch bends up after the hit
  gasp: (c) => smp(c, 'gasp', { gain: LV.gasp }),
  horror: (c) => smp(c, 'horror', { gain: LV.horror }),                                 // low gong + gasp: he sees the mirror
  snicker: (c, soft) => smp(c, 'giggle', { gain: soft ? LV.giggle * 0.55 : LV.giggle, rate: soft ? st(1) : 1 }),
  thud: (c) => smp(c, 'thud', { gain: LV.thud }),
  freeze: (c) => smp(c, 'freeze', { gain: LV.freeze }),                                 // 梆子 "嗒-嗒!"
  snap: (c) => smp(c, 'snap', { gain: LV.snap }),                                       // the staff cracks, two halves clatter
  tick: (c, p = 0) => smp(c, 'tick', { rate: st(Math.round(p * 7)), gain: LV.tick }),   // every 10% of progress: barely there
  merge: (c) => { [0, 4, 7, 12].forEach((n, i) => smp(c, 'ping', { t: i * 0.06, rate: st(n - 5), gain: LV.ping * 0.8 })); smp(c, 'whoosh', { gain: LV.whoosh * 0.4, rate: 1.2 }); },
};

/* ---------------- built-in demo scripts (used by the web component's demo attribute and play()) ---------------- */
export const DEMOS = {
  small: [[0, 's', 'a1', 'Scan src/hooks', 'search'], [350, 's', 'a2', 'Read API docs', 'search'], [700, 's', 'a3', 'Write tests', 'code'], [3600, 'd', 'a2'], [5200, 'd', 'a1'], [6800, 'all']],
  big: [
    ...Array.from({ length: 10 }, (_, i) => [i * 140, 's', 'b' + (i + 1), 'Migrate pkg ' + (i + 1), ['code', 'run', 'search', 'staff'][i % 4]]),
    [5600, 'f', 'b4'], [7000, 'd', 'b2'], [7800, 'd', 'b7'], [8600, 'd', 'b1'], [10400, 'all'],
  ],
  stop: [[0, 's', 'c1', 'Crawl'], [200, 's', 'c2', 'Crawl'], [400, 's', 'c3', 'Crawl'], [600, 's', 'c4', 'Crawl'], [3200, 'stop']],
};

function Sprite({ k, s, set, cls = '', style }) {
  const m = META[k]; if (!m) return null;
  return <img className={'ch-img ' + cls} src={set[k]} alt="" draggable={false} aria-hidden="true"
    style={{ left: -m.ax * s, top: -m.ay * s, width: m.w * s, height: m.h * s, ...style }} />;
}
// the 金箍棒: red rod, gold bands at both ends (pure CSS so it can stretch to any length)
const Rod = ({ cls = '', style }) => <span className={'ch-rod ' + cls} style={style}><i className="a" /><b /><i className="z" /></span>;
const Check = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l2.9 2.8 6.1-6.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const fmt = (ms) => (ms < 60000 ? (ms / 1000).toFixed(1) + 's' : Math.floor(ms / 60000) + 'm' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') + 's');

const CloneHairs = forwardRef(function CloneHairs(props, ref) {
  const {
    layout = 'strip', size = 'xs', theme = 'dark', sound = true, voice = true, voiceLang = 'zh', lang = 'zh', thresholds = [3, 6, 9], max = 9, idleEggMs = 9000,
    showLabels = false, showChip = true, demo, onChange, onRetry, className = '', style,
  } = props;
  const panel = layout === 'panel';
  const k = SIZES[size] || 1;
  const set = theme === 'light' ? SPR_LIGHT : SPR_DARK;
  const t = TXT[lang] || TXT.zh;
  const [t1, t2, t3] = thresholds;

  // geometry (css px). strip: characters in a row. panel: the Monkey King in the header, clones live in the rows.
  const G = panel ? 130 * k : 84 * k, MX = panel ? 42 * k : 33 * k, sM = (panel ? 0.26 : 0.2) * k, sC = 0.2 * k, sA = 0.26 * k, SLOT0 = 94 * k, SP = 28 * k;
  const stageW = SLOT0 + (max - 1) * SP + 20 * k;
  const slotX = (i) => SLOT0 + i * SP;

  const [, setTick] = useState(0);
  const M = useRef(null);
  if (!M.current) M.current = { clones: [], queue: [], pending: [], rows: [], hairs: 0, fly: 0, fx: [], pose: null, actor: 'idle', reward: false, egg: false, lvl: 0, wantFx: null, uid: 0, seq: 0, ret: 0, rm: false, gen: 0, rodHand: false };
  const timers = useRef(new Set());
  const P = useRef(props); P.current = props;
  const root = useRef(null), avEls = useRef({}), rodEls = useRef({});
  const geo = useRef({}); geo.current = { G, MX, sM, sC, slotX, panel };

  const render = useCallback(() => setTick((x) => x + 1), []);
  const later = useCallback((f, ms) => { const id = setTimeout(() => { timers.current.delete(id); f(); }, ms); timers.current.add(id); return id; }, []);
  const play = useCallback((name, arg) => {
    if (P.current.sound === false) return; const c = ctx(); if (!c || c.state !== 'running') return;
    // strip + panel on one run: the panel's poof lands a beat later, so poofs de-dupe over a longer window
    const key = name === 'tick' ? 'tick' : name + ':' + (arg == null ? '' : String(arg)), tt = now(); // ticks: one at a time, however many clones report
    if (LAST[key] && tt - LAST[key] < (DEDUPE[name] || 70)) return; LAST[key] = tt;
    try { SFX[name](c, arg); } catch (_) {}
  }, []);
  // the Monkey King's voice lines: 'go' (blowing out clones), 'hair' (the mirror), 'hehe' (on the cloud)
  const speak = useCallback((line) => {
    const pr = P.current; if (pr.sound === false || pr.voice === false) return; const c = ctx(); if (!c || c.state !== 'running') return;
    try { say(c, line, pr.voiceLang === 'en' ? 'en' : 'zh'); } catch (_) {}
  }, []);

  const active = () => M.current.clones.filter((c) => c.phase !== 'out');
  const busy = () => active().length + M.current.pending.length + M.current.fly; // on screen + waiting to be blown out
  const level = (h) => (h >= t3 ? 3 : h >= t2 ? 2 : h >= t1 ? 1 : 0);
  // bald stage drawn into the art: 1 = small spot (one hair before t2), 2 = patch (t2..t3-1), 3 = big (t3+)
  const bald = (h) => (h >= t3 ? 3 : h >= t2 ? 2 : h >= t2 - 1 && h >= t1 ? 1 : 0);
  const row = (id) => M.current.rows.find((r) => r.id === id);

  const basePose = () => {
    const m = M.current, b = bald(m.hairs);
    if (m.pose) return m.pose;
    if (m.actor === 'pluck') return b >= 2 ? 'm-pluck2' : 'm-pluck';
    if (m.actor === 'blow') return b >= 2 ? 'm-blow2' : 'm-blow';
    if (m.hairs === 0) return m.egg ? 'm-peach' : 'm-idle';
    if (m.hairs < t1) return 'm-smug';
    return b ? 'm-sweat' + b : 'm-sweat';
  };
  const headPos = () => { const g = geo.current, pm = META[basePose()] || META['m-idle'], b = pm.band != null ? pm : META['m-idle']; return { x: g.MX + (b.hx - b.ax) * g.sM, y: g.G - (b.ay - b.band) * g.sM + 3 * k }; };
  const mouthPos = () => { const g = geo.current; return { x: g.MX + 66 * g.sM, y: g.G - 150 * g.sM }; };
  const handPos = () => { const g = geo.current, c = META['m-cloud']; return { x: g.MX + (195 - c.ax) * g.sM, y: g.G + (57 - c.ay) * g.sM }; };
  // panel: where a row's avatar / rod sits, in the component's own px (offset walk, so host zoom/transforms don't matter)
  const posIn = (el) => { let x = 0, y = 0, e = el; while (e && e !== root.current) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return e ? { x, y } : null; };
  const avPos = (id) => { const el = avEls.current[id]; const p = el && posIn(el); return p ? { x: p.x + el.offsetWidth / 2, y: p.y + el.offsetHeight - 2 * k } : null; };

  const addFx = (kind, x, y, extra = {}) => {
    const m = M.current, key = ++m.uid, dur = extra.dur || (kind === 'hair' ? 640 : kind === 'spark' ? 600 : kind === 'rodfly' ? 620 : 420);
    m.fx.push({ key, kind, x, y, ...extra, dur }); later(() => { m.fx = m.fx.filter((f) => f.key !== key); render(); }, dur + (extra.delay || 0) + 40);
  };

  // escalation: react when the number of hairs out crosses a threshold (the reaction waits until he finishes blowing)
  const checkLevel = () => {
    const m = M.current, l = level(m.hairs);
    if (l > m.lvl) { if (l === 3) m.wantFx = 'horror'; else if (l === 2 && m.wantFx !== 'horror') m.wantFx = 'bald'; }
    m.lvl = l;
    if (m.actor === 'idle') runReaction();
  };
  const runReaction = () => {
    const m = M.current, w = m.wantFx; if (!w || m.reward) return; m.wantFx = null;
    const gen = m.gen;
    if (w === 'bald') { m.pose = 'm-bald'; play('gasp'); later(() => { if (m.gen === gen && m.pose === 'm-bald') { m.pose = null; render(); } }, 1100); }
    if (w === 'horror') horror(true);
    render();
  };
  const horror = (loud) => {
    const m = M.current, gen = m.gen;
    m.pose = 'm-horror'; if (loud) { play('horror'); later(() => { if (m.gen === gen) speak('hair'); }, 240); }
    later(() => { if (m.gen !== gen) return; active().forEach((c) => { if (c.phase === 'work') c.phase = 'snicker'; }); play('snicker', !loud); render(); }, 380);
    later(() => { if (m.gen !== gen) return; active().forEach((c) => { if (c.phase === 'snicker') c.phase = 'work'; }); if (m.pose === 'm-horror') m.pose = null; render(); }, 2100);
  };

  const touch = () => {
    const m = M.current; clearTimeout(m.eggT); if (m.egg) { m.egg = false; }
    m.eggT = later(() => { if (!m.reward) { m.egg = true; render(); } }, P.current.idleEggMs != null ? P.current.idleEggMs : 9000);
  };

  const freeSlot = () => { const used = new Set(active().map((c) => c.slot)); let i = 0; while (used.has(i)) i++; return i; };

  const launch = (b, i, quiet) => { // quiet: the first wave rides on the puff, no poof sound on top of it (user, Oct 14)
    const m = M.current, slot = freeSlot(), x = slotX(slot), mo = mouthPos(), seq = m.seq++;
    m.fly = Math.max(0, m.fly - 1);
    const job = geo.current.panel ? KIND[b.kind] || KIND.staff : JOBS[seq % JOBS.length]; // panel: tool by kind; strip: a mixed crowd
    const c = { key: ++m.uid, id: b.id, label: b.label, kind: b.kind, slot, job, snick: SNICK[seq % SNICK.length], phase: m.rm ? 'work' : 'in', fx: mo.x - x, fy: mo.y - G + 14 * k, delay: -((seq * 173) % 900) };
    m.clones.push(c);
    const r = row(b.id); if (r) { r.st = 'run'; r.t0 = now(); r.t1 = null; r.clone = c.key; }
    if (geo.current.panel) {
      // the blown hair flies from his lips to the row, then POOF: the mini clone appears on the row
      const av = avPos(b.id);
      if (!m.rm && av) { addFx('hair', mo.x, mo.y, { dx: av.x - mo.x, dy: av.y - 12 * k - mo.y, s: 0.12 * k, dur: 360, out: 1 }); later(() => { addFx('poof', av.x, av.y + 2 * k, { s: 0.1 * k }); if (!quiet) play('poof', i); }, 340); }
    } else if (!m.rm) { addFx('poof', mo.x + 4 * k, mo.y + 12 * k, { s: 0.11 * k }); if (!quiet) play('poof', i); }
    later(() => {
      if (c.phase === 'in') c.phase = 'work';
      if (!m.rm && !geo.current.panel) addFx('wisp', x + 9 * k, G - 6 * k, { s: 0.1 * k, dur: 380 });
      if (c.after) { const a = c.after; c.after = null; retire(c, a); }
      render();
    }, m.rm ? 0 : geo.current.panel ? 700 : 460);
  };

  const pluck = () => {
    const m = M.current, gen = m.gen;
    const batch = m.pending.splice(0); if (!batch.length) { m.actor = 'idle'; return; }
    const first = true; // every wave is announced by his breath; the clone poofs stay silent (user, Oct 14)
    m.hairs += batch.length; m.fly += batch.length;
    if (m.rm) { batch.forEach((b, i) => launch(b, i)); m.lvl = level(m.hairs); render(); return; } // reduced motion: no pluck/blow beat
    m.actor = 'pluck'; play('pluck'); checkLevel(); render();
    later(() => {
      if (m.gen !== gen) return;
      m.actor = 'blow'; if (first) play('blow'); later(() => { if (m.gen === gen) speak('go'); }, first && BUF && BUF.blow ? BUF.blow.duration * 1000 + 60 : 120); render(); // the line starts once the puff has finished (user, Oct 14)
      batch.forEach((b, i) => later(() => { if (m.gen === gen) launch(b, i, first); render(); }, 160 + i * 110));
      later(() => { if (m.gen !== gen) return; m.actor = 'idle'; if (m.pending.length) pluck(); else runReaction(); render(); }, Math.max(440, 160 + batch.length * 110 + 140));
    }, m.rm ? 0 : 300);
  };

  const dequeue = () => {
    const m = M.current;
    while (m.queue.length && busy() < (P.current.max || max)) m.pending.push(m.queue.shift());
    if (m.pending.length && m.actor === 'idle') pluck();
  };

  const hairHome = (x, y) => {
    const m = M.current, gen = m.gen;
    if (m.rm) { m.hairs = Math.max(0, m.hairs - 1); m.lvl = level(m.hairs); return; }
    const h = headPos();
    addFx('hair', x, y, { dx: h.x - x, dy: h.y - y, s: 0.13 * k });
    later(() => { if (m.gen !== gen) return; m.hairs = Math.max(0, m.hairs - 1); m.lvl = level(m.hairs); play('ping', m.ret++); addFx('spark', h.x, h.y, { s: k }); render(); m.onHome && m.onHome(); }, 640);
  };

  const retire = (c, how, quick) => {
    const m = M.current, pnl = geo.current.panel;
    if (c.phase === 'in') { c.after = how; return; }
    if (c.phase === 'out' || c.phase === 'dizzy' || c.phase === 'plant') return;
    const r = row(c.id);
    const at = () => (pnl ? avPos(c.id) || { x: slotX(0), y: G } : { x: slotX(c.slot), y: G });
    const poof = () => {
      const p = at(); c.phase = 'out'; addFx('poof', p.x + 2 * k, p.y - (pnl ? 4 : 14) * k, { s: (pnl ? 0.12 : 0.15) * k }); play('unpoof', c.slot);
      hairHome(p.x, p.y - 20 * k);
      later(() => { m.clones = m.clones.filter((z) => z !== c); render(); }, 320);
      later(dequeue, 360); render();
    };
    if (how === 'fail' && !m.rm) {
      if (r) { r.st = 'fail'; r.t1 = now(); play('snap'); }
      c.phase = 'dizzy'; render();
      later(() => { c.phase = 'plant'; play('thud'); render(); }, 420);
      later(poof, 1300);
    } else {
      if (r && r.st === 'run') { r.st = how === 'fail' ? 'fail' : how === 'stop' ? 'stop' : r.fly ? 'done' : 'flash'; r.p = how === 'done' ? 1 : r.p; r.t1 = now(); if (r.st === 'flash') later(() => { if (r.st === 'flash') { r.st = 'done'; render(); } }, 620); }
      if (pnl && how !== 'stop' && !quick && !m.rm) later(poof, 260); else poof();
    }
  };

  const endReward = () => { const m = M.current; if (m.reward || m.pose === 'm-flip' || m.pose === 'm-cloud') { m.reward = false; m.pose = null; m.rodHand = false; m.gen++; } };

  const reward = () => {
    const m = M.current, gen = ++m.gen;
    m.egg = false; clearTimeout(m.eggT);
    if (m.rm) { m.pose = 'm-cloud'; m.rodHand = geo.current.panel; m.reward = true; render(); later(() => { if (m.gen === gen) { m.pose = null; m.reward = false; m.rodHand = false; touch(); render(); } }, 2600); return; }
    m.reward = true; m.pose = 'm-flip'; play('whoosh'); render();
    later(() => {
      if (m.gen !== gen) return; m.pose = 'm-cloud'; play('gong'); later(() => { if (m.gen === gen) speak('hehe'); }, 420);
      if (geo.current.panel) { m.rodHand = true; play('merge'); }
      [0, 120, 260].forEach((d, i) => later(() => { if (m.gen === gen) addFx('spark', MX + (i - 1) * 22 * k, G - (52 + i * 6) * k * (sM / (0.236 * k)), { s: k * 1.2 }); }, d)); render();
    }, 620);
    later(() => { if (m.gen !== gen) return; m.pose = null; m.reward = false; m.rodHand = false; touch(); render(); }, 3400);
  };

  /* ---------------- host API ---------------- */
  const api = {
    spawn(id, label, kind) {
      const m = M.current; unlockAudio(); touch(); endReward();
      if (id == null) id = 'clone-' + (m.uid + 1);
      if (active().some((c) => c.id === id && c.phase !== 'dizzy' && c.phase !== 'plant') || m.queue.some((q) => q.id === id) || m.pending.some((q) => q.id === id)) return id;
      const old = row(id);
      if (old) { Object.assign(old, { label: label != null ? label : old.label, kind: kind != null ? kind : old.kind, fly: false, st: 'queued', p: null, step: '', t0: null, t1: null }); label = old.label; kind = old.kind; }
      else m.rows.push({ id, label, kind, st: 'queued', p: null, step: '', t0: null, t1: null, n: ++m.uid });
      if (busy() >= (P.current.max || max)) m.queue.push({ id, label, kind });
      else { m.pending.push({ id, label, kind }); if (m.actor === 'idle') pluck(); }
      render(); return id;
    },
    progress(id, p, step) {
      const r = row(id); if (!r) return;
      const np = p == null || isNaN(p) ? null : Math.max(0, Math.min(1, +p));
      if (np != null && (r.p == null || Math.floor(np * 10) > Math.floor(r.p * 10)) && r.st === 'run') play('tick', Math.round(np * 10) / 10);
      r.p = np; if (step != null) r.step = String(step); render();
    },
    done(id) { finish1(id, 'done'); },
    fail(id) { finish1(id, 'fail'); },
    finishAll() {
      const m = M.current; touch(); m.queue = []; m.hairs = Math.max(0, m.hairs - m.pending.length); m.pending = []; m.wantFx = null;
      m.rows.forEach((r) => { if (r.st === 'queued') { r.st = 'done'; r.p = 1; r.t0 = r.t0 || now(); r.t1 = now(); } });
      if (m.pose === 'm-horror' || m.pose === 'm-bald') m.pose = null;
      const list = active().filter((c) => c.phase !== 'dizzy' && c.phase !== 'plant');
      const rest = active().length - list.length;
      if (!list.length && !rest) { reward(); return; }
      list.forEach((c) => { if (c.phase !== 'in') c.phase = 'cheer'; });
      // panel: every running rod flies off and merges into one staff in his hand
      if (geo.current.panel && !m.rm) {
        const hp = handPos();
        const L = 160 * geo.current.sM; // the staff in his hand
        list.forEach((c, i) => {
          const r = row(c.id), el = rodEls.current[c.id], p = el && posIn(el); if (!p || !r) return;
          const w = Math.max(16 * k, el.offsetWidth * (r.p == null ? 0.45 : Math.max(0.12, r.p))); r.fly = true;
          addFx('rodfly', p.x + w / 2, p.y + el.offsetHeight / 2, { w, sc: L / w, dx: hp.x - p.x - w / 2, dy: hp.y - p.y - el.offsetHeight / 2, delay: i * 70, dur: 720 });
        });
      }
      render(); play('snicker', true);
      const go = () => list.forEach((c, i) => later(() => retire(c, 'done'), i * 120));
      later(go, m.rm ? 0 : 520);
      // reward once every hair is home
      m.onHome = () => { if (m.hairs === 0 && !active().length) { m.onHome = null; later(reward, 120); } };
      if (m.rm) later(() => { m.onHome = null; reward(); }, 10);
    },
    stop() {
      const m = M.current; touch(); m.queue = []; m.hairs = Math.max(0, m.hairs - m.pending.length); m.pending = []; m.wantFx = null; m.onHome = null;
      m.gen++; m.actor = 'idle'; m.hairs = Math.max(0, m.hairs - m.fly); m.fly = 0;
      m.rows.forEach((r) => { if (r.st === 'queued' || r.st === 'run') { r.st = 'stop'; r.t1 = now(); } });
      const list = active();
      m.pose = list.length ? 'm-wow' : null;
      list.forEach((c) => { c.frozen = sprOf(c); c.phase = 'freeze'; });
      if (list.length) play('freeze');
      render();
      later(() => { list.forEach((c, i) => later(() => retire(c, 'stop', true), i * 60)); }, m.rm ? 0 : 700);
      const gen = m.gen; later(() => { if (m.gen === gen && m.pose === 'm-wow') { m.pose = null; render(); } }, 1500 + list.length * 60);
    },
    reset() {
      timers.current.forEach(clearTimeout); timers.current.clear();
      const m = M.current; Object.assign(m, { clones: [], queue: [], pending: [], rows: [], hairs: 0, fly: 0, fx: [], pose: null, actor: 'idle', reward: false, egg: false, lvl: 0, wantFx: null, onHome: null, rodHand: false, gen: m.gen + 1 });
      touch(); render();
    },
    play(name = 'small') {
      const sc = DEMOS[name]; if (!sc) return; api.reset(); unlockAudio();
      sc.forEach(([at, op, id, label, kind]) => later(() => { if (op === 's') api.spawn(id, label, kind); else if (op === 'd') api.done(id); else if (op === 'f') api.fail(id); else if (op === 'all') api.finishAll(); else if (op === 'stop') api.stop(); }, at));
      // fake progress for the built-in demos
      sc.filter((x) => x[1] === 's').forEach(([at, , id], i) => [0.15, 0.35, 0.55, 0.75].forEach((p, j) => later(() => api.progress(id, p, ['…', '…', '…', '…'][j]), at + 900 + j * 700 + i * 90)));
    },
    get count() { return active().length; },
    get queued() { return M.current.queue.length; },
    get hairs() { return M.current.hairs; },
    get level() { return level(M.current.hairs); },
    get rows() { return M.current.rows.map((r) => ({ id: r.id, label: r.label, kind: r.kind, status: r.st === 'flash' ? 'done' : r.st, progress: r.p, step: r.step })); },
    get state() { const m = M.current; return { active: active().map((c) => ({ id: c.id, label: c.label, phase: c.phase })), queued: m.queue.map((q) => q.id), hairs: m.hairs, level: level(m.hairs), pose: basePose(), egg: m.egg }; },
  };
  const finish1 = (id, how) => {
    const m = M.current; touch();
    const r = row(id);
    const qi = m.queue.findIndex((q) => q.id === id); if (qi >= 0) { m.queue.splice(qi, 1); if (r) { r.st = how; r.t1 = now(); } render(); return; }
    const pi = m.pending.findIndex((q) => q.id === id); if (pi >= 0) { m.pending.splice(pi, 1); m.hairs = Math.max(0, m.hairs - 1); if (r) { r.st = how; r.t1 = now(); } render(); return; }
    const c = active().filter((z) => z.id === id).pop(); if (!c) return; // the newest clone for this id (a retried one)
    if (c.phase === 'snicker' || c.phase === 'cheer' || c.phase === 'freeze') c.phase = 'work';
    retire(c, how); render();
  };
  const apiRef = useRef(api); apiRef.current = api;
  useImperativeHandle(ref, () => ({
    spawn: (...a) => apiRef.current.spawn(...a), progress: (...a) => apiRef.current.progress(...a), done: (...a) => apiRef.current.done(...a), fail: (...a) => apiRef.current.fail(...a),
    finishAll: () => apiRef.current.finishAll(), stop: () => apiRef.current.stop(), reset: () => apiRef.current.reset(), play: (n) => apiRef.current.play(n),
    get count() { return apiRef.current.count; }, get queued() { return apiRef.current.queued; }, get hairs() { return apiRef.current.hairs; },
    get level() { return apiRef.current.level; }, get state() { return apiRef.current.state; }, get rows() { return apiRef.current.rows; },
  }), []);

  const sprOf = (c) => {
    const m = M.current;
    if (c.phase === 'freeze') return c.frozen || c.job;
    if (c.phase === 'in') return 'c-hop';
    if (c.phase === 'snicker') return c.snick;
    if (c.phase === 'cheer') return 'c-cheer';
    if (c.phase === 'dizzy') return 'c-dizzy';
    if (c.phase === 'plant') return 'c-plant';
    if (m.egg && c.phase === 'work') return 'c-peach';
    return c.job;
  };

  // mount: reduced motion, audio unlock on the first gesture, sprite decode, egg timer, demo attribute
  useEffect(() => {
    const m = M.current;
    const mq = isB() && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    m.rm = !!(mq && mq.matches); const onMq = () => { m.rm = !!mq.matches; };
    mq && mq.addEventListener && mq.addEventListener('change', onMq);
    const on = () => unlockAudio();
    document.addEventListener('pointerdown', on, true); document.addEventListener('keydown', on, true);
    Object.values(set).forEach((src) => { const i = new Image(); i.src = src; i.decode && i.decode().catch(() => {}); });
    touch();
    if (demo && DEMOS[demo]) later(() => apiRef.current.play(demo), 400);
    return () => {
      timers.current.forEach(clearTimeout); timers.current.clear();
      document.removeEventListener('pointerdown', on, true); document.removeEventListener('keydown', on, true);
      mq && mq.removeEventListener && mq.removeEventListener('change', onMq);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // re-trigger the mirror gag now and then while he is still over the top threshold
  const m = M.current;
  const lv = level(m.hairs);
  useEffect(() => {
    if (lv < 3) return undefined;
    const iv = setInterval(() => { const mm = M.current; if (level(mm.hairs) >= 3 && mm.actor === 'idle' && !mm.pose && !mm.reward) { horror(false); render(); } }, 7000);
    return () => clearInterval(iv);
  }, [lv]); // eslint-disable-line react-hooks/exhaustive-deps

  // panel: tick the elapsed timers while something runs
  const running = panel && m.rows.some((r) => r.st === 'run');
  useEffect(() => { if (!running) return undefined; const iv = setInterval(render, 100); return () => clearInterval(iv); }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = active();
  const nActive = act.length, nQueued = m.queue.length;
  const nDone = m.rows.filter((r) => r.st === 'done' || r.st === 'flash').length;
  const lastSent = useRef('');
  useEffect(() => {
    const key = nActive + '/' + nQueued + '/' + m.hairs + '/' + lv + '/' + nDone;
    if (key !== lastSent.current) { lastSent.current = key; onChange && onChange({ active: nActive, queued: nQueued, done: nDone, hairs: m.hairs, level: lv }); }
  });

  const pose = basePose();
  const T = now();

  const mainMonkey = (
    <div className="ch-main" data-pose={pose} data-actor={m.actor} data-level={lv} data-bald={bald(m.hairs)} style={{ left: MX, top: G }}>
      <div className="ch-body">
        {m.rodHand && pose === 'm-cloud' && (() => { const h = handPos(); return <Rod cls="ch-rod-hand" style={{ left: h.x - MX + 4 * sM, top: h.y - G - 26 * sM, width: 160 * sM, '--rh': Math.max(4, 15 * sM) + 'px' }} />; })()}
        <Sprite k={pose} s={sM} set={set} />
      </div>
    </div>
  );
  const fxLayer = m.fx.map((f) => f.kind === 'hair' ? (
    <div key={f.key} className={'ch-fx ch-hairx' + (f.out ? ' out' : '')} style={{ left: f.x, top: f.y, '--dx': f.dx + 'px', '--dy': f.dy + 'px', '--d': f.dur + 'ms' }}>
      <div className="ch-hairy"><div className="ch-hairr"><Sprite k="fx-hair" s={f.s} set={set} /></div></div>
    </div>
  ) : f.kind === 'spark' ? (
    <div key={f.key} className="ch-fx ch-spark" style={{ left: f.x, top: f.y, '--s': f.s }} aria-hidden="true"><i /><i /><i /><i /></div>
  ) : f.kind === 'rodfly' ? (
    <div key={f.key} className="ch-fx ch-rodfly" style={{ left: f.x, top: f.y, '--dx': f.dx + 'px', '--dy': f.dy + 'px', '--sc': f.sc, '--d': f.dur + 'ms', '--dl': f.delay + 'ms' }}>
      <Rod style={{ width: f.w, left: -f.w / 2, '--rh': 7 * k + 'px' }} />
    </div>
  ) : (
    <div key={f.key} className={'ch-fx ch-' + f.kind} style={{ left: f.x, top: f.y, '--d': f.dur + 'ms' }}>
      <Sprite k={f.kind === 'poof' ? 'fx-poof' : 'fx-wisp'} s={f.s} set={set} />
    </div>
  ));
  const common = {
    ref: root, role: 'group', 'aria-label': t.aria, style: { '--k': k, ...style },
    'data-layout': panel ? 'panel' : 'strip', 'data-size': SIZES[size] ? size : 'xs', 'data-theme': theme === 'light' ? 'light' : 'dark',
    'data-count': nActive, 'data-queued': nQueued, 'data-done': nDone, 'data-hairs': m.hairs, 'data-level': lv, 'data-bald': bald(m.hairs),
    'data-pose': pose, 'data-egg': m.egg ? '1' : '0', 'data-reward': m.reward ? '1' : '0',
  };

  if (panel) {
    const byId = {}; m.clones.filter((c) => c.phase === 'out').concat(act).forEach((c) => { byId[c.id] = c; }); // a live clone wins over one that is poofing out
    return (
      <div className={'ch chp ' + className} {...common}>
        <div className="chp-head" style={{ height: 138 * k }}>
          <div className="ch-stage" style={{ width: 92 * k, height: 138 * k }}>{mainMonkey}</div>
          {showChip && <div className="ch-chips">
            <span className="ch-chip" data-on={nActive ? '1' : '0'}><i />{t.chip} <b>{nActive}</b><span className="ch-dot">·</span>{t.done} <b className="d">{nDone}</b>{nQueued > 0 && <><span className="ch-dot">·</span>{t.q} <b className="q">{nQueued}</b></>}</span>
          </div>}
        </div>
        <ol className="chp-rows">
          {m.rows.map((r) => {
            const c = byId[r.id], st = r.st;
            const ind = st === 'run' && r.p == null;
            const pct = st === 'flash' || st === 'done' ? 100 : r.p == null ? 0 : Math.max(4, r.p * 100);
            const el = r.t0 ? fmt(((r.t1 || T) - r.t0)) : '—';
            const snick = c && c.phase === 'snicker';
            return (
              <li key={r.id} className="chp-row" data-st={st} data-ph={c ? c.phase : ''} data-kind={r.kind || 'staff'}>
                <span className="chp-av" ref={(e) => { avEls.current[r.id] = e; }}>
                  {st === 'done' ? <span className="chp-ok"><Check /></span>
                    : c && c.phase !== 'out' ? <span className="ch-clone" data-ph={c.phase} data-job={c.job} style={{ left: '50%', top: '100%', '--dl': c.delay + 'ms' }}>
                      <span className="ch-hop"><span className="ch-loop"><Sprite k={sprOf(c)} s={sA * (snick && c.snick === 'c-snick3' ? 1 : 1)} set={set} /></span></span></span>
                    : st === 'queued' || st === 'fail' || st === 'stop' ? <span className="chp-hair" data-st={st}><Sprite k="fx-hair" s={0.13 * k} set={set} /></span> : null}
                </span>
                <span className="chp-tx">
                  <span className="chp-l1"><span className="chp-name">{r.label || r.id}</span>
                    {st === 'fail' && <button type="button" className="chp-retry" onClick={() => { unlockAudio(); P.current.onRetry ? P.current.onRetry({ id: r.id, label: r.label, kind: r.kind }) : api.spawn(r.id, r.label, r.kind); }}>↻ {t.retry}</button>}
                    <span className="chp-time">{el}</span></span>
                  {st !== 'done' && <span className="chp-step">{st === 'queued' ? t.queued : st === 'fail' ? (r.step ? t.failed + ' · ' + r.step : t.failed) : st === 'stop' ? t.stopped : r.step || '\u00a0'}</span>}
                  {st !== 'done' && <span className="chp-track" ref={(e) => { rodEls.current[r.id] = e; }} data-ind={ind ? '1' : '0'} data-fly={r.fly ? '1' : '0'}>
                    {st === 'fail' ? <span className="chp-snap" style={{ width: Math.max(pct, 30) + '%' }}><Rod cls="h1" /><Rod cls="h2" /><i className="crack" /></span>
                      : st !== 'queued' && <Rod cls="chp-fill" style={{ width: ind ? undefined : pct + '%' }} />}
                  </span>}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="chp-fx" aria-hidden="true">{fxLayer}</div>
        <span className="ch-sr" aria-live="polite">{t.live(nActive, nQueued)}</span>
      </div>
    );
  }

  return (
    <div className={'ch ' + className} {...common}>
      <div className="ch-stage" style={{ width: stageW, height: 88 * k }}>
        {mainMonkey}
        {/* the clones */}
        {act.concat(m.clones.filter((c) => c.phase === 'out')).map((c) => (
          <div key={c.key} className="ch-clone" data-ph={c.phase} data-job={c.job} title={c.label || undefined}
            style={{ left: slotX(c.slot), top: G, '--fx': c.fx + 'px', '--fy': c.fy + 'px', '--dl': c.delay + 'ms' }}>
            <div className="ch-hop"><div className="ch-loop"><Sprite k={sprOf(c)} s={sC} set={set} /></div></div>
            {showLabels && c.label && <span className="ch-label">{c.label}</span>}
          </div>
        ))}
        {/* effects: poof clouds, wisps, homing hairs, sparkles */}
        {fxLayer}
      </div>
      {showChip && <div className="ch-chips">
        <span className="ch-chip" data-on={nActive ? '1' : '0'}><i />{t.chip} <b>{nActive}</b>{nQueued > 0 && <em>+{nQueued}</em>}</span>
      </div>}
      <span className="ch-sr" aria-live="polite">{t.live(nActive, nQueued)}</span>
    </div>
  );
});

export default CloneHairs;
