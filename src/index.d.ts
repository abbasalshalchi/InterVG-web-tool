// SPDX-License-Identifier: AGPL-3.0-or-later
// InterVG -- Copyright (C) 2026 Abbas Alshalchi
// Also available under a commercial licence; see COMMERCIAL.md

/** A parsed .ivg: the artwork, the tracks, and both resting states. */
export interface IVGDocument {
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

export interface IVGPlayerOptions {
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

export interface IVGPlayOptions {
  loop?: boolean;
  /** Run the timeline backwards. Costs nothing: reversal is a time transform. */
  reverse?: boolean;
  /** Start from this time in seconds instead of the current position. */
  from?: number;
}

export interface IVGHit {
  /** The element's stable id, when the bake shipped ids. */
  id: string | null;
  group: string;
  index: number;
}

export declare class IVGPlayer {
  constructor(canvas: HTMLCanvasElement, doc: IVGDocument, options?: IVGPlayerOptions);

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
  readonly doc: IVGDocument;

  play(options?: IVGPlayOptions): this;
  /** Play backwards. No second file: reversal is a time transform. */
  reverse(options?: IVGPlayOptions): this;
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
  pick(clientX: number, clientY: number, slop?: number): IVGHit | null;

  /** A resting state as an SVG string, for cutting to static artwork. */
  state(which?: 'start' | 'end'): string | null;

  destroy(): void;
}

/** Parse an .ivg (or bare track JSON) that you already have as text. */
export declare function parseDocument(text: string): IVGDocument;

/** Fetch and parse an .ivg. */
export declare function fetchDocument(src: string, init?: RequestInit): Promise<IVGDocument>;

/**
 * Register `<ivg-player>`. Called on import of the package root; safe to call
 * again, and a no-op where `customElements` does not exist, so it does not
 * break server rendering.
 */
export declare function defineElement(tag?: string): void;

export declare class IVGPlayerElement extends HTMLElement {
  readonly player: IVGPlayer | null;
  play(options?: IVGPlayOptions): this;
  reverse(options?: IVGPlayOptions): this;
  pause(): this;
  seek(t: number): this;
  setGroupColor(group: string, css: string): this;
  pick(x: number, y: number): IVGHit | null;
  /** Hand off to the static resting state — the transition-to-DOM pattern. */
  showState(which?: 'start' | 'end'): this;
  showAnimation(): this;
}

export interface IVGLoadOptions extends IVGPlayerOptions {
  autoplay?: boolean;
  loop?: boolean;
}

/**
 * Load an .ivg and attach it to a container. Pass a canvas to draw into it, or
 * any element to have one created and sized inside it.
 */
export declare function load(
  source: string | IVGDocument,
  target: HTMLElement | HTMLCanvasElement,
  options?: IVGLoadOptions,
): Promise<IVGPlayer>;

declare const _default: { load: typeof load; defineElement: typeof defineElement };
export default _default;
