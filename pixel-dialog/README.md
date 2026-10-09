# Pixel Dialog

A chat input for AI agents that **is** a 16-bit RPG dialogue box. A little mage reads what you type, casts your message as a spell when you press A, listens when you talk, and drops a treasure chest when you attach a file.

![Pixel Dialog FIRAGA](./media/poster.png)

▶ [Showcase video](./media/showcase.mp4)

Every message is a spell, and its size decides which one. Short messages cast **FIRE**, longer ones **FIRA**, and long prompts cast **FIRAGA**: the box turns into a night sky, a meteor crashes into your words and a **CRITICAL!** shows the damage, which is your message's token count. The tag on the top border shows the spell and the token cost while you type.

Category: ui-component

## What it does

- **Spells by length.** FIRE, FIRA, FIRAGA, picked from an estimated token count (CJK counts per character, other text about 4 characters per token). Tune it with `spellTiers`.
- **The mage reacts to what you write.** A `?` puzzles him, a `!` makes him jump, "please" or "thanks" gets hearts, and code puts on his glasses.
- **Voice input.** Tap the pixel mic. The mage holds a brass ear trumpet, notes float along the border from a LISTEN meter into his name plate, and your words type themselves in as you speak (Web Speech API). Browsers without speech recognition get "You have not learned this spell yet."
- **Loot by rarity.** Attach with the chest button, drag and drop, or paste. Images drop a rare chest, documents an epic one and archives a legendary one, each with its own light pillar and colour.
- **Classic RPG lines.** Send an empty box and you get "But nothing happened..." with a puff of smoke. Clear with B or Esc and it's "Got away safely!"
- **ENEMY TURN.** While `busy`, the mage raises a shield, the A button becomes an hourglass and the tag reads ENEMY TURN.
- **A secret.** Type ↑↑↓↓←→←→BA in the box for gold mode and ULTIMA.

## Sizes

- **Default** is compact and sits in a chat composer.
- **`size="lg"`** is the big showcase version.

## Install

Copy `PixelDialog.jsx`, `pixel-dialog.css` and the `fonts/` folder into your project and import the CSS once. React 18+ is the only dependency, and it is SSR-safe.

```jsx
import PixelDialog from './PixelDialog.jsx';
import './pixel-dialog.css';

<PixelDialog onSend={(text, files) => {}} busy={thinking} />
<PixelDialog size="lg" sound name="WIZARD" />
```

Imperative: `ref.current.send()`, `clear()`, `focus()`, `attach(files)`, `listen()`, `stopListening()`, `konami()`, and `simulateVoice(text, ms)` for demos and recordings.

## Props

| Prop | Default | |
|---|---|---|
| `value` / `defaultValue` | `''` | controlled / uncontrolled text |
| `onChange(text)`, `onSend(text, files)`, `onClear()`, `onAttach(files)` | | |
| `busy` | `false` | the agent's turn: shield, hourglass, ENEMY TURN |
| `size` | `'md'` | `'md'` (composer) or `'lg'` (showcase) |
| `spellTiers` | `[12, 60]` | token limits for FIRE and FIRA; above the second is FIRAGA |
| `voice` | `true` | show the mic button |
| `lang`, `onListen(on)` | | speech recognition language, listening callback |
| `sound` | `false` | tiny 8-bit WebAudio bleeps |
| `name` | `'AGENT'` | the name plate |
| `placeholder` | `'PRESS START'` | |
| `accept`, `maxRows`, `disabled`, `ariaLabel`, `className` | | |

## Interaction

- Enter or A sends, Shift+Enter adds a line, Esc or B clears.
- Accessibility: a real labelled textarea, labelled buttons (the mic is a toggle with `aria-pressed`), and sends, items and listening go to a polite live region.
- `prefers-reduced-motion`: no fireballs, meteors, chests or notes, just the result.

## Files

- `PixelDialog.jsx`: the component (pixel sprites drawn as inline SVG)
- `pixel-dialog.css`
- `fonts/`: Press Start 2P and VT323 (SIL Open Font License, see `fonts/FONTS.md`)
- `demo.html`: offline demo. Use `?mode=hero` for the large size
- `media/`: showcase video and poster

## License

Free for non-commercial use ([PolyForm Noncommercial 1.0.0](../LICENSE)). Commercial use needs permission, see [COMMERCIAL.md](../COMMERCIAL.md). The bundled fonts keep their own SIL Open Font License.
