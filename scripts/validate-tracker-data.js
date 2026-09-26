#!/usr/bin/env node
/* Run this before every push that touches tracker/droid-data.js or
   tracker/icons-data.js. Catches, mechanically, the two ways this data has
   actually broken in production (see memory/encoding_corruption_playbook.md
   for the incident this was written after):

   1. An orphaned duplicate data object (e.g. a regeneration script writing
      "const CARD_ICONS = {...}" instead of updating "const ICONS = {...}",
      leaving real, valid, completely unused data sitting dead in the file).
   2. A cache-busting "?v=" query param on the <script> tags that wasn't
      bumped even though the file's content changed - meaning returning
      visitors keep serving a stale copy forever.

   Exits non-zero (and prints exactly what's wrong) on either problem.
   On a clean run where the version WAS correctly bumped, it updates
   tracker/.data-manifest.json to the new baseline - commit that file
   alongside your change. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ICONS_PATH = path.join(ROOT, 'tracker/icons-data.js');
const DROID_PATH = path.join(ROOT, 'tracker/droid-data.js');
const INDEX_PATH = path.join(ROOT, 'tracker/index.html');
const MANIFEST_PATH = path.join(ROOT, 'tracker/.data-manifest.json');

let failed = false;
function fail(msg) { console.error('FAIL: ' + msg); failed = true; }
function ok(msg) { console.log('ok: ' + msg); }

const iconsCode = fs.readFileSync(ICONS_PATH, 'utf8');
const droidCode = fs.readFileSync(DROID_PATH, 'utf8');
const indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');

// --- Check 1: exactly one top-level `const NAME = {` in icons-data.js, and
// it must be named ICONS (what tracker/index.html actually reads). A second
// one - under any name - means a regeneration script wrote new data into a
// block nothing loads, exactly like the CARD_ICONS incident. ---
const topLevelConsts = [...iconsCode.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=/gm)];
if (topLevelConsts.length !== 1) {
  fail(`icons-data.js has ${topLevelConsts.length} top-level const declarations ` +
       `(${topLevelConsts.map(m => m[1]).join(', ')}) - expected exactly 1 named ICONS. ` +
       `A second one is almost certainly orphaned data nothing loads.`);
} else if (topLevelConsts[0][1] !== 'ICONS') {
  fail(`icons-data.js's only top-level const is named "${topLevelConsts[0][1]}", ` +
       `but tracker/index.html reads "ICONS". Rename it or nothing will render.`);
} else {
  ok('icons-data.js declares exactly one top-level const, named ICONS');
}

// --- Check 2: every (cycle, level, slot) droid-data.js's CYCLES implies
// must exist in ICONS with a value that decodes as a real WEBP image. ---
const ctx = vm.createContext({});
vm.runInContext(droidCode, ctx);
vm.runInContext(iconsCode, ctx);

const CYCLES = vm.runInContext('typeof CYCLES !== "undefined" ? CYCLES : null', ctx);
const ICONS = vm.runInContext('typeof ICONS !== "undefined" ? ICONS : null', ctx);

if (!CYCLES) {
  fail('droid-data.js did not define CYCLES (or icons-data.js threw before it could run)');
} else if (!ICONS) {
  fail('ICONS is not defined after evaluating icons-data.js (see Check 1)');
} else {
  const missing = [];
  const invalid = [];
  let checkedCount = 0;
  for (const cycleKey of Object.keys(CYCLES)) {
    const levels = CYCLES[cycleKey];
    levels.forEach((level, levelIdx) => {
      level.forEach((slot, slotIdx) => {
        const name = slot[1];
        if (name === '?' || name === undefined) return; // unfilled placeholder level, not required yet
        checkedCount++;
        const key = `${cycleKey}-${levelIdx + 1}-${slotIdx}`;
        const b64 = ICONS[key];
        if (b64 === undefined) {
          missing.push(key);
          return;
        }
        const buf = Buffer.from(b64, 'base64');
        const isWebp = buf.length >= 12 &&
          buf.toString('ascii', 0, 4) === 'RIFF' &&
          buf.toString('ascii', 8, 12) === 'WEBP';
        if (!isWebp) invalid.push(key);
      });
    });
  }
  if (missing.length) {
    fail(`${missing.length}/${checkedCount} required icon keys are missing from ICONS: ` +
         missing.slice(0, 15).join(', ') + (missing.length > 15 ? ', ...' : ''));
  } else {
    ok(`all ${checkedCount} required icon keys are present in ICONS`);
  }
  if (invalid.length) {
    fail(`${invalid.length} icon values don't decode as valid WEBP: ` + invalid.slice(0, 15).join(', '));
  } else if (!missing.length) {
    ok('every required icon value decodes as a valid WEBP image');
  }
}

// --- Check 3: cache-busting ?v= on both <script> tags must match each
// other, and must have changed since the last commit if the data changed. ---
const iconsVerMatch = indexHtml.match(/icons-data\.js\?v=([\w.]+)/);
const droidVerMatch = indexHtml.match(/droid-data\.js\?v=([\w.]+)/);
if (!iconsVerMatch || !droidVerMatch) {
  fail('could not find ?v= version query on the icons-data.js/droid-data.js <script> tags in tracker/index.html');
} else {
  const iconsVer = iconsVerMatch[1];
  const droidVer = droidVerMatch[1];
  if (iconsVer !== droidVer) {
    fail(`icons-data.js is stamped ?v=${iconsVer} but droid-data.js is ?v=${droidVer} - keep them in sync`);
  } else {
    ok(`both data scripts are stamped ?v=${iconsVer}`);
  }

  const hash = crypto.createHash('sha256').update(iconsCode).update(droidCode).digest('hex');
  let manifest = null;
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch (e) { /* first run */ }

  if (!manifest) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ version: iconsVer, sha256: hash }, null, 2) + '\n');
    ok(`no manifest found - created tracker/.data-manifest.json at version ${iconsVer}. Commit it.`);
  } else if (manifest.sha256 === hash) {
    ok('icons-data.js/droid-data.js content unchanged since last recorded version - nothing to bump');
  } else if (manifest.version === iconsVer) {
    fail(`icons-data.js and/or droid-data.js content changed since version ${manifest.version} was ` +
         `recorded, but the ?v= query wasn't bumped. Returning visitors will keep serving the stale ` +
         `copy forever (see memory/encoding_corruption_playbook.md, "stale cache-buster" section). ` +
         `Bump ?v= on BOTH <script> tags in tracker/index.html, then re-run this script.`);
  } else {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ version: iconsVer, sha256: hash }, null, 2) + '\n');
    ok(`content changed and version was correctly bumped (${manifest.version} -> ${iconsVer}). ` +
       `Updated tracker/.data-manifest.json - commit it alongside your change.`);
  }
}

if (failed) {
  console.error('\nvalidate-tracker-data.js: FAILED - do not push until these are fixed.');
  process.exit(1);
} else {
  console.log('\nvalidate-tracker-data.js: all checks passed.');
}
