# Song Recognizer

Shared rules for every extension come from the GNOME-EXTENSIONS kit: `../CLAUDE.md` and `../.claude/rules/` (loaded with this file), and the `gnome-ext:*` skills. `.claude/kit.sh` pulls the kit at session start, or, with no kit beside this repository, fetches it and prints its rules into the session.

A GNOME Shell extension (UUID `song-recognizer@jackicus`, `version-name` 0.1, shell 50): Recognize the song your computer is playing, from the top bar, with SongRec.

One top-bar button. Its menu has a round record button, the latest song under it, and a
History expander listing every song kept, each with a button to remove it.

## The rule the design hangs off

**The extension holds no Shazam client.** It records with PipeWire's `pw-record` and hands
the clip to the `songrec` command the user installed (SongRec, an unofficial Shazam client),
which fingerprints it and asks Shazam. The name, UUID and icon never say "Shazam" (Apple's
trademark); the UI names it only where a song's Shazam page is opened. Without `songrec` on
`PATH` the menu says to install it, and nothing is recorded.

## Layout

```
src/extension.js        entry point: imports lib/app.js
src/prefs.js            preferences (own process: Gtk and Adw only)
src/schemas/            org.gnome.shell.extensions.song-recognizer
src/stylesheet.css      the record button, the song rows
src/lib/app.js          SongRecognizerApp; the indicator, its menu and the notification
src/lib/recognizer.js   pw-record, then songrec; Gio and GLib only
scripts/ext.conf        what the kit's scripts need to know about this extension
```

## How a recognition runs

- `recognize()` records into a `Gio.File.new_tmp()` WAV (16 kHz mono) and deletes it after.
  `pw-record` has no length option: a timer sends it SIGINT, which makes it write the WAV
  header. Without the microphone setting it records the default output's monitor
  (`stream.capture.sink=true`).
- `songrec audio-file-to-recognized-song FILE` prints Shazam's raw JSON: `track` when it
  matched (`key`, `title`, `subtitle` is the artist, `images.coverart`, `url`), no `track`
  when not. Its `recognize` subcommand exits 0 on errors and cannot name the default
  monitor, so it is not used.
- One `Gio.Cancellable` per recognition: the record button stops it, SIGINT to `pw-record`
  and `force_exit()` to `songrec`. Destroying the indicator cancels it and drops it, and the
  recognition's `finally` touches the UI only while its cancellable is still the current one.
- A result goes to the front of `history` (the same `key` as the newest replaces it) and,
  when the menu has been closed meanwhile and `notify` is on, into a transient notification
  with the cover.

## Settings

`microphone` (false), `listen-seconds` (10, 4–20), `click-action` (`open` the Shazam page,
or `copy` "title – artist"), `notify` (true), `history-size` (50, 1–500; lowering it trims
at once), `history` (`aa{ss}`, newest first: key, title, artist, cover, url, time).

## Design notes

- Covers are `Gio.FileIcon`s on the `https://` URL. St loads them through GVfs and caches
  them for the session; nothing is downloaded to disk.
- Secondary text is dimmed with actor opacity (`DIM_OPACITY`), so it suits light and dark menus.
- The listening pulse is 900 ms (`PULSE_MS`), outside the shell's 100–250 ms: it is a
  state that repeats while listening, not a transition.

## Verifying

`make check` (ESLint, the schema, and `size` against the budget of 600 lines in
`scripts/ext.conf`: one menu, its preferences and two subprocesses; CI runs it). Anything
visible is seen in the nested shell (`gnome-ext:nested-shell`, then this repository's
`drive-extension` skill, which has a stand-in `pw-record` for a real match without playing
sound on the machine).

## Gotchas

- `make link` links only the files `src/` has when it runs: after adding one (the
  stylesheet), `./scripts/dev.sh link --no-enable` again.
- A recognition sends a fingerprint of what the machine is playing to Shazam: in the nested
  shell too. With `click-action` `open`, activating a song opens a browser on the real
  desktop; set it to `copy` in the nested settings before clicking songs.
