---
name: drive-extension
description: See Song Recognizer in a throwaway nested GNOME Shell - its menu, a recognition, the history and its preferences - and take screenshots of it. Use whenever a change to it must be seen or needs a fresh shell start (extension.js, metadata.json, the schema).
---

# Driving Song Recognizer in a nested shell

**Read `gnome-ext:nested-shell` first**: the loop (`start`, `do`, `reload`, `stop`), the
steps and its settings are there. This is what is particular to Song Recognizer.

```bash
G="./scripts/nested.sh run timeout 5 gsettings --schemadir src/schemas"   # then: $G set org.gnome.shell.extensions.song-recognizer KEY VALUE
./scripts/nested.sh start --headless     # Song Recognizer is ACTIVE when it returns
./scripts/nested.sh do "click 1383 16" "wait 1" "shot $S/menu.png 1000 0 600 320"
./scripts/nested.sh stop
```

In zsh, `$G` does not word-split: write the command out.

## Where things are (1600x900, one monitor)

- **The button**: the note icon left of the screen-sharing indicator, about (1383, 16).
- **The record button**: centred under it, about (1383, 80), with the menu open. It turns
  into a stop button while listening.
- **The latest song**: under the status line. **History (N)**: the row below it, about
  (1300, 255) with one song shown; it expands in place, and each song's × is at the right
  edge, about x 1502.

- **In quick settings** (`location` `quick-settings`): open them at about (1540, 16); the
  button is first in the top row, about (1261, 72). Changing `location` moves it at once.

## Before clicking

- **Set `click-action` to `copy`** in the nested settings: `open` launches a browser on the
  real desktop.
- **A recognition is real**: `pw-record` records the machine's own output (or microphone)
  and SongRec sends its fingerprint to Shazam. With nothing playing it is "No Match".

## A real match without playing sound

The nested shell inherits `PATH` from `start` (outside `--stand-in`). A stand-in `pw-record`
that hands over a clip and waits for SIGINT gives a real match:

```bash
ffmpeg -loglevel error -ss 40 -t 8 -i SONG.mp3 -ac 1 -ar 16000 $S/clip.wav   # a CC-licensed track
mkdir -p $S/bin && cat > $S/bin/pw-record <<EOF
#!/bin/sh
for out; do :; done
cp $S/clip.wav "\$out"
trap 'exit 0' INT TERM
while :; do sleep 0.2; done
EOF
chmod +x $S/bin/pw-record
./scripts/nested.sh stop && PATH=$S/bin:$PATH ./scripts/nested.sh start
```

Kevin MacLeod's tracks on incompetech.com (CC BY) are in Shazam's catalogue.

## History without recognizing

`$G set … history "[{'key': '1', 'title': 'T', 'artist': 'A', 'cover': '', 'url': '', 'time': '1791187280'}]"`
fills the menu.

## Screenshots

`./scripts/nested.sh shots [--out DIR]` takes the README's `docs/screenshots/menu.png` and
`quick-settings.png` (`scripts/nested.d/shots.sh`), under `start --stand-in`: invented songs
with covers drawn by `scripts/nested.d/stand-in.sh`, and `songrec` and `pw-record` as
stand-ins (`EXT_STAND_IN_BINS`), so nothing is recorded or sent. Without `oxipng`, strip
them with `magick IN -strip OUT`. Then the checks in `gnome-ext:screenshots`.
