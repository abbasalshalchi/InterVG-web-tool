// SPDX-License-Identifier: AGPL-3.0-or-later
// Lerpa -- Copyright (C) 2026 Abbas Alshalchi
//
// React is an optional peer, so nothing here names a React type: importing
// this file must not require @types/react to be installed.
import type { LerpaDocument, LerpaPlayer, LerpaPlayerOptions } from './index.js';

export interface LerpaProps extends LerpaPlayerOptions {
  src: string | LerpaDocument;
  autoPlay?: boolean;
  loop?: boolean;
  onLoad?: (player: LerpaPlayer) => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
  style?: unknown;
  className?: string;
  [key: string]: unknown;
}

/** Forwards a ref to the live LerpaPlayer. */
export declare const Lerpa: (props: LerpaProps & { ref?: unknown }) => unknown;
export default Lerpa;
