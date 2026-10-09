// NosyPassword — a password field with a nosy little animal peeking over its top edge (animal="teddy" | "corgi").
// Its eyes follow your caret as you type. Reveal the password and it gasps and hides its eyes in its own way
// (the teddy flips its ears over them, the corgi turns round and shows you its butt), then sneaks a peek and gets caught. Hide it again and it whistles
// like nothing happened. Clear the field and it sinks back, disappointed.
// size="md" (default) fits a sign-in form; size="lg" is the showcase drawing.
import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useId } from 'react';

const T = { gasp: 180, peekAt: 1100, peekFor: 650, caughtFor: 420, peekEvery: 3600, whistle: 1600, sad: 1300, startle: 420 };
const reduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function EyeIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false">
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.1" fill="currentColor" />
      {!open && <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />}
    </svg>
  );
}

// ---- shared drawing helpers -------------------------------------------------------------
// Outline trick: draw the silhouette pieces once with a thick dark stroke, then again filled on top,
// so overlapping circles read as one clean inked shape.
function Blob({ shapes, fill, ink, w = 3 }) {
  const draw = (s, i, extra) => s[0] === 'c'
    ? <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} {...extra} />
    : s[0] === 'e' ? <ellipse key={i} cx={s[1]} cy={s[2]} rx={s[3]} ry={s[4]} {...extra} />
    : <path key={i} d={s[1]} {...extra} />;
  return (
    <>
      <g>{shapes.map((s, i) => draw(s, i, { fill: ink, stroke: ink, strokeWidth: w, strokeLinejoin: 'round' }))}</g>
      <g>{shapes.map((s, i) => draw(s, i, { fill: s[5] || (s[0] === 'p' ? s[2] : null) || fill }))}</g>
    </>
  );
}
const curl = (x, y, s = 1, col = '#a8683a', o = 0.6) => (
  <path key={`cu${x}-${y}`} d={`M${x - 3.6 * s} ${y + 1.2 * s} q0 -4.2 ${3.8 * s} -4.2 q3.6 0 3.6 3.4 q0 2.6 -2.6 2.6 q-2 0 -2 -1.8`} fill="none" stroke={col} strokeWidth={1.25} strokeLinecap="round" opacity={o} />
);

function Eye({ c, x, y }) {
  const id = c('eye' + x);
  return (
    <g className="np-eye">
      <defs><clipPath id={id}><ellipse cx={x} cy={y} rx="8.2" ry="9" /></clipPath></defs>
      <g className="np-eyeopen">
        <ellipse cx={x} cy={y} rx="8.9" ry="9.7" fill="#1b100b" />
        <g clipPath={`url(#${id})`}>
          <g className="np-iris">
            <ellipse cx={x} cy={y + 0.6} rx="6.6" ry="7.4" fill={`url(#${c('iris')})`} />
            <ellipse cx={x} cy={y + 0.2} rx="3.5" ry="4.1" fill="#0f0805" />
            <ellipse cx={x + 2.7} cy={y - 3.5} rx="3" ry="3.4" fill="#fff" />
            <circle cx={x - 2.9} cy={y + 3.3} r="1.45" fill="#fff" />
            <circle cx={x + 3.4} cy={y + 2.6} r=".8" fill="#fff" opacity=".85" />
          </g>
          <path d={`M${x - 6} ${y + 6.4} Q${x} ${y + 9.6} ${x + 6} ${y + 6.4}`} fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="1.2" />
        </g>
      </g>
      <path className="np-eyesleep" d={`M${x - 7} ${y} Q${x} ${y + 5.5} ${x + 7} ${y}`} />
      <path className="np-eyehappy" d={`M${x - 7} ${y + 2.5} Q${x} ${y - 5} ${x + 7} ${y + 2.5}`} />
    </g>
  );
}
function Mouth({ y = 75, ink, tongue = '#ff8a95' }) {
  return (
    <g className="np-mouths" stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <g className="np-mouth smile">
        <path d={`M66.6 ${y + 1.2} Q70 ${y + 6.2} 73.4 ${y + 1.2}Z`} fill={tongue} strokeWidth="1" />
        <path d={`M63.5 ${y} Q66.75 ${y + 4} 70 ${y} Q73.25 ${y + 4} 76.5 ${y}`} fill="none" />
      </g>
      <path className="np-mouth flat" d={`M65 ${y + 2} Q70 ${y + 0.6} 75 ${y + 2}`} fill="none" />
      <ellipse className="np-mouth oo" cx="71" cy={y + 2.4} rx="2.4" ry="2.8" fill="#7a2f36" strokeWidth="1.1" />
      <g className="np-mouth gasp"><ellipse cx="70" cy={y + 2.8} rx="3.8" ry="4.6" fill="#6e2730" strokeWidth="1.1" /><ellipse cx="70" cy={y + 5.2} rx="2.3" ry="1.5" fill={tongue} stroke="none" /></g>
    </g>
  );
}
const Fx = () => (
  <>
    <g className="np-sweat"><path d="M114 25 Q120 34 114 39 Q108 34 114 25Z" fill="#a6dcff" stroke="#4d9ad6" strokeWidth="1.1" /><path d="M112.6 32.5 q.4 -2 1.6 -3" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" fill="none" /></g>
    <g className="np-notes" fill="#b07f22" stroke="#7a5512" strokeWidth=".5"><text x="112" y="78" className="n1">♪</text><text x="122" y="64" className="n2">♫</text></g>
    <g className="np-z" fill="#8a93a3"><text x="106" y="40" className="z1">z</text><text x="114" y="30" className="z2">z</text></g>
  </>
);
function Paws({ c, fill, ink, beans, front }) {
  return (
    <g className="np-turn">
      <ellipse cx="48" cy="91.5" rx="11" ry="2.6" fill="#3a2a1a" opacity=".13" />
      <ellipse cx="92" cy="91.5" rx="11" ry="2.6" fill="#3a2a1a" opacity=".13" />
      {front}
      {[['l', 48], ['r', 92]].map(([s, x]) => (
        <g key={s} className={'np-paw ' + s}>
          <ellipse cx={x} cy="88" rx="10.4" ry="7.4" fill={`url(#${c(fill)})`} stroke={ink} strokeWidth="1.5" />
          <path d={`M${x - 3.6} 83.8 q-.6 3 0 6.2 M${x + 3.6} 83.8 q.6 3 0 6.2`} stroke={ink} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".75" />
          <ellipse cx={x - 3} cy="84.6" rx="3.6" ry="1.6" fill="#fff" opacity=".35" />
          {beans && <g fill={beans}><ellipse cx={x - 6.4} cy="91.6" rx="1.7" ry="1.2" /><ellipse cx={x} cy="92.6" rx="1.8" ry="1.2" /><ellipse cx={x + 6.4} cy="91.6" rx="1.7" ry="1.2" /></g>}
        </g>
      ))}
    </g>
  );
}
const Brows = ({ ink, y, xs = [56, 84] }) => (
  <g className="np-brows" stroke={ink} strokeWidth="1.8" strokeLinecap="round" fill="none">
    <path className="np-brow l" d={`M${xs[0] - 4.5} ${y + 0.8} Q${xs[0]} ${y - 1.6} ${xs[0] + 4.5} ${y + 0.4}`} />
    <path className="np-brow r" d={`M${xs[1] - 4.5} ${y + 0.4} Q${xs[1]} ${y - 1.6} ${xs[1] + 4.5} ${y + 0.8}`} />
  </g>
);

// ---- Teddy: apricot toy poodle with a polka-dot bow and a bell. Flips its curly ears over its eyes. ----
const T_HEAD = [['c', 50, 39, 10], ['c', 59, 31.5, 11], ['c', 70, 28.5, 11.8], ['c', 81, 31.5, 11], ['c', 90, 39, 10], ['c', 42, 49, 9.6], ['c', 98, 49, 9.6], ['c', 41, 65, 10.6], ['c', 99, 65, 10.6], ['e', 70, 61, 33, 27]];
function Teddy({ c, tick }) {
  const g = (n) => `url(#${c(n)})`;
  const ear = (s, pts, ox) => (
    <g className={'np-tick ' + s} key={s + tick} style={{ transformOrigin: `${ox}px 44px` }}>
      <g className={'np-ear ' + s} style={{ transformOrigin: `${ox}px 44px` }}>
        <Blob shapes={pts.map(([x, y, r]) => ['c', x, y, r])} fill={g('tEarPuff')} ink="#7d4a26" w={3} />
        {pts.map(([x, y]) => curl(x - 0.5, y, 0.9, '#8a5430', 0.55))}
        <ellipse cx={pts[0][0] + (s === 'l' ? 3 : -3)} cy={pts[0][1] + 5} rx="7" ry="3" fill="#6b3d1f" opacity=".18" />
      </g>
    </g>
  );
  return (
    <>
      <defs>
        <radialGradient id={c('tPuff')} cx="40%" cy="32%" r="70%"><stop offset="0" stopColor="#f6cc9a" /><stop offset=".55" stopColor="#dca46d" /><stop offset="1" stopColor="#bb8049" /></radialGradient>
        <radialGradient id={c('tFace')} cx="45%" cy="30%" r="75%"><stop offset="0" stopColor="#f1c18e" /><stop offset=".6" stopColor="#dba26b" /><stop offset="1" stopColor="#c0854e" /></radialGradient>
        <radialGradient id={c('tEarPuff')} cx="38%" cy="30%" r="75%"><stop offset="0" stopColor="#d49660" /><stop offset=".6" stopColor="#b8784a" /><stop offset="1" stopColor="#965d33" /></radialGradient>
        <radialGradient id={c('tMuz')} cx="45%" cy="30%" r="75%"><stop offset="0" stopColor="#fff4e6" /><stop offset="1" stopColor="#efcfa9" /></radialGradient>
        <radialGradient id={c('tPaw')} cx="40%" cy="30%" r="80%"><stop offset="0" stopColor="#f0c393" /><stop offset="1" stopColor="#c98d58" /></radialGradient>
        <linearGradient id={c('bow')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffc2d3" /><stop offset="1" stopColor="#ff6f98" /></linearGradient>
        <radialGradient id={c('bell')} cx="35%" cy="30%" r="70%"><stop offset="0" stopColor="#fff3b0" /><stop offset=".5" stopColor="#f2c230" /><stop offset="1" stopColor="#b3830e" /></radialGradient>
      </defs>
      <g clipPath={`url(#${c('field')})`}>
        <g className="np-turn"><g className="np-head">
          <Blob shapes={T_HEAD.slice(0, 9)} fill={g('tPuff')} ink="#8a5530" w={3.2} />
          <ellipse cx="70" cy="61" rx="33" ry="27" fill={g('tFace')} />
          {[[50, 38], [59, 30], [70, 26.5], [81, 30], [90, 38], [43, 48], [97, 48]].map(([x, y]) => curl(x, y, 1, '#b0733f', 0.6))}
          <ellipse cx="62" cy="40" rx="12" ry="5" fill="#fff" opacity=".16" />
          <ellipse cx="70" cy="86" rx="24" ry="5" fill="#8a5530" opacity=".14" />
          <path d="M56 70 q-2 -3 0 -6 M84 70 q2 -3 0 -6" stroke="#b97f4b" strokeWidth="1.1" fill="none" opacity=".5" strokeLinecap="round" />
          <ellipse cx="70" cy="75.5" rx="14.8" ry="10.8" fill={g('tMuz')} stroke="#cf9f70" strokeWidth="1" />
          <path d="M58 79 l-2 1.5 M82 79 l2 1.5 M60 83 l-1.5 2 M80 83 l1.5 2" stroke="#d2a678" strokeWidth="1" strokeLinecap="round" />
          <ellipse className="np-blush" cx="45" cy="73" rx="7.5" ry="4.4" fill={g('blush')} />
          <ellipse className="np-blush" cx="95" cy="73" rx="7.5" ry="4.4" fill={g('blush')} />
          <Brows ink="#8a5530" y={48.5} />
          <Eye c={c} x={56} y={61} /><Eye c={c} x={84} y={61} />
          <path d="M65.2 68.4 Q70 64.8 74.8 68.4 Q75 72.6 70 73.6 Q65 72.6 65.2 68.4Z" fill={g('nose')} stroke="#1c0f08" strokeWidth=".8" />
          <ellipse cx="68.4" cy="67.8" rx="2" ry="1.1" fill="#fff" opacity=".75" />
          <Mouth y={75.6} ink="#3b2418" />
          {ear('l', [[38, 51, 10.2], [35.5, 63.5, 10.8], [36.5, 76, 9.8]], 40)}
          {ear('r', [[102, 51, 10.2], [104.5, 63.5, 10.8], [103.5, 76, 9.8]], 100)}
          <g className="np-bow">
            <path d="M86 29 Q80 20 75 22.5 Q73 29 75.5 35.5 Q80 37 86 29Z M86 29 Q92 20 97 22.5 Q99 29 96.5 35.5 Q92 37 86 29Z" fill={g('bow')} stroke="#d4416c" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M84 29 q-4 -3 -7 -3 M84 30 q-4 2 -6.6 4 M88 29 q4 -3 7 -3 M88 30 q4 2 6.6 4" stroke="#e05a82" strokeWidth=".9" fill="none" opacity=".8" />
            <g fill="#fff" opacity=".85"><circle cx="78.4" cy="27" r="1.1" /><circle cx="79" cy="32.6" r="1" /><circle cx="94" cy="27" r="1.1" /><circle cx="93.4" cy="32.6" r="1" /></g>
            <ellipse cx="86" cy="29.2" rx="3.4" ry="3.8" fill="#ff5c8a" stroke="#d4416c" strokeWidth="1.1" />
            <ellipse cx="85" cy="27.8" rx="1.2" ry=".8" fill="#fff" opacity=".8" />
          </g>
        </g></g>
      </g>
      <Fx />
      <Paws c={c} fill="tPaw" ink="#9b6236" front={
        <g className="np-bell">
          <path d="M60 86.5 Q70 90 80 86.5" stroke="#e8536f" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <circle cx="70" cy="92" r="4.6" fill={g('bell')} stroke="#9c700c" strokeWidth="1" />
          <path d="M66.4 92.4 h7.2" stroke="#9c700c" strokeWidth=".9" /><circle cx="70" cy="94.4" r="1" fill="#6b4a06" />
          <circle cx="68.4" cy="90.2" r="1.1" fill="#fff" opacity=".8" />
        </g>} />
    </>
  );
}

// ---- Corgi: fox-orange, white blaze, red bandana. Turns round and shows you its butt. ----
function Corgi({ c, tick }) {
  const g = (n) => `url(#${c(n)})`;
  const ear = (s, d, inner, tufts, ox) => (
    <g className={'np-tick ' + s} key={s + tick} style={{ transformOrigin: `${ox}px 44px` }}>
      <g className={'np-ear ' + s} style={{ transformOrigin: `${ox}px 44px` }}>
        <path d={d} fill={g('cEar')} stroke="#a85a1c" strokeWidth="2.4" strokeLinejoin="round" />
        <path d={inner} fill={g('cEarIn')} />
        <path d={tufts} stroke="#fff8ef" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
  const head = [['e', 70, 61, 35, 27.5]];
  return (
    <>
      <defs>
        <radialGradient id={c('cFur')} cx="42%" cy="28%" r="78%"><stop offset="0" stopColor="#ffc47a" /><stop offset=".55" stopColor="#f2a04a" /><stop offset="1" stopColor="#d47b2b" /></radialGradient>
        <linearGradient id={c('cEar')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9792a" /><stop offset="1" stopColor="#f5a752" /></linearGradient>
        <linearGradient id={c('cEarIn')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6a69a" /><stop offset="1" stopColor="#ffd7cf" /></linearGradient>
        <radialGradient id={c('cWhite')} cx="45%" cy="30%" r="75%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#f3e3cf" /></radialGradient>
        <radialGradient id={c('cPaw')} cx="40%" cy="30%" r="80%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#ead8c2" /></radialGradient>
        <linearGradient id={c('band')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff5a4e" /><stop offset="1" stopColor="#c8261f" /></linearGradient>
      </defs>
      <g clipPath={`url(#${c('field')})`}>
        <g className="np-front"><g className="np-turn"><g className="np-head">
          {ear('l', 'M36 54 Q33 28 39 13 Q43 8 48.5 13 Q58 25 65 41 Z', 'M41.5 46 Q40 29 43.5 19.5 Q52 30 57.5 41 Z', 'M44 44 l2 -6 M48 45 l1 -6 M52 45 l-.4 -5', 50)}
          {ear('r', 'M104 54 Q107 28 101 13 Q97 8 91.5 13 Q82 25 75 41 Z', 'M98.5 46 Q100 29 96.5 19.5 Q88 30 82.5 41 Z', 'M96 44 l-2 -6 M92 45 l-1 -6 M88 45 l.4 -5', 90)}
          <Blob shapes={head} fill={g('cFur')} ink="#a85a1c" w={3} />
          <path d="M36 66 l-3 3 l4 0 l-2 4 l5 -1 M104 66 l3 3 l-4 0 l2 4 l-5 -1" fill="#f2a04a" stroke="#a85a1c" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M65.5 33.6 Q70 31.4 74.5 33.6 Q77.5 46 80.6 58.5 Q70 63.5 59.4 58.5 Q62.5 46 65.5 33.6Z" fill={g('cWhite')} />
          <path d="M68 35.5 l1 -3 M70.4 35 l.4 -3.2 M72.6 35.6 l1 -2.6" stroke="#d47b2b" strokeWidth="1" strokeLinecap="round" opacity=".6" />
          <path d="M44 74 Q42 68 48 66 Q56 64 62 66.5 Q70 62 78 66.5 Q84 64 92 66 Q98 68 96 74 Q99 79 94 82 Q93 87 86 87 Q78 90 70 89 Q62 90 54 87 Q47 87 46 82 Q41 79 44 74Z" fill={g('cWhite')} stroke="#e6cfb4" strokeWidth=".8" />
          <path d="M47 82 l-3 1.6 M93 82 l3 1.6 M50 86 l-2 2 M90 86 l2 2" stroke="#e2c9ac" strokeWidth="1" strokeLinecap="round" />
          <ellipse cx="58" cy="40" rx="11" ry="4.6" fill="#fff" opacity=".2" transform="rotate(-14 58 40)" />
          <ellipse className="np-blush" cx="45" cy="72" rx="7.5" ry="4.4" fill={g('blush')} />
          <ellipse className="np-blush" cx="95" cy="72" rx="7.5" ry="4.4" fill={g('blush')} />
          <Brows ink="#a85a1c" y={47.5} xs={[55, 85]} />
          <Eye c={c} x={55} y={60} /><Eye c={c} x={85} y={60} />
          <path d="M64.6 67.6 Q70 63.6 75.4 67.6 Q75.6 72.4 70 73.4 Q64.4 72.4 64.6 67.6Z" fill={g('nose')} stroke="#120a06" strokeWidth=".8" />
          <ellipse cx="67.8" cy="67" rx="2.1" ry="1.1" fill="#fff" opacity=".75" />
          <Mouth y={75} ink="#2b211c" />
        </g></g></g>
        <g className="np-back">
          <g className="np-peekhead">
            <path d="M100 46 Q99 27 105 19 Q109 25 115 40Z" fill={g('cEar')} stroke="#a85a1c" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M102.5 41 Q102.5 29 105.5 24 Q109 30 111.5 38Z" fill={g('cEarIn')} />
            <ellipse cx="103" cy="56" rx="15.5" ry="13.5" fill={g('cFur')} stroke="#a85a1c" strokeWidth="2.2" />
            <path d="M88 60 Q92 66 100 66 Q106 66 108 70 Q98 72 90 68Z" fill={g('cWhite')} />
            <ellipse cx="100.5" cy="55" rx="5" ry="5.6" fill="#1b100b" /><ellipse cx="101.8" cy="53" rx="2" ry="2.3" fill="#fff" /><circle cx="99" cy="57.4" r=".9" fill="#fff" />
            <path d="M95.4 49 q3.4 -2 6.6 -.4" stroke="#a85a1c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <ellipse cx="89" cy="62" rx="3" ry="2.3" fill="#24140d" />
          </g>
          <g className="np-buttwrap">
            <Blob shapes={[['c', 55.5, 72, 21.5], ['c', 84.5, 72, 21.5], ['e', 70, 84, 35.5, 14]]} fill={g('cFur')} ink="#a85a1c" w={3} />
            <ellipse cx="50" cy="62" rx="8" ry="5" fill="#fff" opacity=".22" transform="rotate(-30 50 62)" />
            <ellipse cx="80" cy="61" rx="7" ry="4.4" fill="#fff" opacity=".18" transform="rotate(-25 80 61)" />
            <path d="M70 57 Q71.4 66 70 75" stroke="#b5651f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M43 89 Q44 80 50 78 l-1 -3 l4 2 Q58 73 63 76 l1 -3 l2.4 3 Q70 71 74 76 l2.4 -3 l1 3 Q82 73 87 77 l4 -2 l-1 3 Q96 80 97 89Z" fill={g('cWhite')} stroke="#e2c9ac" strokeWidth="1" strokeLinejoin="round" />
            <g className="np-nub">
              <path d="M64 55 Q63 46 70 45 Q77 46 76 55 Q73 57.5 70 57 Q67 57.5 64 55Z" fill={g('cWhite')} stroke="#e2c9ac" strokeWidth="1.1" />
              <path d="M67.4 47.6 l-1 -2.6 M70 46.8 v-2.8 M72.6 47.6 l1 -2.6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </g>
      <Fx />
      <g className="np-front"><Paws c={c} fill="cPaw" ink="#cdb69b" beans="#f2a9a0" front={
        <g>
          <path d="M57 85.5 Q70 89.5 83 85.5 L70 97.5Z" fill={g('band')} stroke="#9c1a14" strokeWidth="1.1" strokeLinejoin="round" />
          <g fill="#fff" opacity=".9"><circle cx="64" cy="89" r="1" /><circle cx="70" cy="91.5" r="1" /><circle cx="76" cy="89" r="1" /><circle cx="70" cy="95" r=".8" /></g>
        </g>} /></g>
      <g className="np-back np-backpaws">
        {[50, 90].map((x) => <g key={x}><ellipse cx={x} cy="91.5" rx="10.5" ry="2.4" fill="#3a2a1a" opacity=".12" /><ellipse cx={x} cy="88" rx="9.8" ry="6.8" fill={g('cPaw')} stroke="#cdb69b" strokeWidth="1.5" /><ellipse cx={x - 2.6} cy="85.4" rx="3.4" ry="1.5" fill="#fff" opacity=".6" /></g>)}
      </g>
    </>
  );
}

const ANIMALS = { teddy: Teddy, corgi: Corgi };
function Art({ animal, uid, px, py, tick }) {
  const c = (n) => `${uid}-${n}`;
  const A = ANIMALS[animal] || Teddy;
  return (
    <svg className="np-art" viewBox="0 0 140 100" aria-hidden="true" focusable="false" style={{ '--px': px + 'px', '--py': py + 'px' }}>
      <defs>
        <clipPath id={c('field')}><rect x="-40" y="-60" width="220" height="148" /></clipPath>
        <linearGradient id={c('iris')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e120c" /><stop offset=".55" stopColor="#4a2a18" /><stop offset="1" stopColor="#9a6034" /></linearGradient>
        <radialGradient id={c('blush')}><stop offset="0" stopColor="#ff8a9a" stopOpacity=".95" /><stop offset="1" stopColor="#ff8a9a" stopOpacity="0" /></radialGradient>
        <radialGradient id={c('nose')} cx="40%" cy="30%" r="70%"><stop offset="0" stopColor="#6b4a3a" /><stop offset="1" stopColor="#1a0d07" /></radialGradient>
      </defs>
      <A c={c} tick={tick} />
    </svg>
  );
}

const NosyPassword = forwardRef(function NosyPassword(props, ref) {
  const {
    value: valueProp, defaultValue = '', onChange,
    revealed: revealedProp, defaultRevealed = false, onRevealChange,
    label = 'Password', placeholder = 'Enter password', name, id: idProp, autoComplete = 'current-password',
    disabled = false, size = 'md', animal = 'teddy', className = '', style, inputProps,
  } = props;
  const uid = 'np' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const inputId = idProp || uid + '-in';
  const [valueState, setValueState] = useState(defaultValue);
  const value = valueProp !== undefined ? valueProp : valueState;
  const [revState, setRevState] = useState(defaultRevealed);
  const revealed = revealedProp !== undefined ? revealedProp : revState;

  const [focused, setFocused] = useState(false);
  const [phase, setPhase] = useState(defaultRevealed ? 'cover' : 'idle'); // idle|startle|gasp|cover|peek|caught|whistle|sad
  const [frac, setFrac] = useState(0);
  const [lean, setLean] = useState(0);
  const [glint, setGlint] = useState(0);
  const inRef = useRef(null), rootRef = useRef(null), timers = useRef([]), leanRef = useRef(0), raf = useRef(0), canvas = useRef(null);
  const prevVal = useRef(value), prevRev = useRef(revealed);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const after = (ms, fn) => { timers.current.push(setTimeout(fn, reduced() ? 0 : ms)); };
  useEffect(() => () => { clear(); cancelAnimationFrame(raf.current); }, []);

  // caret position -> where the eyes look
  const measure = useCallback(() => {
    const el = inRef.current; if (!el || typeof window === 'undefined') return;
    const cs = getComputedStyle(el);
    const ctx = (canvas.current = canvas.current || document.createElement('canvas').getContext('2d'));
    if (!ctx) return;
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const caret = el.selectionStart == null ? el.value.length : el.selectionStart;
    const txt = el.type === 'password' ? '\u2022'.repeat(caret) : el.value.slice(0, caret);
    const pl = parseFloat(cs.paddingLeft) || 0;
    const x = pl + ctx.measureText(txt).width - el.scrollLeft;
    const r = el.getBoundingClientRect(), root = rootRef.current.getBoundingClientRect();
    setFrac(clamp((r.left - root.left + x) / root.width, 0, 1));
  }, []);

  const bump = () => {
    setGlint((g) => g + 1);
    leanRef.current = Math.min(1, leanRef.current + 0.28);
    if (reduced()) return;
    cancelAnimationFrame(raf.current);
    let last = performance.now();
    const tick = (t) => {
      const dt = Math.min(64, t - last); last = t;
      leanRef.current = Math.max(0, leanRef.current - dt / 900);
      setLean(leanRef.current);
      if (leanRef.current > 0) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  // reveal / hide choreography
  useEffect(() => {
    if (prevRev.current === revealed) return;
    prevRev.current = revealed; clear();
    if (revealed) {
      setPhase('gasp');
      after(T.gasp, () => setPhase('cover'));
      const loop = (d) => after(d, () => {
        setPhase('peek');
        after(T.peekFor, () => { setPhase('caught'); after(T.caughtFor, () => { setPhase('cover'); loop(T.peekEvery); }); });
      });
      if (!reduced()) loop(T.peekAt);
    } else {
      setPhase('whistle');
      after(T.whistle, () => setPhase('idle'));
    }
  }, [revealed]);

  // cleared the field -> sad
  useEffect(() => {
    const was = prevVal.current; prevVal.current = value;
    if (was && !value && !revealed) { clear(); setPhase('sad'); after(T.sad, () => setPhase('idle')); }
    if (focused) measure();
  }, [value]);

  const setReveal = (v) => {
    if (revealedProp === undefined) setRevState(v);
    onRevealChange && onRevealChange(v);
  };
  const handleChange = (e) => {
    const v = e.target.value;
    if (valueProp === undefined) setValueState(v);
    onChange && onChange(v, e);
    if (v.length > (value || '').length) bump();
    requestAnimationFrame(measure);
  };
  const onFocus = () => {
    setFocused(true); measure();
    if (phase === 'idle' && !revealed) { clear(); setPhase('startle'); after(T.startle, () => setPhase('idle')); }
  };

  useImperativeHandle(ref, () => ({
    focus: () => inRef.current && inRef.current.focus(),
    blur: () => inRef.current && inRef.current.blur(),
    reveal: (v = true) => setReveal(!!v),
    get input() { return inRef.current; }, get node() { return rootRef.current; }, get phase() { return phase; },
  }), [phase, revealedProp]);

  const asleep = (!focused && !value && !revealed && phase === 'idle') || disabled;
  // gaze
  let px = -5 + frac * 10, py = focused ? 2.6 : 1.8;
  if (!focused && value) { px = 0; py = 2.2; }
  if (phase === 'gasp') { px = -4.4; py = -3.2; }
  if (phase === 'peek') { px = clamp(px, -2, 4.4); py = 3.2; }
  if (phase === 'whistle') { px = 3.6; py = -3.6; }
  if (phase === 'sad') { px = 0; py = 3.6; }
  if (asleep) { px = 0; py = 2; }

  const cls = ['np', 'np-' + size, 'np-a-' + (ANIMALS[animal] ? animal : 'teddy'), glint > 0 && 'has-ticked', 'is-' + phase, asleep && 'is-asleep', focused && 'is-focus', revealed && 'is-revealed', value && 'has-value', disabled && 'is-disabled', className].filter(Boolean).join(' ');
  return (
    <div ref={rootRef} className={cls} style={{ ...style, '--lean': lean.toFixed(3), '--hx': (focused && !revealed ? frac - 0.5 : 0).toFixed(3) }}>
      <label className="np-label" htmlFor={inputId}>{label}</label>
      <Art animal={animal} uid={uid} px={px} py={py} tick={glint} />
      <div className="np-field">
        <input
          ref={inRef} id={inputId} name={name} className="np-input"
          type={revealed ? 'text' : 'password'} value={value} placeholder={placeholder}
          autoComplete={autoComplete} spellCheck={false} autoCapitalize="off" disabled={disabled}
          onChange={handleChange} onFocus={onFocus} onBlur={() => setFocused(false)}
          onKeyUp={measure} onClick={measure} onSelect={measure}
          {...inputProps}
        />
        <button
          type="button" className="np-toggle" disabled={disabled}
          aria-label={revealed ? 'Hide password' : 'Show password'} aria-pressed={revealed} aria-controls={inputId}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setReveal(!revealed); inRef.current && inRef.current.focus(); }}
        >
          <EyeIcon open={!revealed} />
        </button>
      </div>
    </div>
  );
});

export default NosyPassword;
