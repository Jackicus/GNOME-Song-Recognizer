# Song Recognizer

Shared rules for every extension come from the GNOME-EXTENSIONS kit: `../CLAUDE.md` and `../.claude/rules/` (loaded with this file), and the `gnome-ext:*` skills. `.claude/kit.sh` pulls the kit at session start, or, with no kit beside this repository, fetches it and prints its rules into the session.

A GNOME Shell extension (UUID `song-recognizer@jackicus`, `version-name` 0.1, shell 50):
Recognize the song your computer is playing, from the top bar or quick settings, with SongRec.

Two places, chosen by `location`. In the top bar (`panel`), a button whose menu has a round
record button, the latest song under it, and a History expander listing every song kept,
each with a button to remove it. In quick settings (`quick-settings`), a round button just
before the screenshot button, lit (`checked`) while listening whether the panel is open or
not; every result there is a notification. The history is kept in both.

## The rule the design hangs off

**The extension holds no Shazam client.** It records with PipeWire's `pw-record` and hands
the clip to the `songrec` command the user installed (SongRec, an unofficial Shazam client),
which fingerprints it and asks Shazam. The name, UUID and icon never say "Shazam" (Apple's
trademark); the UI names it only where a song's Shazam page is opened. Without `songrec` on
`PATH` the menu says to install it, and nothing is recorded.

## Layout

```
src/extension.js        entry point: imports lib/app.js
src/lib/app.js          SongRecognizerApp (recognition, history, notifications) and its two
                        views: SongRecognizerIndicator, SongRecognizerQuickButton
src/lib/recognizer.js   pw-record, then songrec; Gio and GLib only
src/prefs.js            preferences (own process: Gtk and Adw only)
src/schemas/            org.gnome.shell.extensions.song-recognizer
src/stylesheet.css      the record button, the song rows
docs/private-api.md     the quick settings reach
docs/publishing.md      how the extensions.gnome.org review is answered
scripts/ext.conf        what the kit's scripts need to know about this extension
scripts/nested.d/       the stand-in songs and 'nested.sh shots' (the README's screenshots)
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
- The app owns the recognition, so moving the button mid-recognition keeps it. A view has
  `setBusy()`, `setStatus()` (a no-op on the quick button) and `wantsNotification`.
- One `Gio.Cancellable` per recognition: the record button stops it, SIGINT to `pw-record`
  and `force_exit()` to `songrec`. `disable()` cancels it and drops it, and the
  recognition's `finally` touches the UI only while its cancellable is still the current one.
- A result goes to the front of `history` (the same `key` as the newest replaces it) and
  into a transient notification with the cover when the view wants one: the top bar's when
  its menu is closed and `notify` is on, the quick button's always.

## Settings

`location` (`panel` or `quick-settings`), `microphone` (false), `listen-seconds` (10,
4–20), `click-action` (`open` the Shazam page, or `copy` "title – artist" to the
clipboard), `notify` (true), `history-size` (50, 1–500; lowering it trims at once),
`history` (`aa{ss}`, newest first: key, title, artist, cover, url, time).

## Design notes

- The quick button is the shell's `icon-button`, lit in the accent when checked as a quick
  toggle is (the theme's own checked `icon-button` is a grey).
- Covers are `Gio.FileIcon`s on the `https://` URL. St loads them through GVfs and caches
  them for the session; nothing is downloaded to disk.
- Secondary text is dimmed with actor opacity (`DIM_OPACITY`), so it suits light and dark menus.
- The listening pulse is 900 ms (`PULSE_MS`), outside the shell's 100–250 ms: it is a
  state that repeats while listening, not a transition.
- `metadata.json`'s description declares the clipboard and what goes to Shazam, as the
  review guidelines require; README's opening and Privacy sections say the same.

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
