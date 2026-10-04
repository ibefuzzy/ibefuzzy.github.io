# ibefuzzy.github.io — notes for Claude

GitHub Pages user site. Root `index.html` is a landing page; `tracker/` is a
standalone web port of the Fuzzy-Droid-Tracker Electron app (see the sibling
repo `ibefuzzy/Fuzzy-Droid-Tracker` for the desktop version and its own
CLAUDE.md — the two are kept in sync manually, not shared code). Deploys are
automatic: whatever lands on `main` is what's live at the site's URL within
about a minute. There is no staging branch and no build step — a bad push is
a bad live site immediately.

## Layout
- `index.html` — landing page (redesigned 2026-10-01, the app's "holo console" look: corner-bracket
  panels, Rajdhani + IBM Plex Mono like the tracker). **No number on it is typed in:** the stats strip
  and the "what it does" sentence are filled from `tracker/droid-data.js` by an inline script (cycles,
  real levels = first slot not '?', droids, `RARITY_ORDER`), and the version in the badge / download
  button comes from GitHub's `releases/latest` (silent if unreachable). It loads
  `tracker/droid-data.js?v=X`: **keep that `?v=` equal to the one on `tracker/index.html`'s tags** (the
  validator checks it, Check 3b). Downloads: Windows `.exe` only (no Mac/Linux build has ever been
  published, though package.json has those targets), everyone else goes to the web tracker.
  Don't advertise a feature on this page until its release is published.
- `assets/overlay-*.webp` — the four overlay pictures on the landing page: the REAL overlay pages
  (Fuzzy-Droid-Tracker repo) rendered in headless Chromium with a mock `overlayAPI` and fake progress
  (cycle 1, rebirth 22) on a game-like backdrop. Re-render them if an overlay's look changes.
- `tracker/index.html` — the whole web tracker app: one file, inline
  `<style>`/`<script>`, no build tooling.
- `tracker/droid-data.js`, `tracker/icons-data.js` — data files loaded via
  `<script src="....js?v=X.Y.Z">` at the bottom of `tracker/index.html`.
  `icons-data.js` is large (6+MB) — it's a `const ICONS = {...}` map of
  `"cycle-level-slot": "<base64 webp>"`.

## Rules
- **Run `node scripts/validate-tracker-data.js` before every push that
  touches `tracker/droid-data.js` or `tracker/icons-data.js`, and fix
  everything it reports before pushing.** It mechanically checks for the two
  ways this data has actually broken production: an orphaned duplicate data
  object (a regeneration script writing its output into a new, never-loaded
  variable instead of the one `index.html` reads — see Bug type C in
  `memory/encoding_corruption_playbook.md`) and a stale, un-bumped
  cache-busting version. On success it updates `tracker/.data-manifest.json`
  — commit that file alongside your change; that's what lets the next run
  detect "content changed, version didn't."
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
  all. Check this BEFORE suspecting the data itself or the deploy. (The
  validate script now catches this automatically — see above.)
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

## Synced from the desktop app (2026-09-29, desktop v1.15.1)
- **App looks:** `APP_LOOKS` in a `<head>` script of `tracker/index.html` is a hand
  copy of the desktop app's `requirements.js` APP_LOOKS (13 looks). Keep them in
  sync. A look only sets `--bg-rgb`, `--accent-rgb`, `--glow2-rgb` and the hex vars
  (`--panel`, `--line`, `--text`, …); new CSS must use those variables, not the
  default green literals. The pick is saved in localStorage `rebirth-appLook`;
  the 🎨 Look toolbar button opens the picker.
- **Credit costs:** `REBIRTH_CREDITS` at the end of `tracker/droid-data.js` (same
  block as the desktop app's), shown under each level number in By Rebirth Level
  (`rebirthCreditsFor` / `formatCredits` in index.html, the game's coin via
  `--credit-coin`).
- **Timers** match the desktop app: Stellar :05/:35, Mythic :55, Kyber hourly :15
  (replaced Galactic), Mission every 35 min from the same epoch.
- **Kyber** is emerald `#50c878` with the same per-rarity rules as the desktop app;
  cycle completion counts real slots (`cycleRealSlotCount`, 120 today), not 105.
- Data scripts are stamped `?v=1.18.0` (validator passes).
- **Droid pictures = the desktop app's** (2026-10-04, desktop v1.18.0): `tracker/icons-data.js` `ICONS`
  is exactly the app's `card-icons-data.js` `CARD_ICONS`, all 600 slots. This fixed LO (its 1-8-1 and
  2-34-1 showed the neighbouring Hov-R / RIC; LO had only old crops) and replaced the 75 Kyber pictures
  with the clean cut-outs the app has had since v1.11.0. When the app's pictures change, copy
  CARD_ICONS over (same keys, keep the one `const ICONS = {` object) and bump the stamps.
- **Phones (≤700px): bottom tab bar** (`body.tabbed`, set by `applyTabMode()` from a
  matchMedia): 🎯 Up next / 📋 Droids / 🧬 Reqs / ♻ Retire / ⏱ Timers / ⋯ More (a sheet
  with Sneak, Look, Background, Rename, Export, Import, How to use, Reset). `TAB_VIEWS`
  lists each view's elements; `setTab()` marks them `.tab-on`/`.tab-off` (a new view =
  one entry there). Wider screens keep the old layout untouched. Last tab saved as
  `rebirth-phoneTab`; the timers only tick while their tab is open.
- **🎯 Up next** (`#upNextCard`, `renderUpNext()`, re-rendered by `renderList()`): the next
  4 rebirths after `retireCurrentLevel` (same `rebirth-currentLevel` as Safe to Retire),
  credit chips, droids; − / + stepper and cycle select. A toolbar toggle on computers
  (`rebirth-showUpNext`), the home tab on phones.
- **Rarity on each droid** (🎨 Look → "Picture color" / "Written under the name", a
  player's idea): `html.rarity-text`, from localStorage `rebirth-rarityStyle`, set in
  `<head>`. `.rar-label` spans are always rendered and hidden unless that class is on.
- **Add to Home Screen:** `tracker/manifest.webmanifest` + `tracker/icons/` (icon.svg is
  the source; the PNGs were rendered from it with sharp in the desktop repo). Deliberately
  NO service worker: this site's history is stale-cache bugs, and the `?v=` stamps stay
  the only cache control. The `theme-color` meta follows the chosen look.
- **📲 Install button** (top of the More sheet): keeps the browser's `beforeinstallprompt`
  (so its banner doesn't flash by) and calls `prompt()` on tap; on iPhone/iPad or when no
  offer exists it shows the Share → Add to Home Screen / browser-menu steps instead.
  Hidden when running installed (`display-mode: standalone`).

## Synced from the desktop app v1.18.1 (2026-10-04)
- **🎯 Up next moves on as you log** (`nextNeededLevel`/`lineDone`, the app's requirements.js rule): it starts at the first
  line after the rebirth level that isn't fully logged, never past one still missing a droid, capped at the cycle's last
  line; skipped lines show as one `.un-ready` strip (✓ READY · RB 21–22 + the next rebirth's credits). A friend's card
  follows the same rule. **‹ ›** next to its cycle select switch cycle (wraps), nothing cleared.
- **Export/Import** carry `heldMarks` + `retired` (`cleanCycleMarks`), and Import checks the file first
  (`isValidImportPayload`; a wrong file used to wipe progress) and asks before replacing. Old exports still import.
- The 3 spooky looks (forceghost / harvest / nightsister) are in APP_LOOKS. Tour step `since:'1.18.1'` on both lists,
  TOUR_VERSION 1.18.1. (The app's cycle/finish/undo/level hotkeys are app-only.)

## Synced from the desktop app v1.16.0 (2026-09-30)
- **SELL flags** (`sellFlagFor`, copied from the app's requirements.js): By Rebirth Level's tag and a
  side flag on Up next pictures. Yellow SELL / red number (21-30) / green number (31+).
- **👥 Friends** (`#friendsPanel`, toolbar button; on phones ⋯ More → 👥 Friends = tab `friends`):
  friend codes identical to the app's (same `FRIEND_DROIDS` order + fingerprint, so codes work both
  ways; check the fingerprint matches the app if droid-data.js changes). `tracker/#friend=CODE`
  opens that friend read-only with "Save to my friends" (and no tutorial on top).
- **Tutorial**: `tracker/tour.js` is byte-identical to the app's tour.js (`?v=` stamped). Steps are
  `TOUR_STEPS_COMPUTER` / `TOUR_STEPS_PHONE` in index.html; `TOUR_VERSION` + localStorage
  `rebirth-tourVersion`; `?tour` in the URL shows it as a first visit; ▶ Take the quick tour in
  📖 How to use replays it.

## Testing
No test suite in this repo, but `scripts/validate-tracker-data.js` (Node,
no dependencies) checks `droid-data.js`/`icons-data.js` structural integrity
— see Rules above; run it before pushing either file. Beyond that, sanity-
check a change by serving the directory locally (`python3 -m http.server`
or similar) and opening `tracker/`, or by diffing the pushed file's raw
bytes against the previous commit for anything unexpected outside the lines
you intended to touch — see the playbook for the exact byte-level checks
worth running before any push that touches `tracker/index.html`.
