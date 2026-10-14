# Clone Hairs (身外身法)

A subagents / parallel-runs component for AI agents. Every time your agent spins up a subagent, the Monkey King plucks one of his hairs, blows on it, and *poof*: a tiny clone with a golden-banded staff hops out and gets to work. When the subagent finishes, the clone turns back into a hair and floats home onto his head.

- **Spawn**: he plucks a hair (啵), blows a puff of breath, and the hair turns into a clone that hops out and gets to work. As each wave launches he shouts 「孩儿们，给我打！」.
- **Working**: the clones dig, hammer, pry, twirl and carry. In the side panel each clone carries a tool for its job (a telescope for search, a brush for code, a pickaxe for run, the staff for anything else), with a 金箍棒 progress rod and the current step.
- **Done**: the clone poofs back into a hair (木鱼 klok) that flies home, and a toy glockenspiel walks up a pentatonic scale as each hair lands.
- **Fail**: the clone gets dizzy and faceplants, the rod snaps in two, and the panel row offers a Retry chip.
- **Finish all**: every hair comes home, the clones cheer, and he somersaults onto a cloud (嘿嘿). In the panel the rods merge into one, right into his hand.
- **Stop**: the clones freeze mid-pose (梆子 嗒-嗒!), then all poof home.
- **The cost of too many clones**: the more hairs are out at once, the worse his scalp. At 3 he starts sweating, then a bald patch grows in three stages. At 9 he catches himself in a mirror and screams 「哎呀！俺老孙的毛！」 while the clones snicker (嘻嘻嘻).
- **Queue**: spawns beyond `max` wait in a queue (grey hairs in the panel) and launch as soon as a slot frees up.
- **Easter egg**: leave it idle and the clones slack off with peaches. Any event puts them back to work.

Original chibi art (Journey to the West itself is public domain). No art or audio from any film, TV series or game.

## Layouts

- `layout="strip"` (default): the Monkey King and his clones in a row, a small accent above the Agent row of a chat thread.
- `layout="panel"`: a right side panel. The Monkey King sits in the header and each subagent gets its own row with its clone, label, step, progress rod and elapsed time.

## Use

```jsx
import CloneHairs from './CloneHairs.jsx';
import './clone-hairs.css';

const clones = useRef(null);

<CloneHairs ref={clones} layout="panel" theme="dark" size="xs" lang="en" onChange={(s) => console.log(s)} />

// drive it from your agent's events
clones.current.spawn('t1', 'Scan src/hooks', 'search');
clones.current.progress('t1', 0.4, 'Reading 12 files');
clones.current.done('t1');        // or fail('t1')
clones.current.finishAll();       // or stop()

// or watch a built-in demo
<CloneHairs demo="big" />
```

| Prop | Default | |
|---|---|---|
| `layout` | `"strip"` | `"strip"` or `"panel"` (see above). |
| `size` | `"xs"` | `"xs"`, `"sm"` (1.4×) or `"lg"` (2.1×). |
| `theme` | `"dark"` | `"dark"` or `"light"`. Each theme has its own sprite set. |
| `lang` | `"zh"` | `"zh"` or `"en"` labels (分身 / Clones, 排队 / queued, 重试 / Retry…). |
| `sound` | `true` | `false` mutes everything. Sound plays only after a user gesture. |
| `voice` | `true` | `false` mutes only the voice lines and keeps the SFX. |
| `voiceLang` | `"zh"` | `"zh"` or `"en"` voice lines. |
| `max` | `9` | Clones on screen at once. Spawns beyond it are queued. |
| `thresholds` | `[3, 6, 9]` | Hairs out at once for sweating, the bald patch and the mirror scream. |
| `idleEggMs` | `9000` | Idle time before the peach break. |
| `showLabels` | `false` | Show task labels under the clones in the strip. |
| `showChip` | `true` | The 分身 / Clones counter chip. |
| `demo` | | `"small"`, `"big"` or `"stop"` plays a built-in demo on mount. |
| `onChange(state)` | | Called with `{ active, queued, done, hairs, level }` whenever one of them changes. |
| `onRetry({ id, label, kind })` | | The panel's Retry chip. Without it, Retry re-spawns the same task. |
| `className`, `style` | | |

**Ref methods**

| | |
|---|---|
| `spawn(id, label, kind)` | Starts a subagent. `kind` picks the panel tool: `search`, `code`, `run`, or anything else for the staff. The strip shows a mixed crowd and ignores `kind`. |
| `progress(id, value, step)` | `value` is 0–1, or `null` for an indeterminate rod. `step` is the line shown in the panel row. |
| `done(id)` / `fail(id)` | Ends one subagent. `done()` on a queued id drops it from the queue. |
| `finishAll()` | Everyone comes home, then the cloud somersault. |
| `stop()` | Freeze, then everyone poofs home. |
| `reset()` | Back to idle at once. |
| `play(name)` | Plays a built-in demo: `"small"`, `"big"` or `"stop"`. |

Getters: `count` (clones working), `queued`, `hairs` (hairs out), `level` (0–3 scalp level), `state`, `rows` (the panel rows with their statuses).

**Accessibility.** The root is a labelled group with a polite live region that reads out how many clones are working and queued. Retry is a real button. The component is SSR-safe, and `prefers-reduced-motion` skips the pluck-and-blow beat: clones appear and return at once, and finish goes straight to the cloud.

**Sound.** Every sample is embedded (Opus in WebM, with an MP3 fallback, about 200 KB), so nothing loads from the network. The SFX bus ducks under the voice, a limiter keeps it clean, at most 10 sounds play at once, and a strip and a panel showing the same run play each sound only once. Progress ticks are throttled and very quiet.

## Plain HTML

```html
<script src="clone-hairs.js"></script>
<clone-hairs layout="panel" theme="dark" size="xs" lang="en" voice-lang="en"></clone-hairs>
<script>
  const el = document.querySelector('clone-hairs');
  el.spawn('t1', 'Scan src/hooks', 'search');
  el.progress('t1', 0.5, 'Reading files');
  el.done('t1');
  el.addEventListener('change', (e) => console.log(e.detail));        // { active, queued, done, hairs, level }
  el.addEventListener('retry', (e) => el.spawn(e.detail.id, e.detail.label, e.detail.kind));
</script>
```

Attributes: `layout`, `size`, `theme`, `lang`, `sound`, `voice`, `voice-lang`, `max`, `thresholds` (JSON), `idle-egg-ms`, `show-labels`, `show-chip`, `demo`. `example.html` shows the strip and the panel working, and `demo.html` is an offline demo in a dark agent thread.

## Credits

**Sound effects.** Every sound effect is a CC0 1.0 (public domain) sample from [freesound.org](https://freesound.org), trimmed, layered, pitched and re-encoded. Credits anyway:

| Used for | Freesound sound | Author |
|---|---|---|
| Clone poof with reduced motion (铙钹 cymbal), unpoof tail | [cymbal splash hit nearby chinese opera in park.flac](https://freesound.org/people/kyles/sounds/452400/) | kyles |
| Clone poof with reduced motion (堂鼓 drum thump) | [Chinese Bass Drum Dagu - Rim Shot from Both Sides - Soft](https://freesound.org/people/sazanami12/sounds/856560/) | sazanami12 |
| Unpoof (木鱼 klok), freeze (梆子) | [Ashboy34 - Temple block - Lunarlander 1969](https://freesound.org/people/Sadiquecat/sounds/742279/) | Sadiquecat |
| Pluck (啵) | [Mouth pop](https://freesound.org/people/fleurescence/sounds/573152/) | fleurescence |
| Hair home, merge (glockenspiel) | [Glock-G4.wav](https://freesound.org/people/hollandm/sounds/693357/) | hollandm |
| Somersault whoosh | [whoosh_short_mid.wav](https://freesound.org/people/DJT4NN3R/sounds/449996/) | DJT4NN3R |
| Cloud landing gong, mirror horror | [Gong_Center_Clear.wav](https://freesound.org/people/Q.K./sounds/56240/) | Q.K. |
| Staff snap | [twig snap classic.wav](https://freesound.org/people/martian/sounds/251464/) | martian |
| Staff halves clattering | [wooden rods single strike.ogg](https://freesound.org/people/adharca/sounds/275679/) | adharca |
| Faceplant thud | [Body fall_01.wav](https://freesound.org/people/deleted_user_2104797/sounds/346695/) | deleted_user_2104797 |
| Progress tick | [Woodblock-soft.wav](https://freesound.org/people/hollandm/sounds/692828/) | hollandm |

**Voice.** The Chinese voice lines (「孩儿们，给我打！」, 「哎呀！俺老孙的毛！」, 嘿嘿, 嘶, 嘻嘻嘻) and the breath of the blow are the author's own voice, recorded with [fish.audio](https://fish.audio). The English voice lines ("Go, my little ones!", "Oh no, my hair!", "Heh heh!") are text-to-speech.

Made by [@nextoneforeal](https://x.com/nextoneforeal) · [heynext1.com](https://heynext1.com)

## License

Free for non-commercial use under the [PolyForm Noncommercial License 1.0.0](../LICENSE). Commercial use needs permission: see [COMMERCIAL.md](../COMMERCIAL.md).
