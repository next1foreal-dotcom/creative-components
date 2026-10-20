// Clawd on the Composer — unofficial fan tribute to Claude (Clawd is Anthropic's character). React / Preact.
import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { ClawdEngine } from './clawd-engine.js';
import './clawd-perch.css';

/**
 * <ClawdPerch ref={r} status="thinking" context={0.4} cost={{usd:.42,tokens:12800,pct:.31}} />
 * r.current.send(text) / tool(name) / ask() -> Promise<boolean> / decide(ok) / stream() / error() / done() / stop() / compact() / limit(resetAt)
 */
const ClawdPerch = forwardRef(function ClawdPerch({ status, context, cost, size = 'xs', lang = 'zh', mute = false, meterTick = false, fidgetSound = false, fidgets = true, snoreSound = true, onStatus, className = '', style }, ref) {
  const wrap = useRef(null), cv = useRef(null), eng = useRef(null), sr = useRef(null), pet = useRef(null), mb = useRef(null);
  useEffect(() => {
    const rm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const e = new ClawdEngine(cv.current, { size, lang, mute, meterTick, fidgetSound, fidgets, snoreSound, reducedMotion: rm, width: wrap.current.clientWidth || 600,
      onStatus: t => { if (sr.current) sr.current.textContent = t; onStatus && onStatus(t); } });
    const orig = e.render.bind(e);
    e.render = () => { orig(); const b = e.crabBox, m = e.meterBox;
      if (b && pet.current) Object.assign(pet.current.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' });
      if (mb.current) { mb.current.hidden = !m; if (m) Object.assign(mb.current.style, { left: m.x + 'px', top: m.y + 'px', width: m.w + 'px', height: m.h + 'px' }); } };
    const ro = new ResizeObserver(() => e.resize(wrap.current.clientWidth || 600)); ro.observe(wrap.current);
    const unlock = () => e.sfx._c(); addEventListener('pointerdown', unlock, { once: true, capture: true });
    eng.current = e;
    const u1 = e.bindDom(wrap.current), u2 = e.bindDrag(pet.current); const unbind = () => { u1(); u2(); };
    return () => { unbind(); e.destroy(); ro.disconnect(); removeEventListener('pointerdown', unlock, true); };
  }, [size]);
  useEffect(() => { eng.current && status && eng.current.setStatus(status); }, [status]);
  useEffect(() => { eng.current && context != null && eng.current.context(context); }, [context]);
  useEffect(() => { eng.current && cost && eng.current.cost(cost); }, [cost && cost.usd, cost && cost.tokens, cost && cost.pct]);
  useEffect(() => { if (eng.current) { eng.current.mute = mute; eng.current.lang = lang; eng.current.meterTick = meterTick; eng.current.fidgetSound = fidgetSound; eng.current.fidgets = fidgets; eng.current.snoreSound = snoreSound; } }, [mute, lang, meterTick, fidgetSound, fidgets, snoreSound]);
  useImperativeHandle(ref, () => new Proxy({}, { get: (_, k) => { const e = eng.current; const v = e && e[k]; return typeof v === 'function' ? v.bind(e) : v; } }), []);
  const L = lang === 'en' ? { pet: 'Pet Clawd', meter: 'Toggle meter' } : { pet: '摸摸 Clawd', meter: '切换跳表显示' };
  return (
    <div ref={wrap} className={`clawd-perch clawd-perch--${size} ${className}`} style={style}>
      <canvas ref={cv} aria-hidden="true" />
      <button ref={pet} type="button" className="clawd-perch__hit" aria-label={L.pet} onClick={() => eng.current && eng.current.pet()} />
      <button ref={mb} type="button" className="clawd-perch__hit" aria-label={L.meter} hidden onClick={() => eng.current && eng.current.cycleMeter()} />
      <span ref={sr} className="clawd-perch__sr" role="status" aria-live="polite" />
    </div>
  );
});
export default ClawdPerch;
export { ClawdPerch };
