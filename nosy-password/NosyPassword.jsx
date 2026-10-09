// NosyPassword — a password field with a nosy raccoon neighbour peeking over its top edge.
// Its eyes follow your caret as you type. Reveal the password and it gasps, whips its head away and
// covers its eyes, then sneaks a peek between its paws and gets caught. Hide it again and it whistles
// like nothing happened. Clear the field and it sinks back, disappointed.
// size="md" (default) fits a sign-in form; size="lg" is the showcase drawing.
import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useId } from 'react';

const T = { gasp: 130, peekAt: 1100, peekFor: 650, caughtFor: 420, peekEvery: 3600, whistle: 1600, sad: 1300, startle: 420 };
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

function Raccoon({ uid, px, py, glint }) {
  const c = (n) => `${uid}-${n}`;
  return (
    <svg className="np-art" viewBox="0 0 140 96" aria-hidden="true" focusable="false" style={{ '--px': px + 'px', '--py': py + 'px' }}>
      <defs>
        <clipPath id={c('field')}><rect x="-40" y="-60" width="220" height="148" /></clipPath>
        <clipPath id={c('el')}><circle cx="54" cy="56" r="7.6" /></clipPath>
        <clipPath id={c('er')}><circle cx="86" cy="56" r="7.6" /></clipPath>
        <pattern id={c('pj')} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#eaf1fb" /><rect width="4" height="8" fill="#7fa6dd" />
        </pattern>
        <radialGradient id={c('fur')} cx="50%" cy="35%" r="65%">
          <stop offset="0" stopColor="#b3b8c1" /><stop offset="1" stopColor="#8b919c" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${c('field')})`}>
        <g className="np-turn">
          <g className="np-head">
            {/* pajama collar */}
            <path d="M34 96 Q36 80 70 80 Q104 80 106 96 Z" fill={`url(#${c('pj')})`} stroke="#5c7fb3" strokeWidth="1.2" />
            {/* ears */}
            <g className="np-ear l"><path d="M30 46 Q24 16 50 26 Q44 36 30 46Z" fill="#6f7580" /><path d="M33 40 Q30 23 45 28 Q40 34 33 40Z" fill="#f2b9b4" /></g>
            <g className="np-ear r"><path d="M110 46 Q116 16 90 26 Q96 36 110 46Z" fill="#6f7580" /><path d="M107 40 Q110 23 95 28 Q100 34 107 40Z" fill="#f2b9b4" /></g>
            {/* head */}
            <ellipse cx="70" cy="58" rx="40" ry="31" fill={`url(#${c('fur')})`} stroke="#5f6570" strokeWidth="1.3" />
            <path d="M62 28 Q70 24 78 28 L74 44 Q70 47 66 44Z" fill="#6f7580" opacity=".9" />
            {/* white brows + cheeks */}
            <path d="M38 50 Q50 34 66 46 Q52 42 38 50Z" fill="#f6f3ee" />
            <path d="M102 50 Q90 34 74 46 Q88 42 102 50Z" fill="#f6f3ee" />
            {/* mask */}
            <path d="M32 60 Q34 44 54 45 Q64 46 70 52 Q76 46 86 45 Q106 44 108 60 Q100 70 86 67 Q76 65 70 60 Q64 65 54 67 Q40 70 32 60Z" fill="#2f333b" />
            {/* muzzle */}
            <ellipse cx="70" cy="74" rx="20" ry="12.5" fill="#f6f3ee" />
            {/* blush */}
            <ellipse className="np-blush" cx="44" cy="73" rx="7" ry="3.6" fill="#ff8f9a" />
            <ellipse className="np-blush" cx="96" cy="73" rx="7" ry="3.6" fill="#ff8f9a" />
            {/* eyes */}
            {[['l', 54], ['r', 86]].map(([s, x]) => (
              <g key={s} className={'np-eye ' + s}>
                <circle cx={x} cy="56" r="7.6" fill="#fff" />
                <g clipPath={`url(#${c('e' + s)})`}>
                  <g className="np-pupil"><circle cx={x} cy="56" r="4.1" fill="#1b1d22" /><circle cx={x + 1.5} cy="54.4" r="1.4" fill="#fff" /></g>
                  <rect className="np-lid" x={x - 9} y="47" width="18" height="18" fill="#3a3f48" />
                </g>
              </g>
            ))}
            {/* glasses */}
            <g className="np-glasses" fill="rgba(255,255,255,.14)" stroke="#c99a3b" strokeWidth="2.1">
              <circle cx="54" cy="56" r="11.2" /><circle cx="86" cy="56" r="11.2" />
              <path d="M65 54 Q70 51 75 54" fill="none" />
              <path d="M42.8 55 L33 52" fill="none" /><path d="M97.2 55 L107 52" fill="none" />
            </g>
            <g className="np-glint" key={glint}>
              <path d="M47 52 L51 48" /><path d="M79 52 L83 48" />
            </g>
            {/* nose + mouth */}
            <ellipse cx="70" cy="69.5" rx="5.6" ry="3.9" fill="#22252b" />
            <ellipse cx="68.4" cy="68.4" rx="1.7" ry="1" fill="#fff" opacity=".7" />
            <path className="np-mouth smile" d="M64.5 76 Q70 80.5 75.5 76" fill="none" stroke="#3a3f48" strokeWidth="1.7" strokeLinecap="round" />
            <path className="np-mouth flat" d="M65 78 Q70 76.6 75 78" fill="none" stroke="#3a3f48" strokeWidth="1.7" strokeLinecap="round" />
            <ellipse className="np-mouth oo" cx="71.5" cy="78" rx="2.4" ry="2.7" fill="#5b2b33" stroke="#3a3f48" strokeWidth="1.1" />
            <path className="np-mouth gasp" d="M66.5 78.5 Q70 73.5 73.5 78.5 Q70 81.5 66.5 78.5Z" fill="#5b2b33" stroke="#3a3f48" strokeWidth="1.1" />
          </g>
          {/* forearms, clipped at the field edge */}
          <g className="np-arm l"><rect x="38" y="88" width="16" height="44" rx="8" fill="#6a707b" /></g>
          <g className="np-arm r"><rect x="86" y="88" width="16" height="44" rx="8" fill="#6a707b" /></g>
        </g>
      </g>
      {/* sweat + notes + z, outside the head so they float */}
      <path className="np-sweat" d="M112 22 Q117 30 112 34 Q107 30 112 22Z" fill="#8fd0ff" stroke="#4d9ad6" strokeWidth="1" />
      <g className="np-notes" fill="#9a7426"><text x="106" y="82" className="n1">♪</text><text x="116" y="70" className="n2">♫</text></g>
      <g className="np-z" fill="#7d8796"><text x="104" y="40" className="z1">z</text><text x="112" y="30" className="z2">z</text></g>
      {/* paws, in front of the field edge */}
      <g className="np-turn">
        {[['l', 46], ['r', 94]].map(([s, x]) => (
          <g key={s} className={'np-paw ' + s}>
            <g className="np-pawshape">
              <ellipse cx={x} cy="88" rx="10.5" ry="7.2" fill="#5d626c" stroke="#464a52" strokeWidth="1.1" />
              <path d={`M${x - 4.5} 84.5 v4 M${x} 83.6 v4.6 M${x + 4.5} 84.5 v4`} stroke="#3e4249" strokeWidth="1.2" strokeLinecap="round" />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

const NosyPassword = forwardRef(function NosyPassword(props, ref) {
  const {
    value: valueProp, defaultValue = '', onChange,
    revealed: revealedProp, defaultRevealed = false, onRevealChange,
    label = 'Password', placeholder = 'Enter password', name, id: idProp, autoComplete = 'current-password',
    disabled = false, size = 'md', className = '', style, inputProps,
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

  const cls = ['np', 'np-' + size, 'is-' + phase, asleep && 'is-asleep', focused && 'is-focus', revealed && 'is-revealed', value && 'has-value', disabled && 'is-disabled', className].filter(Boolean).join(' ');
  return (
    <div ref={rootRef} className={cls} style={{ ...style, '--lean': lean.toFixed(3) }}>
      <label className="np-label" htmlFor={inputId}>{label}</label>
      <Raccoon uid={uid} px={px} py={py} glint={glint} />
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
