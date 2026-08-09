// SPDX-License-Identifier: AGPL-3.0-or-later
// Lerpa -- Copyright (C) 2026 Abbas Alshalchi
// Also available under a commercial licence; see COMMERCIAL.md
/**
 * Lerpa -- interactive vector animations for the web.
 *
 * An .lerpa file is a valid SVG with its animation embedded, so it renders as a
 * picture anywhere and animates wherever this player is loaded.
 */

export { LerpaPlayer, fetchDocument, parseDocument } from './player.js';
export { LerpaPlayerElement, defineElement } from './element.js';

import { LerpaPlayer, fetchDocument } from './player.js';
import { defineElement } from './element.js';

/**
 * Load an .lerpa and attach it to a container.
 *
 * @param {string|object} source URL of an .lerpa, or an already-parsed document
 * @param {HTMLElement|HTMLCanvasElement} target element to render into
 * @param {object} [options] see LerpaPlayer
 * @returns {Promise<LerpaPlayer>}
 *
 * @example
 * const anim = await load('/anim/tower.lerpa', document.querySelector('#stage'));
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
  const player = new LerpaPlayer(canvas, doc, options);
  if (options.autoplay) player.play({ loop: !!options.loop });
  return player;
}

// Registering on import is the friendly default: dropping the script tag in is
// enough to make <lerpa-player> work. Tree-shaken out if you only import `load`.
defineElement();

export default { load, defineElement };
