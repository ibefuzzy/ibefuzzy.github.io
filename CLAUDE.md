# ibefuzzy.github.io — notes for Claude

GitHub Pages user site. Root `index.html` is a landing page; `tracker/` is a
standalone web port of the Fuzzy-Droid-Tracker Electron app (see the sibling
repo `ibefuzzy/Fuzzy-Droid-Tracker` for the desktop version and its own
CLAUDE.md — the two are kept in sync manually, not shared code). Deploys are
automatic: whatever lands on `main` is what's live at the site's URL within
about a minute. There is no staging branch and no build step — a bad push is
a bad live site immediately.

## Layout
- `index.html` — landing page.
- `tracker/index.html` — the whole web tracker app: one file, inline
  `<style>`/`<script>`, no build tooling.
- `tracker/droid-data.js`, `tracker/icons-data.js` — data files loaded via
  `<script src="....js?v=X.Y.Z">` at the bottom of `tracker/index.html`.
  `icons-data.js` is large (6+MB) — it's a `const ICONS = {...}` map of
  `"cycle-level-slot": "<base64 webp>"`.

## Rules
- **Bump the `?v=` query param on `icons-data.js` and `droid-data.js` every
  time either file's content changes.** These are the only cache-busting
  mechanism for two files browsers otherwise cache indefinitely by URL. As of
  2026-09-26 this had been frozen at `?v=1.7.1` since v1.7.1 while both files
  were updated across 8+ releases (through v1.10.8) — meaning every returning
  visitor kept serving whichever copy their browser first cached, silently,
  forever. Symptom when this is the bug: new content (a droid's name, an
  added row) shows up but that same content's *image/icon* doesn't, and it's
  identical on desktop and mobile, and survives a normal reload — because a
  version-stamped URL that hasn't changed isn't something "hard refresh"
  reliably re-fetches, and mobile browsers mostly have no hard-refresh at
  all. Check this BEFORE suspecting the data itself or the deploy.
- **Never open/save these files without pinning `encoding='utf-8'`
  explicitly**, especially from any Windows-side script or tool. See
  `memory/encoding_corruption_playbook.md` for exactly why and what it looks
  like when this goes wrong — this has already happened once (v1.10.8) and
  cost an entire debugging session before it was correctly diagnosed.
- If you're staring at literal `�` characters, garbled `â€™`/`â€"`-style
  text, or a bug report describing "broken text" / "wrong characters" /
  "mojibake" on this site, stop and read
  `memory/encoding_corruption_playbook.md` before doing anything else. It is
  a specific, mechanical diagnosis — not a "clear cache and see" situation.

## Testing
No test suite in this repo. Sanity-check a change by serving the directory
locally (`python3 -m http.server` or similar) and opening `tracker/`, or by
diffing the pushed file's raw bytes against the previous commit for anything
unexpected outside the lines you intended to touch — see the playbook for
the exact byte-level checks worth running before any push that touches
`tracker/index.html`.
