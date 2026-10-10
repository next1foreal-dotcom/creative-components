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

// ---- Sanrio-style flat drawing: pure fills, one soft near-black line, bean eyes, pink blush ----
const INK = '#3a2a24';
const LW = 2.4;
const line = { stroke: INK, strokeWidth: LW, strokeLinejoin: 'round', strokeLinecap: 'round' };
// Union outline: stroke every piece wide underneath, fill them all on top -> one clean silhouette.
function Blob({ shapes, fill }) {
  const draw = (s, i, extra) => s[0] === 'c'
    ? <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} {...extra} />
    : s[0] === 'e' ? <ellipse key={i} cx={s[1]} cy={s[2]} rx={s[3]} ry={s[4]} {...extra} />
    : <path key={i} d={s[1]} {...extra} />;
  return (
    <>
      <g>{shapes.map((s, i) => draw(s, i, { fill: INK, stroke: INK, strokeWidth: LW * 2, strokeLinejoin: 'round' }))}</g>
      <g>{shapes.map((s, i) => draw(s, i, { fill }))}</g>
    </>
  );
}
function Eye({ x, y }) {
  return (
    <g className="np-eye">
      <g className="np-eyeopen"><g className="np-iris">
        <ellipse cx={x} cy={y} rx="3.6" ry="5" fill={INK} />
        <ellipse cx={x + 1.1} cy={y - 2} rx="1" ry="1.3" fill="#fff" />
      </g></g>
      <path className="np-eyesleep" d={`M${x - 5} ${y} Q${x} ${y + 3.6} ${x + 5} ${y}`} />
      <path className="np-eyehappy" d={`M${x - 5} ${y + 1.6} Q${x} ${y - 3.6} ${x + 5} ${y + 1.6}`} />
    </g>
  );
}
function Mouth({ y }) {
  const pink = '#f59bab';
  return (
    <g className="np-mouths" {...line} strokeWidth="1.9">
      <g className="np-mouth smile">
        <path d={`M65.5 ${y} Q70 ${y + 0.8} 74.5 ${y} Q74 ${y + 7.5} 70 ${y + 8} Q66 ${y + 7.5} 65.5 ${y}Z`} fill="#c94f63" />
        <path d={`M66.8 ${y + 4.6} Q70 ${y + 2.6} 73.2 ${y + 4.6} Q72.4 ${y + 7.6} 70 ${y + 7.8} Q67.6 ${y + 7.6} 66.8 ${y + 4.6}Z`} fill={pink} stroke="none" />
        <path d={`M63.6 ${y - 1.2} q.6 1 1.9 1.2 M76.4 ${y - 1.2} q-.6 1 -1.9 1.2`} fill="none" />
      </g>
      <path className="np-mouth flat" d={`M66 ${y + 2} Q70 ${y + 0.8} 74 ${y + 2}`} fill="none" />
      <ellipse className="np-mouth oo" cx="71.5" cy={y + 2.5} rx="2.2" ry="2.6" fill="#c94f63" />
      <g className="np-mouth gasp"><ellipse cx="70" cy={y + 3.4} rx="3.6" ry="4.6" fill="#c94f63" /><ellipse cx="70" cy={y + 5.6} rx="2.2" ry="1.5" fill={pink} stroke="none" /></g>
    </g>
  );
}
const Blush = ({ y = 70, xs = [47, 93] }) => xs.map((x) => <ellipse key={x} className="np-blush" cx={x} cy={y} rx="6.6" ry="3.8" fill="#f9b4c1" />);
const Fx = () => (
  <>
    <g className="np-sweat"><path d="M114 25 Q120 34 114 39 Q108 34 114 25Z" fill="#a9dcff" {...line} strokeWidth="1.6" /></g>
    <g className="np-notes" fill={INK}><text x="112" y="78" className="n1">♪</text><text x="122" y="64" className="n2">♫</text></g>
    <g className="np-z" fill="#8a93a3"><text x="106" y="40" className="z1">z</text><text x="114" y="30" className="z2">z</text></g>
  </>
);
function Paws({ fill = '#fff', front, xs = [48, 92] }) {
  return (
    <g className="np-turn">
      {front}
      {[['l', xs[0]], ['r', xs[1]]].map(([s, x]) => (
        <g key={s} className={'np-paw ' + s}>
          <ellipse cx={x} cy="88" rx="9.6" ry="7" fill={fill} {...line} />
          <path d={`M${x - 3} 91 v-3.4 M${x + 3} 91 v-3.4`} {...line} strokeWidth="1.7" fill="none" />
        </g>
      ))}
    </g>
  );
}

// ---- Teddy (original): apricot toy poodle, scalloped curly head, long fluffy ears, pink bow. ----
function Teddy({ tick, fid }) {
  const FUR = '#f7d3ae', EAR = '#ecb68c';
  const ear = (s, d, ox) => (
    <g className={'np-tick ' + s} key={s + tick} style={{ transformOrigin: `${ox}px 44px` }}>
      <g className={'np-ear ' + s} style={{ transformOrigin: `${ox}px 44px` }}>
        <path d={d} fill={EAR} {...line} />
      </g>
    </g>
  );
  return (
    <>
      <g clipPath={`url(#${fid})`}>
        <g className="np-turn"><g className="np-head">
          <Blob fill={FUR} shapes={[['e', 70, 63, 34, 25.5], ['c', 52, 42, 9], ['c', 61, 36.5, 9.5], ['c', 70, 34.5, 10], ['c', 79, 36.5, 9.5], ['c', 88, 42, 9]]} />
          <path d="M64 40 q3 -3 6 0 q3 -3 6 0" fill="none" {...line} strokeWidth="1.6" />
          <Blush y={71} xs={[51, 89]} />
          <Eye x={56} y={62} /><Eye x={84} y={62} />
          <ellipse cx="70" cy="68.4" rx="3.2" ry="2.3" fill={INK} />
          <Mouth y={71.6} />
          {ear('l', 'M42 46 Q33 46 31.5 56 Q28 62 31 68 Q29 75 33.5 80 Q37 86 42.5 83 Q47 80 46 73 Q49 66 46.5 60 Q49 52 42 46Z', 41)}
          {ear('r', 'M98 46 Q107 46 108.5 56 Q112 62 109 68 Q111 75 106.5 80 Q103 86 97.5 83 Q93 80 94 73 Q91 66 93.5 60 Q91 52 98 46Z', 99)}
          <g className="np-bow">
            <path d="M85 32 Q79 24 75.5 26.5 Q74 32 76 37.5 Q80 38.5 85 32Z M85 32 Q91 24 94.5 26.5 Q96 32 94 37.5 Q90 38.5 85 32Z" fill="#ff9fb7" {...line} strokeWidth="2" />
            <g fill="#fff"><circle cx="79" cy="30" r="1.1" /><circle cx="79.4" cy="34.6" r="1" /><circle cx="91" cy="30" r="1.1" /><circle cx="90.6" cy="34.6" r="1" /></g>
            <circle cx="85" cy="32" r="3" fill="#ff7f9e" {...line} strokeWidth="2" />
          </g>
        </g></g>
      </g>
      <Fx />
      <Paws fill={FUR} front={
        <g className="np-bell">
          <circle cx="70" cy="91" r="4.2" fill="#ffd95a" {...line} strokeWidth="2" />
          <path d="M67 91.6 h6" {...line} strokeWidth="1.5" />
        </g>} />
    </>
  );
}

// ---- Corgi (original): orange and white, big pointy ears, red bandana. Turns round and shows its butt. ----
function Corgi({ tick, fid }) {
  const OR = '#f6ad62', WH = '#fff', IN = '#ffc9cf';
  const ear = (s, d, inner, ox) => (
    <g className={'np-tick ' + s} key={s + tick} style={{ transformOrigin: `${ox}px 44px` }}>
      <g className={'np-ear ' + s} style={{ transformOrigin: `${ox}px 44px` }}>
        <path d={d} fill={OR} {...line} /><path d={inner} fill={IN} />
      </g>
    </g>
  );
  return (
    <>
      <g clipPath={`url(#${fid})`}>
        <g className="np-front"><g className="np-turn"><g className="np-head">
          {ear('l', 'M38 54 Q34 30 40 16 Q44 11 49 16 Q57 27 64 42Z', 'M43.5 46 Q42 31 44.5 22.5 Q51.5 31.5 56.5 41.5Z', 50)}
          {ear('r', 'M102 54 Q106 30 100 16 Q96 11 91 16 Q83 27 76 42Z', 'M96.5 46 Q98 31 95.5 22.5 Q88.5 31.5 83.5 41.5Z', 90)}
          <Blob fill={OR} shapes={[['e', 70, 63, 35, 25.5]]} />
          <path d="M66 38.2 Q70 37 74 38.2 Q76.5 50 79.5 60 Q86 62 92 67 Q95 74 90 80 Q82 87.6 70 87.6 Q58 87.6 50 80 Q45 74 48 67 Q54 62 60.5 60 Q63.5 50 66 38.2Z" fill={WH} />
          <Blush y={71} xs={[46, 94]} />
          <Eye x={55} y={61} /><Eye x={85} y={61} />
          <ellipse cx="70" cy="67.6" rx="3.6" ry="2.6" fill={INK} />
          <Mouth y={71} />
        </g></g></g>
        <g className="np-back">
          <g className="np-peekhead">
            <path d="M100 47 Q99 28 105 20 Q109 26 115 41Z" fill={OR} {...line} />
            <path d="M102.6 42 Q102.6 30 105.4 25 Q108.6 31 111.4 39Z" fill={IN} />
            <ellipse cx="103" cy="57" rx="15" ry="13" fill={OR} {...line} />
            <path d="M89 62 Q93 67 101 66.6 Q107 66.6 109 70 Q99 72.6 91 68.6Z" fill={WH} />
            <ellipse cx="100" cy="56" rx="3.3" ry="4.6" fill={INK} /><ellipse cx="101" cy="54.2" rx="1" ry="1.3" fill="#fff" />
            <ellipse cx="90" cy="62" rx="2.4" ry="1.8" fill={INK} />
            <ellipse cx="104" cy="65" rx="4" ry="2.4" fill="#f9b4c1" />
          </g>
          <g className="np-buttwrap">
            <Blob fill={OR} shapes={[['c', 55.5, 73, 21], ['c', 84.5, 73, 21], ['e', 70, 85, 35, 13]]} />
            <path d="M70 60 Q71.2 67 70 74" fill="none" {...line} strokeWidth="1.9" />
            <path d="M44.5 90 Q47 79 57 77.6 Q64 77 70 80 Q76 77 83 77.6 Q93 79 95.5 90Z" fill={WH} />
            <g className="np-nub"><ellipse cx="70" cy="52.5" rx="6" ry="5.6" fill={WH} {...line} /></g>
          </g>
        </g>
      </g>
      <Fx />
      <g className="np-front"><Paws front={
        <g>
          <path d="M58 86 Q70 89.6 82 86 L70 96.5Z" fill="#ff6b5e" {...line} strokeWidth="2" />
          <g fill="#fff"><circle cx="64.5" cy="89.4" r="1" /><circle cx="75.5" cy="89.4" r="1" /><circle cx="70" cy="92.6" r="1" /></g>
        </g>} /></g>
      <g className="np-back np-backpaws">
        {[50, 90].map((x) => <ellipse key={x} cx={x} cy="88" rx="9.4" ry="6.6" fill={WH} {...line} />)}
      </g>
    </>
  );
}

const ANIMALS = { teddy: Teddy, corgi: Corgi };
function Art({ animal, uid, px, py, tick }) {
  const A = ANIMALS[animal] || Teddy;
  const fid = `${uid}-field`;
  return (
    <svg className="np-art" viewBox="0 0 140 100" aria-hidden="true" focusable="false" style={{ '--px': px + 'px', '--py': py + 'px' }}>
      <defs><clipPath id={fid}><rect x="-40" y="-60" width="220" height="148" /></clipPath></defs>
      <A tick={tick} fid={fid} />
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
