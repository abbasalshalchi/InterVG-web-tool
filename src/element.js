// SPDX-License-Identifier: AGPL-3.0-or-later
// InterVG -- Copyright (C) 2026 Abbas Alshalchi
// Also available under a commercial licence; see COMMERCIAL.md
/**
 * <ivg-player> -- a custom element, so it works the same in Vue, Svelte,
 * Angular, plain HTML, and React 19+ without a framework-specific wrapper.
 *
 *   <ivg-player src="/anim/tower.ivg" autoplay loop></ivg-player>
 *
 * It renders the embedded resting state immediately, before the animation data
 * has even been parsed, so there is never an empty box while a file loads --
 * the container carries a real picture for exactly this reason.
 */

import { IVGPlayer, fetchDocument } from './player.js';

// `class X extends HTMLElement` is evaluated at import time, so on a server
// (Nuxt, Next, SvelteKit, Astro — anything that renders on Node) merely
// importing this module would throw `HTMLElement is not defined` before any
// component ran. Extending a stand-in keeps the import side-effect free off the
// browser; the element is only ever registered and instantiated by
// defineElement(), which already no-ops without `customElements`.
const ElementBase = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

const TEMPLATE = `
  <style>
    :host { display: block; position: relative; contain: content; }
    :host([hidden]) { display: none; }
    canvas, .state { position: absolute; inset: 0; width: 100%; height: 100%; }
    .state { display: grid; place-items: stretch; }
    .state svg { width: 100%; height: 100%; }
    canvas { display: block; }
    :host(:not([data-ready])) canvas { visibility: hidden; }
    :host([data-ready]) .state { display: none; }
  </style>
  <div class="state" part="state"></div>
  <canvas part="canvas"></canvas>
`;

export class IVGPlayerElement extends ElementBase {
  static get observedAttributes() {
    return ['src', 'autoplay', 'loop', 'speed', 'fit', 'background', 'seam-fix'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = TEMPLATE;
    this._canvas = this.shadowRoot.querySelector('canvas');
    this._stateHost = this.shadowRoot.querySelector('.state');
    this.player = null;
    this._token = 0;
  }

  connectedCallback() {
    if (!this.hasAttribute('src')) return;
    this._load(this.getAttribute('src'));
  }

  disconnectedCallback() {
    if (this.player) { this.player.destroy(); this.player = null; }
    this.removeAttribute('data-ready');
  }

  attributeChangedCallback(name, oldValue, value) {
    if (oldValue === value) return;
    if (name === 'src') { if (this.isConnected) this._load(value); return; }
    if (!this.player) return;
    if (name === 'speed') this.player.speed = parseFloat(value) || 1;
    if (name === 'background') { this.player.background = value || null; this.player.render(this.player.time); }
    if (name === 'fit') { this.player.fit = value || 'contain'; this.player.resize(); }
    if (name === 'seam-fix') {
      this.player.seamFix = value !== 'false';
      this.player.render(this.player.time);
    }
  }

  async _load(src) {
    const token = ++this._token;
    this.removeAttribute('data-ready');
    try {
      const doc = await fetchDocument(src);
      if (token !== this._token) return;               // a newer src won the race

      // paint the resting state first: something real is on screen before the
      // player has done any work
      if (doc.states && doc.states.start) this._stateHost.innerHTML = doc.states.start;

      if (this.player) this.player.destroy();
      this.player = new IVGPlayer(this._canvas, doc, {
        fit: this.getAttribute('fit') || 'contain',
        speed: parseFloat(this.getAttribute('speed')) || 1,
        background: this.getAttribute('background') || null,
        seamFix: this.getAttribute('seam-fix') !== 'false',
        onend: () => this.dispatchEvent(new CustomEvent('end')),
      });
      this.setAttribute('data-ready', '');
      this.dispatchEvent(new CustomEvent('load', { detail: { player: this.player } }));
      if (this.hasAttribute('autoplay')) this.play();
    } catch (error) {
      this.dispatchEvent(new CustomEvent('error', { detail: { error } }));
      if (!this.hasAttribute('quiet')) console.error(error);
    }
  }

  // --- the API mirrors the player, so the element is not a dead end ---------

  play(options = {}) {
    this.player?.play({ loop: this.hasAttribute('loop'), ...options });
    return this;
  }
  reverse(options = {}) {
    this.player?.reverse({ loop: this.hasAttribute('loop'), ...options });
    return this;
  }
  pause() { this.player?.pause(); return this; }
  seek(t) { this.player?.seek(t); return this; }
  setGroupColor(group, css) { this.player?.setGroupColor(group, css); return this; }
  setElementColor(id, css) { this.player?.setElementColor(id, css); return this; }
  pick(x, y) { return this.player ? this.player.pick(x, y) : null; }

  /** Swap the canvas for the real, interactive SVG of a resting state. */
  showState(which = 'end') {
    const markup = this.player?.state(which);
    if (!markup) return this;
    this._stateHost.innerHTML = markup;
    this.removeAttribute('data-ready');
    return this;
  }
  showAnimation() { this.setAttribute('data-ready', ''); return this; }

  get duration() { return this.player ? this.player.duration : 0; }
  get currentTime() { return this.player ? this.player.time : 0; }
  set currentTime(t) { this.seek(t); }
}

let defined = false;

/** Register <ivg-player>. Safe to call repeatedly. */
export function defineElement(tag = 'ivg-player') {
  if (defined || typeof customElements === 'undefined') return;
  if (!customElements.get(tag)) customElements.define(tag, IVGPlayerElement);
  defined = true;
}
