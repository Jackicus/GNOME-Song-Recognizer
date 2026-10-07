# SongRec Button

Shared rules for every extension come from the GNOME-EXTENSIONS kit: `../CLAUDE.md` and `../.claude/rules/` (loaded with this file), and the `gnome-ext:*` skills. `.claude/kit.sh` pulls the kit at session start, or, with no kit beside this repository, fetches it and prints its rules into the session.

A GNOME Shell extension (UUID `songrec-button@jackicus`, `version-name` 0.1, shell 50): a
quick settings button that runs SongRec to recognize the song the computer is playing.

One place: a pill in quick settings (`QuickMenuToggle`, added with `addExternalIndicator`).
Clicking it listens, and clicking again stops; it is lit (`checked`) while listening, with a
note icon in the top bar. A notification says what was found. The pill's menu holds the
history, each song with a button to remove it, and a Settings item.

## The rule the design hangs off

**The extension holds no Shazam client, and claims none of the work.** It records with
PipeWire's `pw-record` and hands the clip to the `songrec` command the user installed
(SongRec, an unofficial Shazam client), which fingerprints it and asks Shazam. The name says whose work it runs; nothing says
"Shazam" (Apple's trademark) but the click action that opens a song's Shazam page. Without
`songrec` on `PATH` the pill says to install it, and nothing is recorded. Its preferences
mirror SongRec's own, where they apply to a one-shot button.

## Layout

```
src/extension.js        entry point: imports lib/app.js
src/lib/app.js          SongRecButtonApp (recognition, history, notifications) and the pill:
                        SongRecButtonIndicator, SongRecButtonToggle
src/lib/recognizer.js   pw-record, then songrec; Gio and GLib only
src/prefs.js            preferences (own process: Gtk and Adw; lists devices with pw-dump)
src/schemas/            org.gnome.shell.extensions.songrec-button
src/stylesheet.css      the history's height, the song rows
docs/publishing.md      how the extensions.gnome.org review is answered
scripts/ext.conf        what the kit's scripts need to know about this extension
scripts/nested.d/       the stand-in songs and 'nested.sh shots' (the README's screenshots)
```

## How a recognition runs

- `recognize()` records into a `Gio.File.new_tmp()` WAV (16 kHz mono) and deletes it after.
  `pw-record` has no length option: a timer sends it SIGINT, which makes it write the WAV
  header. `device` picks the target: `''` the default output's sound
  (`stream.capture.sink=true`), `microphone` the default input, `<sink>.monitor` that
  output's sound (`--target <sink>` plus the sink flag), anything else an input's node
  name. SongRec's own `current_device_name` uses the same `.monitor` naming.
- `songrec audio-file-to-recognized-song FILE` prints Shazam's raw JSON: `track` when it
  matched (`key`, `title`, `subtitle` is the artist, `images.coverart`, `url`), no `track`
  when not. Its `recognize` subcommand exits 0 on errors and cannot name the default
  monitor, so it is not used.
- The pill's subtitle is the state: none when idle, "Listening…", "Searching…", then the
  song's title or what went wrong.
- One `Gio.Cancellable` per recognition: clicking the pill again stops it, SIGINT to
  `pw-record` and `force_exit()` to `songrec`. `disable()` cancels it and drops it, and the
  recognition's `finally` touches the UI only while its cancellable is still the current one.
- A result goes to the front of `history` (with `no-duplicates`, earlier entries of the same
  `key` go) and, with `notify` on, into a transient notification with the cover.

## Settings

`device` (`''`), `listen-seconds` (10, 4–20), `notify` (true), `no-duplicates` (false),
`click-action` (`open` the Shazam page, `search` the `search-url` with "title artist", or
`copy` "title – artist" to the clipboard), `search-url` (YouTube's search, as SongRec's),
`history-size` (50, 1–500; lowering it trims at once), `history` (`aa{ss}`, newest first:
key, title, artist, cover, url, time).

## Design notes

- The history scrolls: its section's actor is an `St.ScrollView` around the section's box
  (as the shell's `PopupSubMenu` has), capped by `max-height`, since the shell's quick
  settings menus do not scroll and 50 songs would outgrow the screen.
- The toggle destroys its menu with itself: the shell puts a toggle's menu in quick
  settings' overlay and never takes it out.
- The idle subtitle is `null`, not `''`: an empty string keeps the line and pushes the
  title up.
- Covers are `Gio.FileIcon`s on the `https://` URL. St loads them through GVfs and caches
  them for the session; nothing is downloaded to disk.
- Secondary text is dimmed with actor opacity (`DIM_OPACITY`), so it suits light and dark menus.
- `metadata.json`'s description declares the clipboard and what goes to Shazam, as the
  review guidelines require; README's opening and Privacy sections say the same.

## Verifying

`make check` (ESLint, the schema, and `size`; CI runs it). Anything
visible is seen in the nested shell (`gnome-ext:nested-shell`, then this repository's
`drive-extension` skill, which has a stand-in `pw-record` for a real match without playing
sound on the machine).

## Gotchas

- `make link` links only the files `src/` has when it runs: after adding one (the
  stylesheet), `./scripts/dev.sh link --no-enable` again.
- A recognition sends a fingerprint of what the machine is playing to Shazam: in the nested
  shell too. With `click-action` `open`, activating a song opens a browser on the real
  desktop; set it to `copy` in the nested settings before clicking songs.
