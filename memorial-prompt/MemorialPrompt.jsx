// 皇上批奏折 · Your Majesty, Approve? — a playful PERMISSION / APPROVAL prompt for AI agents.
// The agent kneels before you with a memorial (奏折) holding the tool call it wants to run. The longer you wait, the more he
// sweats; after ~20s he falls asleep (snot bubble). 准奏 (allow once) -> a red brush 「准」 on the memorial, he kowtows so hard
// the floor cracks, then scurries off. 驳回 (deny) -> the memorial slaps his face; 3 denials in a row -> 臣冤枉啊 bawling.
// 钦此 (always allow) -> a gold 玉玺 stamp slams down, golden-jacket disco. Dangerous commands (rm -rf, sudo, drop, payment…)
// arrive as a black-red 密折: his hat flies off and 准奏 needs a 1s press-and-hold. Approve 3 requests each <1.2s after they
// appear (not reading) -> sly gold-ingot grin, buried under memorials, and a big red 「昏君」 seal stamps across the prompt.
// Controlled: request {tool, command, summary?, danger?} + onDecision(decision, request); or imperative ask(req) / decide(d) /
// reset(). Host renders its own "Agent · status" row as children: order = [character strip] [children] [memorial card].
// Original art. SFX are synthesized at runtime (WebAudio); the Chinese voice lines are the author's own takes, embedded in memorial-sfx.js.
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { META, SPR_DARK, SPR_LIGHT } from './memorial-sprites.js';
import { GLYPH } from './memorial-glyphs.js';
import { VOICE } from './memorial-sfx.js';

const isB = () => typeof window !== 'undefined' && typeof document !== 'undefined';
const now = () => (isB() && window.performance ? performance.now() : Date.now());
const SIZES = { xs: 1, lg: 1.8 };
export const DANGER_RE = /\brm\s+-(?:[a-z]*r[a-z]*f|[a-z]*f[a-z]*r)\b|\brm\s+-r\b|\bsudo\b|\bdrop\s+(?:table|database|schema)\b|\btruncate\s+table\b|\bmkfs\b|\bdd\s+if=|\bchmod\s+-R\s+777\b|\bgit\s+push\b.*(?:--force|-f\b)|\bgit\s+reset\s+--hard\b|\bpayment|\bcharge\b|\bstripe\b|\btransfer\s+funds\b|\bcurl\b[^|]*\|\s*(?:sh|bash)\b/i;
export const isDanger = (r) => !!r && (r.danger != null ? !!r.danger : DANGER_RE.test(String(r.command || '') + ' ' + String(r.tool || '')));

const TXT = {
  zh: {
    title: '奏请圣裁', dangerTitle: '密折 · 危险操作', allow: '准奏', deny: '驳回', always: '钦此', alwaysHint: '总是允许', hold: '按住准奏',
    allowAria: '准奏：允许一次', denyAria: '驳回：拒绝', alwaysAria: '钦此：以后总是允许', holdAria: '按住一秒准奏：允许这次危险操作',
    noAlways: '密折不可钦此', why: '缘由', chip: { enter: '觐见', pending: '候旨', sleep: '睡着了', allow: '已准奏', always: '钦此', deny: '已驳回', cry: '冤枉', hunjun: '昏君！' },
    res: { allow: '已准奏', always: '已钦此 · 以后不再请示', deny: '已驳回' }, dangerTag: '密折',
    live: (r) => `请求权限：${r.tool || ''} ${r.command || ''}`, done: (d) => ({ allow: '已允许', always: '已总是允许', deny: '已拒绝' }[d]),
  },
  en: {
    title: 'Permission request', dangerTitle: 'Sealed memorial · dangerous', allow: 'Allow', deny: 'Deny', always: 'Always allow', alwaysHint: '', hold: 'Hold to allow',
    allowAria: 'Allow once', denyAria: 'Deny', alwaysAria: 'Always allow this tool', holdAria: 'Press and hold for one second to allow this dangerous command',
    noAlways: 'Not available for dangerous commands', why: 'Why', chip: { enter: 'Arriving', pending: 'Waiting', sleep: 'Asleep', allow: 'Allowed', always: 'Always', deny: 'Denied', cry: 'Wronged!', hunjun: 'Tyrant!' },
    res: { allow: 'Allowed', always: 'Always allowed', deny: 'Denied' }, dangerTag: 'Danger',
    live: (r) => `Permission requested: ${r.tool || ''} ${r.command || ''}`, done: (d) => ({ allow: 'Allowed', always: 'Always allowed', deny: 'Denied' }[d]),
  },
};

/* ---------------- sound: synthesized SFX + optional voice slots (one AudioContext) ----------------
   Rules (Clone Hairs lessons): one clean sound per beat, never two on the same beat, a voice line starts when the
   previous sound ENDS (+60ms, from the real duration). Voice slots are silent until a recording exists. */
let AC = null, MASTER = null, NOISE = null; const VBUF = {}; let VLOADED = false;
const DUR = { swish: 0.34, thud: 0.3, slap: 0.16, stamp: 0.32, gong: 1.25, coins: 0.6, snore: 1.5 };
const GAP = 0.06;
function ctx() {
  if (!isB()) return null;
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try {
      AC = new C();
      const lim = AC.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 2; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
      MASTER = AC.createGain(); MASTER.gain.value = 0.8; MASTER.connect(lim); lim.connect(AC.destination);
      const n = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = n.getChannelData(0); let s = 12345;
      for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } NOISE = n;
    } catch (_) { AC = null; return null; }
  }
  if (!VLOADED) { VLOADED = true; Object.keys(VOICE).forEach((k) => loadVoice(k, VOICE[k], true)); }
  return AC;
}
function unlockAudio() { const c = ctx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
function b64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function decode(c, ab) { return new Promise((res, rej) => { try { const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } }); }
function loadVoice(k, src, isB64) {
  const c = AC; if (!c || !src) return;
  const get = isB64 ? Promise.resolve(b64(src)) : fetch(src).then((r) => r.arrayBuffer());
  get.then((ab) => decode(c, ab)).then((b) => { VBUF[k] = b; }, () => {});
}
const env = (c, g, t, a, peak, dcy) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); };
function noise(c, t, dur) { const s = c.createBufferSource(); s.buffer = NOISE; s.start(t, Math.random() * 0.5, dur + 0.05); return s; }
// per-SFX level so the synth beats sit with the voice lines (voices: -20 LUFS, peaks ~-11 dBFS; raw synth peaks -1..-4 dBFS)
const LV = {swish: 4.121, thud: 0.804, slap: 0.7, stamp: 0.75, gong: 0.733, coins: 1.496, snore: 6.237}; // loudness-matched: max momentary -19 LUFS like the voices, SFX peaks capped at -3 dBFS
let OUT = null;
const VGAIN = {v_always: 0.902, v_approve: 0.933, v_buried: 1.084, v_cry: 0.989, v_danger: 1.0, v_deny: 1.109, v_praise: 1.035, v_smirk: 0.944, v_snore: 0.4, v_wait: 1.047, v_wait2: 0.944}; // every voice line matched to max momentary -19 LUFS
export const SFX = {
  // brush swish: a band-passed noise sweep up, like a wet brush dragged across paper
  swish: (c, t) => { const s = noise(c, t, DUR.swish), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(4200, t + 0.26); env(c, g, t, 0.05, 0.55, 0.27); s.connect(f); f.connect(g); g.connect(OUT); },
  // kowtow thud: a low sine knock that drops in pitch (head on the floor)
  thud: (c, t) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.2); env(c, g, t, 0.004, 0.9, 0.28); o.connect(g); g.connect(OUT); o.start(t); o.stop(t + DUR.thud + 0.02); },
  // paper slap: a short bright noise crack
  slap: (c, t) => { const s = noise(c, t, DUR.slap), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'highpass'; f.frequency.value = 1100; env(c, g, t, 0.002, 0.8, 0.13); s.connect(f); f.connect(g); g.connect(OUT); },
  // stamp thump: a heavy wooden thump (seal on paper)
  stamp: (c, t) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.16); env(c, g, t, 0.003, 1, 0.3); o.connect(g); g.connect(OUT); o.start(t); o.stop(t + DUR.stamp + 0.02); },
  // gong on 钦此: inharmonic partials, pitch bends up a touch, gone by 1.25s
  gong: (c, t) => { [[1, 0.5], [2.41, 0.22], [3.93, 0.12], [5.4, 0.06]].forEach(([r, a]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(170 * r, t); o.frequency.linearRampToValueAtTime(176 * r, t + 0.3); env(c, g, t, 0.01, a, DUR.gong - 0.02); o.connect(g); g.connect(OUT); o.start(t); o.stop(t + DUR.gong + 0.03); }); },
  // coins (昏君 gold grin): five small metallic pings
  coins: (c, t) => { [0, 0.07, 0.15, 0.24, 0.34].forEach((d, i) => { const f0 = [3150, 3720, 2890, 4180, 3500][i]; [1, 2.76].forEach((r, j) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f0 * r; env(c, g, t + d, 0.002, j ? 0.05 : 0.16, 0.22); o.connect(g); g.connect(OUT); o.start(t + d); o.stop(t + d + 0.26); }); }); },
  // snore: low filtered noise breathing in, a soft whistle out
  snore: (c, t) => { const s = noise(c, t, DUR.snore), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(900, t + 0.8); f.Q.value = 6; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95); s.connect(f); f.connect(g); g.connect(OUT);
    const o = c.createOscillator(), g2 = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(880, t + 1.0); o.frequency.exponentialRampToValueAtTime(560, t + 1.45); env(c, g2, t + 1.0, 0.05, 0.035, 0.42); o.connect(g2); g2.connect(OUT); o.start(t + 1.0); o.stop(t + DUR.snore + 0.02); },
};

/* ---------------- glyph art (SVG paths, so no webfont inside the shadow DOM) ---------------- */
const Glyph = ({ set, ch, x = 0, y = 0, s = 1, fill }) => <path d={GLYPH[set][ch]} transform={`translate(${x} ${y}) scale(${s})`} fill={fill} />;
// red brush 「准」 with a dry-brush swoosh under it
const Zhun = () => (
  <svg className="mp-zhun" viewBox="0 0 1200 1000" aria-hidden="true">
    <defs>
      <filter id="mp-ink" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" /><feDisplacementMap in="SourceGraphic" scale="14" /></filter>
      <clipPath id="mp-zclip"><rect className="mp-zrev" x="-40" y="-40" width="1300" height="1100" /></clipPath>
    </defs>
    <g filter="url(#mp-ink)" clipPath="url(#mp-zclip)">
      <path className="mp-zsw" d="M120 860 C 380 820, 760 800, 1120 760" fill="none" stroke="#c8281f" strokeWidth="46" strokeLinecap="round" opacity=".85" />
      <Glyph set="brush" ch="准" x={140} y={-40} s={0.95} fill="#d0301f" />
    </g>
  </svg>
);
// gold 玉玺 「钦此」 (阳刻: gold characters + gold border, knocked-out field) and the red 「昏君」 seal (阴刻)
const SealGold = () => (
  <svg className="mp-seal mp-seal-gold" viewBox="0 0 620 1000" aria-hidden="true">
    <defs>
      <linearGradient id="mp-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3b8" /><stop offset=".35" stopColor="#f6cc55" /><stop offset=".7" stopColor="#d39a2a" /><stop offset="1" stopColor="#ffe089" /></linearGradient>
      <filter id="mp-rough"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="3" result="n" /><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.4" result="m" /><feComposite in="SourceGraphic" in2="m" operator="in" /></filter>
    </defs>
    <g filter="url(#mp-rough)">
      <rect x="30" y="30" width="560" height="940" rx="46" fill="rgba(246,204,85,.10)" stroke="url(#mp-gold)" strokeWidth="44" />
      <rect x="86" y="86" width="448" height="828" rx="20" fill="none" stroke="url(#mp-gold)" strokeWidth="10" />
      <Glyph set="seal" ch="钦" x={110} y={100} s={0.4} fill="url(#mp-gold)" />
      <Glyph set="seal" ch="此" x={110} y={500} s={0.4} fill="url(#mp-gold)" />
    </g>
  </svg>
);
const SealRed = () => (
  <svg className="mp-seal mp-seal-red" viewBox="0 0 1000 560" aria-hidden="true">
    <defs><filter id="mp-rough2"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="11" result="n" /><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.0 1.45" result="m" /><feComposite in="SourceGraphic" in2="m" operator="in" /></filter></defs>
    <g filter="url(#mp-rough2)" fill="#e5352a">
      <rect x="24" y="24" width="952" height="512" rx="44" fill="rgba(229,53,42,.13)" stroke="#e5352a" strokeWidth="40" />
      <rect x="70" y="70" width="860" height="420" rx="18" fill="none" stroke="#e5352a" strokeWidth="9" />
      <Glyph set="seal" ch="昏" x={95} y={82} s={0.4} />
      <Glyph set="seal" ch="君" x={505} y={82} s={0.4} />
    </g>
  </svg>
);
const Ring = ({ p }) => (
  <svg className="mp-ring" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="2.2" />
    <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="47.12" strokeDashoffset={47.12 * (1 - p)} transform="rotate(-90 10 10)" /></svg>
);
const IC = {
  scroll: <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h7.5a1.5 1.5 0 011.5 1.5v8.5H5.5A1.5 1.5 0 014 11V2.5z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M4 11a1.5 1.5 0 001.5 1.5M6.5 5.5h4M6.5 8h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
  warn: <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2l6 10.6H2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M8 6.3v3.2M8 11.2v.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  ok: <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l2.9 2.8 6.1-6.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  no: <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  all: <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.6l2.4 2.4 4.6-5M7.6 10.4l.6.6 5.3-5.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};
const fmtW = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

const MemorialPrompt = forwardRef(function MemorialPrompt(props, ref) {
  const {
    request, onDecision, lang = 'zh', theme = 'dark', size = 'xs', sound = true, voices, autoFocus = true,
    nervousMs = 5000, sweatMs = 11000, sleepMs = 20000, holdMs = 1000, fastMs = 1200, fastCount = 3, denyCount = 3,
    showChip = true, children, className = '', style,
  } = props;
  const k = SIZES[size] || 1;
  const set = theme === 'light' ? SPR_LIGHT : SPR_DARK;
  const t = TXT[lang] || TXT.zh;
  const G = 94 * k, CX = 52 * k, S = 0.287 * k; // foot baseline, character x, sprite scale (calm pose ≈ 70px tall at xs; user OK'd 61→70, Oct 16)

  const [, setTick] = useState(0);
  const render = useCallback(() => setTick((x) => x + 1), []);
  const M = useRef(null);
  if (!M.current) M.current = { req: null, phase: 'empty', pose: 'p-calm', anim: '', stage: 0, shownAt: 0, fast: 0, denies: 0, fx: null, chip: null, result: null, next: null, hold: 0, gen: 0, rm: false, hj: false };
  const P = useRef(props); P.current = props;
  const CURV = useRef(null), timers = useRef(new Set()), cardRef = useRef(null), holdRef = useRef(null);
  const later = useCallback((f, ms) => { const id = setTimeout(() => { timers.current.delete(id); f(); }, ms); timers.current.add(id); return id; }, []);
  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current.clear(); if (holdRef.current) { cancelAnimationFrame(holdRef.current.raf); holdRef.current = null; } };

  /* sound: play(name) returns its duration in seconds (0 when muted) so beats can be sequenced */
  const live = () => { if (P.current.sound === false) return null; const c = ctx(); return c && c.state === 'running' ? c : null; };
  const play = (name) => { const c = live(); if (!c) return 0; if (window.__mpSfxLog) window.__mpSfxLog.push([name, Math.round(now())]); try { const g = c.createGain(); g.gain.value = LV[name] || 1; g.connect(MASTER); OUT = g; SFX[name](c, c.currentTime + 0.005); } catch (_) {} return DUR[name]; };
  const voice = (slot) => { const c = live(); const b = VBUF[slot]; if (!c || !b) return 0; if (window.__mpSfxLog) window.__mpSfxLog.push([slot, Math.round(now())]); hush(); const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = VGAIN[slot] || 1; s.connect(g); g.connect(MASTER); s.start(); CURV.current = { s, g }; return b.duration; };
  // cut a still-running voice line with a ~30ms fade (a new beat never lands on top of an old line)
  const hush = () => { const v = CURV.current; const c = AC; if (!v || !c) return; try { v.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.01); v.s.stop(c.currentTime + 0.06); } catch (_) {} CURV.current = null; };
  const hasVoice = (slot) => !!VBUF[slot];
  // a voice line that starts once the previous sound has ended (+60ms)

  const danger = (r) => isDanger(r || M.current.req);

  /* waiting: calm -> nervous -> sweat waterfall (皇上～皇上？) -> asleep (snore loop). A dangerous memorial keeps him awake. */
  const waitPose = () => { const m = M.current; if (danger()) return 'p-danger'; return ['p-calm', 'p-nervous', 'p-sweat', 'p-sleep'][m.stage]; };
  const startWait = () => {
    const m = M.current, gen = m.gen; m.stage = 0;
    if (danger()) return;
    later(() => { if (m.gen === gen && m.phase === 'pending') { m.stage = 1; m.pose = waitPose(); render(); } }, P.current.nervousMs ?? nervousMs);
    later(() => { if (m.gen === gen && m.phase === 'pending') { m.stage = 2; m.pose = waitPose(); voice('v_wait2'); render(); } }, P.current.sweatMs ?? sweatMs);
    later(() => { if (m.gen === gen && m.phase === 'pending') { m.stage = 3; m.pose = waitPose(); m.chip = 'sleep'; render(); snore(gen); } }, P.current.sleepMs ?? sleepMs);
  };
  const snore = (gen) => { const m = M.current; if (m.gen !== gen || m.stage !== 3 || m.phase !== 'pending') return; const d = hasVoice('v_snore') ? voice('v_snore') : play('snore'); later(() => snore(gen), Math.max(2800, (d + 1.6) * 1000)); }; // gentle loop: snore, ~1.6s breath, snore…
  const wake = () => { const m = M.current; if (m.phase !== 'pending' || m.stage !== 3) return; m.gen++; m.stage = 2; m.pose = waitPose(); m.chip = 'pending'; m.anim = 'startle'; render(); const gen = m.gen; later(() => { if (m.gen === gen) { m.anim = ''; render(); } }, 400); startWaitFrom(2, gen); };
  const startWaitFrom = (stg, gen) => { const m = M.current; later(() => { if (m.gen === gen && m.phase === 'pending') { m.stage = 3; m.pose = waitPose(); m.chip = 'sleep'; render(); snore(gen); } }, (P.current.sleepMs ?? sleepMs) - (P.current.sweatMs ?? sweatMs)); };

  const show = (req) => {
    const m = M.current; clearAll(); const gen = ++m.gen;
    Object.assign(m, { req, phase: 'pending', stage: 0, fx: null, result: null, hold: 0, hj: false, shownAt: now(), chip: 'pending' });
    if (m.rm) { m.pose = waitPose(); m.anim = ''; render(); startWait(); focusCard(); return; }
    m.pose = 'p-enter'; m.anim = 'enter'; m.chip = 'enter'; render();
    later(() => {
      if (m.gen !== gen) return; m.anim = danger() ? 'hatpop' : ''; m.pose = waitPose(); m.chip = 'pending'; render();
      voice(danger() ? 'v_danger' : 'v_wait');
      later(() => { if (m.gen === gen && m.anim === 'hatpop') { m.anim = ''; render(); } }, 500);
      startWait();
    }, 420);
    focusCard();
  };
  const focusCard = () => { if (P.current.autoFocus === false) return; later(() => { const el = cardRef.current; if (el && el.focus) try { el.focus({ preventScroll: true }); } catch (_) {} }, 30); };

  const finish = () => {
    const m = M.current; m.phase = 'done'; m.anim = ''; m.fx = null; m.gen++; render();
    if (m.next) { const n = m.next; m.next = null; later(() => show(n), 260); }
  };
  const exit = (how, ms) => { const m = M.current, gen = m.gen; m.anim = how; render(); later(() => { if (m.gen === gen) finish(); }, ms); };

  const decide = (d) => {
    const m = M.current; if (m.phase !== 'pending' || !m.req) return;
    if (d === 'always' && danger()) return;
    unlockAudio();
    const req = m.req, dt = now() - m.shownAt, gen = ++m.gen;
    clearAll(); hush();
    m.phase = 'out'; m.result = { decision: d, req, danger: danger() }; m.anim = '';
    if (d === 'deny') { m.fast = 0; m.denies++; } else { m.denies = 0; m.fast = dt < (P.current.fastMs ?? fastMs) ? m.fast + 1 : 0; }
    try { P.current.onDecision && P.current.onDecision(d, req); } catch (_) {}
    const hunjun = d !== 'deny' && m.fast >= (P.current.fastCount ?? fastCount);
    const cry = d === 'deny' && m.denies >= (P.current.denyCount ?? denyCount);
    if (hunjun) m.fast = 0; if (cry) m.denies = 0;
    if (m.rm) { m.pose = hunjun ? 'p-buried' : cry ? 'p-cry' : d === 'deny' ? 'p-slap' : d === 'always' ? 'p-disco' : 'p-kowtow'; m.fx = hunjun ? 'hunjun' : d === 'deny' ? null : d === 'always' ? 'qin' : 'zhun'; m.chip = hunjun ? 'hunjun' : cry ? 'cry' : d; m.hj = hunjun; render(); later(() => { if (m.gen === gen) finish(); }, 1600); return; }
    const L = (f, ms) => later(() => { if (m.gen === gen) { f(); render(); } }, ms);
    // beat(slot, sfx): a recorded voice line carries its beat and that beat's SFX stays silent; otherwise the SFX plays.
    // Returns the seconds of sound on the beat, so the next beat starts when it ends (+60ms).
    const beat = (slot, sfx) => (slot && hasVoice(slot) && live() ? voice(slot) : sfx ? play(sfx) : 0);
    const vd = (slot) => (hasVoice(slot) && live() ? VBUF[slot].duration : 0);
    if (hunjun) {
      // 昏君: gold grin (嘿嘿嘿 | coins) -> buried under memorials (救命…) -> 皇上英明～ (or a beat of silence) -> the red seal
      m.hj = true; m.fx = 'zhun'; m.chip = 'allow'; m.pose = 'p-greedy'; m.anim = 'greedy';
      // tightened Oct 16 (user OK): no extra pads, voice lines chain back-to-back (+GAP)
      const a = Math.max(0.9, beat('v_smirk', 'coins') + GAP);
      L(() => { m.pose = 'p-buried'; m.anim = 'bury'; beat('v_buried'); }, a * 1000);
      const b = a + Math.max(0.9, vd('v_buried') + GAP);
      L(() => beat('v_praise'), b * 1000);
      const pr = vd('v_praise') ? vd('v_praise') + GAP : 0.35;
      L(() => { m.fx = 'hunjun'; m.chip = 'hunjun'; m.anim = 'seal'; play('stamp'); }, (b + pr) * 1000);
      L(() => { m.anim = 'slink'; }, (b + pr + 1.6) * 1000);
      later(() => { if (m.gen === gen) finish(); }, (b + pr + 2.2) * 1000);
      render(); return;
    }
    if (d === 'allow') {
      // 准 brush (swish) -> kowtow (谢主隆恩！ | thud) -> scurry off
      m.fx = 'zhun'; m.chip = 'allow'; const sw = play('swish');
      const at = Math.max(0.46, sw + GAP);
      L(() => { m.pose = 'p-kowtow'; m.anim = 'kowtow'; beat('v_approve', 'thud'); }, at * 1000);
      const hold = at + Math.max(1.0, (vd('v_approve') || DUR.thud) + 0.2);
      L(() => { m.pose = 'p-scurry'; m.anim = 'scurry'; }, hold * 1000);
      later(() => { if (m.gen === gen) finish(); }, (hold + 0.75) * 1000);
    } else if (d === 'always') {
      // gold 钦此 stamp (thump) -> golden disco (奴才领旨！ | gong)
      m.fx = 'qin'; m.chip = 'always'; const st = play('stamp');
      const at = Math.max(0.3, st + GAP);
      L(() => { m.pose = 'p-disco'; m.anim = 'disco'; beat('v_always', 'gong'); }, at * 1000);
      const hold = at + Math.max(2.2, (vd('v_always') || DUR.gong) + 0.5);
      L(() => { m.anim = 'discoout'; }, hold * 1000);
      later(() => { if (m.gen === gen) finish(); }, (hold + 0.6) * 1000);
    } else {
      // memorial slaps his face (哎哟！ | paper slap); 3rd in a row -> 臣冤枉啊～ once the slap beat has ended
      m.fx = 'slap'; m.chip = 'deny'; m.pose = 'p-slap'; m.anim = 'slap'; const sl = beat('v_deny', 'slap');
      if (cry) {
        const at = Math.max(0.7, sl + GAP);
        L(() => { m.pose = 'p-cry'; m.anim = 'cry'; m.chip = 'cry'; m.fx = null; beat('v_cry'); }, at * 1000);
        const hold = at + Math.max(2.2, vd('v_cry') + 0.3);
        L(() => { m.anim = 'slink'; }, hold * 1000);
        later(() => { if (m.gen === gen) finish(); }, (hold + 0.6) * 1000);
      } else {
        const hold = Math.max(1.15, sl + 0.2);
        L(() => { m.anim = 'slink'; m.fx = null; }, hold * 1000);
        later(() => { if (m.gen === gen) finish(); }, (hold + 0.6) * 1000);
      }
    }
    render();
  };

  /* press-and-hold for 密折 */
  const holdStart = (e) => {
    const m = M.current; if (m.phase !== 'pending' || holdRef.current) return; unlockAudio();
    if (e && e.preventDefault) e.preventDefault();
    if (m.stage === 3) wake();
    const t0 = now(), dur = P.current.holdMs ?? holdMs;
    const step = () => { const p = Math.min(1, (now() - t0) / dur); m.hold = p; render(); if (p >= 1) { holdRef.current = null; m.hold = 0; decide('allow'); } else holdRef.current.raf = requestAnimationFrame(step); };
    holdRef.current = { raf: requestAnimationFrame(step) };
  };
  const holdEnd = () => { const m = M.current; if (!holdRef.current) return; cancelAnimationFrame(holdRef.current.raf); holdRef.current = null; m.hold = 0; render(); };

  const onKey = (e) => {
    const m = M.current; if (m.phase !== 'pending') return;
    const btn = e.target && e.target.tagName === 'BUTTON';
    if (e.key === 'Escape') { e.preventDefault(); decide('deny'); }
    else if (e.key === 'Enter' && !e.shiftKey) {
      if (danger()) { if (!e.repeat) { e.preventDefault(); holdStart(e); } }
      else if (!btn) { e.preventDefault(); decide('allow'); }
    } else if ((e.key === 'a' || e.key === 'A') && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); decide('always'); }
  };
  const onKeyUp = (e) => { if (e.key === 'Enter' || e.key === ' ') holdEnd(); };

  const api = {
    ask(req) { const m = M.current; unlockAudio(); if (!req) return; if (m.phase === 'out') { m.next = req; return; } show(req); },
    decide(d) { decide(d); },
    reset() { clearAll(); hush(); Object.assign(M.current, { req: null, phase: 'empty', pose: 'p-calm', anim: '', stage: 0, fx: null, chip: null, result: null, next: null, hold: 0, fast: 0, denies: 0, hj: false, gen: M.current.gen + 1 }); render(); },
    get state() { const m = M.current; return { phase: m.phase, hold: m.hold, shownAt: m.shownAt, anim: m.anim, chip: m.chip, pose: m.pose, stage: m.stage, fx: m.fx, fast: m.fast, denies: m.denies, danger: m.req ? danger() : false, result: m.result ? { decision: m.result.decision } : null }; },
  };
  const apiRef = useRef(api); apiRef.current = api;
  useImperativeHandle(ref, () => ({ ask: (r) => apiRef.current.ask(r), decide: (d) => apiRef.current.decide(d), reset: () => apiRef.current.reset(), get state() { return apiRef.current.state; } }), []);

  // controlled: a new `request` object -> ask it
  const lastReq = useRef(undefined);
  useEffect(() => { if (request === lastReq.current) return; lastReq.current = request; if (request) apiRef.current.ask(request); }, [request]);

  useEffect(() => {
    const m = M.current;
    const mq = isB() && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    m.rm = !!(mq && mq.matches); const onMq = () => { m.rm = !!mq.matches; render(); };
    mq && mq.addEventListener && mq.addEventListener('change', onMq);
    const on = () => unlockAudio();
    document.addEventListener('pointerdown', on, true); document.addEventListener('keydown', on, true);
    Object.values(set).forEach((src) => { const i = new Image(); i.src = src; i.decode && i.decode().catch(() => {}); });
    return () => { clearAll(); document.removeEventListener('pointerdown', on, true); document.removeEventListener('keydown', on, true); mq && mq.removeEventListener && mq.removeEventListener('change', onMq); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // user-supplied voice files (prop voices = { v_wait: url, ... }) override the embedded ones
  useEffect(() => { if (!voices) return; const go = () => { const c = ctx(); if (!c) return; Object.entries(voices).forEach(([kk, u]) => u && loadVoice(kk, u, false)); }; if (AC) go(); else if (isB()) { const f = () => { go(); document.removeEventListener('pointerdown', f, true); }; document.addEventListener('pointerdown', f, true); } }, [voices]);
  // waiting timer chip ticks once a second
  const m = M.current;
  const waiting = m.phase === 'pending';
  useEffect(() => { if (!waiting) return undefined; const iv = setInterval(render, 1000); return () => clearInterval(iv); }, [waiting]); // eslint-disable-line react-hooks/exhaustive-deps

  const req = m.req, dz = req ? danger() : false;
  const pose = m.pose, pm = META[pose] || META['p-calm'];
  const stripOpen = m.phase === 'pending' || m.phase === 'out';
  const cardOpen = m.phase === 'pending' || m.phase === 'out';
  const res = m.result;
  const chipTxt = m.chip ? t.chip[m.chip] : '';
  const isShell = req && /^(bash|shell|run|exec|terminal|command)$/i.test(String(req.tool || ''));

  const common = {
    className: 'mp ' + className, style: { '--k': k, ...style }, onPointerEnter: wake,
    'data-size': SIZES[size] ? size : 'xs', 'data-theme': theme === 'light' ? 'light' : 'dark', 'data-phase': m.phase, 'data-pose': pose,
    'data-anim': m.anim || '', 'data-stage': m.stage, 'data-danger': dz ? '1' : '0', 'data-fx': m.fx || '', 'data-hunjun': m.hj ? '1' : '0',
    'data-decision': res ? res.decision : '', 'data-rm': m.rm ? '1' : '0',
  };
  return (
    <div {...common}>
      <div className="mp-strip" data-open={stripOpen ? '1' : '0'} style={{ height: stripOpen ? 100 * k : 0 }} aria-hidden="true">
        <div className="mp-stage" style={{ height: 88 * k }}>
          <div className="mp-chr" style={{ left: CX, top: G }}>
            <div className="mp-move"><div className="mp-body">
              {(pose === 'p-disco') && <span className="mp-glow" style={{ left: -60 * k, top: -78 * k, width: 120 * k, height: 90 * k }} />}
              <img className="mp-img" src={set[pose]} alt="" draggable={false} style={{ left: -pm.ax * S, top: -pm.ay * S, width: pm.w * S, height: pm.h * S }} />
              {pose === 'p-sleep' && <span className="mp-zz" style={{ left: 18 * k, top: -60 * k }}><i>z</i><i>z</i><i>Z</i></span>}
              {pose === 'p-disco' && <span className="mp-sparks"><i /><i /><i /><i /><i /></span>}
              {pose === 'p-kowtow' && <span className="mp-dust" style={{ left: -30 * k, top: -6 * k }}><i /><i /><i /></span>}
            </div></div>
          </div>
        </div>
        {showChip && chipTxt && <span className="mp-chip" data-c={m.chip}><i />{chipTxt}{m.phase === 'pending' && <b>{fmtW(now() - m.shownAt)}</b>}</span>}
      </div>
      {children}
      {cardOpen && req ? (
        <div className="mp-card" ref={cardRef} tabIndex={-1} role="alertdialog" aria-modal="false" aria-labelledby="mp-title" aria-describedby="mp-cmd"
          onKeyDown={onKey} onKeyUp={onKeyUp} data-danger={dz ? '1' : '0'} data-fx={m.fx || ''}>
          <div className="mp-head">
            <span className="mp-hic">{dz ? IC.warn : IC.scroll}</span>
            <span className="mp-title" id="mp-title">{dz ? t.dangerTitle : t.title}</span>
            {req.tool && <span className="mp-tool">{req.tool}</span>}
            {dz && <span className="mp-tag">{t.dangerTag}</span>}
          </div>
          <div className="mp-cmd" id="mp-cmd"><code>{isShell && <span className="mp-ps">$ </span>}{req.command}</code></div>
          {req.summary && <div className="mp-why"><span>{t.why}</span>{req.summary}</div>}
          <div className="mp-btns" role="group">
            {dz ? (
              <button type="button" className="mp-b mp-allow mp-holdb" aria-label={t.holdAria} disabled={m.phase !== 'pending'} style={{ '--hp': m.hold }}
                onPointerDown={holdStart} onPointerUp={holdEnd} onPointerLeave={holdEnd} onPointerCancel={holdEnd} onClick={(e) => e.preventDefault()}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); e.stopPropagation(); holdStart(e); } }}>
                <Ring p={m.hold} />{t.hold}<kbd>↵</kbd>
              </button>
            ) : (
              <button type="button" className="mp-b mp-allow" aria-label={t.allowAria} disabled={m.phase !== 'pending'} onClick={() => decide('allow')}>{t.allow}<kbd>↵</kbd></button>
            )}
            <button type="button" className="mp-b mp-always" aria-label={dz ? t.noAlways : t.alwaysAria} title={dz ? t.noAlways : undefined} disabled={m.phase !== 'pending' || dz} onClick={() => decide('always')}>
              {t.always}{t.alwaysHint && <small>{t.alwaysHint}</small>}<kbd>A</kbd></button>
            <span className="mp-grow" />
            <button type="button" className="mp-b mp-deny" aria-label={t.denyAria} disabled={m.phase !== 'pending'} onClick={() => decide('deny')}>{t.deny}<kbd>Esc</kbd></button>
          </div>
          <div className="mp-fx" aria-hidden="true">
            {(m.fx === 'zhun' || m.hj) && <Zhun />}
            {m.fx === 'qin' && <SealGold />}
            {m.fx === 'hunjun' && <SealRed />}
          </div>
        </div>
      ) : m.phase === 'done' && res ? (
        <div className="mp-res" data-d={res.decision} data-danger={res.danger ? '1' : '0'} data-hunjun={m.hj ? '1' : '0'}>
          <span className="mp-ric">{res.decision === 'deny' ? IC.no : res.decision === 'always' ? IC.all : IC.ok}</span>
          <span className="mp-rl">{t.res[res.decision]}</span>
          {res.req.tool && <span className="mp-tool">{res.req.tool}</span>}
          <code className="mp-rc">{res.req.command}</code>
        </div>
      ) : null}
      <span className="mp-sr" aria-live="polite">{m.phase === 'pending' && req ? t.live(req) : res && m.phase === 'done' ? t.done(res.decision) : ''}</span>
    </div>
  );
});

export default MemorialPrompt;
