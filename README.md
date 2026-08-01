# IVG

**Interactive vector animations that are just SVG files.**

An IVG file is a real `.svg`. Open it, drop it in an `<img>`, put it in Figma —
it renders, because it is a normal SVG showing the resting state. Load this
player and the same file becomes an animation, because the keyframes ride along
inside it in a `<metadata>` block.

That means no new file extension, no MIME configuration, no build plugin, and
no broken image if JavaScript never runs.

```bash
npm install ivg
```

> The package name in `package.json` is a placeholder — check availability on
> npm and rename before publishing.

---

## Use it

### Plain HTML

```html
<script type="module" src="https://unpkg.com/ivg"></script>

<ivg-player src="/anim/tower.svg" autoplay loop style="height:320px"></ivg-player>
```

`<ivg-player>` is a custom element, so it behaves identically in Vue, Svelte,
Angular, Astro, plain HTML and React 19+.

### Vue

```vue
<script setup>
import 'ivg';
</script>

<template>
  <ivg-player src="/anim/tower.svg" autoplay loop />
</template>
```

Vue warns about unknown elements unless you tell it this one is custom:

```js
// vite.config.js
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'ivg-player' } } })
```

### React

React 18 and earlier cannot set properties or listen for events on custom
elements, so use the binding:

```jsx
import { IVG } from 'ivg/react';

<IVG src="/anim/tower.svg" autoPlay loop onEnd={() => console.log('done')} />
```

### Any framework, imperative

```js
import { load } from 'ivg';

const anim = await load('/anim/tower.svg', document.querySelector('#stage'));
anim.play({ loop: true });
```

---

## Why it is small

A 12-frame transition of a fairly dense scene (1,654 elements, 1280×720) is
**~260 KB gzipped**, and it stays crisp at any resolution. The comparable
`.mp4`/`.webm` is in the same range but pixellates when scaled, cannot be
recoloured, and cannot be clicked.

Three decisions keep it there:

- **The player is not in the file.** It is a few KB shared across every
  animation on the page. Inlining it per asset would multiply it by the number
  of transitions.
- **There is no reverse copy.** `reverse()` runs the timeline backwards, so a
  second file would double the size to store something already present.
- **Coordinates are quantised integer deltas along time.** Elements that move
  together produce near-identical delta streams, which compress far better than
  absolute positions. Serve it gzipped or brotli'd — that is where the win is.

---

## API

### `<ivg-player>`

| attribute | |
|---|---|
| `src` | URL of the `.svg` |
| `autoplay` | start on load |
| `loop` | loop playback |
| `speed` | playback rate, default `1` |
| `fit` | `contain` (default), `cover`, `stretch` |
| `background` | CSS colour, default transparent |
| `seam-fix` | `false` to skip closing hairlines between abutting fills — see below |

Methods: `play()`, `reverse()`, `pause()`, `seek(t)`, `showState('end')`,
`showAnimation()`, `setGroupColor(group, css)`, `pick(x, y)`.
Events: `load`, `end`, `error`.

### `load(src, target, options) → Promise<IVGPlayer>`

`target` may be a `<canvas>` or any element to render inside.

### Player

```js
anim.play({ loop: true });
anim.reverse();                          // no second file needed
anim.seek(0.25);

anim.setGroupColor('Cabinets', '#e5484d');   // live data binding
anim.setElementColor(id, '#e5484d');
anim.setColor(0, '#ffffff');                 // recolour a palette swatch

const hit = anim.pick(event.clientX, event.clientY);  // works mid-playback
// -> { id: 'bts cabinet/f12', group: 'bts cabinet' }

anim.state('end');   // the resting state as standalone SVG markup
```

`anim.groups` lists the group names available for theming — they come from the
object names in the source scene.

### The transition → static pattern

The two resting states travel inside the file, rendered from the same data as
the animation, so the last frame and the state you cut to are computed from
identical numbers and the swap is seamless.

```js
anim.onend = () => el.showState('end');   // hand off to real, interactive DOM
```

---

## CLI

```bash
npx ivg info anim/tower.svg     # elements, duration, size, what the states cost
npx ivg strip anim/tower.svg    # drop the embedded states -> smaller, no fallback
npx ivg states anim/tower.svg   # extract the resting states as plain .svg
```

---

## Performance

Frame cost is driven by **element count**, not resolution — measured flat from
640×360 to 1920×1080, because the work is path setup rather than pixel fill.

A dense scene of 1,654 elements (563 of them filled polygons), measured on a
clean page with warmup, interleaved to rule out JIT effects:

| | ms/frame | of a 60fps budget |
|---|---|---|
| default | 8–11 ms | 50–65% |
| `seam-fix="false"` | 4–5 ms | 25–30% |

**Seam fixing roughly doubles the cost of a fill-heavy scene.** It strokes each
filled polygon with its own colour to close the antialiased hairline every 2D
rasteriser leaves between abutting shapes. If your artwork has no large
subdivided surfaces — floors, walls, ground planes — you will not see those
hairlines and should turn it off:

```html
<ivg-player src="/anim/tower.svg" seam-fix="false"></ivg-player>
```

If frames are still tight, cut element count at bake time (sharp-edge filtering
and edge chaining) rather than tuning the player — that is the lever with real
leverage.

## Gotchas

- **SVG optimisers strip `<metadata>`.** SVGO removes it by default, which
  deletes the animation and leaves a still image. Exclude these files, or set
  `removeMetadata: false`.
- **`<img>` renders the resting state, not the animation.** Images do not run
  scripts. That is the intended fallback; use the player for motion.
- **Serve it compressed.** The payload is text, and gzip is doing a lot of the
  work — uncompressed it is roughly 4× larger.
- **Bundler imports** need the URL, not the parsed contents:
  `import url from './tower.svg?url'` in Vite, or `new URL('./tower.svg', import.meta.url)`.

## Making the files

They come out of [VecBake](../README.md), a Blender add-on that bakes a 3D
scene and camera move into 2D keyframes. All the 3D work — hidden-line removal,
occlusion ordering — happens once at bake time; playback is 2D interpolation.

## Licence

MIT.
