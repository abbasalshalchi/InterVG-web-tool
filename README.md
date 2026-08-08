# IVG

**Interactive vector animations that are just SVG files.**

An IVG file is a real `.svg`. Open it, drop it in an `<img>`, put it in Figma —
it renders, because it is a normal SVG showing the resting state. Load this
player and the same file becomes an animation, because the keyframes ride along
inside it in a `<metadata>` block.

That means no new file extension, no MIME configuration, no build plugin, and
no broken image if JavaScript never runs.

```bash
npm install intervg
```

---

## Use it

### Plain HTML

```html
<script type="module" src="https://unpkg.com/intervg"></script>

<ivg-player src="/anim/tower.svg" autoplay loop style="height:320px"></ivg-player>
```

`<ivg-player>` is a custom element, so it behaves identically in Vue, Svelte,
Angular, Astro, plain HTML and React 19+.

### Vue

```vue
<script setup>
import 'intervg';
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

### Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vue: { template: { compilerOptions: { isCustomElement: (tag) => tag === 'ivg-player' } } },
})
```

The package is safe to import from a server-rendered component — it does not
touch `HTMLElement` or `customElements` until the browser registers the element.
Reference the file by URL rather than importing its contents:

```js
import towerUrl from '~/assets/anim/tower.svg?url';
```

### React

React 18 and earlier cannot set properties or listen for events on custom
elements, so use the binding:

```jsx
import { IVG } from 'intervg/react';

<IVG src="/anim/tower.svg" autoPlay loop onEnd={() => console.log('done')} />
```

### Any framework, imperative

```js
import { load } from 'intervg';

const anim = await load('/anim/tower.svg', document.querySelector('#stage'));
anim.play({ loop: true });
```

---

## Choosing a clip, and which way to play it

**A filename never tells you which way a camera moves.** `tower.bts_cam.svg`
could be a move towards the cabinet or away from it, and guessing gives you a
transition that runs backwards — which reads as broken artwork rather than
broken wiring. Do not infer it from the name. Ask:

```bash
npx ivg info anim/tower.bts_cam.svg
#   motion     moves OUT, x0.42 — play() goes close -> wide, reverse() goes wide -> close
```

So for that file, zooming *out* of the cabinet is `play()`, and zooming *in* is
`reverse()`. Every clip carries this in its metadata, readable at runtime:

```js
anim.doc.motion   // { scale: 0.42, direction: 'out' }
```

For a set of clips, generate an index once and drive your UI from it instead of
from a hand-written filename map:

```bash
npx ivg manifest anim/          # writes anim/index.json
```

```js
import manifest from '~/assets/anim/index.json';

function clipFor(from, to) {
  // label your cameras in Blender with vecbake_from / vecbake_to custom
  // properties and this becomes an exact lookup
  const clip = manifest.clips.find((c) => c.from === from && c.to === to);
  if (clip) return { src: clip.file, reverse: false };

  const back = manifest.clips.find((c) => c.from === to && c.to === from);
  return back ? { src: back.file, reverse: true } : null;
}
```

VecBake writes `index.json` for you as soon as a folder holds more than one
clip. A single clip gets none — the `.svg` is self-contained, so there is
nothing to look up.

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
npx ivg info anim/tower.svg     # size, elements, samples, and which way it moves
npx ivg manifest anim/          # index.json for a folder of clips
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

The four that bite hardest, in the order people hit them:

1. **Do not guess playback direction from a filename.** Run `npx ivg info` or
   read `doc.motion`. See [above](#choosing-a-clip-and-which-way-to-play-it).
2. **Already have your own resting-state artwork?** Then the states embedded in
   each file are dead weight — often half the payload. `npx ivg strip file.svg`
   removes them.
3. **`seam-fix` defaults on and roughly doubles frame cost** on fill-heavy
   artwork. Turn it off unless you can see hairlines between abutting shapes.
4. **A few sparse samples interpolate linearly.** If the bake used a large frame
   step, a curved camera path visibly cuts corners between keys. `npx ivg info`
   prints the sample count; single digits over half a second is coarse.

### Everything else

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

## Releasing

Publishing happens in CI, and there is **no npm token** — not in a secret, not
anywhere. npm trusts this repository and [this workflow](.github/workflows/publish.yml)
by name, and the runner proves it is them with a short-lived OIDC token minted for
that one run. Nothing long-lived exists to leak, expire, or rotate.

That is also where **provenance** comes from: the signed record of which repo and
commit a tarball was built from, which npm checks against a public transparency
log and shows on the package page. On this path it is automatic — `--provenance`
is not passed, because it would be redundant.

One-time setup, on npmjs.com under the package's **Settings -> Trusted Publisher**:

| | |
|---|---|
| Repository | `abbasalshalchi/InterVG-web-tool` |
| Workflow filename | `publish.yml` |

**The first version is the awkward one.** That settings page only exists once the
package does, and `npm trust` says the same — *"the package you're configuring must
already exist on the npm registry"*. npm has no equivalent of PyPI's pending
publishers. So version one goes out by hand, with an interactive login and your
normal 2FA, and every version after it comes from CI:

```bash
npm login
```

```bash
npm publish --access public
```

Then configure the trusted publisher, and from then on:

```bash
npm version patch      # or minor / major — writes package.json and tags
```

```bash
git push --follow-tags
```

Draft a GitHub release on that tag and publish it. The workflow refuses to continue
if the tag and `package.json` disagree, because a mislabelled version cannot be
taken back. For a release with no tag, run the workflow by hand from the **Actions**
tab instead.

Do not create an access token with *Bypass two-factor authentication* for this. npm
warns against it on the token page itself, and trusted publishing exists precisely
so that nobody needs one.

`prepublishOnly` imports the package on Node with no DOM before anything ships. It
catches a broken export map and anything reaching for `HTMLElement` at module
scope, which is the failure that breaks server rendering before a component runs.

## Licence

**AGPL-3.0-or-later** — see [LICENSE](./LICENSE). Free to use in open-source
projects, personal work and evaluation.

Shipping it inside a closed-source product needs a **commercial licence**, which
lifts the AGPL's source-disclosure requirement. See [COMMERCIAL.md](./COMMERCIAL.md).

**The `.svg` files you bake are yours.** Output carries no obligation from this
project — only the runtime is licensed.
