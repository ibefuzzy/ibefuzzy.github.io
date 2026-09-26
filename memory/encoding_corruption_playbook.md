# Diagnosing "broken text" / mojibake bugs — read this first

Written after the v1.10.8 incident (2026-09-26): a prior session spent a full
debugging pass on a broken web tracker, correctly gathered evidence (commit
hash, "no console errors", "CARD_ICONS loaded" — note that name was simply
wrong, the real object is `ICONS`), and still failed to find the cause,
because it never looked at the actual bytes on disk. It treated "text looks
wrong in the browser" as a rendering/caching/deployment question. It is
almost never that. Do the byte-level check first; it takes under a minute
and either confirms or rules out the entire mojibake category immediately.

## Step 1: look at the raw bytes, not the rendered page

A browser screenshot showing `�` or garbage symbols tells you *that*
something is wrong but nothing about *where*. Go straight to the source:

```
git show <commit>:path/to/file.html | grep -n 'the broken text' | head
git show <commit>:path/to/file.html | sed -n '<line>p' | od -An -tx1
```

or in Python:
```python
data = open('file.html','rb').read()
data.count(b'\xef\xbf\xbd')   # counts literal U+FFFD (the replacement char) already baked into the file
```

This tells you immediately which of two completely different bugs you have.
They look identical in a screenshot and require opposite fixes.

## Bug type A: recoverable double-encoding ("mojibake")

Symptom in the raw file: text like `â€™`, `â€"`, `âŸ³`, `Â ` — these are all
**valid UTF-8**, just semantically wrong. Nothing is missing yet.

Cause: the file's real UTF-8 bytes got decoded once using the wrong
single-byte encoding (almost always **Windows-1252**, because on Windows,
Python's `open(path)` with no `encoding=` argument uses the OS locale
encoding, not UTF-8 — this is Windows-specific; the same code on Linux/macOS
defaults to UTF-8 and would never do this), then the resulting (garbled)
text got saved back out as UTF-8. Every non-ASCII character effectively got
encoded twice.

**This is 100% reversible** as long as you catch it before anything trims,
replaces, or re-corrupts the mojibake text. Reversal is: take the mojibake
*string*, re-encode it as the same wrong encoding to get back the original
*bytes*, then decode those bytes as UTF-8:

```python
mojibake_string.encode('windows-1252').decode('utf-8')
```

**Gotcha:** Python's `str.encode('windows-1252')` refuses 5 codepoints
(U+0081, U+008D, U+008F, U+0090, U+009D) that its *decoder* nonetheless
produces from bytes 0x81/0x8D/0x8F/0x90/0x9D (real-world encoders, browsers,
and whatever actually created your corruption, treat these as a permissive
pass-through, matching Latin-1). If you get
`UnicodeEncodeError: 'charmap' codec can't encode character '\x90'`, don't
give up on the transform — build the reverse map by hand instead of calling
`.encode()` directly:

```python
CP1252_UNDEFINED_PASSTHROUGH = {0x81, 0x8D, 0x8F, 0x90, 0x9D}
byte_to_char = {}
for b in range(256):
    if b in CP1252_UNDEFINED_PASSTHROUGH or b < 0x80 or b >= 0xA0:
        byte_to_char[b] = chr(b)
    else:
        byte_to_char[b] = bytes([b]).decode('cp1252')
char_to_byte = {c: b for b, c in byte_to_char.items()}

out = bytearray()
for ch in mojibake_text:
    out.append(char_to_byte[ch]) if ch in char_to_byte else out.extend(ch.encode('utf-8'))
fixed_text = out.decode('utf-8')   # should succeed with zero errors
```

If this fully succeeds (every character maps, the final UTF-8 decode
succeeds with no exceptions) and produces recognizable characters
(em-dashes, real emoji, arrows, quotation marks) where the corruption was,
you have your fix. **Verify it, don't just trust it**: grep git history for
one specific corrupted line's *pre-corruption* version if any commit
predates the bug, and confirm your reversal matches it exactly, character
for character. That is a real proof, not a guess.

## Bug type B: destroyed data (U+FFFD already in the file)

Symptom in the raw file: the literal Unicode replacement character
(`\xef\xbf\xbd` in UTF-8, renders as `�`) is already committed.

**This is not reversible from this file.** The original byte(s) are gone —
U+FFFD is what a decoder emits when it gives up on a byte sequence it can't
interpret, and once something writes that codepoint back out, there is no
information left pointing to what was there before. No amount of
re-encoding, re-decoding, cache-clearing, or redeployment recovers it.

This is exactly what happened in the v1.10.8 "fix": an earlier attempt
correctly noticed the mojibake (type A) but "fixed" it by finding the
corrupted sequences and replacing them with `�`/blank instead of reversing
the double-encoding — turning a fully recoverable bug into a permanent one,
in the file that was actually deployed.

**Fix:** go back through git log to the commit *before* whichever commit
introduced U+FFFD. If that earlier commit still has type-A mojibake (not
yet destroyed), reverse it there (per Bug type A above) and re-apply any
*legitimate* content changes made between that commit and HEAD on top of the
reversed text — diff the two to separate "real changes" from "corruption
churn" (in practice: a diff between the corrupted commit and its parent that
touches nothing but character-level substitutions on otherwise-identical
lines is 100% the corruption; anything touching line structure, added/removed
lines, or code logic is real and must be preserved).

If NO earlier commit has recoverable text either (i.e. the corruption is
older than your history, or was introduced pre-destroyed), the text is
gone — the only source is wherever else that string might exist:
a sibling repo with the same copy (this site mirrors
`ibefuzzy/Fuzzy-Droid-Tracker`'s desktop app text in several places), a
release note, or asking the human.

## Finding exactly which commit introduced the corruption

Pick one specific string near the corruption and check it across commits
oldest-to-newest until it flips from clean to broken:

```bash
for c in <commit1> <commit2> <commit3> ...; do
  echo "=== $c ==="; git show $c:path/to/file | grep -n 'known nearby text'
done
```

**Red flag to watch for:** a commit whose message describes something
trivial and unrelated (e.g. "update print statement", "fix typo") but whose
diff touches a huge number of lines across the whole file. That mismatch
*is* the signal — a script that was only meant to change one string, but
opened the file without `encoding='utf-8'` and rewrote the entire thing,
will produce exactly this shape: a "small" commit message with a
whole-file-width diff of nothing but character substitutions. Don't
dismiss a commit as unrelated just because its message says so.

## Bug type C: orphaned duplicate data object (the actual v1.10.8 icon bug)

This is what the "stale cache-buster" section below assumed was happening,
and bumping the version DID help (it stopped browsers serving a truly-old
copy) - but it wasn't the whole story. The real bug: `tracker/icons-data.js`
contained **two separate top-level objects** - the real `const ICONS = {...}`
that `tracker/index.html` actually reads, and, appended right after its
closing `};`, a second, completely different `const CARD_ICONS = {...}` full
of correct, valid, newly-generated icon data (including all the levels
36-40 art) that **nothing in the app ever referenced**. A regeneration
script (`build-gonk-icons.js` + `extract-kyber-final.js`, per the comment
left in the file) produced good output under a new variable name and it was
never merged into - or used to replace - the object the app actually reads.

This is *insidious* specifically because:
- It produces **zero console errors or exceptions** - `const A = {...}; const
  B = {...};` is completely valid JavaScript, so the file parses and runs
  fine top to bottom.
- **Most rows still work** - anything already covered by the original
  `ICONS` object renders exactly as before, so the bug only shows up on
  whatever's new, making it look like a narrow, targeted problem (like a
  keying bug for the new rows) rather than "there's a second, disconnected
  copy of the data sitting dead in this file."
- A naive text-search for the expected key (e.g. `grep '"1-36-0"'`) finds it
  and looks reassuring - it's really *evidence of the bug*, not evidence
  against it, because it's the orphaned copy you're finding, not the live one.

**How to actually tell these apart:** don't trust a text search. Execute the
file for real (Node's `vm` module, or a browser) and check what the live
object actually contains:

```js
const vm = require('vm');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('icons-data.js', 'utf8'), ctx);
console.log(Object.keys(vm.runInContext('ICONS', ctx)).length);
console.log('1-36-0' in vm.runInContext('ICONS', ctx));  // false = orphaned elsewhere
```

If the count is suspiciously round (this file's real object had exactly
525 = 5 cycles x 35 levels x 3 slots - the *old* shape, before the levels
36-40 addition) and a key you can literally see in the file's text isn't in
the real object, search the file for **more than one** `^const \w+ = {`
line. A second one is your answer.

**Fix:** merge, don't just delete one side blindly - the newer block may
only be a *partial* replacement (in this incident, the gonk.tools
re-extraction of levels 1-35 was missing 6 keys the original extraction
had). Build the merged object programmatically (prefer the newer source,
fall back to the older one for anything it's missing), validate every
required key is present and every value decodes as a real image, and only
then write it out as a single, correctly-named object - see
`scripts/validate-tracker-data.js`, which checks for exactly this
(duplicate top-level consts + full key coverage) and should be run before
every push that touches `icons-data.js` or `droid-data.js`.

## Separately: "new content shows up but its image/icon doesn't"

This is a **different bug class** — don't reach for the mojibake playbook
above if the *text* is fine and only images/icons for newly-added items are
missing. Check, in order:
1. Does the data file actually contain the right key/value? (Parse it for
   real — with Node/`vm`, or Python — don't eyeball a 6MB minified file.)
2. Is the value itself valid? Decode it (base64 → bytes → check magic
   bytes, e.g. `RIFF`/`WEBP`) and actually render it — don't assume broken
   just because it's small, and don't assume fine just because it decodes.
   In the v1.10.8 case the icon data was completely valid; rendering it
   directly proved that in seconds and eliminated an entire wrong
   hypothesis.
3. Is the file that defines this data loaded through a **cache-busting
   version string that hasn't been bumped**? If `<script src="data.js?v=X">`
   still says an old `X` after several releases changed `data.js`, every
   returning visitor's browser may still be serving the pre-update file —
   this reproduces identically on every device that visited before, is
   unaffected by a normal or even hard reload on some browsers, and has
   nothing to do with GitHub Pages deployment status (the *repo* has the
   right file; the *visitor's cache* doesn't). This was the actual bug here:
   `?v=1.7.1` had never been bumped despite 8+ releases changing the files
   it version-stamps. Fix: bump it to match the current release, and treat
   forgetting to bump it as a shipped bug going forward (see CLAUDE.md rule).
