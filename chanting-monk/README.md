# Chanting Monk (唠叨和尚)

A streaming message bubble for AI agents. A little monk sits on top of the bubble and taps a wooden fish once for every streamed token, while a monkey in a golden headband listens beside him.

- **入定**, waiting for the first token: the monk's eyes are closed and he taps along to the slow chant (哚…). The monkey dozes.
- **开念**, streaming starts (up to 200 streamed characters by default): he taps along to the chant while tokens arrive. New words drift into the bubble like incense smoke and the monkey opens its eyes.
- **入迷**, normal length (up to 500): a steady rhythm. The monkey nods along and its headband is loose.
- **紧箍咒**, rambling (up to 800): the monk chants faster and spins his beads. The headband tightens in three steps and the monkey clutches its head.
- **失控**, out of control (up to 1000, and past it for now: a 5th tier is reserved): the monkey rolls on the floor with smoke coming out of its ears, and the bubble trembles.
- **Stop**: the monkey leaps up and stuffs a peach into the monk's mouth. The chant cuts off mid-character into 唔唔唔, the monkey hops back, the wooden fish drops (咚) and the monkey dusts off its hands. The text freezes exactly where it stopped.
- **A short, natural finish**: the monk joins his palms and says 善哉, a bell rings 当, a golden halo appears, and the monkey does a flip and bows. If the answer finished after rambling, the monkey collapses instead.
- **功德 = characters streamed**: the 功德 counter is the same number the levels use (one 功德 per streamed character), and it resets on every `start()`.
- **Easter egg**: tap the wooden fish for a knock, a 功德 +1 pop and **+1 bonus 功德** on top of the character count.

The monk chants the OIIA cat meme ("oiiaioooooiai"). It gets faster as he loses it: 0.75x while meditating, 1x in the zone, 1.25x for 紧箍咒 and 1.5x when 失控. The thought cloud spells the phrase out in time with the sound. (The OIIA chant is third-party meme audio, not made by me. See the sound note below.)

## Use

```jsx
import ChantingMonk from './ChantingMonk.jsx';
import './chanting-monk.css';

// 1) hand it a stream: an AsyncIterable<string>, a ReadableStream (bytes or strings), or a function returning one
<ChantingMonk stream={tokens} onStop={(textSoFar) => abort()} onDone={(text) => save(text)} />

// 2) or drive it yourself
<ChantingMonk text={text} streaming={isStreaming} onStop={abort} />

// 3) or simulate an answer
<ChantingMonk demo="ramble" sound />
```

| Prop | Default | |
|---|---|---|
| `stream` | | An AsyncIterable of strings, a `ReadableStream`, or a function returning one. Each chunk is one token and queues one tap on the next beat. Stop closes the iterator (`return()` / `reader.cancel()`). |
| `text`, `streaming` | | Controlled mode. Each time `text` grows, the new part counts as one token. `streaming={false}` finishes the answer. After Stop, further text is ignored. |
| `demo` | | `"short"` or `"ramble"` simulates an answer. `demoSpeed` speeds it up. |
| `onStop(text)`, `onDone(text)`, `onToken(tok)` | | Callbacks. |
| `levels` | `[200, 500, 800, 1000]` | Streamed-character upper bounds for 开念 / 入迷 / 紧箍咒 / 失控. Past the last one is tier 5 (reserved, plays 失控 for now; `data-tier` 1–5 on the root). 入定 = before the first token. Legacy `openFor` / `rambleAt` / `wildAt` still work when `levels` is not set. |
| ref `start()` / `push(chunk)` / `finish()` / `stop()` | | Host-driven mode: the host renders the reply text itself and feeds the chunks. `ref.count` = characters streamed; `ref.merit` = 功德 (characters + fish-tap bonus). |
| `showText` | `true` | `false` = the component is only the strip (monk, monkey, 功德, sound) with its chips beside it, aligned to the top of the strip (level with the heads; `sm` keeps them on the ground line); put your own message text right under it. |
| `theme` | `"light"` | `"dark"` drops the card and uses quiet host-style chips; the text takes `--cm-msg-size/-lh/-color`, chips `--cm-chip-line/-color/-bg`, counters `--cm-mono`. Dark uses its own sprite set (`chanting-monk-sprites-dark.js`): the same art with the white sticker border stripped, so no white halo shows on a dark background. |
| `showStop` | `true` | `false` hides the built-in Stop (use your composer's Stop and call `stop()`). |
| `footer` | | Extra host chips in the meta row. (No separate character counter is needed: 功德 already is the character count.) |
| `size` | `"lg"` | `"sm"` is the compact size for a message list or above a composer. `"xs"` is the lg layout at about half scale (stage 160px wide, 88px tall): a small inline accent strip above a reply, used by the dark demo. Tune its width with `--cm-xs-w`. |
| `maxHeight` | | Caps the text height. The text scrolls and sticks to the newest token. |
| `sound` | `false` | The OIIA chant clips plus synthesized SFX. They play only after a user gesture. |
| `lang` | `"zh"` | `"zh"` or `"en"` labels. `labels` overrides any of them. |
| `label`, `className`, `style`, `id` | | |

Ref methods: `stop()`, `demo(kind)` (also called `play`), `reset()`, plus `state` and `text`.

**Accessibility.** The text has `aria-live="polite"`, and `aria-busy="true"` while streaming. Stop is a real button with a label, and Esc also stops while focus is inside. The wooden fish is a labelled button. The component is SSR-safe, and `prefers-reduced-motion` jumps every sequence straight to its final state.

**Sound.** The chant is the clock: every wooden-fish hit lands on the beat of the OIIA phrase. A token queues a hit and the hit plays on the next beat (one knock on every sung syllable of the chant in 入定, 开念 and 入迷, 16ths in 紧箍咒 and 失控). In 紧箍咒 and 失控, every beat gets a hit while tokens stream faster than the beat, and slower streams only hit on beats with a queued token. In 入定, 开念 and 入迷 every sung syllable gets a knock while the monk chants, with none in the breath. The text itself is never delayed. Hits and phrases are scheduled on the Web Audio timeline, and the mallet's strike frame is pinned to the sound. Under the taps the monk chants the OIIA phrase on a loop (pitch-preserved clips for each speed). It ducks about 3 dB under every fish hit, fades out over 300 ms when the stream ends or stalls, and tape-stops on the peach. You also hear the monkey's squeak, the peach 噗, the fish drop 咚, the bell 当, a whoosh, a sigh and the 功德 ding. **Third-party audio:** the OIIA chant is the internet "OIIA cat" meme audio. It is third-party material with unclear rights, is not covered by this repo's license, and is included only for non-commercial fun. Swap it for your own chant before any commercial use.

## Plain HTML

```html
<script src="chanting-monk.js"></script>
<chanting-monk demo="short" sound="true" max-height="220"></chanting-monk>
<script>
  const m = document.querySelector('chanting-monk');
  m.stream = myAsyncIterableOfTokens;        // or m.text = '…'; m.streaming = true
  m.addEventListener('stop', (e) => console.log(e.detail.text));
</script>
```

Made by [@nextoneforeal](https://x.com/nextoneforeal) · [heynext1.com](https://heynext1.com)

## License

Free for non-commercial use under the [PolyForm Noncommercial License 1.0.0](../LICENSE). Commercial use needs permission: see [COMMERCIAL.md](../COMMERCIAL.md).
