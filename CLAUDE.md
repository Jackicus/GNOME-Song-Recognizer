# Song Recognizer

Shared rules for every extension come from the GNOME-EXTENSIONS kit: `../CLAUDE.md` and `../.claude/rules/` (loaded with this file), and the `gnome-ext:*` skills. `.claude/kit.sh` pulls the kit at session start, or, with no kit beside this repository, fetches it and prints its rules into the session.

A GNOME Shell extension (UUID `song-recognizer@jackicus`, `version-name` 0.1, shell 50): Recognize the song your computer is playing, from the top bar, with SongRec.

## Layout

```
src/extension.js        entry point: imports lib/app.js
src/prefs.js            preferences (own process: Gtk and Adw only)
src/schemas/            org.gnome.shell.extensions.song-recognizer
src/lib/app.js          SongRecognizerApp: everything enable() puts into the shell
scripts/ext.conf        what the kit's scripts need to know about this extension
```

## Settings

`show-indicator` (true): the icon in the top bar.

## Verifying

`make check` (ESLint, the schema, and `size` against the budget of 1500 lines in
`scripts/ext.conf`, which suits one indicator and its preferences; CI runs it). Anything visible is seen in the
nested shell (`gnome-ext:nested-shell`, then this repository's `drive-extension`
skill).

## Gotchas

None of its own yet. A trap true of every extension goes in the kit, not here.
