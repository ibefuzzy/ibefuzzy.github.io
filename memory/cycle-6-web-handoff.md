# Cycle 6 on the website: handoff for the main PC check

Written 2026-11-01 from a laptop session while the main PC was down (dead PSU, drive not yet read).
The user will have Claude compare everything here against the local folders once that PC is back.
Treat this as a list of things to verify, not as proof they're right.

## Fallback

- `backup/before-cycle-6` in both repos is the state just before this work
  (website `a7d5be0`, app `a6edda2`). App v1.20.0 on GitHub Releases was not touched.
- To undo on the website: revert the Cycle 6 commit on `main`. The site updates within about a minute.

## What changed on the website

- `tracker/droid-data.js`: Cycle 6 added from the app's `claude/cycle-6` branch, plus the seven new
  droids' classes. Cycles 1-5 are unchanged.
- `tracker/icons-data.js`: 120 pictures appended (`6-*` keys). The existing 600 are unchanged.
- `tracker/index.html`: `cycleTotal()` / `isCycleKey()` replace every literal 5, Cycle 6 is in the four
  cycle menus, a "Cycle 6 is here" tour step was added, `TOUR_VERSION` is 1.21.0, stamps are `?v=1.21.0`.
- `tracker/index.html` friend codes: see below.
- `index.html`: stamp bumped, and the web tracker blurb now says the Windows app gets Cycle 6 next update.
- Not changed: `version.json`, so app v1.20.0 players get no update notice.

## Friend codes

`FRIEND_DROIDS_V5` is the first 62 droids, the list app v1.20.0 uses. New droids sort after them.

- The site reads both the 62-droid and 69-droid formats.
- It writes the 62-droid format unless the player is on Cycle 6 or has logged a new droid, so
  app v1.20.0 can still read it.
- Tested against the old website code in a browser. The real app could not be run from the laptop.
- The app's `claude/cycle-6` branch does not have this. Port it before releasing v1.21.0, or app 1.21
  will refuse codes from v1.20.0 players. Remove it once players have had time to update.

## Pictures

All 58 new droid + rarity pictures are 96x96 WebP, made in a browser canvas at quality 0.9, not with sharp.

- **46 from gonk.tools portraits**, scaled straight to 96x96 with no trim. The user has permission from
  the gonk.tools owner. Rebuilding six shipped pictures this way came out almost identical, so this is
  how the shipped non-Kyber pictures were made.
  File ids: Gonk=GNK, JO9-4MN=JO94MN, Amp Walker=Combo05, Haul-R=Combo13, Nav-Ex=Combo01, Cyclens=Combo21.
- **12 from the user's in-game screenshots**, cut out, then trimmed and fitted to 92 px: EG-58 Base, Gold,
  Diamond and Beskar, and green Kyber for Gonk, EG-58, EGL, KT, MPH, JO9-4MN, PLNK and ECG.
  gonk.tools has no Kyber art, and no EG-58 file was found there.
- The 12 screenshots and all 58 finished pictures (`new-card-icons.json`) are on branch
  `backup/cycle-6-picture-sources`, which the site doesn't deploy. Use that JSON for the app's pictures.
- Base EG-58 is grey: the user confirmed this in-game. The community Cycle 6 chart shows it tan.
- The new Kybers are bright neon; the shipped ones are a muted green with shards. Levels 36-40 mix both.
- PLNK and JO9-4MN lose a little of their feet, because the name text overlapped them in the screenshots.
- Droidex (droidex.dubtrackr.win) art was not used. Its terms updated 2026-10-27 forbid copying protected
  assets. The user remembers an earlier fan-project permission; it was not found on the site.

## To reconcile on the main PC

1. Run `git pull` in `dev/web-tracker` before editing. It will be behind this work.
2. Read the local-only notes (`COMMON_TASKS.md`, `GOTCHAS_AND_CONSTRAINTS.md`, `CLAUDE_HISTORY.md` and the
   rest) and check this work against them. They were not available for any of it.
3. `CLAUDE.md` on `claude/cycle-6` says those notes and tools were lost with the PC. Only the PSU failed,
   so correct that if the drive is fine.
4. Compare the rebuilt `tools/card-icons.js` with the old picture scripts. It trims and fits to 92 px, so
   it won't match gonk.tools pictures, which are scaled straight to 96.

## Still to do for app v1.21.0

- Add the 58 pictures to `card-icons-data.js` and set `CYCLE6_NEW_ART_PENDING` to false.
- Add base prices to `DROID_BASE_PRICES` and empty `PRICE_PENDING`. From DubTrackr, checked 2026-11-01:
  EG-58 160K, EGL 2.7M, KT 4.2M, MPH 6.6M, JO9-4MN 28M, PLNK 31M, ECG 240M.
- Port the friend-code change above.
- Redeploy the Live Friends Worker (`MAX_CYCLE` 12, on `claude/cycle-6`). Until then Cycle 6 live saves
  should be refused. This one is worth doing sooner, since the website already has Cycle 6.
- Add gonk.tools to the README Credits. The landing page credits it; the README doesn't.
- Build, test in-game, and bump `version.json` only when the release is published.
