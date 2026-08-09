// SPDX-License-Identifier: AGPL-3.0-or-later
// Lerpa -- Copyright (C) 2026 Abbas Alshalchi
// Also available under a commercial licence; see COMMERCIAL.md

/** A parsed .lerpa: the artwork, the tracks, and both resting states. */
export interface LerpaDocument {
  /** Author-space width in pixels. Drawing is scaled to the canvas from this. */
  w: number;
  h: number;
  /** Seconds. */
  dur: number;
  fps: number;
  groups?: string[];
  colors?: string[];
  bg?: string | null;
  /** The resting states, as standalone SVG strings. */
  states?: { start?: string; end?: string } | null;
  els: unknown[];
  [key: string]: unknown;
}

export interface LerpaPlayerOptions {
  /** CSS colour painted before each frame. Defaults to the file's own. */
  background?: string | null;
  /** How the drawing fits the canvas. Default `'contain'`. */
  fit?: 'contain' | 'cover' | 'stretch';
  /** Playback rate multiplier. Default `1`. */
  speed?: number;
  /** Multiplies every stroke width, for hairlines on dense scenes. Default `1`. */
  lineScale?: number;
  /**
   * Stroke each fill in its own colour to close the antialiasing hairline
   * between abutting polygons. On by default; every 2D rasteriser needs it.
   */
  seamFix?: boolean;
  seamWidth?: number;
  /** Fires when a non-looping run reaches the end. */
  onend?: (() => void) | null;
  /** Re-fit on container resize via ResizeObserver. On by default. */
  autoResize?: boolean;
}

export interface LerpaPlayOptions {
  loop?: boolean;
  /** Run the timeline backwards. Costs nothing: reversal is a time transform. */
  reverse?: boolean;
  /** Start from this time in seconds instead of the current position. */
  from?: number;
}

export interface LerpaHit {
  /** The element's stable id, when the bake shipped ids. */
  id: string | null;
  group: string;
  index: number;
}

export declare class LerpaPlayer {
  constructor(canvas: HTMLCanvasElement, doc: LerpaDocument, options?: LerpaPlayerOptions);

  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  /** Seconds. */
  readonly duration: number;
  readonly fps: number;
  readonly groups: string[];
  /** Current position in seconds. */
  time: number;
  playing: boolean;
  speed: number;
  lineScale: number;
  /** Elements drawn in the last frame, after culling. */
  readonly visible: number;

  /** The parsed document, including `doc.motion` — which way the camera moved. */
  readonly doc: LerpaDocument;

  play(options?: LerpaPlayOptions): this;
  /** Play backwards. No second file: reversal is a time transform. */
  reverse(options?: LerpaPlayOptions): this;
  pause(): this;
  /** Jump to a time in seconds and paint it. */
  seek(t: number): this;
  /** Paint one frame without touching playback state. */
  render(t: number): void;
  /** Re-read the canvas size and re-fit. Called for you unless autoResize is off. */
  resize(): void;

  /** Recolour every element in a group. Live data binding, no re-bake. */
  setGroupColor(group: string, css: string): this;
  setElementColor(id: string, css: string): this;
  /** Recolour one palette swatch, and everything drawn in it. */
  setColor(index: number, css: string): this;

  /**
   * Hit-test in client coordinates. Tests the curve, not the polyline, so it
   * matches what the viewer can see.
   */
  pick(clientX: number, clientY: number, slop?: number): LerpaHit | null;

  /** A resting state as an SVG string, for cutting to static artwork. */
  state(which?: 'start' | 'end'): string | null;

  destroy(): void;
}

/** Parse an .lerpa (or bare track JSON) that you already have as text. */
export declare function parseDocument(text: string): LerpaDocument;

/** Fetch and parse an .lerpa. */
export declare function fetchDocument(src: string, init?: RequestInit): Promise<LerpaDocument>;

/**
 * Register `<lerpa-player>`. Called on import of the package root; safe to call
 * again, and a no-op where `customElements` does not exist, so it does not
 * break server rendering.
 */
export declare function defineElement(tag?: string): void;

export declare class LerpaPlayerElement extends HTMLElement {
  readonly player: LerpaPlayer | null;
  play(options?: LerpaPlayOptions): this;
  reverse(options?: LerpaPlayOptions): this;
  pause(): this;
  seek(t: number): this;
  setGroupColor(group: string, css: string): this;
  pick(x: number, y: number): LerpaHit | null;
  /** Hand off to the static resting state — the transition-to-DOM pattern. */
  showState(which?: 'start' | 'end'): this;
  showAnimation(): this;
}

export interface LerpaLoadOptions extends LerpaPlayerOptions {
  autoplay?: boolean;
  loop?: boolean;
}

/**
 * Load an .lerpa and attach it to a container. Pass a canvas to draw into it, or
 * any element to have one created and sized inside it.
 */
export declare function load(
  source: string | LerpaDocument,
  target: HTMLElement | HTMLCanvasElement,
  options?: LerpaLoadOptions,
): Promise<LerpaPlayer>;

declare const _default: { load: typeof load; defineElement: typeof defineElement };
export default _default;
