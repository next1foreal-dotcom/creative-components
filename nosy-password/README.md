# Nosy Password

A password field with a nosy raccoon neighbour peeking over the top edge.

- **Asleep** until you tap the field, then startles awake.
- **Eyes follow your typing**, and leans in closer the faster you type.
- **Reveal the password** and it gasps, whips its head away and covers its eyes. A second later it sneaks a peek between its paws and gets caught.
- **Hide it again** and it whistles like nothing happened.
- **Clear the field** and it sinks back, disappointed.

![preview](./media/preview.png)

Open `demo.html` (works offline) and press ▶ Autoplay, or type a dummy password yourself.

## React

```jsx
import NosyPassword from './NosyPassword.jsx';
import './nosy-password.css';

<NosyPassword label="Password" onChange={(v) => setPw(v)} />
<NosyPassword size="lg" />
```

Props: `value` / `defaultValue` / `onChange(value, event)`, `revealed` / `defaultRevealed` / `onRevealChange(bool)`, `label`, `placeholder`, `name`, `id`, `autoComplete`, `disabled`, `size` (`"md"` or `"lg"`), `inputProps`. Ref: `focus()`, `blur()`, `reveal(bool)`, `input`.

## Plain HTML

```html
<script src="nosy-password.js"></script>
<nosy-password label="Password"></nosy-password>
```

Events: `input` (`detail.value`), `reveal` (`detail.revealed`). See `example.html`.

It's a real `<input type="password">` with a labelled show/hide button (`aria-pressed`), so password managers, keyboard and screen readers work as usual. The raccoon is decorative and hidden from assistive tech. `prefers-reduced-motion` keeps the poses but drops the motion.

## License

Free for non-commercial use under the [PolyForm Noncommercial License 1.0.0](../LICENSE). Commercial use needs permission, see [COMMERCIAL.md](../COMMERCIAL.md).
