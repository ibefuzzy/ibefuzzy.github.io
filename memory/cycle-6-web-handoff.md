# Cycle 6 handoff: for the review on the main PC

Written from a laptop session on 2026-11-01, finalized 2026-11-02, while the main PC was down (dead PSU, its
drive not read yet). The user will give this file to Claude on the main PC, to review and run against the MD
files there, make sure things are consistent, and fix from there.

The laptop session worked from GitHub only. It never saw the main PC's local notes, so treat everything here
as things to verify, not as proof they're right.

## How to run the review

1. Report differences to the user before changing anything.
2. Run `git fetch` in both repos and read `git status -sb` first. Local files may be newer than GitHub.
3. Never `reset --hard`, `checkout`/`restore` over local files, `clean` or `stash`: ignored local-only work has
   no other copy (rule in the app's `CLAUDE.md`).
4. Read the local-only notes and check this work against them: `COMMON_TASKS.md`, `GOTCHAS_AND_CONSTRAINTS.md`,
   `CLAUDE_HISTORY.md`, `TEST_WITHOUT_ELECTRON.md`, `IPC_REFERENCE.md`, `SETTINGS_SCHEMA.md`, `OVERLAY_TEMPLATE.md`,
   `DROIDEX_IMAGE_IMPORT_GUIDE.md`, plus Claude's local memory notes. None were available for this work.
5. Compare the local `CLAUDE.md` with both versions on GitHub: `main` (v1.20.0 state) and `claude/cycle-6`
   (updated 2026-11-02 with the state below).
6. `dev/web-tracker` (the website repo) will be behind. Pull it once its status is clean or understood.

## Where things stand

| Item | State |
|---|---|
| Website `ibefuzzy/ibefuzzy.github.io` `main` | **Live with Cycle 6** since commit `b01df26` (website 1.21.0) |
| App v1.20.0 on GitHub Releases | Unchanged, still the latest release |
| App repo `main` | Unchanged (`a6edda2`) |
| App repo `claude/cycle-6` | v1.21.0 work, not merged or released. Lacks the pictures, prices and friend-code change below |
| `version.json` | Still 1.20.0, so app players get no update notice |
| Live Friends Worker | Needs a one-line change. Not confirmed done (see below) |

The user chose to put Cycle 6 on the live website ahead of the app, because players should be able to use it now.
The user tested the website and is satisfied. The app waits until the main PC is back.

## Fallbacks

- `backup/before-cycle-6` in both repos: the state just before this work (website `a7d5be0`, app `a6edda2`).
- `backup/cycle-6-picture-sources` in the website repo, not deployed: the user's 12 screenshots and
  `new-card-icons.json`, all 58 finished pictures.
- To undo on the website: revert `b01df26` on `main`. The site updates within about a minute.

## What changed on the website

- `tracker/droid-data.js`: Cycle 6 from `claude/cycle-6`, plus the seven new droids' classes. Cycles 1-5 unchanged.
- `tracker/icons-data.js`: 120 pictures appended (`6-*` keys), 62 reused and 58 new. The existing 600 are unchanged.
- `tracker/index.html`: `cycleTotal()` / `isCycleKey()` replace every literal 5, Cycle 6 is in the four cycle menus,
  a "Cycle 6 is here" tour step was added, `TOUR_VERSION` is 1.21.0, data stamps are `?v=1.21.0`.
- `index.html` (landing): stamp bumped, and the web tracker blurb says the Windows app gets Cycle 6 in its next update.
  Its counters read the data, so it now shows 6 cycles and 69 droids.
- `CLAUDE.md`: stamp updated and a section on running ahead of the app.
- `scripts/validate-tracker-data.js` passed before the push, and `tracker/.data-manifest.json` was committed with it.

## Friend codes

`FRIEND_DROIDS_V5` is the first 62 droids, the list app v1.20.0 uses. The seven new droids sort after them.

- The site reads both the 62-droid and 69-droid formats.
- It writes the 62-droid format unless the player is on Cycle 6 or has logged a new droid, so app v1.20.0 can still
  read it. A Cycle 6 code gets the "one of you needs to update" message on the app. That's expected until the app updates.
- Tested in a browser against the old website code, which uses the same format and droid list. Never tested against
  the real app.
- `claude/cycle-6` does not have this. Port it before releasing v1.21.0, or app 1.21 will refuse codes from v1.20.0
  players. Remove it once players have had time to update.

## Pictures

All 58 new droid + rarity pictures are 96x96 WebP, made in a browser canvas at quality 0.9, not with sharp.
The scripts were one-offs and weren't saved; the method is described here.

- **46 from gonk.tools portraits**, scaled straight to 96x96 with no trim. The user has permission from the gonk.tools
  owner, who is active in the community Discord. Rebuilding six shipped pictures this way came out almost identical,
  which shows the shipped non-Kyber pictures were made this way.
  Base: `/droids/T_Portrait_<id>_Common.png`. Other rarities: `/droids/rarities/T_Portrait_<id>_<Rarity>.png`.
  File ids: Gonk=GNK, JO9-4MN=JO94MN, Amp Walker=Combo05, Haul-R=Combo13, Nav-Ex=Combo01, Cyclens=Combo21.
- **12 from the user's in-game screenshots**: EG-58 Base, Gold, Diamond and Beskar, and green Kyber for Gonk, EG-58, EGL,
  KT, MPH, JO9-4MN, PLNK and ECG. gonk.tools has no Kyber art, and no EG-58 file was found there.
  Cut out, trimmed and fitted to 92 px. The 7 Kybers other than EG-58 also had their halo and body sparkles removed.
- The user confirmed in-game that Base EG-58 is grey. The community Cycle 6 chart shows it tan, and its white Kybers are the
  Inactive look, so don't use that chart's art.
- The new Kybers are bright neon; the shipped ones are a muted green with shards. Levels 36-40 mix both, and the user accepted this.
- PLNK and JO9-4MN lose a little of their feet, because the name text overlapped them in the screenshots. MPH keeps a white
  flare by its feet. EG-58's pose is more front-facing than other droids.
- Droidex (droidex.dubtrackr.win) art was not used. Its terms, updated 2026-10-27, forbid copying protected assets, and it
  marks its portraits as protected. The user remembers an earlier fan-project permission; it wasn't found on the site, but
  `DROIDEX_IMAGE_IMPORT_GUIDE.md` may record it.

## To reconcile with the local folders

- `CLAUDE.md` on `claude/cycle-6` said the local notes and tools were lost with the PC, and was corrected on 2026-11-02.
  Only the PSU failed, so confirm what actually survived.
- Compare `tools/card-icons.js` (rebuilt in a cloud session) with the old local scripts `build-gonk-icons.js`,
  `build-kyber-card-icons.js` and `build-missing-card-icons.js`. It trims and fits to 92 px, so it won't match gonk.tools
  pictures, which are scaled straight to 96.
- Check whether `COMMON_TASKS.md` has website rules this push missed. It followed the website's own `CLAUDE.md`.
- The README Credits don't mention gonk.tools; the landing page does.

## Still to do for app v1.21.0

1. Add the 58 pictures from `new-card-icons.json` to `card-icons-data.js` and set `CYCLE6_NEW_ART_PENDING` to false.
2. Add base prices to `DROID_BASE_PRICES` and empty `PRICE_PENDING`. From DubTrackr, checked 2026-11-01:
   EG-58 160K, EGL 2.7M, KT 4.2M, MPH 6.6M, JO9-4MN 28M, PLNK 31M, ECG 240M. KT and JO9-4MN fit `PRICE_LADDER` at Kyber.
3. Port the friend-code change above.
4. Run `npm test`, build, and test in-game. The app and overlays have not been run with Cycle 6.
5. Publish on the release flow, and bump `version.json` only when the release is published.

## Other open items

- **Live Friends Worker:** the code on `main` refuses Cycle 6 saves (`b[3] > 5`). The user was given a one-line Cloudflare edit
  to `b[3] > 12`. Check whether it was done. `claude/cycle-6` has the same change as `MAX_CYCLE = 12`; redeploy from there
  when the app work is done.
- **Name:** kept as JO9-4MN (letter O), matching DubTrackr and gonk.tools's file name. The chart and tycoon-tools write J09-4MN.
- **Possible older website bug, unconfirmed:** a brand-new browser showed "What's new" instead of the welcome card. The page may
  save `rebirth-ownedRank-v2` before the tour checks for existing data (`seen = '1.15.1'` in `tracker/index.html`).
- **Laptop:** Git and Node are installed and the GitHub sign-in is saved. The clones used were in a temp folder.
