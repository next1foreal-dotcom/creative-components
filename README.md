# Creative Components

Playful, illustrated UI components for AI apps. Each one is a real, usable control with a little story inside it.

| Component | What it is |
|---|---|
| [Thinking Effort](./thinking-effort) | A thinking-effort slider. The knob is a brain and a zombie chases it. Pull it too low and the brain gets eaten. |
| [Model Slot](./model-slot) | A model picker shaped like a tiny slot machine. Swipe the reel or pull the lever, and Opus and Astra hit a jackpot. |
| [Pixel Dialog](./pixel-dialog) | A chat input that's a 16-bit RPG dialogue box. A mage casts your message as FIRE, FIRA or FIRAGA by its length, listens when you talk, and drops loot when you attach a file. Switch models by changing party members and set thinking effort on an MP bar. |
| [Nosy Password](./nosy-password) | A password field with a nosy teddy or corgi peeking over it. It watches you type, and when you reveal the password it hides its eyes (the corgi shows you its butt), then sneaks a peek. |

Every component is a single React 18 file plus one CSS file, with an offline `demo.html` and a showcase video in `media/`.

**No React? Use plain HTML.** Each folder also has a ready-made Web Component file. Add one script tag and write the tag:

```html
<script src="creative-components.js"></script>

<thinking-effort value="1"></thinking-effort>
<model-slot></model-slot>
<pixel-dialog></pixel-dialog>
<nosy-password></nosy-password>
<nosy-password></nosy-password>
```

`creative-components.js` has all of them. Each folder's own `<name>.js` has just that one, and `example.html` shows it working. A tiny renderer ([Preact](https://preactjs.com)) is bundled inside, so the page needs nothing else. They're keyboard and screen-reader accessible, SSR-safe and respect `prefers-reduced-motion`.

New components land here as they're made.

Made by [@nextoneforeal](https://x.com/nextoneforeal) · [heynext1.com](https://heynext1.com)

## License

Free for non-commercial use under the [PolyForm Noncommercial License 1.0.0](./LICENSE). Keep the credit line when you share them.

**Commercial use needs permission.** Email [next1foreal@gmail.com](mailto:next1foreal@gmail.com) or DM [@nextoneforeal](https://x.com/nextoneforeal) on X. See [COMMERCIAL.md](./COMMERCIAL.md).
