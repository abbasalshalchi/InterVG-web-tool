// Part-explorer API: group opacity, isolation, bounds and framing.
//
//   node test/parts.mjs
//
// Exercised against stub elements rather than a parsed document, so it needs
// no canvas and no DOM. The methods under test never touch either -- that is
// why groupBounds writes into its own probe buffer instead of the shared
// scratch the renderer is using.
//
// The invariant that matters for a turntable: a part swings across the frame
// as the model rotates, so bounds must be a function of time. A framing that
// ignores time drifts off the part within a few degrees of rotation.

import { LerpaPlayer } from '../src/player.js';

let fails = 0;
const check = (label, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  if (!cond) fails++;
};

// a square that slides right as t advances -- a part on a turntable
const movingSquare = (x0, y0, size, drift) => ({
  points(t, buf, off) {
    const x = x0 + drift * t, y = y0;
    buf[off] = x;            buf[off + 1] = y;
    buf[off + 2] = x + size; buf[off + 3] = y;
    buf[off + 4] = x + size; buf[off + 5] = y + size;
    buf[off + 6] = x;        buf[off + 7] = y + size;
  },
});

const el = (group, id, geo) => ({
  id, group, npts: 4, geo, kind: 1, alpha: 0, offset: 0,
  opacity: null, depth: null, shade: null, closed: true, cssKey: -1,
});

function player() {
  const p = Object.create(LerpaPlayer.prototype);
  p.groups = ['dish', 'boom'];
  p.elements = [
    el('dish', 'dish#1', movingSquare(10, 10, 20, 100)),
    el('boom', 'boom#1', movingSquare(60, 40, 10, 100)),
  ];
  p.groupAlphas = new Map();
  p.elementAlphas = new Map();
  p.time = 0;
  p._probe = null;
  p._invalidate = () => {};
  p.render = () => {};
  return p;
}

let p = player();
check('no override means full opacity', p._alphaScale(p.elements[0]) === 1);

p.setGroupOpacity('dish', 0);
check('a group can be hidden outright', p._alphaScale(p.elements[0]) === 0);
check('...without touching its neighbours', p._alphaScale(p.elements[1]) === 1);

p.setGroupOpacity('dish', null);
check('null clears the override', p._alphaScale(p.elements[0]) === 1);

p.setElementOpacity('dish#1', 0.25);
p.setGroupOpacity('dish', 1);
check('an element override beats its group', p._alphaScale(p.elements[0]) === 0.25);

p = player();
p.isolateGroups('dish');
check('isolating keeps the chosen group', p._alphaScale(p.elements[0]) === 1);
check('...and hides the rest', p._alphaScale(p.elements[1]) === 0);

p.isolateGroups('dish', 0.15);
check('a rest level dims instead of hiding', p._alphaScale(p.elements[1]) === 0.15);

p.isolateGroups(null);
check('null restores everything',
      p._alphaScale(p.elements[0]) === 1 && p._alphaScale(p.elements[1]) === 1);

p = player();
const b0 = p.groupBounds('dish', 0);
check('bounds of a group at t=0',
      b0.x === 10 && b0.y === 10 && b0.w === 20 && b0.h === 20, JSON.stringify(b0));

const b1 = p.groupBounds('dish', 1);
check('bounds MOVE with time -- the turntable case',
      b1.x === 110 && b1.w === 20, JSON.stringify(b1));

const both = p.groupBounds(['dish', 'boom'], 0);
check('several groups union into one box',
      both.x === 10 && both.w === 60, JSON.stringify(both));

check('an unknown group has no bounds', p.groupBounds('nope', 0) === null);

p.setGroupOpacity('dish', 0);
check('bounds answer for hidden groups too, so you can frame before revealing',
      p.groupBounds('dish', 0) !== null);

p = player();
p.canvas = { width: 400, height: 400 };
p.dpr = 1;
p.frameGroup('dish', { padding: 0 });
check('framing scales the part to the canvas', p.scaleX === 20, `scaleX=${p.scaleX}`);
check('...and centres it',
      p.offX + 20 * p.scaleX === 200 && p.offY + 20 * p.scaleY === 200,
      `offX=${p.offX} offY=${p.offY}`);

p.time = 1;
p.frameGroup('dish', { padding: 0 });
check('re-framing follows the part as it turns',
      p.offX + 120 * p.scaleX === 200, `offX=${p.offX}`);

check('framing an absent group is a no-op, not a crash', p.frameGroup('nope') === null);

console.log(`\n${fails} failure(s)`);
process.exit(fails ? 1 : 0);
