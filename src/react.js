/**
 * React binding.
 *
 * The custom element already works in React 19+, but older React passes every
 * prop as a string attribute and cannot listen for custom events, so this
 * drives the player directly against a canvas ref instead. No JSX here, so the
 * package needs no build step.
 *
 *   import { IVG } from 'ivg/react';
 *   <IVG src="/anim/tower.ivg" autoPlay loop />
 */

import { createElement, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { IVGPlayer, fetchDocument } from './player.js';

export const IVG = forwardRef(function IVG(props, ref) {
  const {
    src, autoPlay = false, loop = false, speed = 1, fit = 'contain',
    background = null, onLoad, onEnd, onError, style, className, ...rest
  } = props;

  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const handlers = useRef({});
  handlers.current = { onLoad, onEnd, onError };

  useEffect(() => {
    let cancelled = false;
    let player = null;

    (async () => {
      try {
        const doc = typeof src === 'string' ? await fetchDocument(src) : src;
        if (cancelled || !canvasRef.current) return;
        player = new IVGPlayer(canvasRef.current, doc, {
          fit, speed, background,
          onend: () => handlers.current.onEnd && handlers.current.onEnd(),
        });
        playerRef.current = player;
        handlers.current.onLoad && handlers.current.onLoad(player);
        if (autoPlay) player.play({ loop });
      } catch (error) {
        if (!cancelled) {
          if (handlers.current.onError) handlers.current.onError(error);
          else console.error(error);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (player) player.destroy();
      playerRef.current = null;
    };
    // re-create only when the source changes; the rest are applied live below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => { if (playerRef.current) playerRef.current.speed = speed; }, [speed]);
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    p.fit = fit;
    p.background = background;
    p.resize();
  }, [fit, background]);

  useImperativeHandle(ref, () => ({
    get player() { return playerRef.current; },
    play: (o) => playerRef.current?.play({ loop, ...o }),
    reverse: (o) => playerRef.current?.reverse({ loop, ...o }),
    pause: () => playerRef.current?.pause(),
    seek: (t) => playerRef.current?.seek(t),
    setGroupColor: (g, c) => playerRef.current?.setGroupColor(g, c),
    pick: (x, y) => playerRef.current?.pick(x, y) ?? null,
  }), [loop]);

  return createElement('canvas', {
    ref: canvasRef,
    className,
    style: { display: 'block', width: '100%', height: '100%', ...style },
    ...rest,
  });
});

export default IVG;
