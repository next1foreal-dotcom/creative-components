'use client';
// ChantingMonk (唠叨和尚): a streaming message bubble for AI agents. A little monk sits on top of the bubble and taps a
// wooden fish in time with the chant while tokens stream (v8: hits are locked to the OIIA beat), while a monkey in a golden headband listens beside him. Short answers keep the
// monkey happy. Long, rambling answers make the monk chant faster and the headband tightens (紧箍咒) until the monkey
// rolls on the floor with smoke coming out of its ears. Press Stop and the monkey stuffs a peach in the monk's mouth.
//
// Feed it with `stream` (an AsyncIterable of strings, a ReadableStream, or a function returning one), or drive it
// yourself with `text` + `streaming`, or set `demo="short" | "ramble"` to simulate an answer.
// The chant is the OIIA cat meme ("oiiaioooooiai"), looped phrase by phrase and sped up as the monk loses it.
import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useId } from 'react';
import SFX_DATA, { OIIA } from './chanting-monk-sfx.js';
import SPR from './chanting-monk-sprites.js';
import SPR_DARK from './chanting-monk-sprites-dark.js'; // v8y: same art, white sticker border stripped for theme="dark"

const isBrowser = () => typeof window !== 'undefined';
const reduced = () => isBrowser() && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mayPlay = () => typeof navigator !== 'undefined' && (!navigator.userActivation || navigator.userActivation.hasBeenActive);

// Joke + reward timings (ms). Slow on purpose so every beat reads.
const J = { leap: 0, stuff: 640, back: 1300, drop: 1900, dust: 2550, rest: 3600 };
const R = { palms: 0, bell: 420, flip: 900, bow: 1550, rest: 2600 };
// v8: the chant is the clock. Wooden-fish hits are no longer fired by token arrival: a token QUEUES a hit, and the hit
// plays on the next beat of the OIIA phrase (OIIA.beat = per-clip syllable onsets on a 16th-note grid, cm/sfx_gen.py).
// Beats: 16ths in 紧箍咒/失控 (v8 exactly).
// v8s (入定/开念) + v8t (入迷): one knock on every SUNG syllable of the phrase (OIIA.J = o i i a i o o o o o ia i, 12 per
// phrase; 0.75x clip in 入定/开念, 1x clip in 入迷), table onsets / tok rotation / gain / duck as in v8; no knock in the breath.
const BEAT_UNITS = { wait: 0, open: 2, zone: 2, tight: 1, wild: 1 };
const SUNG = OIIA.J;
const HZN = 0.1;      // s of look-ahead: hits and phrases are scheduled on the audio timeline up to 100 ms ahead
const TICK = 25;      // ms between scheduler ticks
// v7 chant = the OIIA cat phrase "oiiaioooooiai", one pitch-preserved clip per speed (0.75x 入定/开念, 1x 入迷,
// 1.25x 紧箍咒, 1.5x 失控). It loops phrase by phrase with a breath between phrases that shrinks as the monk speeds up;
// the cloud spells the phrase out syllable by syllable in time with the clip (OIIA.on = onset fractions, OIIA.let).
const BED_KEY = { wait: 'oi075', open: 'oi075', zone: 'oi100', tight: 'oi125', wild: 'oi150' };
// v7 breaths between phrases were wait .9 / open .45 / zone .24 / tight .10 / wild .03 s; v8 rounds each phrase period to
// a whole number of beats (OIIA.per, in grid units) so the grid runs straight through the breath.
const unitT = (k, j) => { const B = OIIA.beat[k]; return j < B.length ? B[j] : OIIA.t0[k] + OIIA.u[k] * j; };
const KEY_STATE = { oi075: 'open', oi100: 'zone', oi125: 'tight', oi150: 'wild' };
const perOf = (sub, k) => (BED_KEY[sub] === k && OIIA.per[sub]) || OIIA.per[KEY_STATE[k]] || 16;
const BED_STALL = 1.5; // s without a token mid-stream = paused: fade the chant out, pick it up on the next token

// v8w: default character thresholds and the tier -> state map (tier 5 = past the last level: reserved, 失控 for now)
const DEFAULT_LEVELS = [200, 500, 800, 1000];
const TIERS = ['open', 'zone', 'tight', 'wild', 'wild'];

const LABELS = {
  zh: { wait: '入定…', open: '开念', zone: '入迷', tight: '紧箍咒!', wild: '失控!!', stopped: '已打断', calm: '善哉', tired: '念完了…', idle: '',
    stop: '停', stopAria: '停止生成', fish: '敲木鱼:功德 +1', merit: '功德' },
  en: { wait: 'Meditating…', open: 'Chanting', zone: 'In the zone', tight: 'Rambling!', wild: 'Out of control!!', stopped: 'Stopped', calm: 'Done', tired: 'Done… finally', idle: '',
    stop: 'Stop', stopAria: 'Stop generating', fish: 'Tap the wooden fish: merit +1', merit: 'Merit' },
};

const DEMO = {
  zh: {
    short: '可以。把 userId 加进 useEffect 的依赖数组里,id 一变就重新请求;再在清理函数里取消上一次请求,旧数据就不会盖掉新数据了。',
    ramble: '好的!这是一个非常好的问题,让我们从头说起。首先,我们需要理解什么是状态。状态,从广义上讲,是某一时刻系统的全部信息;从狭义上讲,它又是组件里会变的那一部分。那么问题来了,为什么会变?这就要从 JavaScript 的历史讲起了。1995 年,一位工程师用十天写出了这门语言,当然这和你的问题关系不大,但了解背景总是有益的。回到正题,在回答之前,我想先补充三点注意事项,其中第二点又可以细分为五个小点。第一,渲染是纯函数;第二,副作用要放进 effect,这里又分为挂载、更新、卸载三种情况,每一种情况又有它的边界条件;第三,我们还应当考虑并发模式、服务端渲染、无障碍、国际化、性能、可测试性以及团队协作中的命名规范。说到命名规范,其实变量名的选择也是一门学问,驼峰还是下划线,这个问题业界争论了很多年。总而言之,言而总之,综上所述,换句话说,也就是说,简单来讲,我们可以得出一个初步的结论,不过在给出结论之前,让我们再回顾一下前面提到的所有要点,并逐一展开。第一点我们已经讲过了,但我想换一个角度再讲一遍,因为重复是学习之母。第二点,其实和第一点有异曲同工之妙,只不过侧重点略有不同,具体来说又可以分为上、中、下三篇。上篇讲起源,中篇讲发展,下篇讲未来展望。在展望未来之前,我们不妨先回顾一下过去,毕竟温故而知新。说到过去,就不得不提二十年前的网页开发:那时没有组件,没有状态管理,一个页面就是一个巨大的文件,里面混着表格、样式和脚本,改一行要祈祷三天。后来有了库,有了框架,有了框架的框架,还有了比较这些框架的文章,以及比较这些文章的文章。我个人比较推荐你把这些文章都读一遍,读完之后你就会发现,问题其实还在原地。好,现在我们正式进入下篇。下篇又分为甲、乙、丙、丁四个部分。甲部分讨论请求的生命周期:发起、等待、成功、失败、重试、取消、超时、再重试、再取消;乙部分讨论缓存:缓存什么、缓存多久、缓存失效以后怎么办、失效的缓存还算不算缓存;丙部分讨论竞态条件,这个词听起来很吓人,其实就是两个请求在赛跑,谁后到谁说了算,就像早上抢厕所一样;丁部分是附录,附录里还有附录的附录。当然,在讲丁部分之前,我们还要先讲一讲甲乙丙之间的关系,因为它们并不是孤立存在的,而是相互影响、相互渗透、相互成就的。说到相互成就,我想起了一个小故事:从前有座山,山里有座庙,庙里有个老和尚在给小和尚讲故事,讲的是什么呢?讲的是从前有座山,山里有座庙……抱歉,我们回到正题。正题是什么来着?对,是状态,是副作用,是依赖数组,是清理函数,是竞态,是缓存,是框架,是历史,是未来,是人生。人生其实也是一个大的 useEffect,依赖一变,一切重来。所以,在我看来,……',
  },
  en: {
    short: 'Yes. Add userId to the useEffect dependency array so it refetches when the id changes, and abort the previous request in the cleanup so stale data never overwrites fresh data.',
    ramble: "Great question! Let's start from the very beginning. First, we need to understand what state really is. In the broadest sense, state is everything a system knows at a given moment; in a narrower sense, it is the part of a component that changes. Which raises the question: why does it change? To answer that, we have to go back to 1995, when an engineer wrote a language in ten days, which admittedly has little to do with your question, but context is always valuable. Before I answer, let me add three caveats, the second of which splits into five sub-points. One, rendering is pure. Two, side effects belong in effects, which come in three flavours, each with its own edge cases. Three, we should also consider concurrency, server rendering, accessibility, internationalisation, performance, testability and naming conventions. Speaking of naming conventions, camelCase versus snake_case is a debate that has raged for years. In summary, to put it another way, simply put, in other words, we can reach a preliminary conclusion, but before we do, let's revisit every point above one by one. The first point we already covered, but I'd like to cover it again from another angle, because repetition is the mother of learning. The second point is remarkably similar to the first, only with a slightly different emphasis, and it naturally divides into three parts: origins, evolution and future outlook. Before looking ahead, though, it's worth looking back once more…",
  },
};

// ---------- sound (muted unless `sound`): synthesized samples (cm/sfx_gen.py), WebAudio, created lazily after a gesture.
// v6: one AudioContext + decoded buffers shared by every instance on the page (browsers cap live contexts).
const SHARED = { ctx: null, out: null, bufs: {}, fb: {}, users: 0 };
function makeAudio() {
  let noWA = false; SHARED.users++;
  const bufs = SHARED.bufs, fb = SHARED.fb;
  const get = () => {
    if (SHARED.ctx) return SHARED.ctx;
    let ctx = null, out = null;
    const AC = isBrowser() && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try { ctx = new AC(); out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination); } catch (_) { ctx = null; }
    // v6: decode the inlined data URIs ourselves (no fetch: works in sandboxed / opaque-origin iframes and under strict
    // CSP); a clip that fails to decode is played through an <audio> element instead.
    if (ctx) for (const [k, url] of Object.entries(SFX_DATA)) {
      let ab = null;
      try { const bin = atob(url.slice(url.indexOf(',') + 1)); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); ab = u8.buffer; } catch (_) { fb[k] = 1; continue; }
      try {
        const pr = ctx.decodeAudioData(ab, (b) => { bufs[k] = b; }, () => { fb[k] = 1; });
        if (pr && pr.then) pr.then((b) => { bufs[k] = b; }, () => { fb[k] = 1; });
      } catch (_) { fb[k] = 1; }
    }
    SHARED.ctx = ctx; SHARED.out = out;
    return ctx;
  };
  // called synchronously inside a user gesture (click / key / pointerdown): create + resume the context and play one
  // silent frame, which is what Safari/iOS and Chrome's autoplay policy need to let later, timer-driven taps sound.
  const unlock = () => {
    const c = get();
    if (!c) { noWA = true; return; }
    try { if (c.state !== 'running') c.resume().catch(() => {}); } catch (_) {}
    try { const b = c.createBuffer(1, 1, c.sampleRate || 44100), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (_) {}
  };
  // HTMLAudioElement fallback (no WebAudio, or a clip WebAudio could not decode)
  const el = (k, rate, gain) => {
    const url = SFX_DATA[k]; if (!url || typeof Audio === 'undefined') return null;
    try { const a = new Audio(url); a.playbackRate = rate; a.preservesPitch = false; a.volume = Math.max(0, Math.min(1, gain * 0.9)); const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); return { el: a, k }; } catch (_) { return null; }
  };
  const live = new Set();
  // [sfx-pass v5] choke groups: a new fish hit fades the previous one out (12 ms) and a new chant syllable fades the
  // previous syllable (25 ms), so fast 紧箍 taps stay separate hits instead of piling into mush. Fish hits closer than
  // 55 ms are dropped. (v8: token-driven hits go through hitAt(), scheduled on the chant's beat; play() is for one-shots.)
  let lastTok = -1;
  const choke = (c, grp, ms) => {
    for (const h of live) if (h.grp === grp) {
      try { const t = c.currentTime, gp = h.g.gain; gp.cancelScheduledValues(t); gp.setValueAtTime(gp.value, t); gp.linearRampToValueAtTime(0, t + ms / 1000); h.src.stop(t + ms / 1000 + 0.005); } catch (_) {}
      live.delete(h);
    }
  };
  const play = (k, rate = 1, gain = 1) => {
    const c = noWA ? null : get();
    if (!c || (fb[k] && !bufs[k])) return el(k, rate, gain);
    if (!bufs[k]) return el(k, rate, gain); // still decoding (first few ms after the unlock): <audio> fallback
    if (c.state === 'suspended') c.resume().catch(() => {});
    const grp = k.startsWith('tok') ? 'tok' : null;
    if (grp === 'tok') { if (c.currentTime - lastTok < 0.055) return null; lastTok = c.currentTime; choke(c, 'tok', 12); duckBed(); }
    // [/sfx-pass v5]
    try {
      const src = c.createBufferSource(), g = c.createGain(), b = bufs[k];
      src.buffer = b; src.playbackRate.value = rate;
      const t = c.currentTime, end = t + b.duration / rate;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.003);
      g.gain.setValueAtTime(gain, Math.max(t + 0.004, end - 0.01)); g.gain.linearRampToValueAtTime(0, end);
      src.connect(g).connect(SHARED.out); src.start(t);
      const h = { src, g, k, grp }; live.add(h); src.onended = () => live.delete(h);
      return h;
    } catch (_) { return null; }
  };
  // cut every voice line with a 30 ms fade (no trailing half syllable)
  const cutVoice = () => {
    const ctx = SHARED.ctx; if (!ctx) return;
    for (const h of live) if (h.k[0] === 'c' && h.k[1] === 'h') {
      try { const t = ctx.currentTime, gp = h.g.gain; gp.cancelScheduledValues(t); gp.setValueAtTime(gp.value, t); gp.linearRampToValueAtTime(0, t + 0.03); h.src.stop(t + 0.035); } catch (_) {}
      live.delete(h);
    }
  };
  // ---------- v7 OIIA chant bed: one phrase per source, phrase-aligned speed switches, duck under fish hits ----------
  // chain: phrase gain -> duck -> fade -> lowpass (tape-stop muffle) -> SHARED.out. Per instance, created lazily.
  let bus = null, cur = null; const els = new Set(), bed = new Set(); let elFade = null;
  const meta = {}; // decoded-buffer onset (s) per key: mp3 decoders add a little leading silence, so we find the "o"
  const bedBus = (c) => {
    if (bus && bus.c === c) return bus;
    try {
      const duck = c.createGain(), fadeG = c.createGain(), lpf = c.createBiquadFilter();
      lpf.type = 'lowpass'; lpf.frequency.value = 18000; lpf.Q.value = 0.5;
      duck.connect(fadeG).connect(lpf).connect(SHARED.out);
      bus = { c, duck, fadeG, lpf };
    } catch (_) { bus = null; }
    return bus;
  };
  const on8 = (k) => {   // v8: position (s) of the 8%-of-peak onset inside a decoded clip: the anchor phrases / hits are timed on
    if (meta[k] != null) return meta[k];
    const b = bufs[k]; if (!b) return 0;
    const d = b.getChannelData(0); let pk = 0; for (let i = 0; i < d.length; i++) { const a = d[i] < 0 ? -d[i] : d[i]; if (a > pk) pk = a; }
    let i = 0; while (i < d.length && (d[i] < 0 ? -d[i] : d[i]) < pk * 0.08) i++;
    return (meta[k] = i / b.sampleRate);
  };
  const elKill = (a) => { try { a.pause(); } catch (_) {} els.delete(a); };
  // HTMLAudioElement chant (no WebAudio, or the clip failed to decode): best effort. Started by timer, seeked to the
  // wanted position; the component re-anchors its beat grid from the element's currentTime (elPos).
  const bedEl = (k, delay, pos) => {
    const url = SFX_DATA[k]; if (!url || typeof Audio === 'undefined') return null;
    if (elFade) { clearInterval(elFade); elFade = null; }
    try {
      const a = new Audio(url); a.volume = 0.8; els.add(a);
      a.onended = () => els.delete(a);
      const t0 = Date.now() + delay * 1000;
      const go = () => {
        if (!els.has(a)) return;
        const late = (Date.now() - t0) / 1000, at = OIIA.pre + pos + late;   // seek over the timer's lateness
        try { if (at > 0.02) a.currentTime = at; } catch (_) {}
        const pr = a.play(); if (pr && pr.catch) pr.catch(() => {});
      };
      if (delay > 0.005) setTimeout(go, delay * 1000); else go();
      const h = { el: a, k }; elCur = h; return h;
    } catch (_) { return null; }
  };
  let elCur = null;
  const elPos = () => { const h = elCur; if (!h || !els.has(h.el)) return null; const a = h.el; return a.paused ? null : { k: h.k, ct: a.currentTime }; };
  // v8: start one phrase `delay` s from now (scheduler clock), at buffer position `pos` s relative to the clip's anchor
  // (8% onset; negative = a few ms of pre-roll). xf > 0 = speed switch: everything still sounding fades out over xf from
  // the switch time; xf = 0 only replaces a phrase still queued.
  const bedPhrase = (k, delay = 0, pos = 0, xf = 0, at = null) => {   // at: absolute AudioContext start time (exact; preferred)
    const c = noWA ? null : get();
    if (!c || !bufs[k]) {
      if (xf) for (const a of [...els]) elKill(a);
      const h = bedEl(k, delay, pos); if (h) cur = h; return !!h;
    }
    if (c.state === 'suspended') c.resume().catch(() => {});
    const B = bedBus(c); if (!B) return false;
    if (xf && !bed.size && !els.size) xf = 0;   // nothing sounding to crossfade from
    try {
      if (at != null) delay = at - c.currentTime;
      let t = c.currentTime + Math.max(0, delay), off = on8(k) + pos + Math.max(0, -delay);
      if (off < 0) { t -= off; off = 0; }
      const fg = B.fadeG.gain; fg.cancelScheduledValues(t); fg.setValueAtTime(1, t);   // undo an earlier fade-out
      const f = B.lpf.frequency; f.cancelScheduledValues(t); f.setValueAtTime(18000, t);
      const src = c.createBufferSource(), g = c.createGain();
      src.buffer = bufs[k];
      const rise = xf ? 0.008 : 0.004;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + rise);
      for (const o of [...bed]) if (xf || o.t > c.currentTime + 0.002) { bedFadeOne(o, xf ? t : c.currentTime, xf || 0.004); bed.delete(o); }
      if (xf) for (const a of [...els]) elKill(a);
      src.connect(g).connect(B.duck); src.start(t, Math.min(off, bufs[k].duration - 0.01));
      const h = { src, g, k, t }; cur = h; bed.add(h); src.onended = () => { bed.delete(h); if (cur === h) cur = null; };
      return true;
    } catch (_) { return false; }
  };
  // ---------- v8 beat-locked fish hits ----------
  // performance.now() (ms) at which AudioContext time `t` comes out of the speakers
  const outPerf = (t) => {
    const c = SHARED.ctx; if (!c) return null;
    try { const ts = c.getOutputTimestamp && c.getOutputTimestamp(); if (ts && ts.performanceTime > 0 && ts.contextTime > 0) return ts.performanceTime + (t - ts.contextTime) * 1000; } catch (_) {}
    return performance.now() + (t - c.currentTime) * 1000 + ((c.outputLatency || 0) || (c.baseLatency || 0)) * 1000;
  };
  const lat = () => { const c = SHARED.ctx; return c ? (c.outputLatency || 0) || (c.baseLatency || 0) : 0; };
  const running = () => { const c = noWA ? null : SHARED.ctx; return c && c.state === 'running' ? c : null; };
  const hits = new Set();
  // schedule fish hit `k` so its attack lands exactly `delay` s from now (scheduler clock). Returns the performance.now()
  // ms at which it will be heard (for the mallet), or null when nothing could be scheduled.
  const hitAt = (k, delay, gain = 1, at = null) => {   // at: absolute AudioContext time of the attack (exact; preferred)
    const c = running();
    if (!c || !bufs[k]) {      // <audio> fallback: timer, best effort
      const h = {}; h.id = setTimeout(() => { hits.delete(h); el(k, 1, gain); }, Math.max(0, delay * 1000 - 4)); hits.add(h);
      return performance.now() + delay * 1000;
    }
    try {
      const when = at != null ? Math.max(c.currentTime, at) : c.currentTime + Math.max(0, delay), b = bufs[k], on = Math.min(on8(k), 0.004), st = Math.max(c.currentTime, when - on);
      // choke group at the hit time: the previous fish hit fades out over 12 ms as this one lands
      for (const h of live) if (h.grp === 'tok') {
        try { const gp = h.g.gain; if (gp.cancelAndHoldAtTime) gp.cancelAndHoldAtTime(st); else gp.cancelScheduledValues(st); gp.linearRampToValueAtTime(0, st + 0.012); h.src.stop(st + 0.017); } catch (_) {}
        live.delete(h);
      }
      const src = c.createBufferSource(), g = c.createGain(), end = st + b.duration;
      src.buffer = b;
      g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(gain, st + 0.001);
      g.gain.setValueAtTime(gain, Math.max(st + 0.002, end - 0.01)); g.gain.linearRampToValueAtTime(0, end);
      src.connect(g).connect(SHARED.out); src.start(st);
      const h = { src, g, k, grp: 'tok', t: st }; live.add(h); hits.add(h); src.onended = () => { live.delete(h); hits.delete(h); };
      duckBed(st + on);
      lastTok = st;
      return outPerf(st + on);
    } catch (_) { return null; }
  };
  // drop every hit still waiting to sound (Stop / finish / reset)
  const cancelHits = () => {
    const c = SHARED.ctx;
    for (const h of [...hits]) {
      if (h.id) clearTimeout(h.id);
      else if (c && h.t > c.currentTime + 0.002) { try { h.src.stop(); } catch (_) {} live.delete(h); }
      hits.delete(h);
    }
  };
  const bedFadeOne = (h, t, ms) => {
    if (h.el) { elKill(h.el); return; }
    try { const gp = h.g.gain; gp.cancelScheduledValues(t); gp.setValueAtTime(gp.value, t); gp.linearRampToValueAtTime(0, t + ms); h.src.stop(t + ms + 0.005); } catch (_) {}
  };
  // mode 'fade' (300 ms, end/pause of the stream) | 'tape' (120 ms tape-stop + muffle: the peach) | 'cut' (30 ms)
  const bedStop = (mode = 'fade') => {
    for (const a of [...els]) {
      if (mode !== 'fade') { elKill(a); continue; }
      const v0 = a.volume, t0 = Date.now(); if (elFade) clearInterval(elFade);
      elFade = setInterval(() => { const p = (Date.now() - t0) / 300; if (p >= 1) { clearInterval(elFade); elFade = null; elKill(a); } else try { a.volume = v0 * (1 - p); } catch (_) {} }, 30);
    }
    const hs = [...bed]; bed.clear(); cur = null;
    const c = SHARED.ctx; if (!c || !bus || bus.c !== c) return;
    const t = c.currentTime, fg = bus.fadeG.gain;
    try {
      fg.cancelScheduledValues(t); fg.setValueAtTime(fg.value, t);
      if (mode === 'tape') {
        const T = 0.12;
        fg.setValueAtTime(fg.value, t + 0.04); fg.linearRampToValueAtTime(0, t + T);
        const f = bus.lpf.frequency; f.cancelScheduledValues(t); f.setValueAtTime(12000, t); f.exponentialRampToValueAtTime(220, t + T);
        for (const h of hs) { const pr = h.src.playbackRate; pr.cancelScheduledValues(t); pr.setValueAtTime(1, t); pr.exponentialRampToValueAtTime(0.28, t + T); h.src.stop(Math.max(t, h.t) + T + 0.01); }
      } else {
        const T = mode === 'cut' ? 0.03 : 0.3;
        fg.linearRampToValueAtTime(0, t + T);
        for (const h of hs) h.src.stop(Math.max(t, h.t) + T + 0.01);
      }
    } catch (_) {}
  };
  // each fish hit dips the chant ~3 dB for ~60 ms so 哚 stays on top (v8: at the hit's scheduled time)
  const duckBed = (at) => {
    const c = SHARED.ctx; if (!c || !bus || bus.c !== c || !cur) return;
    try {
      const gp = bus.duck.gain, t = Math.max(c.currentTime, at || 0);
      if (gp.cancelAndHoldAtTime) gp.cancelAndHoldAtTime(t); else { gp.cancelScheduledValues(t); gp.setValueAtTime(t > c.currentTime + 0.001 ? 1 : gp.value, t); }
      gp.linearRampToValueAtTime(0.7, t + 0.006); gp.setTargetAtTime(1, t + 0.06, 0.05);
    } catch (_) {}
  };
  const bedReady = (k) => { const c = noWA ? null : get(); return !c || !!bufs[k] || !!fb[k]; };
  let closed = false;
  const hasBuf = (k) => !!bufs[k];
  return { warm: get, unlock, play, cutVoice, bedPhrase, bedStop, bedReady, duckBed, hitAt, cancelHits, outPerf, lat, running, hasBuf, elPos, close: () => {
    if (closed) return; closed = true; cancelHits(); bedStop('cut');
    if (--SHARED.users <= 0 && SHARED.ctx) { try { SHARED.ctx.close().catch(() => {}); } catch (_) {} SHARED.ctx = null; SHARED.out = null; for (const k in bufs) delete bufs[k]; for (const k in fb) delete fb[k]; SHARED.users = 0; }
  } };
}

// ---------- art ----------
// v4 "doodle sticker": the characters are hand-drawn sticker sprites (one image per pose, chanting-monk-sprites.js),
// swapped per state; all the life is CSS motion on the wrappers. Original characters: a bald baby monk with a wooden
// fish, and a smug little monkey in a plain gold band. The gold reward (nimbus, halo, sparkles, bell) stays vector.
const INK = '#3b2a22';
// Story rule (user, Oct 12 2026): the MONK is the one torturing the monkey, so he only gets happier and more zealous
// the longer he chants (never pained). The MONKEY never smiles while the monk chants: smiles only after Stop and in 善哉.
const MONK_POSES = ['zen', 'chant', 'bliss', 'zeal', 'ecstatic', 'rapture', 'peach', 'peach2', 'zenzai'];
// poses that hold the separate mallet layer (v6: the mallet is no longer painted into these sprites)
const MALLET_POSES = ['zen', 'chant', 'bliss', 'zeal', 'ecstatic', 'rapture'];
const MK_POSES = ['doze', 'earsoff', 'bored', 'pain1', 'pain2', 'fakecry', 'rolling', 'leap', 'shove', 'smirk', 'dust', 'relief', 'bow', 'ko'];
function sprite(key, cls, set = SPR) {
  const s = set[key];
  return <img key={key} className={'cm-sp ' + cls} src={s[0]} alt="" draggable="false" decoding="async" style={{ aspectRatio: String(s[1]) }} />;
}
function monkPose(phase, sub, tight, joke, endKind) {
  if (phase === 'stopped') return joke >= 5 ? 'peach2' : joke >= 2 ? 'peach' : 'chant'; // oblivious mid-chant → stuffed → teary
  if (phase === 'done') return endKind === 'calm' ? 'zenzai' : 'zen';
  if (phase !== 'live' || sub === 'wait') return 'zen';
  if (sub === 'open') return 'chant';      // happy chant, eyes closed
  if (sub === 'zone') return 'bliss';      // blissful little smile
  if (sub === 'tight') return tight >= 3 ? 'rapture' : tight === 2 ? 'ecstatic' : 'zeal';
  return 'ecstatic';                       // 失控: still oblivious, max speed
}
function monkeyPose(phase, sub, tight, joke, rew, endKind) {
  if (phase === 'stopped') return joke <= 1 ? 'leap' : joke === 2 ? 'shove' : joke === 5 ? 'dust' : 'smirk';
  if (phase === 'done') return endKind === 'calm' ? (rew >= 4 ? 'bow' : 'relief') : (rew >= 3 ? 'ko' : 'pain2');
  if (phase !== 'live') return 'smirk';
  if (sub === 'wait') return 'doze';
  if (sub === 'open') return 'earsoff';    // 嫌弃, paws over his ears
  if (sub === 'zone') return 'bored';      // dead-eyed, sour lip-sync, no smile
  if (sub === 'tight') return tight >= 3 ? 'fakecry' : tight === 2 ? 'pain2' : 'pain1';
  return 'rolling';                        // rolling in agony, sneaking a peek
}

function sparkle(x, y, s = 1, className, g) {
  return <path className={className} d={`M${x} ${y - 5 * s} Q${x + 1 * s} ${y - 1 * s} ${x + 5 * s} ${y} Q${x + 1 * s} ${y + 1 * s} ${x} ${y + 5 * s} Q${x - 1 * s} ${y + 1 * s} ${x - 5 * s} ${y} Q${x - 1 * s} ${y - 1 * s} ${x} ${y - 5 * s}Z`} fill={g ? `url(#${g}-spark)` : '#ffd34d'} stroke="#a8740b" strokeWidth="1" strokeLinejoin="round" />;
}
// Peach impact (Stop beat 2): a comic starburst behind the monk's head, and in front: dizzy stars and peach
// juice flying out from his stuffed mouth. Coordinates are around the contact point (0, 0).
function burst() {
  const pts = (n, r0, r1, rot) => Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2 + rot, r = i % 2 ? r0 : r1 * (i % 4 === 0 ? 1 : 0.86); return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  return (
    <g className="cm-bst">
      <polygon points={pts(12, 26, 48, 0.1)} fill="#fff3b8" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <polygon points={pts(10, 16, 32, 0.35)} fill="#ffc94a" stroke="#e08a1c" strokeWidth="1.4" strokeLinejoin="round" />
    </g>
  );
}
function star5(x, y, r, cls) {
  const p = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`; }).join(' ');
  return <polygon className={cls} points={p} fill="#ffd34d" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />;
}
function hitfx() {
  // juice bursts from the peach rim (radius ~20) and flies well past his face
  const drops = [[18, -14, 52, -46, 5, '#ff8f8f'], [22, 2, 62, -8, 4.2, '#ffb36b'], [16, 16, 50, 34, 4.6, '#ff9f9f'], [4, -22, 14, -60, 3.8, '#ffb36b'],
    [-16, -18, -46, -50, 4.2, '#ff8f8f'], [-22, 6, -60, 10, 3.6, '#ffc27a'], [-12, 20, -40, 44, 3.6, '#ff9f9f'], [24, -6, 70, -26, 3, '#ff8f8f']];
  return (
    <>
      <g className="cm-juice">
        {drops.map(([x, y, dx, dy, r, c], i) => <g key={i} style={{ '--dx': (dx - x) + 'px', '--dy': (dy - y) + 'px' }}><path d={`M${x} ${y - r * 1.5} Q${x + r} ${y - r * 0.2} ${x + r * 0.8} ${y + r * 0.5} A${r * 0.85} ${r * 0.85} 0 1 1 ${x - r * 0.8} ${y + r * 0.5} Q${x - r} ${y - r * 0.2} ${x} ${y - r * 1.5}Z`} fill={c} stroke={INK} strokeWidth="1.1" transform={`rotate(${Math.round((Math.atan2(dy - y, dx - x) * 180) / Math.PI) + 90 + 180} ${x} ${y})`} /></g>)}
      </g>
      <g className="cm-stars">
        <g style={{ '--dx': '-18px', '--dy': '-16px' }}>{star5(-34, -66, 7, 's1')}</g>
        <g style={{ '--dx': '16px', '--dy': '-18px' }}>{star5(30, -70, 6, 's2')}</g>
        <g style={{ '--dx': '-22px', '--dy': '-4px' }}>{star5(-58, -40, 5, 's3')}</g>
        <g style={{ '--dx': '20px', '--dy': '-6px' }}>{star5(52, -46, 5, 's4')}</g>
      </g>
    </>
  );
}
function defs(g) {
  return (
    <defs>
      <radialGradient id={`${g}-nimbus`} cx="50%" cy="45%" r="50%"><stop offset="0" stopColor="#fffbe6" /><stop offset=".55" stopColor="#ffe68a" /><stop offset=".86" stopColor="#ffd04a" /><stop offset="1" stopColor="#f2b52a" /></radialGradient>
      <radialGradient id={`${g}-glow`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffe68a" stopOpacity=".9" /><stop offset=".6" stopColor="#ffd75e" stopOpacity=".35" /><stop offset="1" stopColor="#ffd75e" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${g}-gold`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff4b0" /><stop offset=".45" stopColor="#f2c230" /><stop offset="1" stopColor="#a8740b" /></linearGradient>
      <linearGradient id={`${g}-bell`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8a5a14" /><stop offset=".35" stopColor="#f5cf5c" /><stop offset=".6" stopColor="#d9a127" /><stop offset="1" stopColor="#7a4d0e" /></linearGradient>
      <radialGradient id={`${g}-spark`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fffbe0" /><stop offset=".5" stopColor="#ffd34d" /><stop offset="1" stopColor="#f2b52a" /></radialGradient>
      <linearGradient id={`${g}-ray`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe27a" /><stop offset="1" stopColor="#f5b82e" /></linearGradient>
    </defs>
  );
}

function fx(g) {
  const rays = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, r0 = 45, r1 = i % 2 ? 53 : 59, w = i % 2 ? 0.07 : 0.09;
    const p = (r, d) => `${(70 + Math.cos(a + d) * r).toFixed(1)} ${(51 + Math.sin(a + d) * r).toFixed(1)}`;
    rays.push(<path key={i} d={`M${p(r0, -w)} L${p(r1, 0)} L${p(r0, w)}Z`} />);
  }
  return (
    <>
      {/* 善哉: a gold nimbus disc with a crisp rim behind the head, rays, halo ring, sparkles, bell */}
      <g className="cm-glow">
        <circle cx="70" cy="51" r="68" fill={`url(#${g}-glow)`} />
        <g className="cm-rays" fill={`url(#${g}-ray)`} stroke="#b9850f" strokeWidth=".9" strokeLinejoin="round">{rays}</g>
        <circle cx="70" cy="51" r="43.5" fill={`url(#${g}-nimbus)`} stroke="#a8740b" strokeWidth="1.8" />
        <circle cx="70" cy="51" r="40" fill="none" stroke="#fffbe6" strokeWidth="1.2" opacity=".9" />
        <circle cx="70" cy="51" r="37" fill="none" stroke="#e8a91c" strokeWidth=".8" strokeDasharray="1.2 2.4" />
      </g>
      <g className="cm-halo">
        <ellipse cx="70" cy="8" rx="18" ry="4.6" fill="none" stroke="#7a4d0e" strokeWidth="5" />
        <ellipse cx="70" cy="8" rx="18" ry="4.6" fill="none" stroke={`url(#${g}-gold)`} strokeWidth="3.2" />
        <path d="M57.5 5.7 Q63.5 3.9 70 3.7" stroke="#fffbe0" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
      <g className="cm-sparks">{sparkle(24, 22, 1.2, 'k1', g)}{sparkle(116, 20, 1, 'k2', g)}{sparkle(18, 80, 0.9, 'k3', g)}{sparkle(150, 42, 1.1, 'k4', g)}{sparkle(114, 76, 0.7, 'k5', g)}</g>
      <g className="cm-bell">
        <path d="M14 0 V7" stroke={INK} strokeWidth="1.2" />
        <g className="cm-bellswing">
          <path d="M6 22 Q6 9 14 8 Q22 9 22 22 L24 25 L4 25Z" fill={`url(#${g}-bell)`} stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M7.5 19 H20.5" stroke="#7a4d0e" strokeWidth=".9" />
          <path d="M9 12 Q10 10 12 9.6" stroke="#fff6c8" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <circle cx="14" cy="26.6" r="2" fill="#7a4d0e" stroke={INK} strokeWidth="1" />
        </g>
        <g className="cm-rings" stroke="#c48a12" strokeWidth="1.3" fill="none" strokeLinecap="round"><path d="M27 12 q3 5 0 10 M31 9 q5 8 0 16" /></g>
      </g>
      <g className="cm-wisps" fill="none" strokeLinecap="round">
        <path className="w1" d="M126 92 C120 80 136 74 130 62 S142 46 152 50" stroke="#cfc6bd" strokeWidth="2.2" />
        <path className="w2" d="M122 92 C128 82 114 72 124 60 S118 44 106 40" stroke="#ddd6cf" strokeWidth="1.8" />
      </g>
    </>
  );
}


// ---------- token sources ----------
function toIterator(src) {
  if (!src) return null;
  const s = typeof src === 'function' ? src() : src;
  if (!s) return null;
  if (typeof s.getReader === 'function') {
    const reader = s.getReader(); const dec = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
    return { next: async () => { const r = await reader.read(); if (r.done) return r; const v = r.value; return { done: false, value: typeof v === 'string' ? v : dec ? dec.decode(v, { stream: true }) : String(v) }; }, return: async () => { try { await reader.cancel(); } catch (_) {} return { done: true }; } };
  }
  if (s[Symbol.asyncIterator]) return s[Symbol.asyncIterator]();
  if (s[Symbol.iterator]) return s[Symbol.iterator]();
  return null;
}
function splitDemo(text, rnd, big) {
  const out = []; let i = 0;
  while (i < text.length) {
    if (/[A-Za-z0-9]/.test(text[i])) { const m = text.slice(i).match(/^[A-Za-z0-9_']+\s?/); out.push(m[0]); i += m[0].length; continue; }
    const n = /[\u4e00-\u9fff]/.test(text[i]) ? (big ? 2 : 1) + Math.floor(rnd() * 3) : 1;
    let tok = ''; for (let k = 0; k < n && i < text.length && !/[A-Za-z0-9]/.test(text[i]); k++) tok += text[i++];
    out.push(tok);
  }
  return out;
}

const ChantingMonk = forwardRef(function ChantingMonk(props, ref) {
  const {
    text, streaming, stream, demo, onStop, onDone, onToken,
    levels: levelsIn, rambleAt, wildAt, openFor, size = 'lg', sound = false, lang = 'zh', labels: labelsIn,
    className = '', style, id, label = 'Assistant message', demoSpeed = 1, maxHeight,
    theme = 'light', showStop = true, // v8x: size 'xs' = the lg layout at ~half scale (an inline accent strip, ~85px tall in dark)
    showText = true, footer = null, // v8w: showText=false = characters + merit only, the host renders the reply text and drives push()
    // v8v: theme="dark" blends into a dark host (no card); showStop=false when the host has its own Stop; footer = extra host chips in the meta row
  } = props;
  const L = { ...(LABELS[lang] || LABELS.zh), ...(labelsIn || {}) };
  // v8w: escalation is decided by how many characters have streamed. levels = upper bounds (inclusive) of
  // 开念 / 入迷 / 紧箍咒 / 失控; past the last one is tier 5 (reserved for a future beat, plays 失控 for now).
  // Legacy openFor / rambleAt / wildAt (exclusive starts of 入迷 / 紧箍咒 / 失控) still work when levels is not given.
  const lv = Array.isArray(levelsIn) && levelsIn.length ? levelsIn
    : openFor != null || rambleAt != null || wildAt != null
      ? (() => { const o = openFor != null ? openFor : 30, ra = rambleAt != null ? rambleAt : 240, w = wildAt || ra + 200; return [o - 1, ra - 1, w - 1, w - 1]; })()
      : DEFAULT_LEVELS;
  const g = 'cm' + useId().replace(/[^a-zA-Z0-9]/g, '');

  const [chunks, setChunksS] = useState(() => (text ? [text] : []));
  const [phase, setPhase] = useState(() => (streaming || stream || demo ? 'live' : 'idle')); // idle | live | stopped | done
  const [joke, setJoke] = useState(0); // 0 none, 1 leap, 2 stuffed, 3 hop back, 4 fish drops, 5 dust, 6 rest
  const [rew, setRew] = useState(0); // reward beats: 1 palms, 2 bell, 3 flip, 4 bow, 5 rest
  const [endKind, setEndKind] = useState('calm');
  const [bonus, setBonus] = useState(0); // v8y: 功德 = streamed characters (the same count the levels use) + fish-tap bonus
  const [egg, setEgg] = useState(0);
  const [pops, setPops] = useState([]);
  const [chant, setChant] = useState([]);
  const [cutSyl, setCutSyl] = useState('');

  const R0 = useRef({}); const r = R0.current;
  if (!r.chunks) r.chunks = chunks;
  const setChunks = (v) => { r.chunks = v; setChunksS(v); };
  r.props = props; r.L = L;
  const audio = useRef(null);
  const textEl = useRef(null);
  const sfx = useCallback((k, rate, gain) => {
    if (!r.props.sound || !isBrowser() || !mayPlay()) return;
    if (!audio.current) audio.current = makeAudio();
    audio.current.play(k, rate, gain);
  }, []);
  useEffect(() => { if (sound && isBrowser() && mayPlay()) { if (!audio.current) audio.current = makeAudio(); audio.current.warm(); } }, [sound]);
  // v6: unlock audio inside the gesture itself. Called from play/demo, Stop and the fish tap, and from a capturing
  // listener on any pointerdown/keydown in the page while sound is on (so the host page's own buttons count too).
  const unlock = useCallback(() => {
    if (!r.props.sound || !isBrowser()) return;
    if (!audio.current) audio.current = makeAudio();
    audio.current.unlock();
  }, []);
  useEffect(() => {
    if (!sound || !isBrowser()) return;
    const on = () => unlock();
    const o = { capture: true, passive: true };
    for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) document.addEventListener(ev, on, o);
    return () => { for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) document.removeEventListener(ev, on, o); };
  }, [sound]);
  useEffect(() => () => { clearAll(); for (const t of r.vis || []) clearTimeout(t); if (r.bedIv) clearInterval(r.bedIv); r.bed = null; if (audio.current) audio.current.close(); }, []);

  const timers = useRef(new Set());
  const later = (fn, ms) => { const t = setTimeout(() => { timers.current.delete(t); fn(); }, ms); timers.current.add(t); return t; };
  const clearAll = () => { for (const t of timers.current) clearTimeout(t); timers.current.clear(); };

  const len = chunks.reduce((n, c) => n + c.length, 0);
  let ti = lv.findIndex((l) => len <= l); if (ti < 0) ti = lv.length;
  const tier = phase === 'live' && len > 0 ? Math.min(ti, TIERS.length - 1) + 1 : 0;   // 1..5 (0 = not streaming / 入定)
  const sub = phase !== 'live' ? phase : len === 0 ? 'wait' : TIERS[tier - 1];
  const tLo = lv[1] != null ? lv[1] : 0, tHi = lv[2] != null ? lv[2] : tLo + 1;
  const tight = sub === 'tight' ? clamp(1 + Math.floor(((len - tLo - 1) / Math.max(1, tHi - tLo)) * 3), 1, 3) : sub === 'wild' ? 3 : 0;
  r.sub = sub; r.len = len;
  const merit = len + bonus; r.merit = merit;
  r.peak = r.peak || 0;
  const rank = { wait: 0, open: 1, zone: 2, tight: 3, wild: 4 };
  if (sub in rank && rank[sub] > r.peak) r.peak = rank[sub];

  const pop = (kind, txt) => {
    const pid = (r.popN = (r.popN || 0) + 1);
    setPops((p) => [...p.slice(-5), { id: pid, kind, txt }]);
    later(() => setPops((p) => p.filter((x) => x.id !== pid)), kind === 'merit' ? 1300 : 1100);
  };

  // ---------- v8 beat clock ----------
  // The OIIA chant is the master clock. With sound, time = the shared AudioContext's currentTime and every phrase and
  // fish hit is scheduled on the audio timeline (start(when), ~100 ms look-ahead, 25 ms ticks: no setTimeout drift).
  // Without WebAudio (sound off, <audio> fallback) the same scheduler runs on performance.now().
  // A phrase P = { k: clip, A: anchor (clock s at which the clip's 8% onset sounds), N: period in grid units, j0: first
  // unit it owns (> 0 after a mid-phrase speed switch) }. Beat j of P sounds at P.A + unitT(P.k, j).
  const bedOK = () => r.props.sound && isBrowser() && mayPlay();
  const bedAudio = () => { if (!bedOK()) return null; if (!audio.current) audio.current = makeAudio(); return audio.current; };
  const perfS = () => performance.now() / 1000;
  const rootEl = useRef(null);
  // flip the tap keyframes (data-tp a <-> b restarts them) and pin their start so the strike frame (8% of the tap, 6%
  // for the fast 紧箍 keyframes) lands on `strikeMs` (performance.now() ms at which the hit is heard)
  const strike = (strikeMs) => {
    const el = rootEl.current; if (!el) return;
    const tp = el.getAttribute('data-tp') === 'a' ? 'b' : 'a';
    el.setAttribute('data-tp', tp);
    if (strikeMs == null || !el.getAnimations || el.getAttribute('data-tp') !== tp) return;
    try {
      const as = el.getAnimations({ subtree: true }).filter((x) => /^cm-(strike|nod|bounce|tick)/.test(x.animationName || ''));
      const sk = as.find((x) => /^cm-strike/.test(x.animationName)); if (!sk) return;
      const dur = sk.effect.getComputedTiming().duration, frac = /^cm-strikeF/.test(sk.animationName) ? 0.06 : 0.08;
      const start = strikeMs - frac * dur, pn = performance.now(), tl = document.timeline && document.timeline.currentTime;
      const exact = tl != null && Math.abs(tl - pn) < 50;   // document timeline shares performance.now()'s origin
      for (const x of as) { if (exact) x.startTime = start; else x.currentTime = pn - start; }
      if (window.__cmBeatLog) { const e = { ev: 'vis', strikeMs, start, dur, frac, name: sk.animationName, set: exact ? 'startTime' : 'currentTime', st: r.sub, fired: pn }; window.__cmBeatLog.push(e); requestAnimationFrame(() => { e.startRead = sk.startTime; e.frame = performance.now(); }); }
    } catch (_) {}
  };
  const visTimers = new Set(); r.vis = r.vis || visTimers;
  const cancelVis = () => { for (const t of r.vis) clearTimeout(t); r.vis.clear(); };
  // one fish hit at clock time th (now = clock time of this tick)
  const doHit = (th, now, slow, doPop) => {
    const b = r.bed, a = bedAudio(), s = r.sub, fast = s === 'tight' || s === 'wild';
    const k = slow ? 'tokslow' : (fast ? 'tokf' : 'tok') + (r.tk = ((r.tk || 0) + 1) % 3);
    let ms = null;
    if (a) ms = a.hitAt(k, th - now, slow ? 1 : 0.9, b && b.clk === 'ac' ? th : null);
    if (ms == null) ms = b && b.clk === 'ac' && a ? a.outPerf(th) : performance.now() + (th - now) * 1000;
    if (window.__cmBeatLog) window.__cmBeatLog.push({ ev: 'hit', k, th, clk: b && b.clk, ctxNow: now, strikeMs: ms, st: s, pend: !!r.pend });
    const pre = Math.max(24, (slow ? 520 : fast ? 92 : 150) * 0.08 + 8);   // fire the timer a little before the tap keyframes begin (startTime is then pinned exactly)
    const d = ms - performance.now() - pre;
    const fire = () => { strike(ms); if (slow || doPop) pop('do', '哚…'); };
    if (d > 1) { const t = setTimeout(() => { r.vis.delete(t); fire(); }, d); r.vis.add(t); } else fire();
  };
  // a beat came up: hit it if a token is queued, or on every beat while tokens stream faster than the beat
  const beatHit = (j, th, now, P) => {
    if (r.phase !== 'live') return;
    const s = r.sub;
    // v8s 入定/开念 (+ v8t 入迷): knock every sung syllable while the monk chants (入定: always; 开念/入迷: a queued token, or
    // any token in the last BED_STALL s, so a sparse stream still knocks every syllable instead of randomly). Breath units never knock.
    if (s === 'wait' || s === 'open' || s === 'zone') {
      if (!SUNG.includes(j)) return;
      if (s !== 'wait' && !r.pend && !(r.lastTokAt && perfS() - r.lastTokAt < BED_STALL)) return;
      r.pend = false; doHit(th, now, false, s === 'wait' && j === 0); return;
    }
    const per = BEAT_UNITS[s] || 2; if (j % per) return;
    const beatLen = OIIA.u[P.k] * per, ps = perfS();
    const flowing = r.tokIv > 0 && r.tokIv < beatLen * 1.05 && r.lastTokAt && ps - r.lastTokAt < 2 * beatLen + 0.1;
    if (!r.pend && !flowing) return;
    r.pend = false; doHit(th, now, false);
  };
  const bedTick = () => {
    const b = r.bed; if (!b) return;
    const a = bedAudio(), sub = r.sub;
    const last = b.ph[b.ph.length - 1];
    const want = BED_KEY[sub] || (last && last.k) || 'oi075';
    if (a && !a.bedReady(want) && !b.ph.length && (b.wait = (b.wait || 0) + 1) < 8) return; // let the clip decode (first ~100 ms after unlock)
    const ctx = a && a.running();
    const clk = ctx && a.hasBuf(want) ? 'ac' : 'pf';
    if (!!a !== b.snd || (!b.ph.length && clk !== b.clk)) { b.snd = !!a; b.clk = clk; b.ph = []; b.pi = 0; b.j = 0; }   // sound toggled: new grid
    else if (b.clk === 'pf' && clk === 'ac') { const d = ctx.currentTime - perfS(); for (const q of b.ph) q.A += d; b.clk = 'ac'; }   // context came up: move the grid onto the audio clock
    else if (b.clk === 'ac' && !ctx) { b.clk = 'pf'; b.ph = []; b.pi = 0; b.j = 0; }                                               // context suspended: restart on the performance clock
    const now = b.clk === 'ac' ? ctx.currentTime : perfS();
    const ps = perfS();
    // paused stream: no token for BED_STALL s after the first one -> fade out; the next token starts a fresh grid
    if (sub !== 'wait' && r.lastTokAt && ps - r.lastTokAt > BED_STALL) {
      if (!b.paused) { b.paused = true; b.ph = []; b.pi = 0; b.j = 0; if (a) a.bedStop('fade'); }
      return;
    }
    b.paused = false;
    const idle = sub !== 'wait' && r.lastTokAt && ps - r.lastTokAt > 0.9;   // tokens stopped coming: don't start another phrase
    const start = (k, A, j0, xf) => {   // add a phrase and schedule its audio
      const P = { k, A, N: perOf(sub, k), j0 }; b.ph.push(P);
      if (!b.ph[b.pi]) { b.pi = b.ph.length - 1; b.j = j0; }
      const pos = j0 ? unitT(k, j0) - 0.01 : -OIIA.pre;
      if (a) a.bedPhrase(k, A + pos - now, pos, xf, b.clk === 'ac' ? A + pos : null);
      if (window.__cmBeatLog) window.__cmBeatLog.push({ ev: 'phrase', k, A, j0, N: P.N, clk: b.clk, now, st: sub });
      return P;
    };
    if (!b.ph.length) { if (idle) return; start(want, now + 0.03, 0, 0); }
    else {
      const L = b.ph[b.ph.length - 1];
      if (L.k !== want && BED_KEY[sub]) {
        if (L.A - OIIA.pre > now + 0.015) {   // next phrase still queued: swap its clip, same anchor (still on the grid)
          L.k = want; L.N = perOf(sub, want);
          if (a) a.bedPhrase(want, L.A - OIIA.pre - now, -OIIA.pre, 0, b.clk === 'ac' ? L.A - OIIA.pre : null);
          if (window.__cmBeatLog) window.__cmBeatLog.push({ ev: 'swap', k: want, A: L.A, now });
        } else {                              // sounding: switch at the next sung syllable, crossfade, same phrase position
          const jmin = b.ph[b.pi] === L ? b.j : 0;
          const e = OIIA.J.find((j) => j >= jmin && j <= 12 && L.A + unitT(L.k, j) - 0.01 > now + 0.012);
          if (e != null) { const T = L.A + unitT(L.k, e); L.N = e; start(want, T - unitT(want, e), e, 0.03); }
        }
      } else if (BED_KEY[sub] === L.k && b.ph[b.pi] === L) L.N = Math.max(perOf(sub, L.k), b.j);   // same clip, new breath (入定 -> 开念)
    }
    // <audio> fallback: re-anchor the current phrase from the element's playhead (best effort)
    if (a && b.clk === 'pf') {
      const ep = a.elPos(), L = b.ph[b.ph.length - 1];
      if (ep && L && ep.k === L.k && ep.ct > 0.05) {
        const err = (now - (ep.ct - OIIA.pre)) - L.A;
        if (Math.abs(err) < 0.25) { L.A += err * 0.5; if (window.__cmBeatLog) window.__cmBeatLog.push({ ev: 'elsync', err }); }
      }
    }
    // next phrase, a whole number of beats after this one
    const L = b.ph[b.ph.length - 1];
    if (L) {
      const nextA = L.A + L.N * OIIA.u[L.k];
      if (!idle && nextA - OIIA.pre - now < HZN) start(want, Math.max(nextA, now + 0.02), 0, 0);
    }
    // fish hits: walk the grid up to the horizon
    for (let g = 0; g < 64; g++) {
      const P = b.ph[b.pi]; if (!P) break;
      if (b.j >= P.N) { if (b.pi + 1 < b.ph.length) { b.pi++; b.j = b.ph[b.pi].j0; continue; } break; }
      const th = P.A + unitT(P.k, b.j);
      if (th > now + HZN) break;
      if (th >= now - 0.004) beatHit(b.j, th, now, P);
      b.j++;
    }
    while (b.pi > 1) { b.ph.shift(); b.pi--; }
    // cloud: spell the phrase that is coming out of the speakers right now
    const tOut = now - (b.clk === 'ac' && a ? a.lat() : 0);
    let H = null; for (const q of b.ph) if (q.A + (q.j0 ? unitT(q.k, q.j0) : -0.004) <= tOut) H = q;
    if (H) {
      const S = OIIA.syl[H.k]; let n = 0; while (n < S.length && H.A + S[n] <= tOut) n++;
      if (H !== b.hp || n - 1 !== b.shown) { b.hp = H; b.shown = n - 1; r.chant = OIIA.let.slice(0, n); setChant(r.chant); }
    }
  };
  const bedStart = () => {
    if (r.bed) return;
    r.bed = { ph: [], pi: 0, j: 0, clk: null, snd: null };
    r.bedIv = setInterval(bedTick, TICK);   // first tick after the render that set the new state
  };
  const bedEnd = (mode) => {
    if (r.bedIv) { clearInterval(r.bedIv); r.bedIv = null; }
    r.bed = null;
    if (audio.current) audio.current.bedStop(mode);
  };
  const dropHits = () => {
    r.pend = false; cancelVis();
    if (audio.current) { if (window.__cmBeatLog) { const c = audio.current.running(); window.__cmBeatLog.push({ ev: 'drop', t: c ? c.currentTime : null }); } audio.current.cancelHits(); }
  };
  r.phase = phase;

  const push = useCallback((tok) => {
    if (r.phase !== 'live' || !tok) return;
    const ps = performance.now() / 1000;
    if (r.lastTokAt) { const d = ps - r.lastTokAt; r.tokIv = r.tokIv ? r.tokIv * 0.7 + d * 0.3 : d; }
    r.lastTokAt = ps;
    setChunks([...r.chunks, tok]);
    r.pend = true;   // v8: the hit waits for the next beat of the chant (bedTick)
    if (window.__cmBeatLog) window.__cmBeatLog.push({ ev: 'tok', p: ps });
    if (r.props.onToken) r.props.onToken(tok);
  }, []);

  // the OIIA chant runs for the whole live phase (入定 included); stop/finish/reset end it
  useEffect(() => { if (phase === 'live' && isBrowser()) bedStart(); }, [phase]);
  // sound switched off mid-chant: fade the chant (the text keeps going)
  useEffect(() => { if (!sound && audio.current) audio.current.bedStop('fade'); }, [sound]);

  // 入定 (waiting for the first token): a knock on every sung syllable of each phrase, scheduled by bedTick

  r.fullText = () => r.chunks.join('');

  const finish = useCallback(() => {
    if (r.phase !== 'live') return;
    r.phase = 'done'; setPhase('done');
    const kind = (r.peak || 0) >= 3 ? 'tired' : 'calm';
    setEndKind(kind);
    dropHits(); bedEnd('fade');
    if (audio.current) audio.current.cutVoice();
    if (reduced()) { setRew(5); } else if (kind === 'calm') {
      setRew(1); sfx('sigh', 1.25, 0.4);
      later(() => { setRew(2); sfx('bell'); pop('bell', '当'); }, R.bell);
      later(() => { setRew(3); sfx('whoosh'); sfx('squeak2', 1.1); }, R.flip);
      later(() => { setRew(4); sfx('squeak', 0.9); }, R.bow);
      later(() => setRew(5), R.rest);
    } else {
      setRew(1); sfx('sigh');
      later(() => { setRew(3); sfx('thud'); }, 500);
      later(() => setRew(5), 1400);
    }
    if (r.props.onDone) later(() => r.props.onDone(r.fullText()), 0);
  }, []);

  const stop = useCallback(() => {
    unlock();
    if (r.phase !== 'live') return;
    r.phase = 'stopped'; setPhase('stopped');
    r.cancel && r.cancel();
    dropHits();   // v8: hits already scheduled on upcoming beats are dropped; the chant itself runs on until the peach
    if (audio.current) audio.current.cutVoice();
    // v7: the monk is oblivious and keeps oiia-ing while the monkey leaps; the song dies on the peach impact
    const crush = () => {
      const c = r.chant && r.chant.length ? r.chant : OIIA.let.slice(0, 4);
      setCutSyl(c[c.length - 1]); r.chant = c.slice(0, -1); setChant(r.chant);
    };
    const frozen = r.fullText();
    if (r.props.onStop) r.props.onStop(frozen);
    if (reduced()) { bedEnd('cut'); crush(); setJoke(6); return; }
    setJoke(1); sfx('squeak'); sfx('whoosh', 1.1);
    // contact: the chant tape-stops (120 ms, muffled) + heavy 噗 on the hit, ~120 ms hit-stop, then the muffled 唔
    later(() => { bedEnd('tape'); crush(); setJoke(2); sfx('pu'); pop('pu', '噗'); later(() => sfx('mmm'), 300); }, J.stuff);
    later(() => { setJoke(3); sfx('whoosh', 0.9); }, J.back);
    later(() => { setJoke(4); sfx('dong'); pop('dong', '咚'); }, J.drop);
    later(() => { setJoke(5); sfx('squeak2'); }, J.dust);
    later(() => setJoke(6), J.rest);
  }, []);

  const reset = useCallback((initial = '') => {
    clearAll(); r.cancel && r.cancel(); r.cancel = null; r.peak = 0; r.pend = false; r.tokIv = 0; r.lastTokAt = 0;
    dropHits(); bedEnd('cut');
    r.chant = []; setBonus(0); setChunks(initial ? [initial] : []); setJoke(0); setRew(0); setChant([]); setCutSyl(''); setPops([]); setEndKind('calm');
  }, []);

  const begin = useCallback(() => { reset(); r.phase = 'live'; setPhase('live'); if (isBrowser()) bedStart(); }, []);

  // source: async iterable / ReadableStream
  useEffect(() => {
    if (!stream) return;
    const it = toIterator(stream); if (!it) return;
    begin(); let dead = false;
    r.cancel = () => { dead = true; try { it.return && it.return(); } catch (_) {} };
    (async () => {
      try { for (;;) { const res = await it.next(); if (dead) return; if (res.done) break; push(String(res.value)); } } catch (_) {}
      if (!dead) finish();
    })();
    return () => { dead = true; };
  }, [stream]);

  // source: demo
  const runDemo = useCallback((kind) => {
    unlock();
    begin();
    const k = kind === 'ramble' ? 'ramble' : 'short';
    const lg = (DEMO[r.props.lang] || DEMO.zh);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const toks = splitDemo(lg[k], rnd, k === 'ramble');
    const sp = r.props.demoSpeed || 1;
    let i = 0, dead = false;
    r.cancel = () => { dead = true; };
    const step = () => {
      if (dead) return;
      if (i >= toks.length) { finish(); return; }
      push(toks[i++]);
      const base = k === 'ramble' ? 38 + rnd() * 30 : 70 + rnd() * 70;
      later(step, base / sp);
    };
    later(step, (window.__cmFirstToken != null ? window.__cmFirstToken : 1600 + rnd() * 600) / sp);
  }, []);
  useEffect(() => { if (demo && isBrowser()) runDemo(demo === 'ramble' ? 'ramble' : 'short'); }, [demo]);

  // source: controlled text + streaming
  const wasStreaming = useRef(!!streaming);
  useEffect(() => {
    if (stream || demo) return;
    if (streaming && !wasStreaming.current) { begin(); r.seen = ''; }
    wasStreaming.current = !!streaming;
    if (streaming) return;
    if (r.phase === 'live') finish();
  }, [streaming]);
  useEffect(() => {
    if (stream || demo || text == null) return;
    if (r.phase === 'live') {
      const seen = r.seen || '';
      if (text.startsWith(seen) && text.length > seen.length) { push(text.slice(seen.length)); r.seen = text; }
      else if (!text.startsWith(seen)) { setChunks([text]); r.seen = text; }
    } else if (r.phase === 'idle') { setChunks(text ? [text] : []); }
  }, [text]);

  // v8w host-driven API: start() -> push(chunk)* -> finish() | stop()
  useImperativeHandle(ref, () => ({ start: () => { unlock(); begin(); }, push, finish, stop, demo: runDemo, play: runDemo,
    reset: () => { reset(); r.phase = 'idle'; setPhase('idle'); }, get state() { return r.sub; }, get text() { return r.fullText(); }, get count() { return r.len; }, get merit() { return r.merit; } }), []);

  const tapFish = (e) => {
    e && e.stopPropagation();
    unlock();
    setBonus((m) => m + 1); strike(null); setEgg((n) => n + 1);
    sfx('merit'); pop('merit', `${L.merit} +1`);
  };
  const onKeyDown = (e) => { if (e.key === 'Escape' && r.phase === 'live') { e.preventDefault(); stop(); } };

  const live = phase === 'live';
  // with maxHeight the text scrolls and sticks to the newest token while streaming
  useEffect(() => { const el = textEl.current; if (el && maxHeight != null) { if (live) el.scrollTop = el.scrollHeight; el.setAttribute('data-over', el.scrollTop > 2 ? '1' : '0'); } }, [len, maxHeight, live]);
  const status = live ? sub : phase === 'stopped' ? 'stopped' : phase === 'done' ? endKind : 'idle';
  const nTok = chunks.length, ANIM = 18;
  const head = chunks.slice(0, Math.max(0, nTok - ANIM)).join('');
  const tail = chunks.slice(Math.max(0, nTok - ANIM));

  const S = theme === 'dark' ? SPR_DARK : SPR;
  const mp = monkPose(phase, sub, tight, joke, endKind), kp = monkeyPose(phase, sub, tight, joke, rew, endKind);
  // chant cloud text
  let cloud = null;
  // v7: the cloud spells "oiiaioooooiai" in time with the chant; after the peach only the last few letters survive
  const tailOf = (a) => a.join('').slice(-5);
  if ((live || (phase === 'stopped' && joke === 1)) && chant.length) cloud = <span className="cm-chant cm-oiia">{chant.join('')}{chant.length < OIIA.let.length ? <span className="cm-ell">…</span> : null}</span>;
  else if (phase === 'stopped' && joke === 2) cloud = <span className="cm-chant cm-oiia"><span className="cm-crush">{tailOf(chant)}<span className="cm-cut">{cutSyl}</span></span><b className="cm-mm cm-mmhit">唔！！</b></span>;
  else if (phase === 'stopped' && joke >= 3) cloud = <span className="cm-chant cm-oiia">{tailOf(chant)}<span className="cm-cut">{cutSyl}</span><b className="cm-mm">唔唔唔</b></span>;
  else if (phase === 'done' && rew >= 1) cloud = endKind === 'calm' ? <b className="cm-zen">善哉</b> : <span className="cm-chant">呼……</span>;

  return (
    <div ref={rootEl} id={id} className={'cm ' + className} style={style} data-size={size === 'sm' || size === 'xs' ? size : 'lg'} data-theme={theme === 'dark' ? 'dark' : 'light'} data-state={status}
      data-tight={tight} data-tier={tier} data-text={showText ? '1' : '0'} data-joke={joke} data-rew={rew} data-tp="b" data-egg={egg ? (egg % 2 ? 'a' : 'b') : undefined}
      data-mp={mp} data-kp={kp} onKeyDown={onKeyDown}>
      <div className="cm-stage">
        <div className="cm-art" aria-hidden="true">
          <svg className="cm-fx" viewBox="0 0 240 132" focusable="false">{defs(g)}<g className="cm-fxpos" transform="translate(-11 6) translate(70 51) scale(.86) translate(-70 -51)">{fx(g)}</g></svg>
          <svg className="cm-burst" viewBox="-50 -50 100 100" focusable="false">{burst()}</svg>
          <div className="cm-monk"><div className="cm-monk-in">{MONK_POSES.map((k) => sprite('monk-' + k, 'm-' + k, S))}
            <i className="cm-mallet"><img src={S.mallet[0]} alt="" draggable="false" decoding="async" /></i>
            {MALLET_POSES.includes(mp) && <span className="cm-cap">{sprite('monk-' + mp, 'c-' + mp, S)}</span>}</div></div>
          <div className="cm-fish"><div className="cm-fish-in">{sprite('fish', 'f-fish', S)}</div><i className="cm-tick"><b /><b /><b /></i><i className="cm-ring" /></div>
          <div className="cm-monkey"><div className="cm-mk-move"><div className="cm-mk-in">{MK_POSES.map((k) => sprite('mk-' + k, 'k-' + k, S))}<i className="cm-bandfx" /></div><i className="cm-speed"><b /><b /><b /><b /></i></div></div>
          <svg className="cm-hit" viewBox="-50 -50 100 100" focusable="false">{hitfx()}</svg>
        </div>
        <div className="cm-cloud" aria-hidden="true" data-on={cloud ? '1' : '0'}>{cloud}</div>
        <div className="cm-pops" aria-hidden="true">{pops.map((p) => <span key={p.id} className={'cm-pop ' + p.kind} style={{ '--cm-dx': (p.id % 3) * 14 + 'px', '--cm-dy': (p.id % 3) * 12 + 'px' }}>{p.txt}</span>)}</div>
        <button type="button" className="cm-fishbtn" aria-label={L.fish} title={L.fish} onClick={tapFish} />
      </div>
      {showText ? (
      <div className="cm-bubble" role="group" aria-label={label}>
          <div className="cm-text" ref={textEl} aria-live="polite" aria-busy={live ? 'true' : 'false'} style={maxHeight != null ? { maxHeight, overflowY: 'auto' } : undefined}
            onScroll={maxHeight != null ? (e) => e.currentTarget.setAttribute('data-over', e.currentTarget.scrollTop > 2 ? '1' : '0') : undefined}>
            {head}{tail.map((c, i) => <span key={nTok - tail.length + i} className="cm-tok">{c}</span>)}
            {live && <span className="cm-caret" aria-hidden="true" />}
            {live && len === 0 && <span className="cm-wait" aria-hidden="true"><i /><i /><i /></span>}
          </div>
          <div className="cm-foot">
            <span className="cm-status" aria-hidden={status === 'idle' ? 'true' : undefined}>{L[status] || ''}</span>
            <span className="cm-merit" title={L.merit}><img className="cm-merit-ic" src={S.fish[0]} alt="" aria-hidden="true" draggable="false" decoding="async" />{L.merit} <b>{merit}</b></span>
            {live && showStop ? (
              <button type="button" className="cm-stop" onClick={stop} aria-label={L.stopAria} aria-keyshortcuts="Escape">
                <i aria-hidden="true" />{size !== 'sm' && <span>{L.stop}</span>}
              </button>
            ) : showStop ? <span className="cm-stop-ph" /> : null}
            {footer}
          </div>
        </div>
      ) : (
        <div className="cm-foot">
          <span className="cm-status" aria-hidden={status === 'idle' ? 'true' : undefined}>{L[status] || ''}</span>
          <span className="cm-merit" title={L.merit}><img className="cm-merit-ic" src={S.fish[0]} alt="" aria-hidden="true" draggable="false" decoding="async" />{L.merit} <b>{merit}</b></span>
          {live && showStop ? (
            <button type="button" className="cm-stop" onClick={stop} aria-label={L.stopAria} aria-keyshortcuts="Escape">
              <i aria-hidden="true" />{size !== 'sm' && <span>{L.stop}</span>}
            </button>
          ) : showStop ? <span className="cm-stop-ph" /> : null}
          {footer}
        </div>
      )}
    </div>
  );
});

export default ChantingMonk;
export { DEMO, LABELS, DEFAULT_LEVELS, splitDemo };
// internal: pose names, for preview sheets
export const __art = { MONK_POSES, MK_POSES };
