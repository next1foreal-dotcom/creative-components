/* Clawd on the Composer — unofficial fan tribute to Claude. Clawd is Anthropic's character.
   Framework-free engine: canvas renderer + state machine + 8-bit sound. */
const BODY=[".XXXXXXXXXX.",".XXXXXXXXXX.","XXXXXXXXXXXX","XXXXXXXXXXXX",".XXXXXXXXXX.",".XXXXXXXXXX."];
const LEGS={stand:["..X.X..X.X..","..X.X..X.X.."],a:["..X.X..X.X..","..X....X...."],b:["..X.X..X.X..","....X....X.."],tuck:["..X.X..X.X..","............"]};
const C={body:'#D97757',ink:'#141414',blush:'#F2A48F',sweat:'#7FB8E6',gold:'#F2C94C',heart:'#E8586B',box:'#B7894F',boxD:'#8F6A3A',sign:'#F3EFE6',post:'#6B5A44',dust:'#6f6a62',sand:'#C9A66B',sandD:'#A9884F',meter:'#1d1d1b',green:'#7CFF6B',yellow:'#FFD15C',red:'#FF6B5C',text:'#a8a39a',shell:'#F0B49C',steam:'#cfcac2',cloud:'#77736b',paper:'#F3EFE6',paperL:'#bdb7aa',mug:'#E8E6E1',coffee:'#6B4A2E',angry:'#E2553F',lid:'#B9B4AA',lidD:'#8D887F',lens:'#BFE3F5',cover:'#4E6E8E',code:'#7CFF6B'};
const VERBS={zh:['思考中','琢磨中','酝酿中','盘算中','推敲中','脑补中','发酵中','钻研中'],en:['Pondering','Noodling','Cogitating','Schlepping','Percolating','Ruminating','Moseying','Combobulating']};
const L={zh:{pat:'开心',angry:'生气了',look:'东张西望',snip:'夹夹',yawn:'打哈欠',dance:'跳舞',wow:'吓一跳',shrug:'耸肩',paper:'被粘贴的文字淹没',laugh:'大笑',sad:'难过',night:'晚安',wave:'欢迎回来',ask:'可以吗？',idle:'闲置',typing:'看你打字',thinking:'思考中',streaming:'输出中',tool:'使用工具',ask_:'等待你允许',limit:'额度用完，重置倒计时',error:'出错了',done:'完成',compact:'蜕壳（压缩上下文）',stop:'已停止',dizzy:'被刹车到晕',cool:'零错误完成',love:'害羞',sleep:'睡着了',meter:'切换跳表显示',pet:'摸摸 Clawd',type:'敲代码',read:'翻资料',grep:'拿放大镜找',surf:'上网冲浪',agents:'召唤分身',todo:'列清单',held:'被拎起来了',drop:'落地',shook:'被甩晕了'},
 en:{pat:'Happy',angry:'Annoyed',look:'Looking around',snip:'Snip snip',yawn:'Yawning',dance:'Dancing',wow:'Whoa',shrug:'Shrug',paper:'Buried in pasted text',laugh:'Laughing',sad:'Sad',night:'Good night',wave:'Welcome back',ask:'May I?',idle:'Idle',typing:'Watching you type',thinking:'Thinking',streaming:'Writing',tool:'Using a tool',ask_:'Waiting for permission',limit:'Usage limit, resets in',error:'Error',done:'Done',compact:'Molting (compacting context)',stop:'Stopped',dizzy:'Dizzy from braking',cool:'Flawless run',love:'Blushing',sleep:'Asleep',meter:'Toggle meter',pet:'Pet Clawd',type:'Typing code',read:'Reading',grep:'Searching',surf:'Surfing the web',agents:'Summoning clones',todo:'Making a list',held:'Picked up',drop:'Landed',shook:'Shaken dizzy'}};
const ease=t=>1-Math.pow(1-t,3), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* per-sound gain (dB) from verify/loud.py: relative levels before master: events -42, small/frequent -50…-57, sleepy/ambient -50 */
const SFX_GAIN_DB={ha: 6.1, angry: 3.6, pat: 2.7, wow: 2.3, tick: 2.0, step: 1.4, no: 1.3, blip: 0.3, ask: -0.0, wave: -0.3, send: -0.4, paper: -0.4, dizzy: -0.5, shrug: -0.8, sad: -1.0, yes: -1.0, love: -1.7, cool: -2.9, night: -3.0, done: -3.2, fall: -3.9, snip: -4.2, purr: -4.7, drip: -4.8, pop: -5.0, climb: -5.1, box: -5.7, burst: -7.0, skid: -7.4, snoreIn: -9.2, yawn: -9.3, snoreOut: -12.4, key: -13, page: 2, found: -3, surf: 6, thud: -4.5, check: -3};
const SFX_MASTER_DB=16; /* raw (pre-limiter) loudest peak ≈ -3.7 dBFS; events ≈ -25.5 LUFS-M, small/frequent -34…-43, sleepy -32…-36 */
class Sfx{constructor(){this.ctx=null;this.muted=false}
 _c(){if(this.muted)return null;if(!this.ctx){const A=globalThis.AudioContext||globalThis.webkitAudioContext;if(!A)return null;this.ctx=new A();this.bus=this.ctx.createDynamicsCompressor();/* safety limiter only: balance is set by SFX_GAIN_DB */const B=this.bus;B.threshold.value=-2;B.knee.value=0;B.ratio.value=20;B.attack.value=.001;B.release.value=.12;this.bus.connect(this.ctx.destination)}if(this.ctx.state==='suspended')this.ctx.resume();return this.ctx}
 tone(f,d=.08,at=0,{type='square',vol=.07,to=null}={}){const c=this._c();if(!c)return;const t=c.currentTime+at,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);g.gain.setValueAtTime(vol*(this._g||1),t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(this.bus);o.start(t);o.stop(t+d+.02)}
 noise(d=.12,at=0,vol=.05,hp=800){const c=this._c();if(!c)return;const t=c.currentTime+at,n=Math.floor(c.sampleRate*d),b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();f.type='highpass';f.frequency.value=hp;g.gain.value=vol*(this._g||1);s.buffer=b;s.connect(f);f.connect(g);g.connect(this.bus);s.start(t)}
 _echo(){const c=this.ctx;if(this.wet)return this.wet;const d=c.createDelay();d.delayTime.value=.17;const fb=c.createGain();fb.gain.value=.3;const lp=c.createBiquadFilter();lp.frequency.value=2600;this.wet=c.createGain();this.wet.gain.value=.4;this.wet.connect(d);d.connect(lp);lp.connect(fb);fb.connect(d);lp.connect(this.bus);return this.wet}
 _env(g,t,a,v,d){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+d)}
 /* soft tone with attack + echo send (ported from heynext1.com hand-hero buddy) */
 stone(f,d,{type='sine',vol=.04,to=null,a=.005,echo=0}={}){const c=this._c();if(!c)return;const t=c.currentTime+(this.base||0),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);this._env(g,t,a,vol*(this._g||1),d);o.connect(g);g.connect(this.bus);if(echo){const e=c.createGain();e.gain.value=echo;g.connect(e);e.connect(this._echo())}o.start(t);o.stop(t+d+.05)}
 snoise(d,{vol=.04,f=1500,to=null,q=1,type='bandpass'}={}){const c=this._c();if(!c)return;const t=c.currentTime+(this.base||0),n=Math.floor(c.sampleRate*d),b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;const s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();fl.type=type;fl.frequency.setValueAtTime(f,t);if(to)fl.frequency.exponentialRampToValueAtTime(to,t+d);fl.Q.value=q;this._env(g,t,.003,vol*(this._g||1),d);s.buffer=b;s.connect(fl);fl.connect(g);g.connect(this.bus);s.start(t)}
 play(k){this._g=Math.pow(10,((SFX_GAIN_DB[k]||0)+SFX_MASTER_DB)/20);const T=(...a)=>this.tone(...a);switch(k){
  case'snoreIn':/* cute nasal 'hnnngk' inhale */this.snoise(.65,{vol:.05,f:280,to:900,type:'lowpass'});this.stone(150,.6,{type:'triangle',vol:.04,to:215,a:.12});this.stone(300,.6,{vol:.02,to:430,a:.12});break;
  case'snoreOut':/* soft whistle 'pyuuu~' exhale */this.stone(1500,.55,{vol:.042,to:760,a:.03,echo:.25});this.stone(1520,.55,{vol:.016,to:780,a:.03});this.snoise(.45,{vol:.03,f:1800,to:900,q:2});break;
  case'send':T(523,.06);T(784,.09,.06);break;
  case'box':T(140,.09,0,{type:'triangle',vol:.12});break;
  case'ask':T(880,.05);T(1320,.07,.05);break;
  case'yes':T(660,.06);T(990,.1,.07);break;
  case'no':T(440,.12,0,{to:300});break;
  case'fall':T(900,.32,0,{to:180,type:'triangle',vol:.08});T(90,.12,.34,{type:'triangle',vol:.14});break;
  case'climb':[0,1,2].forEach(i=>T(500+i*120,.04,i*.09,{vol:.04}));break;
  case'pop':this.noise(.06,0,.06,1500);T(1600,.08,0,{to:400,type:'triangle',vol:.1});[1047,1319,1568].forEach((f,i)=>T(f,.07,.12+i*.06,{vol:.04}));break;
  case'done':T(784,.09);T(1047,.16,.1);break;
  case'cool':[523,659,784,1047].forEach((f,i)=>T(f,.08,i*.08,{vol:.06}));break;
  case'skid':this.noise(.18,0,.06,2500);break;
  case'dizzy':[0,1,2,3].forEach(i=>T(i%2?520:620,.07,i*.08,{vol:.05}));break;
  case'love':T(1047,.08,0,{type:'sine',vol:.08});T(1319,.12,.09,{type:'sine',vol:.08});break;
  case'snip':T(2400,.02,0,{vol:.05});T(1800,.025,.05,{vol:.05});break;
  case'pat':T(988,.05,0,{type:'sine',vol:.08});T(1319,.06,.05,{type:'sine',vol:.06});break;
  case'angry':T(110,.22,0,{type:'sawtooth',vol:.05});T(98,.25,.24,{type:'sawtooth',vol:.05});break;
  case'yawn':T(620,.55,0,{type:'sine',to:240,vol:.06});break;
  case'step':T(330,.03,0,{vol:.03});break;
  case'wow':T(600,.12,0,{to:1400,vol:.06});break;
  case'shrug':T(520,.07);T(415,.1,.09);break;
  case'paper':this.noise(.05,0,.05,3000);break;
  case'burst':this.noise(.16,0,.06,1200);T(900,.1,0,{to:1500,type:'triangle',vol:.06});break;
  case'ha':T(880,.04,0,{vol:.05});T(1100,.04,.05,{vol:.04});break;
  case'sad':T(500,.25,0,{type:'triangle',to:350,vol:.06});T(400,.32,.28,{type:'triangle',to:270,vol:.06});break;
  case'wave':T(660,.06);T(880,.08,.08);break;
  case'night':T(523,.12,0,{type:'sine',vol:.08});T(392,.22,.14,{type:'sine',vol:.08});break;
  case'blip':T(1200,.025,0,{type:'sine',vol:.04});break;
  case'purr':T(330,.09,0,{type:'triangle',vol:.05});T(392,.12,.1,{type:'triangle',vol:.05});break;
  case'drip':T(1500,.06,0,{type:'sine',to:600,vol:.06});break;
  case'tick':T(2000,.012,0,{vol:.02});break;
  case'key':/* soft keyboard clack, pitch varies per key */this.noise(.025,0,.035,2200);T(260+Math.random()*120,.02,0,{type:'triangle',vol:.05});break;
  case'page':this.snoise(.14,{vol:.035,f:2600,to:5200,q:.8});break;
  case'surf':this.snoise(.6,{vol:.045,f:420,to:1500,q:.7});this.snoise(.35,{vol:.02,f:3000,to:1800,q:1});break;
  case'thud':T(110,.09,0,{type:'triangle',vol:.14});this.noise(.06,0,.05,600);break;
  case'check':T(1568,.035,0,{vol:.04});T(2093,.05,.04,{vol:.035});break;
  case'found':T(1319,.05,0,{type:'sine',vol:.06});T(1760,.09,.06,{type:'sine',vol:.06});break;}}}
export class ClawdEngine{
 constructor(canvas,o={}){this.cv=canvas;this.g=canvas.getContext('2d');this.size=o.size||'xs';this.lang=o.lang||'zh';this.manual=!!o.manual;this.reduced=!!o.reducedMotion;this.onStatus=o.onStatus||(()=>{});
  this.sfx=new Sfx();this.sfx.muted=!!o.mute;this.meterTick=!!o.meterTick;this.fidgetSound=!!o.fidgetSound;this.fidgets=o.fidgets!==false;this.snoreSound=o.snoreSound!==false;
  this.S=this.size==='lg'?8:4;this.Hc=24;this.Wc=60;this.clock=0;this.wallT0=Date.now();
  this.base='idle';this.anim=null;this.x=null;this.dir=-1;this.idleT=0;this.step=0;this.walkPh=0;this.ctx=0;this.meter=null;this.limitAt=null;this.tools=[];this.run={tools:0,errors:0};this.stops=[];this.verb=0;this.toolName='';this.particles=[];
  this.resize(o.width||canvas.clientWidth||600);
  if(!this.manual){let last=performance.now();const loop=n=>{this.tick(Math.min(.05,(n-last)/1000));last=n;this.raf=requestAnimationFrame(loop)};this.raf=requestAnimationFrame(loop)}}
 now(){return this.manual?this.wallT0+this.clock*1000:Date.now()}
 resize(wpx){const dpr=globalThis.devicePixelRatio||1;this.Wc=Math.max(30,Math.floor(wpx/this.S));this.cv.width=Math.round(this.Wc*this.S*dpr);this.cv.height=Math.round(this.Hc*this.S*dpr);this.cv.style.width=this.Wc*this.S+'px';this.cv.style.height=this.Hc*this.S+'px';this.dpr=dpr;this.home=this.Wc-12-3;if(this.x==null||this.x>this.home)this.x=this.home}
 destroy(){cancelAnimationFrame(this.raf)}
 set mute(v){this.sfx.muted=!!v} 
 label(k){return L[this.lang][k]||k}
 statusText(){if(this.held)return this.label(this.held.shook?'shook':'held');const a=this.anim&&this.anim.name;if(a)return this.label(a);if(this.base==='tool')return this.label('tool')+' '+this.toolName;if(this.base==='ask')return this.label('ask_');if(this.base==='limit')return this.label('limit')+' '+this.countdown();return this.label(this.sleeping?'sleep':this.base)}
 _emit(){this.onStatus(this.statusText())}
 _wake(){this.idleT=0;this.sleeping=false}
 _play(name,dur,extra={}){this.anim={name,t:0,dur,...extra};if(!extra.quiet)this._emit()}
 // ---------- public API ----------
 setStatus(s){this._wake();if(s==='ask')return this.ask();this.base=s;this._emit()}
 typing(len){this._wake();if(this.base==='idle'||this.base==='typing'){this.base='typing';this.typT=0}if(len!=null){const pl=this.typLen||0;this.typLen=len;if(!this.anim&&pl<200&&len>=200){this._play('wow',1.5);this.sfx.play('wow')}else if(!this.anim&&pl>=15&&len===0){this._play('shrug',1.6);this.sfx.play('shrug')}}}
 send(text=''){this._wake();this.run={tools:0,errors:0};this.toolIdx=0;this.stops=[];this.base='thinking';this._play('send',.55);this.sfx.play('send');const T_=String(text);if(/谢谢|thank|thx|感谢/i.test(T_))this._queue('love');else if(/哈哈|haha|lol|lmao|笑死|😂/i.test(T_))this._queue('laugh');else if(this._insult(T_))this._queue('sad');else if(/晚安|good ?night|\bgn\b/i.test(T_))this._queue('night');else if(/早安|早上好|good ?morning/i.test(T_))this._queue('morning')}
 think(){this._wake();this.base='thinking';this._emit()}
 stream(){this._wake();if(this.base!=='streaming'){this.base='streaming';this._emit()}this.lastChunk=this.clock}
 tool(name='Tool'){this._wake();this.run.tools++;this.tools.push(String(name).slice(0,10));if(!this.anim||this.anim.name!=='tool')this._nextTool()}
 _toolKind(n){n=String(n);return /^web|fetch|browse/i.test(n)?'surf':/^(task|agent|subagent)/i.test(n)?'agents':/todo/i.test(n)?'todo':/^(edit|write|multiedit|notebook)/i.test(n)?'type':/^(read|view|cat|ls|glob)/i.test(n)?'read':/(grep|search|find)/i.test(n)?'grep':'box'}
 _nextTool(){const n=this.tools.shift();if(n==null)return;this.toolName=n;const kind=this._toolKind(n);if(kind==='box')this.toolIdx=(this.toolIdx||0)+1;this._play('tool',{agents:2.1,surf:1.9,box:1.7}[kind]||1.4,{label:n,fromX:this.x,idx:this.toolIdx,kind});this.sfx.play({box:'box',type:'key',read:'page',grep:'blip',surf:'surf',agents:'ask',todo:'page'}[kind])}
 ask(){this._wake();this.base='ask';this.sfx.play('ask');this._emit();return new Promise(r=>this._askResolve=r)}
 decide(ok){if(this.base!=='ask')return;this.base='thinking';this._play(ok?'yes':'no',1.1);this.sfx.play(ok?'yes':'no');this._askResolve&&this._askResolve(!!ok);this._askResolve=null}
 error(){this._wake();this.run.errors++;this._play('error',2.6);this.sfx.play('fall');setTimeout(()=>{},0)}
 done(){this._wake();const flawless=this.run.tools>=3&&this.run.errors===0;this.base='idle';this._play(flawless?'cool':'done',flawless?3.4:1.3);this.sfx.play(flawless?'cool':'done');if(this.meter)this.meter.live=false}
 stop(){this._wake();const t=this.clock;this.stops=this.stops.filter(s=>t-s<2.5);this.stops.push(t);this.base='idle';if(this.stops.length>=3){this.stops=[];this._play('dizzy',2.6);this.sfx.play('dizzy')}else{this._play('stop',.9);this.sfx.play('skid')}if(this.meter)this.meter.live=false}
 context(p){this.ctx=clamp(+p||0,0,1)}
 compact(){this._wake();this._play('compact',1.8,{fromCtx:this.ctx});this.sfx.play('pop')}
 limit(resetAt){this._wake();this.limitAt=resetAt instanceof Date?resetAt.getTime():(resetAt>1e12?resetAt:this.now()+resetAt);this.base='limit';this._emit()}
 cost(m={}){this.meter={mode:'usd',...this.meter,...m,live:true}}
 cycleMeter(){if(!this.meter)return;const ms=['usd','tokens','pct'].filter(k=>k==='usd'?this.meter.usd!=null:k==='tokens'?this.meter.tokens!=null:this.meter.pct!=null);const i=ms.indexOf(this.meter.mode);this.meter.mode=ms[(i+1)%ms.length]||'usd'}
 paste(n=0){this._wake();this._play('paper',2.8,{n:Math.min(5,1+Math.floor((+n||0)/400))})}
 welcome(){this._wake();this._play('wave',1.8);this.sfx.play('wave')}
 fidget(k){const L_=['look','snip','yawn','dance'];k=L_.includes(k)?k:L_[Math.floor(Math.random()*4)];this._play(k,{look:2.2,snip:1.4,yawn:2,dance:2.4}[k],{quiet:1});if(k==='yawn')0}
 lookAt(cx){this.lookX=cx==null?null:+cx}
 hover(v){v=!!v;if(v&&!this.hovered&&!this.anim&&this.base==='idle')this.sfx.play('purr');this.hovered=v}
 nightMode(v){this.night=v==null?null:!!v}
 _insult(t){if(/[不没没别别]\s*(笨|蠢|烂|烂|废|废)/.test(t))return false;return /(你|妳|claude|clawd)\s*(是|好|真|很|超|太|有够|也太)?\s*(个|个)?\s*(笨|蠢|烂|烂|废|废|白痴|白痴|智障|垃圾)/i.test(t)||/^(笨蛋|白痴|白痴|智障|废物|废物|蠢货|蠢货)[!！。~～]*$/.test(t.trim())||/\byou('?re| are)?\s+(so\s+|really\s+|such\s+an?\s+)?(stupid|dumb|useless|idiot|an idiot)\b|\b(stupid|dumb|useless)\s+(bot|ai|claude|crab)\b/i.test(t)}
 _fs(k){if(!(this.anim&&this.anim.quiet)||this.fidgetSound)this.sfx.play(k)}
 _queue(k){(this.q=this.q||[]).push(k)}
 bindDom(host){if(typeof window==='undefined')return()=>{};let hid=0;const mv=ev=>{const r=this.cv.getBoundingClientRect();if(ev.clientY<r.top-320||ev.clientY>r.bottom+260){this.lookAt(null);this.hover(false);return}const lx=(ev.clientX-r.left)/this.S,ly=(ev.clientY-r.top)/this.S;this.lookAt(lx);const b=this.crabBox;this.hover(!!b&&lx*this.S>=b.x&&lx*this.S<=b.x+b.w&&ly*this.S>=b.y-this.S*2&&ly*this.S<=b.y+b.h)};const lv=()=>{this.lookAt(null);this.hover(false)};const vis=()=>{if(document.hidden)hid=Date.now();else if(hid&&Date.now()-hid>20000){hid=0;this.welcome()}};addEventListener('pointermove',mv,{passive:true});document.addEventListener('pointerleave',lv);document.addEventListener('visibilitychange',vis);return()=>{removeEventListener('pointermove',mv);document.removeEventListener('pointerleave',lv);document.removeEventListener('visibilitychange',vis)}}
 /* pick-up: grab() → dragTo(cellX, cellY)… → drop(). Shaking hard while held → dizzy on drop */
 grab(){if(this.held||(this.anim&&this.anim.name==='tool'))return false;this._wake();this.anim=null;this.held={x:this.x+6,y:this.Hc-8,sh:[],lx:null,dx:0};this.sfx.play('wow');this._emit();return true}
 dragTo(cx,cy){const h=this.held;if(!h)return;const F=this.Hc-8;const nx=clamp(cx,6,this.Wc-6),ny=clamp(cy,1,F);const dx=nx-h.x;if(Math.abs(dx)>.6){const sg=Math.sign(dx);if(h.dx&&sg!==h.dx){h.sh=h.sh.filter(t=>this.clock-t<1.2);h.sh.push(this.clock);if(h.sh.length>=5&&!h.shook){h.shook=true;this.sfx.play('dizzy');this._emit()}}h.dx=sg}h.x=nx;h.y=ny}
 drop(){const h=this.held;if(!h)return;this.held=null;this.x=clamp(Math.round(h.x-6),0,this.home);if(h.shook){this._play('dizzy',3.3,{fromY:clamp(Math.round(h.y-1),0,this.Hc-8)})}else{this._play('drop',1.1,{fromY:clamp(Math.round(h.y-1),0,this.Hc-8)})}}
 bindDrag(el){if(!el||typeof window==='undefined')return()=>{};let st=null,sup=0;const loc=ev=>{const r=this.cv.getBoundingClientRect();return[(ev.clientX-r.left)/this.S,(ev.clientY-r.top)/this.S]};
  const dn=ev=>{if(ev.button)return;st={x:ev.clientX,y:ev.clientY,id:ev.pointerId,on:false};try{el.setPointerCapture(ev.pointerId)}catch(_){}};
  const mv=ev=>{if(!st||ev.pointerId!==st.id)return;if(!st.on){if(Math.hypot(ev.clientX-st.x,ev.clientY-st.y)<6)return;if(!this.grab()){st=null;return}st.on=true}const[a,b]=loc(ev);this.dragTo(a,b);ev.preventDefault()};
  const up=()=>{if(st&&st.on){this.drop();sup=1;setTimeout(()=>{sup=0},0)}st=null};
  const ck=ev=>{if(sup){sup=0;ev.stopImmediatePropagation();ev.preventDefault()}};
  el.style.touchAction='none';el.addEventListener('pointerdown',dn);el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('click',ck,true);
  return()=>{el.removeEventListener('pointerdown',dn);el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);el.removeEventListener('click',ck,true)}}
 thanks(){this._wake();this._play('love',2);this.sfx.play('love')}
 pet(){this._wake();const t=this.clock;this.pets=(this.pets||[]).filter(s=>t-s<2.2);this.pets.push(t);if(this.pets.length>=5){this.pets=[];this._play('angry',2.2);this.sfx.play('angry')}else if(!this.anim||this.anim.name==='pat'){this._play('pat',.7);this.sfx.play('pat')}}
 countdown(){if(!this.limitAt)return'';let s=Math.max(0,Math.round((this.limitAt-this.now())/1000));const h=Math.floor(s/3600),m=Math.floor(s%3600/60);s%=60;return`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
 // ---------- simulation ----------
 tick(dt){this.clock+=dt;this.idleT+=dt;const R=this.reduced;
  if(this.base==='idle'&&!this.anim&&this.idleT>60)this.sleeping=true;
  const zk=this.sleeping&&!this.anim?'s':(this.base==='limit'&&!this.anim?'l':null);if(zk){if(this.snK!==zk){this.snK=zk;this.snAll=0;this.snT=0;this.snN=0}this.snAll+=dt;this.snT-=dt;if(this.snT<=0){const inh=this.snN%2===0;this.snN++;if(this.snoreSound!==false)this.sfx.play(inh?'snoreIn':'snoreOut');this.snT=inh||this.snAll<10?1.3:14}}else this.snK=null;
  if(this.base==='typing'){this.typT=(this.typT||0)+dt;if(this.typT>2.5)this.base='idle'}
  if(this.base==='streaming'&&this.clock-(this.lastChunk||0)>1.5)this.base='thinking';
  if(this.base==='limit'&&this.limitAt&&this.now()>=this.limitAt){this.base='idle';this.limitAt=null;this._emit()}
  const a=this.anim;if(a){a.t+=dt;if(a.t>=a.dur){this.anim=null;if(a.name==='compact')this.ctx=0;if(a.name==='tool'){this.x=this.home;this._nextTool()}if(a.name==='night'&&this.base==='idle'){this.sleeping=true;this.idleT=61}this._emit()}}
  if(!this.anim&&this.q&&this.q.length){const k=this.q.shift();const D={love:2,laugh:1.8,sad:2.6,night:2.2,morning:2};if(k==='morning'){this._play('yawn',2,{morning:1})}else this._play(k,D[k]);this.sfx.play(k==='morning'?'yawn':k)}
  if(this.base==='thinking'){const pt=this.thinkT||0;this.thinkT=pt+dt;if(pt<25&&this.thinkT>=25)this.sfx.play('drip')}else if(this.base!=='streaming')this.thinkT=0;
  if(this.fidgets!==false&&this.base==='idle'&&!this.anim&&!this.sleeping&&!R){this.fidT=(this.fidT==null?10:this.fidT)-dt;if(this.fidT<=0){this.fidT=8+Math.random()*8;this.fidget()}}
  // movement
  let moving=false;
  if(this.held){}else if(!this.anim&&!R){const range=Math.min(36,this.home-2);
   if(this.base==='thinking'){const v=7;this.x+=this.dir*v*dt;if(this.x<this.home-range){this.dir=1}if(this.x>this.home){this.x=this.home;this.dir=-1}moving=true;if(Math.floor(this.clock/1.6)!==this._vk){this._vk=Math.floor(this.clock/1.6);this.verb=(this.verb+1)%VERBS.zh.length}}
   else if(this.base==='streaming'){const d=this.home-this.x;this.x+=clamp(d,-12*dt,12*dt);moving=Math.abs(d)>.2}
   else{const d=this.home-this.x;if(Math.abs(d)>.1){this.x+=clamp(d,-12*dt,12*dt);moving=true;this.dir=d>0?1:-1}}}
  if(R&&!this.anim&&!this.held)this.x=this.home;
  if(moving){this.walkPh+=dt*(this.base==='streaming'?10:8)}
  this.moving=moving;
  if(this.meter&&this.meter.live&&this.meterTick&&Math.floor(this.clock*3)!==this._mt){this._mt=Math.floor(this.clock*3);this.sfx.play('tick')}
  this.particles=this.particles.filter(p=>(p.t+=dt)<p.life);
  this.render()}
 // ---------- drawing ----------
 px(x,y,c,w=1,h=1){const g=this.g;g.fillStyle=c;g.fillRect(Math.round(x)*this.S,Math.round(y)*this.S,w*this.S,h*this.S)}
 text(s,x,y,c=C.text,sz=2.6,align='left',weight=700){const g=this.g;g.fillStyle=c;g.textAlign=align;g.textBaseline='alphabetic';g.font=`${weight} ${Math.round(sz*this.S)}px ui-monospace,"SF Mono",Menlo,"Noto Sans TC","Noto Sans SC",monospace`;g.fillText(s,x*this.S,y*this.S);return g.measureText(s).width/this.S}
 crab(x,y,o={}){const fat=o.fat||0,rows=[...BODY];
  const leg=LEGS[o.legs||'stand'];
  const cells=[];
  rows.forEach((r,j)=>{const s=r.indexOf('X'),e=r.lastIndexOf('X');const arm=(j===2||j===3);for(let i=s-fat;i<=e+fat;i++){const L_=i===s-fat,R_=i===e+fat;if(arm&&((L_&&o.armsUp)||(R_&&(o.armsUp||o.wave)))){cells.push([i,j-3]);continue}cells.push([i,j])}
   if(o.armsUp&&arm){/*fill gap where arm left*/}});
  leg.forEach((r,j)=>[...r].forEach((ch,i)=>{if(ch==='X')cells.push([i,6+j])}));
  const H=8;const put=(i,j,c)=>{const jj=o.flip?H-1-j:j;this.px(x+i,y+jj,c)};
  cells.forEach(([i,j])=>put(i,j,o.color||C.body));
  const lx=o.look||0,E=C.ink;
  const ey=o.flip?1:0;
  switch(o.eyes||'open'){
   case'open':put(3+lx,2,E);put(8+lx,2,E);break;
   case'wide':put(3+lx,1,E);put(3+lx,2,E);put(8+lx,1,E);put(8+lx,2,E);break;
   case'happy':[[3,1],[2,2],[4,2],[8,1],[7,2],[9,2]].forEach(([i,j])=>put(i,j,E));break;
   case'down':put(3,3,E);put(8,3,E);break;
   case'x':[[2,1],[4,1],[3,2],[2,3],[4,3],[7,1],[9,1],[8,2],[7,3],[9,3]].forEach(([i,j])=>put(i,j,E));break;
   case'closed':put(2,2,E);put(3,2,E);put(8,2,E);put(9,2,E);break;
   case'angry':[[2,1],[3,2],[9,1],[8,2],[3,3],[8,3]].forEach(([i,j])=>put(i,j,E));break;
   case'none':break;}
  if(o.mouth==='o'){put(5,3,E);put(6,3,E);put(5,4,E);put(6,4,E)}else if(o.mouth==='smile'){put(4,4,E);put(5,5-1,E);put(6,4,E);put(7,4,E)}
  if(o.glasses){for(let i=1;i<=10;i++)put(i,2,E);[2,3,4,7,8,9].forEach(i=>put(i,3,E));put(2,2,'#5a5a5a');put(7,2,'#5a5a5a')}
  if(o.blush){put(2,3,C.blush);put(9,3,C.blush)}
 }
 /* laptop seen from behind: lid covers the lower body, claws tap over its top edge, code glyphs float up; returns a draw fn for the 'after' pass */
 _laptop(x,y,sound){const k=Math.floor(this.clock*9);if(k!==this._lk){this._lk=k;if(sound)this.sfx.play('key');if(k%3===0){const G=['{','}',';','()','=>','</>','01','#'];(this.codeP=this.codeP||[]).push({t0:this.clock,x:2+Math.random()*8,s:G[Math.floor(Math.random()*G.length)],c:[C.code,C.gold,C.text][k%3===0&&Math.random()<.5?0:Math.random()<.5?1:2]})}}
  this.codeP=(this.codeP||[]).filter(q=>this.clock-q.t0<1.1);const cp=this.codeP;
  this._lap=1;return()=>{const g=this.g,F=y;
   /* side view, to Clawd's left: keyboard deck + base, lid tilted back with a glowing inner face */
   this.px(x-9,F+7,C.lidD,9,1);this.px(x-8,F+6,C.lid,7,1);for(let i=0;i<3;i++)if((i+k)%3)this.px(x-6+i*2,F+6,C.lidD);
   const LID=[[-9,6],[-9,5],[-10,4],[-10,3],[-11,2],[-11,1]];LID.forEach(([i,j])=>{this.px(x+i,F+j,C.lidD);this.px(x+i-1,F+j,C.lidD)});
   const gl=.7+.3*Math.sin(this.clock*7);g.globalAlpha=gl;LID.slice(0,5).forEach(([i,j])=>this.px(x+i+1,F+j,C.lens));g.globalAlpha=1;
   /* the claw reaching the keys, tapping */
   const up=k%2;this.px(x-1,F+3,C.body);this.px(x-2,F+4,C.body);this.px(x-3,F+4+(up?0:1),C.body);this.px(x-4,F+(up?4:5),C.body);
   for(const q of cp){const tt=(this.clock-q.t0)/1.1;g.globalAlpha=Math.max(0,1-tt*tt);this.text(q.s,x-8+q.x*.4,F-tt*9,q.c,2,'center',700);g.globalAlpha=1}}}
 render(){const g=this.g,S=this.S;g.setTransform(this.dpr,0,0,this.dpr,0,0);g.clearRect(0,0,this.Wc*S,this.Hc*S);g.imageSmoothingEnabled=false;
  const F=this.Hc-8;let x=this.x,y=F,o={legs:'stand'};const a=this.anim,p=a?a.t/a.dur:0;const ph=Math.floor(this.walkPh)%2;
  const blink=(this.clock%3.6)<.12;let after=null;this._lap=0;
  const fat=this.ctx>=.95?2:this.ctx>=.7?1:0;o.fat=fat;
  // base pose
  if(this.held){const h=this.held;x=h.x-6;y=clamp(Math.round(h.y-1),0,F);o.legs=Math.floor(this.clock*(h.shook?16:9))%2?'a':'b';o.eyes=h.shook?'x':'wide';o.armsUp=true;o.mouth=h.shook?null:'o';if(!h.shook){const dy=Math.floor(this.clock*4)%3;this.px(x+12,y+dy,C.sweat)}else{for(let k=0;k<3;k++){const an=this.clock*7+k*2.1;this.px(x+6+Math.round(Math.cos(an)*6),y-2+Math.round(Math.sin(an)*1.2),C.gold)}}}
  else if(this.sleeping){o.eyes='closed';o.legs='tuck';y=F+1;const z=Math.floor(this.clock*1.5)%4;for(let k=0;k<z;k++)this.text(k?'Z':'z',x-2-k*2.6,y-1-k*2.2,C.text,2.2+k*.6,'right')}
  else if(this.base==='typing'){o.look=-1;o.eyes=blink?'none':'open';if(Math.floor(this.clock*4)%6===0)y=F-0}
  else if(this.base==='thinking'){o.legs=this.moving?(ph?'a':'b'):'stand';o.look=this.dir<0?-1:0;const v=VERBS[this.lang][this.verb%VERBS[this.lang].length];const dots='.'.repeat(1+Math.floor(this.clock*3)%3);if(!a)this.text(v+dots,x+6,F-4,C.text,2.4,'center',600);if(this.thinkT>25){const dy=Math.floor(this.clock*3)%4;this.px(x+12,y-1+dy,C.sweat);this.px(x+12,y-2+dy,C.sweat)}}
  else if(this.base==='streaming'){o.legs=this.moving?(ph?'a':'b'):'stand';o.eyes=blink?'none':'open';o.look=-1;if(!this.moving)after=this._laptop(Math.round(x),y,true)}
  else if(this.base==='ask'){o.armsUp=true;o.eyes=blink?'none':'wide';const t=this.label('ask'),sx=x+6;const w=this.text(t,-999,-999,C.ink,2.6);const bw=Math.max(Math.ceil(w)+4,13),bx=Math.round(sx-bw/2+.5),by=y-10+Math.round(Math.sin(this.clock*4)*.4);this.px(bx,by,C.sign,bw,6);const pl=y-1-(by+6);this.px(x,by+6,C.post,1,pl);this.px(x+11,by+6,C.post,1,pl);this.text(t,sx,by+4.4,C.ink,2.6,'center')}
  else if(this.base==='limit'){o.eyes='x';o.legs='tuck';y=F+2;const cd=this.countdown();this.text(cd,x+6,y-3,C.text,2.4,'center',600);const z=Math.floor(this.clock*1.2)%3;for(let k=0;k<=z;k++)this.text('z',x-2-k*2,y-4-k*2,C.text,2+k*.5,'right')}
  else{o.eyes=blink?'none':'open';o.legs=this.moving?(ph?'a':'b'):'stand';if(this.lookX!=null){const d=this.lookX-(x+6);o.look=Math.abs(d)>4?(d<0?-2:2):0}if(this.hovered){o.eyes='happy';o.blush=true}
   if(this.base==='idle'&&(this.night!=null?this.night:new Date(this.now()).getHours()<5)){const mx=x-6;this.px(mx,F+4,C.mug,4,4);this.px(mx+4,F+5,C.mug,1,1);this.px(mx+5,F+5,C.mug,1,2);this.px(mx+4,F+6,C.mug,1,1);this.px(mx,F+4,C.coffee,4,1);const st=(this.clock*1.2)%1;this.px(mx+1+Math.round(Math.sin(this.clock*5)),F+2-Math.round(st*3),C.steam);if(Math.floor(this.clock/3)%3===1)o.eyes='closed'}if(!this.moving&&Math.floor(this.clock/2.2)%3===2)o.legs=Math.floor(this.clock*3)%2?'a':'stand'}
  // transient overrides
  if(a){const n=a.name;o.eyes=o.eyes==='none'?'open':o.eyes;
   if(n==='send'){y=F-Math.round(Math.sin(p*Math.PI)*5);o.armsUp=p<.6;o.eyes='wide';o.legs='a'}
   if(n==='tool'&&a.kind==='type'){o.eyes='open';o.look=-1;const f=this._laptop(Math.round(x),y,true);const xx=x,yy=y;after=()=>{f();this.text(a.label,xx+6,yy-2,C.text,2.2,'center',600)}}
   if(n==='tool'&&a.kind==='read'){const fl=Math.floor(a.t/.7);o.look=Math.floor(a.t*2.5)%2?1:-1;o.eyes=blink?'none':'open';if(fl!==a.k){a.k=fl;if(fl)this.sfx.play('page')}const ft=(a.t%.7)/.18,xx=Math.round(x),yy=y;
     after=()=>{const by=yy+4;this.px(xx-1,by+3,C.cover,14,1);this.px(xx,by,C.paper,5,3);this.px(xx+7,by,C.paper,5,3);this.px(xx+5,by+1,C.paperL,2,2);this.px(xx+5,by,C.paper,2,1);
      for(let r=0;r<2;r++){this.px(xx+1,by+r+1-(r?0:0),C.paperL,3,1);this.px(xx+8,by+r+1,C.paperL,3,1)}
      if(ft<1){const px_=Math.round(xx+10-ft*9);this.px(px_,by-1,C.paper,2,3)}
      this.text(a.label,xx+6,yy-2,C.text,2.2,'center',600)}}
   if(n==='tool'&&a.kind==='grep'){const sw=Math.sin(a.t*2.6);x=this.home-5+Math.round(sw*5);o.legs=Math.floor(a.t*8)%2?'a':'b';const dir=Math.cos(a.t*2.6)>0?1:-1;if(dir!==a.d){a.d=dir;this.sfx.play('blip')}o.look=dir>0?1:-1;const hit=a.t>a.dur-.6;if(hit&&!a.f){a.f=1;this.sfx.play('found')}if(hit){x=this.home;o.legs='stand';o.look=0}
     const xx=Math.round(x),yy=y;after=()=>{const g=this.g,lx=xx+6,ly=yy-1;this.px(lx+1,ly,C.lid,3,1);this.px(lx+1,ly+4,C.lid,3,1);this.px(lx,ly+1,C.lid,1,3);this.px(lx+4,ly+1,C.lid,1,3);g.globalAlpha=.75;this.px(lx+1,ly+1,C.lens,3,3);g.globalAlpha=1;this.px(lx+2+(o.look>0?0:-1)+1,ly+2,C.ink,1,2);this.px(lx+1+(o.look>0?1:0),ly+2,C.ink,1,2);this.px(lx+4,ly+5,C.post);this.px(lx+5,ly+6,C.post);
      if(hit){if(Math.floor(a.t*8)%2)this.text('!',xx+6,yy-3,C.gold,3.4,'center',800)}else this.text(a.label,xx+6,yy-3,C.text,2.2,'center',600)}}
   if(n==='drop'){const fy=a.fromY==null?F:a.fromY,fall=F-fy,T1=fall>2?.3:.05;if(p<T1){const q=p/T1;y=Math.round(fy+fall*q*q);o.eyes='wide';o.legs='a';o.armsUp=true}else{if(!a.k){a.k=1;this.sfx.play('thud')}const q=(p-T1)/(1-T1);if(q<.3){y=F+1;o.legs='tuck';o.eyes=fall>2?'x':'closed';if(Math.floor(a.t*10)%2){this.px(x-2,F+7,C.dust);this.px(x+13,F+7,C.dust)}}else if(q<.55){y=F-1;o.eyes='happy'}else{o.eyes='happy'}}}
   if(n==='tool'&&a.kind==='surf'){x=this.home-Math.round(Math.sin(p*Math.PI)*18);y=F-4+Math.round(Math.sin(a.t*7));o.legs='tuck';o.eyes='happy';o.armsUp=Math.floor(a.t*3)%2===0;o.wave=!o.armsUp;if(p>.5&&!a.k){a.k=1;this.sfx.play('surf')}
     const xx=Math.round(x),yy=y;after=()=>{const g=this.g,sc=Math.floor(a.t*16);for(let i=-24;i<this.Wc-xx+2;i++){const X=xx+i,fa=i<-16?(i+25)/9:1,s1=Math.sin((X+a.t*16)/2.6),s2=Math.sin((X-a.t*9)/5.3);let h=2+(s1>.2?1:0)+(s2>.5?1:0);const d=i-13;if(d>=0&&d<7)h=Math.max(h,[6,7,7,6,5,4,3][d]);g.globalAlpha=.55*fa;this.px(X,F+8-h+1,C.sweat,1,h-1);g.globalAlpha=.95*fa;this.px(X,F+8-h,C.sweat,1,1);g.globalAlpha=fa;if((d>=0&&d<4)||(h>=4&&(X+sc)%2===0)||(h===3&&(X+sc)%4===0))this.px(X,F+8-h-(d===1||d===2?1:0),C.paper);if(d===-1||d===0){if((sc+X)%3===0)this.px(X+1,F+1-(sc%2),C.paper)}g.globalAlpha=1}
      this.px(xx-1,yy+8,C.gold,14,1);this.px(xx-2,yy+7,C.gold);this.px(xx+5,yy+8,C.angry,2,1);this.text(a.label,xx+6,yy-2,C.text,2.2,'center',600)}}
   if(n==='tool'&&a.kind==='agents'){const xx=Math.round(x),yy=y;o.eyes=p<.15?'wide':'happy';o.armsUp=p<.15||p>.92;if(p>=.15&&!a.k){a.k=1;this.sfx.play('pop')}if(p>=.78&&!a.r){a.r=1;this.sfx.play('climb')}if(p>=.95&&!a.m){a.m=1;this.sfx.play('done')}
     after=()=>{const ph=p<.15?-1:p<.5?(p-.15)/.35:p<.75?1:p<.95?1-(p-.75)/.2:-1;if(ph>=0)for(let k=0;k<3;k++){const tx=Math.max(1,xx-9-k*9),mx=Math.round(xx+3+(tx-xx-3)*ease(ph)),hop=p>.5&&p<.75?Math.round(Math.abs(Math.sin(a.t*9+k))*2):0,my=F+4-hop,lg=Math.floor(a.t*12+k)%2;
       this.px(mx+1,my,C.body,4,1);this.px(mx,my+1,C.body,6,1);this.px(mx+1,my+2,C.body,4,1);this.px(mx+1+lg,my+3,C.body);this.px(mx+4-lg,my+3,C.body);this.px(mx+1,my+1,C.ink);this.px(mx+4,my+1,C.ink)}
      if(p>.93)[[-2,0],[13,0],[5,-3]].forEach(([i,j],k)=>{if((Math.floor(a.t*10)+k)%2)this.px(xx+i,yy+j,C.gold)});this.text(a.label+' ×3',xx+6,yy-2,C.text,2.2,'center',600)}}
   if(n==='tool'&&a.kind==='todo'){o.look=1;o.eyes=blink?'none':'open';const xx=Math.round(x),yy=y;const done_=[.3,.5,.7].filter(v=>p>=v).length;if(done_!==(a.k||0)){a.k=done_;this.sfx.play('check')}
     after=()=>{this.px(xx+7,yy+1,C.box,6,7);this.px(xx+8,yy+2,C.paper,4,5);this.px(xx+9,yy,C.lidD,2,2);for(let r=0;r<3;r++){const ry=yy+2+r*2;if(r<done_){this.px(xx+8,ry,C.code)}else this.px(xx+8,ry,C.paperL);this.px(xx+10,ry,r<done_?C.paperL:C.lidD,2,1)}this.text(a.label,xx+6,yy-2,C.text,2.2,'center',600)}}
   if(n==='tool'&&(a.kind||'box')==='box'){const t=a.t,go=.9,back=.9,hold=a.dur-go-back;let xx;if(t<go)xx=a.fromX+ease(t/go)*(this.Wc+14-a.fromX);else if(t<go+hold)xx=this.Wc+14;else xx=this.Wc+14-ease((t-go-hold)/back)*(this.Wc+14-this.home);x=xx;o.legs=Math.floor(t*12)%2?'a':'b';o.armsUp=true;
     const stk=clamp((a.idx||0)-3,0,2);after=()=>{const bx=x+1,by=y-5;for(let k=0;k<=stk;k++){const wx=k?(Math.floor(this.clock*6+k)%2?k:-k)*.5:0,yy=by-k*4;this.px(bx+Math.round(wx),yy,C.box,10,4);this.px(bx+Math.round(wx),yy,C.boxD,10,1);this.px(bx+Math.round(wx)+4,yy,C.boxD,2,4)}this.text(a.label,x+6,by-1-stk*4,C.text,2.2,'center',600);if(stk){const dy=Math.floor(this.clock*4)%3;this.px(x+12,y+dy,C.sweat)}}}
   if(n==='yes'){y=F-Math.round(Math.abs(Math.sin(p*Math.PI*2))*2);o.eyes='happy'}
   if(n==='no'){o.eyes='down';y=F+1;o.legs='tuck'}
   if(n==='error'){if(p<.12){o.eyes='wide';this.text('!',x+6,y-2,C.red,4,'center')}else if(p<.32){y=F+Math.round(((p-.12)/.2)**2*10);o.eyes='wide'}else if(p<.6){y=F+10;const q=(p-.32)/.28;const sh=Math.floor(a.t*8)%2;
     if(q>.15){const cl=(cx,dy)=>{const yy=F+6+dy;this.px(cx,yy,C.body);this.px(cx+2,yy,C.body);this.px(cx,yy+1,C.body,3,1)};const pk=q>.55;if(pk){y=F+4;o.eyes='wide';o.look=Math.floor(a.t*1.5)%2?-1:1}else{cl(x,0);cl(x+9,0)}if(q>.15&&!pk&&q>.4){}
      }
     if(q<.5&&Math.floor(this.clock*4)%2)this.text('!',x+6,F+3,C.red,4,'center')}
    else{const q=(p-.6)/.4;o.armsUp=true;o.eyes='wide';
     if(q<.3){y=F+4;o.legs='tuck';if(Math.floor(a.t*6)%2)o.eyes='open'}
     else if(q<.8){const r=(q-.3)/.5;y=F+4-Math.round(ease(r)*4);o.legs=Math.floor(a.t*14)%2?'a':'b';if(Math.floor(a.t*10)%2){this.px(x-1,F+7,C.dust);this.px(x+12,F+6,C.dust)}}
     else{y=F;o.armsUp=false;o.eyes='happy';if(Math.floor(a.t*10)%2){this.px(x-2,F+7,C.dust);this.px(x+13,F+7,C.dust)}}
     if(!a.c){a.c=1;this.sfx.play('climb')}}}
   if(n==='done'){y=F-Math.round(Math.sin(clamp(p/.6,0,1)*Math.PI)*6);o.eyes='happy';o.armsUp=p<.6;if(p<.8)[[-3,-1],[14,-1],[-2,4],[13,4],[5,-5]].forEach(([i,j],k)=>{if((Math.floor(a.t*10)+k)%2)this.px(x+i,y+j,C.gold)})}
   if(n==='cool'){const t=a.t;o.glasses=t>.6;o.eyes='open';if(t<.6){const gy=y-8+Math.round(t/.6*8);for(let i=1;i<=10;i++)this.px(x+i,gy+2,C.ink)}
     else if(t<2.6){const q=(t-.6)/2;x=this.home-Math.sin(q*Math.PI)*20;o.legs=Math.floor(t*8)%2?'a':'b'}
     if(t>.6&&Math.floor(t*6)%3===0)this.px(x+10,y+1,'#fff')}
   if(n==='stop'){o.eyes='wide';const k=1-p;x=this.x-Math.round(ease(Math.min(1,p*2))*3)*this.dir*-1;o.legs='tuck';if(p<.6)for(let i=0;i<3;i++)this.px(x+(this.dir<0?12+i*2:-2-i*2),F+7-i%2,C.dust)}
   if(n==='dizzy'&&a.fromY!=null){const fy=a.fromY,fall=F-fy,T1=fall>2?.32:.05;o.eyes='x';o.legs=Math.floor(a.t*16)%2?'a':'b';if(a.t<T1){const q=a.t/T1;y=Math.round(fy+fall*q*q);o.armsUp=true}else{if(!a.k){a.k=1;this.sfx.play('thud')}y=a.t<T1+.15?F+1:F;o.legs=a.t<T1+.15?'tuck':o.legs;if(a.t>=T1+.15){const w=Math.floor(a.t*5)%4,amp=p<.72?1:0;x+=[0,amp,0,-amp][w];if(p>.76){o.eyes='happy';o.legs='b';if(p<.9){const q=(p-.76)/.14;y=F-Math.round(Math.sin(q*Math.PI)*3);o.armsUp=q>.2&&q<.8;if(!a.r){a.r=1;this.sfx.play('pat')}}if(p>.8&&p<.97){const f=Math.floor(a.t*6)%2;this.px(x-2,y-1-f,C.gold);this.px(x+13,y-f,C.gold)}}}if(Math.floor(a.t*10)%2&&a.t<T1+.3){this.px(x-2,F+7,C.dust);this.px(x+13,F+7,C.dust)}}if(p<.76)for(let k=0;k<3;k++){const an=a.t*7+k*2.1;this.px(x+6+Math.round(Math.cos(an)*6),y-2+Math.round(Math.sin(an)*1.2),C.gold)}}
   else if(n==='dizzy'){if(p<.2&&a.fromY==null){y=F-Math.round(Math.sin(p/.2*Math.PI)*4)}o.flip=p>=.1&&p<.85;o.eyes='x';o.legs=Math.floor(a.t*12)%2?'a':'b';if(o.flip){y=F+0;const r=3,cx=x+6,cy=y-3;for(let k=0;k<3;k++){const an=a.t*6+k*2.1;this.px(cx+Math.round(Math.cos(an)*r*2),cy+Math.round(Math.sin(an)*r*.6),C.gold)}}}
   if(n==='love'){o.blush=true;o.eyes='happy';y=F-(Math.floor(a.t*4)%2);for(let k=0;k<3;k++){const tt=(a.t*1.2+k*.33)%1;const hx=x+3+k*3,hy=y-1-Math.round(tt*8);const H=[[0,0],[2,0],[-0,1],[1,1],[2,1],[1,2]];if(a.t<a.dur-.3)H.forEach(([i,j])=>this.px(hx+i-1,hy+j-2,C.heart))}}
   const later=f=>{const pv=after;after=()=>{pv&&pv();f()}};
   const HEART=[[0,0],[2,0],[0,1],[1,1],[2,1],[1,2]];
   if(n==='pat'){y=F-Math.round(Math.sin(p*Math.PI)*3);o.eyes='happy';o.blush=true;const hy=y-3-Math.round(p*5);HEART.forEach(([i,j])=>this.px(x+5+i,hy+j-2,C.heart))}
   if(n==='angry'){o.eyes='angry';o.color=C.angry;x+=Math.floor(a.t*20)%2;o.legs=Math.floor(a.t*10)%2?'a':'b';for(let k=0;k<2;k++){const tt=(a.t*1.5+k*.5)%1,sy=y-1-Math.round(tt*6);this.px(x+1-Math.round(tt*2),sy,C.steam);this.px(x+10+Math.round(tt*2),sy,C.steam)}if(Math.floor(a.t*4)%2)[[0,0],[2,0],[1,1],[0,2],[2,2]].forEach(([i,j])=>this.px(x+12+i,y-5+j,C.red))}
   if(n==='look'){o.look=p<.45?-1:p<.9?1:0;const lk=p<.45?0:p<.9?1:2;if(lk!==a.k){a.k=lk;this._fs('blip')}if(p>.42&&p<.5)y=F-1}
   if(n==='snip'){const k=Math.floor(a.t*5);o.armsUp=k%2===0;o.eyes=k%4<2?'open':'happy';if(k!==a.k){a.k=k;if(k%2===0)this._fs('snip')}}
   if(n==='yawn'){const up=p>.15&&p<.75;o.armsUp=up;o.eyes=p<.85?'closed':'open';o.mouth=p>.15&&p<.7?'o':null;y=F-(up?1:0);if(!a.k&&p>.15&&!a.morning){a.k=1;this._fs('yawn')}if(a.morning&&p>.55){[[-3,1],[14,1],[-2,-2],[13,-2]].forEach(([i,j],k)=>{if((Math.floor(a.t*10)+k)%2)this.px(x+i,y+j,C.gold)});if(p<.95)this.text(this.lang==='zh'?'早安':'morning',x+6,y-3,C.text,2.4,'center')}}
   if(n==='dance'){const b=Math.floor(a.t*5);x=this.x+[0,-1,0,1][b%4];y=F-(b%2);o.armsUp=b%2===0;o.wave=!o.armsUp;o.eyes='happy';o.legs=b%2?'a':'b';this.text('♪',x-3-(b%4<2?0:1),y-1-(b%2),C.gold,2.8,'center');if(b!==a.k){a.k=b;if(b%2===0)this._fs('step')}}
   if(n==='wow'){o.eyes='wide';y=F-Math.round(Math.sin(Math.min(1,p*3)*Math.PI)*3);this.text('!?',x+6,y-2,C.yellow,3,'center',800);const dy=Math.floor(a.t*4)%3;this.px(x+12,y+dy,C.sweat);this.px(x+12,y+1+dy,C.sweat)}
   if(n==='shrug'){o.armsUp=p>.1&&p<.8;o.eyes='down';this.text('?',x+6,y-2-(Math.floor(a.t*3)%2),C.text,3.4,'center',800)}
   if(n==='paper'){const N=a.n||1;o.eyes='wide';const lt=k=>.08+k*.09;let landed=0;for(let k=0;k<N;k++)if(p>=lt(k))landed=k+1;
     if(landed!==(a.k||0)){a.k=landed;this.sfx.play('paper')}if(p>=.78&&!a.b){a.b=1;this.sfx.play('burst')}
     if(p>.45&&p<.78){x+=Math.floor(a.t*14)%2;o.legs=Math.floor(a.t*10)%2?'a':'b'}if(p>=.78){y=F-Math.round(Math.sin(Math.min(1,(p-.78)/.15)*Math.PI)*3);o.eyes=p>.9?'happy':'wide'}
     const cx=x,cy=y;later(()=>{const g=this.g;for(let k=0;k<N;k++){const t0=lt(k);if(p<t0-.07)continue;const top=cy+1-k*2,side=k%2?1:-1;let px_=cx+2+side,py_;if(p<t0)py_=-4+(top+4)*((p-(t0-.07))/.07);else py_=top;
       if(p>=.78){const q=(p-.78)/.22;g.globalAlpha=Math.max(0,1-q);px_+=side*(3+k*2)*q*3;py_-=Math.round(q*8-q*q*14)}
       this.px(Math.round(px_),Math.round(py_),C.paper,8,3);this.px(Math.round(px_)+1,Math.round(py_)+1,C.paperL,6,1);g.globalAlpha=1}})}
   if(n==='laugh'){const b=Math.floor(a.t*6);y=F-(b%2?2:0);o.eyes='happy';o.mouth='smile';if(b!==a.k){a.k=b;if(b%2)this.sfx.play('ha')}this.text(this.lang==='zh'?'哈':'ha',x+(b%2?-3:15),y-1-(b%3),C.text,2.4,'center')}
   if(n==='sad'){o.eyes='down';o.legs='tuck';y=F+1;const cx=x+2,cy=y-7;this.px(cx+2,cy,C.cloud,4,1);this.px(cx,cy+1,C.cloud,8,2);for(let k=0;k<3;k++){const tt=(a.t*2+k*.37)%1;this.px(cx+1+k*3,cy+3+Math.round(tt*3),C.sweat)}const tx=x,ty=y;later(()=>{const tt=(a.t*1.3)%1;this.px(tx+3,ty+3+Math.round(tt*3),C.sweat)})}
   if(n==='night'){o.wave=Math.floor(a.t*5)%2;o.eyes=p<.6?'happy':'closed';if(p<.85)this.text(this.lang==='zh'?'晚安':'night',x+6,y-3,C.text,2.4,'center')}
   if(n==='wave'){o.wave=Math.floor(a.t*5)%2;o.eyes='happy';y=F-(p<.2?Math.round(Math.sin(p/.2*Math.PI)*2):0);if(p<.75)this.text(this.lang==='zh'?'回来啦！':'hi!',x+6,y-3,C.text,2.4,'center')}
   if(n==='compact'){const fc=a.fromCtx||0;const f0=fc>=.95?2:fc>=.7?1:0;const g=this.g;
     if(p<.3){o.fat=f0+(Math.floor(a.t*20)%2);o.eyes='wide';x+=(Math.floor(a.t*30)%2?1:0);
      if(p>.12){const cr=[[6,0],[5,1],[6,2],[7,3],[6,4],[5,5]];const k=Math.ceil((p-.12)/.18*cr.length),xx=x,yy=y;after=()=>cr.slice(0,k).forEach(([i,j])=>this.px(Math.round(xx)+i,Math.round(yy)+j,C.ink))}}
     else{const q=(p-.3)/.7;o.fat=0;o.eyes=q<.5?'wide':'happy';o.color=q<.25&&Math.floor(a.t*16)%2?C.shell:C.body;
      if(q<.85){const sx=Math.round(ease(Math.min(1,q*1.6))*7),dy=Math.round(q*q*7),al=q<.5?1:1-(q-.5)/.35;g.globalAlpha=Math.max(0,al);
       BODY.forEach((r,j)=>{for(let i=0;i<12;i++)if(r[i]==='X'&&(i+j)%3){const Lh=i<6;this.px(x+i+(Lh?-sx:sx),y+j+dy-(Lh?0:1),C.shell)}});
       [[-1,-1,-1.6],[12,-1,1.6],[3,-2,-.7],[8,-2,.8],[0,4,-2],[11,4,2]].forEach(([i,j,v])=>{const tt=q*1.2;this.px(Math.round(x+i+v*tt*8),Math.round(y+j-6*tt+12*tt*tt),C.shell)});g.globalAlpha=1}
      if(q>.35&&q<.95)[[-3,-2],[14,-2],[6,-5],[-1,-5],[12,-5]].forEach(([i,j],k)=>{if((Math.floor(a.t*12)+k)%2)this.px(x+i,y+j,C.gold)})}}
  }
  if(!a&&fat>=1&&this.ctx>=.85&&!this.sleeping){const dy=Math.floor(this.clock*3)%4;this.px(x+12+fat,y-1+dy,C.sweat);this.px(x+12+fat,y-2+dy,C.sweat)}
  // meter
  if(this.meter&&(this.meter.live||(a&&a.name==='done'))&&!(a&&(a.name==='tool'||a.name==='cool'))){const m=this.meter;let s,col=C.green;if(m.mode==='tokens'&&m.tokens!=null)s=(m.tokens>=1000?(m.tokens/1000).toFixed(1)+'k':String(m.tokens))+' tok';else if(m.mode==='pct'&&m.pct!=null){s=Math.round(m.pct*100)+'%';col=m.pct>=.95?C.red:m.pct>=.8?C.yellow:C.green}else s='$'+(m.usd||0).toFixed(2);
   const w=Math.ceil(this.text(s,-999,-999,col,2.6))+3,mx=Math.round(this.x)-w-3-(this._lap?15:0),my=F+2;this.px(mx,my,C.meter,w,5);this.px(mx,my+5,'#000',w,1);this.text(s,mx+1.5,my+3.9,col,2.6);this.meterBox={x:mx*this.S,y:my*this.S,w:w*this.S,h:6*this.S}}else this.meterBox=null;
  this.crab(Math.round(x),Math.round(y),o);if(after)after();
  this.crabBox={x:Math.round(x)*S,y:Math.round(y)*S,w:12*S,h:8*S}}
}
export {VERBS,L};
