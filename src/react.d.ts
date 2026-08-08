// SPDX-License-Identifier: AGPL-3.0-or-later
// InterVG -- Copyright (C) 2026 Abbas Alshalchi
//
// React is an optional peer, so nothing here names a React type: importing
// this file must not require @types/react to be installed.
import type { IVGDocument, IVGPlayer, IVGPlayerOptions } from './index.js';

export interface IVGProps extends IVGPlayerOptions {
  src: string | IVGDocument;
  autoPlay?: boolean;
  loop?: boolean;
  onLoad?: (player: IVGPlayer) => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
  style?: unknown;
  className?: string;
  [key: string]: unknown;
}

/** Forwards a ref to the live IVGPlayer. */
export declare const IVG: (props: IVGProps & { ref?: unknown }) => unknown;
export default IVG;
