// SPDX-License-Identifier: AGPL-3.0-or-later
// InterVG -- Copyright (C) 2026 Abbas Alshalchi
// Also available under a commercial licence; see COMMERCIAL.md
/**
 * IVG -- interactive vector animations for the web.
 *
 * An .ivg file is a valid SVG with its animation embedded, so it renders as a
 * picture anywhere and animates wherever this player is loaded.
 */

export { IVGPlayer, fetchDocument, parseDocument } from './player.js';
export { IVGPlayerElement, defineElement } from './element.js';

import { IVGPlayer, fetchDocument } from './player.js';
import { defineElement } from './element.js';

/**
 * Load an .ivg and attach it to a container.
 *
 * @param {string|object} source URL of an .ivg, or an already-parsed document
 * @param {HTMLElement|HTMLCanvasElement} target element to render into
 * @param {object} [options] see IVGPlayer
 * @returns {Promise<IVGPlayer>}
 *
 * @example
 * const anim = await load('/anim/tower.ivg', document.querySelector('#stage'));
 * anim.play({ loop: true });
 */
export async function load(source, target, options = {}) {
  const doc = typeof source === 'string' ? await fetchDocument(source) : source;

  let canvas = target;
  if (!(target instanceof HTMLCanvasElement)) {
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    if (!target.style.position) target.style.position = 'relative';
    target.appendChild(canvas);
  }
  const player = new IVGPlayer(canvas, doc, options);
  if (options.autoplay) player.play({ loop: !!options.loop });
  return player;
}

// Registering on import is the friendly default: dropping the script tag in is
// enough to make <ivg-player> work. Tree-shaken out if you only import `load`.
defineElement();

export default { load, defineElement };
