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

function Eye({ x, y, cls = '' }) {
  return (
    <g className={'np-eye ' + cls}>
      <g className="np-eyeopen">
        <g className="np-iris">
          <ellipse cx={x} cy={y} rx="8" ry="8.8" fill="#2a1d17" />
          <ellipse cx={x} cy={y + 3.5} rx="5.4" ry="3.6" fill="#4a3226" opacity=".8" />
          <circle cx={x + 2.6} cy={y - 3.2} r="3.1" fill="#fff" />
          <circle cx={x - 2.7} cy={y + 2.9} r="1.35" fill="#fff" />
        </g>
      </g>
      <path className="np-eyesleep" d={`M${x - 7} ${y} Q${x} ${y + 5.5} ${x + 7} ${y}`} />
      <path className="np-eyehappy" d={`M${x - 7} ${y + 2.5} Q${x} ${y - 5} ${x + 7} ${y + 2.5}`} />
    </g>
  );
}
function Mouth({ y = 75, ink }) {
  return (
    <g className="np-mouths" stroke={ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path className="np-mouth smile" d={`M63.5 ${y} Q66.75 ${y + 4} 70 ${y} Q73.25 ${y + 4} 76.5 ${y}`} fill="none" />
      <path className="np-mouth flat" d={`M65 ${y + 2} Q70 ${y + 0.6} 75 ${y + 2}`} fill="none" />
      <ellipse className="np-mouth oo" cx="71" cy={y + 2.4} rx="2.4" ry="2.8" fill="#7a2f36" strokeWidth="1.1" />
      <ellipse className="np-mouth gasp" cx="70" cy={y + 2.6} rx="3.6" ry="4.4" fill="#7a2f36" strokeWidth="1.1" />
    </g>
  );
}
const Fx = () => (
  <>
    <path className="np-sweat" d="M114 26 Q119 34 114 38 Q109 34 114 26Z" fill="#9ad7ff" stroke="#58a5dc" strokeWidth="1" />
    <g className="np-notes" fill="#9a7426"><text x="112" y="78" className="n1">♪</text><text x="122" y="64" className="n2">♫</text></g>
    <g className="np-z" fill="#8a93a3"><text x="106" y="40" className="z1">z</text><text x="114" y="30" className="z2">z</text></g>
  </>
);
const Paws = ({ fill, line, beans }) => (
  <g className="np-turn">
    {[['l', 48], ['r', 92]].map(([s, x]) => (
      <g key={s} className={'np-paw ' + s}>
        <ellipse cx={x} cy="88" rx="10" ry="7" fill={fill} stroke={line} strokeWidth="1.1" />
        <path d={`M${x - 4} 85 v3.4 M${x} 84.2 v3.8 M${x + 4} 85 v3.4`} stroke={beans} strokeWidth="1.2" strokeLinecap="round" />
      </g>
    ))}
  </g>
);

// Toy poodle ("teddy"): apricot curls, a pink bow. Covers its eyes with its big curly ears.
function Teddy({ c, tick }) {
  const ear = (s, pts, ox) => (
    <g className={'np-tick ' + s} key={s + tick} style={{ transformOrigin: `${ox}px 44px` }}>
      <g className={'np-ear ' + s} style={{ transformOrigin: `${ox}px 44px` }}>
        {pts.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#b97a48" />)}
        {pts.map(([x, y], i) => <path key={'c' + i} d={`M${x - 4} ${y + 1} q4 -5 8 0`} fill="none" stroke="#9b5f33" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />)}
      </g>
    </g>
  );
  return (
    <>
      <g clipPath={`url(#${c('field')})`}>
        <g className="np-turn"><g className="np-head">
          {[[50, 39, 10], [59, 32, 11], [70, 29, 11.5], [81, 32, 11], [90, 39, 10], [42, 49, 9.5], [98, 49, 9.5], [41, 66, 10.5], [99, 66, 10.5]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#d69c66" />)}
          <ellipse cx="70" cy="61" rx="33" ry="27" fill="#d69c66" />
          {[[58, 31], [70, 27], [82, 31]].map(([x, y], i) => <path key={i} d={`M${x - 4} ${y + 2} q4 -5 8 0`} fill="none" stroke="#b97a48" strokeWidth="1.3" strokeLinecap="round" />)}
          <g className="np-bow"><path d="M86 30 L78 24 Q76 30 78 36Z M86 30 L94 24 Q96 30 94 36Z" fill="#ff8fab" stroke="#e0607f" strokeWidth="1" /><circle cx="86" cy="30" r="2.8" fill="#ff6f93" /></g>
          <ellipse cx="70" cy="75" rx="14.5" ry="10.5" fill="#f4dbbd" />
          <ellipse className="np-blush" cx="46" cy="73" rx="6.5" ry="3.6" fill="#ff9aa6" />
          <ellipse className="np-blush" cx="94" cy="73" rx="6.5" ry="3.6" fill="#ff9aa6" />
          <Eye x={56} y={61} cls="l" /><Eye x={84} y={61} cls="r" />
          <ellipse cx="70" cy="69.5" rx="4.8" ry="3.6" fill="#3b2418" /><ellipse cx="68.8" cy="68.6" rx="1.5" ry=".9" fill="#fff" opacity=".7" />
          <Mouth y={75} ink="#3b2418" />
          {ear('l', [[38, 52, 10], [36, 64, 10.5], [37, 76, 9.5]], 40)}
          {ear('r', [[102, 52, 10], [104, 64, 10.5], [103, 76, 9.5]], 100)}
        </g></g>
      </g>
      <Fx />
      <Paws fill="#e2ad7c" line="#bf8352" beans="#a8693a" />
    </>
  );
}

// Corgi: fox-orange, white blaze. Covers its eyes by turning round and showing you its butt.
function Corgi({ c, tick }) {
  const ear = (s, d, inner, ox) => (
    <g className={'np-tick ' + s} key={s + tick} style={{ transformOrigin: `${ox}px 44px` }}>
      <g className={'np-ear ' + s} style={{ transformOrigin: `${ox}px 44px` }}>
        <path d={d} fill="#e88f3a" stroke="#c9732a" strokeWidth="1.2" strokeLinejoin="round" /><path d={inner} fill="#ffc4b8" />
      </g>
    </g>
  );
  return (
    <>
      <g clipPath={`url(#${c('field')})`}>
        <g className="np-front"><g className="np-turn"><g className="np-head">
          {ear('l', 'M36 52 Q34 26 40 13 Q44 9 49 14 Q58 26 64 40 Z', 'M41 44 Q40 28 43 20 Q51 30 56 40 Z', 50)}
          {ear('r', 'M104 52 Q106 26 100 13 Q96 9 91 14 Q82 26 76 40 Z', 'M99 44 Q100 28 97 20 Q89 30 84 40 Z', 90)}
          <ellipse cx="70" cy="61" rx="35" ry="27.5" fill="#f2a24e" />
          <path d="M66 34 Q70 32 74 34 Q77 46 80 58 Q70 63 60 58 Q63 46 66 34Z" fill="#fff8ef" />
          <ellipse cx="70" cy="77" rx="24" ry="13" fill="#fff8ef" />
          <ellipse cx="45" cy="76" rx="10" ry="8" fill="#fff8ef" /><ellipse cx="95" cy="76" rx="10" ry="8" fill="#fff8ef" />
          <ellipse className="np-blush" cx="45" cy="72" rx="6.5" ry="3.6" fill="#ff9aa6" />
          <ellipse className="np-blush" cx="95" cy="72" rx="6.5" ry="3.6" fill="#ff9aa6" />
          <Eye x={55} y={60} cls="l" /><Eye x={85} y={60} cls="r" />
          <ellipse cx="70" cy="69" rx="5" ry="3.7" fill="#2b211c" /><ellipse cx="68.7" cy="68" rx="1.5" ry=".9" fill="#fff" opacity=".7" />
          <Mouth y={74.5} ink="#2b211c" />
        </g></g></g>
        <g className="np-back">
          <g className="np-peekhead">
            <path d="M101 44 Q101 26 106 20 Q110 26 114 40Z" fill="#e88f3a" stroke="#c9732a" strokeWidth="1.1" />
            <ellipse cx="103" cy="56" rx="15" ry="13" fill="#f2a24e" />
            <ellipse cx="96" cy="64" rx="9" ry="6.5" fill="#fff8ef" />
            <ellipse cx="101" cy="55" rx="4.6" ry="5" fill="#2a1d17" /><circle cx="102.4" cy="53.2" r="1.8" fill="#fff" />
            <ellipse cx="90" cy="62" rx="2.6" ry="2" fill="#2b211c" />
          </g>
          <g className="np-buttwrap">
            <circle cx="56" cy="72" r="21" fill="#f2a24e" /><circle cx="84" cy="72" r="21" fill="#f2a24e" />
            <ellipse cx="70" cy="84" rx="35" ry="14" fill="#f2a24e" />
            <path d="M70 58 Q71 66 70 74" stroke="#d2843a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M44 88 Q48 74 60 76 Q66 70 70 76 Q74 70 80 76 Q92 74 96 88Z" fill="#fff8ef" />
            <g className="np-nub"><circle cx="70" cy="53" r="6" fill="#fff8ef" stroke="#eadbc8" strokeWidth="1" /><circle cx="70" cy="56" r="4" fill="#f2a24e" /></g>
          </g>
        </g>
      </g>
      <Fx />
      <g className="np-front"><Paws fill="#fffaf3" line="#e3d2bf" beans="#e7b8a8" /></g>
      <g className="np-back np-backpaws">
        <ellipse cx="50" cy="88" rx="9.5" ry="6.5" fill="#fffaf3" stroke="#e3d2bf" strokeWidth="1.1" />
        <ellipse cx="90" cy="88" rx="9.5" ry="6.5" fill="#fffaf3" stroke="#e3d2bf" strokeWidth="1.1" />
      </g>
    </>
  );
}

const ANIMALS = { teddy: Teddy, corgi: Corgi };
function Art({ animal, uid, px, py, tick }) {
  const c = (n) => `${uid}-${n}`;
  const A = ANIMALS[animal] || Teddy;
  return (
    <svg className="np-art" viewBox="0 0 140 96" aria-hidden="true" focusable="false" style={{ '--px': px + 'px', '--py': py + 'px' }}>
      <defs><clipPath id={c('field')}><rect x="-40" y="-60" width="220" height="148" /></clipPath></defs>
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
