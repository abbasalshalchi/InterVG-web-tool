#!/usr/bin/env node
/**
 * ivg -- inspect and repack animated IVG .svg files.
 *
 *   npx ivg info anim/tower.svg     what is in this file, and what it costs
 *   npx ivg strip anim/tower.svg    drop the resting states (smaller, no fallback)
 *   npx ivg states anim/tower.svg   write the resting states out as plain .svg
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DATA_RE = /<metadata[^>]*id="ivg-data"[^>]*>([\s\S]*?)<\/metadata>/;

function read(file) {
  const text = readFileSync(file, 'utf8');
  const m = text.match(DATA_RE);
  if (!m) throw new Error(`${file}: no embedded IVG data (a plain SVG, not an animated one?)`);
  const json = JSON.parse(m[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, ''));
  return { text, json };
}

function kb(n) { return (n / 1024).toFixed(1) + ' KB'; }

function motionLine(json) {
  const m = json.motion;
  if (!m) return '  motion     unknown (baked before motion was recorded)';
  if (m.direction === 'in') {
    return `  motion     moves IN, x${m.scale} — play() goes wide -> close, reverse() goes close -> wide`;
  }
  if (m.direction === 'out') {
    return `  motion     moves OUT, x${m.scale} — play() goes close -> wide, reverse() goes wide -> close`;
  }
  return `  motion     little framing change (x${m.scale})`;
}

function info(file) {
  const { text, json } = read(file);
  const bytes = Buffer.byteLength(text);
  const stats = json.stats || {};
  const statesBytes = bytes - Buffer.byteLength(JSON.stringify(json));
  console.log(`${basename(file)}`);
  console.log(`  ${json.w}x${json.h}  ${json.dur.toFixed(3)}s @ ${json.fps}fps  ${json.samples} samples`);
  console.log(motionLine(json));
  console.log(`  elements   ${stats.elements ?? '?'} (${stats.strokes ?? '?'} strokes, ${stats.fills ?? '?'} fills)`);
  console.log(`  drawn/frame ${stats.drawn_peak ?? '?'} peak`);
  console.log(`  groups     ${(json.groups || []).join(', ') || '-'}`);
  console.log(`  size       ${kb(bytes)}  (${kb(gzipSync(text).length)} gzipped)`);
  console.log(`  of which resting states ~${kb(Math.max(0, statesBytes))}`);
  if (json.meta?.camera) console.log(`  camera     ${json.meta.camera}`);
}

function strip(file) {
  const { text } = read(file);
  const out = text.replace(/<g id="ivg-state-end"[\s\S]*?<\/g>\s*(?=<\/svg>)/, '');
  const target = join(dirname(file), basename(file).replace(/\.svg$/, '') + '.min.svg');
  if (target === file) throw new Error('refusing to overwrite the source file');
  writeFileSync(target, out);
  console.log(`${target}  ${kb(Buffer.byteLength(out))} (was ${kb(Buffer.byteLength(text))})`);
}

function states(file) {
  const { text, json } = read(file);
  const header = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${json.w} ${json.h}"`
    + ` width="${json.w}" height="${json.h}">`;
  for (const which of ['start', 'end']) {
    const m = text.match(new RegExp(`<g id="ivg-state-${which}"[^>]*>([\\s\\S]*?)</g>\\s*(?=<g id="ivg-state-|</svg>)`));
    if (!m) continue;
    const target = join(dirname(file), basename(file).replace(/\.svg$/, '') + `.${which}.svg`);
    writeFileSync(target, `${header}${m[1]}</svg>`);
    console.log(target);
  }
}

/** Decode one track back to per-sample values (quantised integer deltas). */
function decodeTrack(track, stride, samples) {
  if (!track || track.c !== undefined) return null;
  const q = track.q || 1;
  const d = track.d;
  const count = track.t ? track.t.length : samples;
  const acc = new Int32Array(stride);
  const out = [];
  for (let i = 0; i < count; i++) {
    const row = [];
    for (let j = 0; j < stride; j++) {
      const k = i * stride + j;
      acc[j] = i === 0 ? d[k] : acc[j] + d[k];
      row.push(acc[j] / q);
    }
    out.push(row);
  }
  return out;
}

/** Same measurement the baker records, for files baked before it existed. */
function measureMotion(json) {
  if (json.motion) return json.motion;
  let a = [Infinity, Infinity, -Infinity, -Infinity];
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  const grow = (box, pts) => {
    for (let i = 0; i < pts.length; i += 2) {
      box[0] = Math.min(box[0], pts[i]); box[1] = Math.min(box[1], pts[i + 1]);
      box[2] = Math.max(box[2], pts[i]); box[3] = Math.max(box[3], pts[i + 1]);
    }
  };
  for (const el of json.els) {
    const v = decodeTrack(el.G, el.n * 2, json.samples);
    if (!v) continue;
    grow(a, v[0]);
    grow(b, v[v.length - 1]);
  }
  const first = Math.max(a[2] - a[0], a[3] - a[1]);
  const last = Math.max(b[2] - b[0], b[3] - b[1]);
  if (!(first > 0) || !(last > 0)) return { scale: 1, direction: 'none' };
  const scale = last / first;
  return {
    scale: Math.round(scale * 1000) / 1000,
    direction: scale > 1.05 ? 'in' : scale < 0.95 ? 'out' : 'none',
  };
}

function manifest(dir) {
  const entries = readdirSync(dir)
    .filter((f) => f.endsWith('.svg'))
    .sort();
  const clips = [];
  for (const f of entries) {
    let json;
    try { ({ json } = read(join(dir, f))); } catch { continue; }  // plain SVG
    clips.push({
      file: f,
      camera: json.meta?.camera ?? null,
      from: json.from ?? json.meta?.from ?? null,
      to: json.to ?? json.meta?.to ?? null,
      duration: json.dur,
      motion: measureMotion(json),
      width: json.w,
      height: json.h,
      elements: json.stats?.elements ?? null,
    });
  }
  if (!clips.length) {
    console.error(`${dir}: no animated SVGs found`);
    process.exit(1);
  }
  const target = join(dir, 'index.json');
  writeFileSync(target, JSON.stringify({ format: 'ivg-manifest', version: 1, clips }, null, 1));
  console.log(`${target}  (${clips.length} clips)`);
  for (const c of clips) {
    console.log(`  ${c.file.padEnd(28)} moves ${c.motion.direction.padEnd(4)} x${c.motion.scale}`);
  }
}

const [command, file] = process.argv.slice(2);
const commands = { info, strip, states, manifest };
if (!command || !file || !commands[command]) {
  console.error('usage: ivg <info|strip|states> <file.svg>');
  console.error('       ivg manifest <folder>');
  process.exit(1);
}
try {
  commands[command](file);
} catch (error) {
  console.error(String(error.message || error));
  process.exit(1);
}
