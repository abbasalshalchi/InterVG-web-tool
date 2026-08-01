#!/usr/bin/env node
/**
 * ivg -- inspect and repack animated IVG .svg files.
 *
 *   npx ivg info anim/tower.svg     what is in this file, and what it costs
 *   npx ivg strip anim/tower.svg    drop the resting states (smaller, no fallback)
 *   npx ivg states anim/tower.svg   write the resting states out as plain .svg
 */

import { readFileSync, writeFileSync } from 'node:fs';
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

function info(file) {
  const { text, json } = read(file);
  const bytes = Buffer.byteLength(text);
  const stats = json.stats || {};
  const statesBytes = bytes - Buffer.byteLength(JSON.stringify(json));
  console.log(`${basename(file)}`);
  console.log(`  ${json.w}x${json.h}  ${json.dur.toFixed(3)}s @ ${json.fps}fps  ${json.samples} samples`);
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

const [command, file] = process.argv.slice(2);
const commands = { info, strip, states };
if (!command || !file || !commands[command]) {
  console.error('usage: ivg <info|strip|states> <file.svg>');
  process.exit(1);
}
try {
  commands[command](file);
} catch (error) {
  console.error(String(error.message || error));
  process.exit(1);
}
