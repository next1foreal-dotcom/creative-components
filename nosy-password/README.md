# Nosy Password

A password field with a nosy little animal peeking over the top edge. Pick `animal="teddy"` (a toy poodle with a pink bow), `animal="corgi"`, or `animal="bear"` (a big-headed college-mascot bear with pop-art rainbow eyes).

- **Asleep** until you tap the field, then startles awake.
- **Eyes follow your typing**, and leans in closer the faster you type.
- **Reveal the password** and it gasps and hides its eyes in its own way: the teddy flips its big curly ears over them, the corgi spins round and shows you its butt, the bear slaps both paws over its eyes and peeks through. A second later it sneaks a peek and gets caught.
- **Hide it again** and it whistles like nothing happened.
- **Clear the field** and it sinks back, disappointed.

![preview](./media/preview.png)

Open `demo.html` (works offline), pick an animal and press ▶ Autoplay, or type a dummy password yourself.

## React

```jsx
import NosyPassword from './NosyPassword.jsx';
import './nosy-password.css';

<NosyPassword label="Password" onChange={(v) => setPw(v)} />
<NosyPassword animal="corgi" size="lg" />
```

Props: `animal` (`"teddy"`, `"corgi"` or `"bear"`), `value` / `defaultValue` / `onChange(value, event)`, `revealed` / `defaultRevealed` / `onRevealChange(bool)`, `label`, `placeholder`, `name`, `id`, `autoComplete`, `disabled`, `size` (`"md"` or `"lg"`), `sound` (boolean, default `false`), `inputProps`. Ref: `focus()`, `blur()`, `reveal(bool)`, `input`.

## Plain HTML

```html
<script src="nosy-password.js"></script>
<nosy-password animal="corgi" label="Password" sound="true"></nosy-password>
```

Events: `input` (`detail.value`), `reveal` (`detail.revealed`). See `example.html`.

It's a real `<input type="password">` with a labelled show/hide button (`aria-pressed`), so password managers, keyboard and screen readers work as usual. The animal is decorative and hidden from assistive tech. `prefers-reduced-motion` keeps the poses but drops the motion.

## Sound

`sound` (attribute `sound="true"`) turns on the showcase video's sound effects, off by default: a soft key click per character, a little wake-up boop when it startles awake, a gasp on reveal, paw pats as it covers its eyes, tiptoe notes as it sneaks a peek, a zip + boing when it gets caught, an innocent whistle when you hide the password again, and a small sigh when you clear the field. They are tiny embedded samples (`nosy-password-sfx.js`, ~60 KB) played with Web Audio, fading in and out so nothing clicks. Nothing plays before the page has had a tap or key press (browser autoplay rules); the samples start decoding when the pointer or focus reaches the field. Same sounds for every animal.

## License

Free for non-commercial use under the [PolyForm Noncommercial License 1.0.0](../LICENSE). Commercial use needs permission, see [COMMERCIAL.md](../COMMERCIAL.md).
