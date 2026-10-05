# Song Recognizer

Recognize the song your computer is playing, from the top bar or quick settings, with SongRec.

Click the note in the top bar, then the round button: it listens to what your computer is
playing for a few seconds and shows the song, with its cover. Every song it finds is kept in
a history under it, each with a button to remove it. In quick settings the round button sits
beside the screenshot button and stays lit while it listens; the song comes as a notification.

## Requirements

- GNOME Shell 50, on PipeWire (`pw-record`, part of PipeWire, does the recording).
- [SongRec](https://github.com/marin-m/SongRec), whose `songrec` command does the
  recognition. The Flatpak does not provide the command: install a native package
  (`sudo pacman -S songrec` on Arch Linux), or see
  [SongRec's install instructions](https://github.com/marin-m/SongRec#installation).

## Privacy and network

Nothing is recorded until you press the button. Then it records a few seconds of your
computer's sound (or the microphone, if you choose it) into a temporary file and runs
SongRec on it, which sends a fingerprint of that sound to Shazam's servers. The file is
deleted straight after. Covers are loaded from Apple's image servers when the menu shows
them. The history is kept in the extension's settings, on your computer only. Clicking a
song opens its Shazam page in your browser or, if you choose, copies its title and artist
to the clipboard; nothing else touches the clipboard.

This extension is not affiliated with Shazam or Apple. SongRec is an unofficial client.

## Install

From source:

```bash
git clone https://github.com/Jackicus/GNOME-Song-Recognizer.git
cd GNOME-Song-Recognizer
make install
```

Then log out and back in (on Wayland the shell only finds a new extension at login), and
turn it on: `gnome-extensions enable song-recognizer@jackicus`, or in Extensions.

To update, pull and `make install` again; to remove it, `make uninstall`.

## Preferences

`gnome-extensions prefs song-recognizer@jackicus`, or Extensions.

- **Location**: the top bar, with the history in its menu, or a round button in quick
  settings beside the screenshot button, lit while it listens, with every result as a
  notification.
- **Use the Microphone**: listen through the microphone instead of the computer's sound.
- **Listening Time**: how many seconds are recorded (4–20, 10 by default).
- **Clicking a Song**: open its Shazam page, or copy its title and artist.
- **Notify**: show the song in a notification when the menu is closed (always, in quick
  settings).
- **Songs Kept** and **Clear History**.

## Troubleshooting

The extension's messages, and its preferences', are in the journal:

```bash
journalctl -o cat --since '10 min ago' /usr/bin/gnome-shell + SYSLOG_IDENTIFIER=org.gnome.Shell.Extensions | grep -F '[Song Recognizer]'
```

Include them in a bug report. "SongRec Is Missing" in the menu means `songrec` is not on
the shell's `PATH`: install it as above, then log out and back in.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). `docs/` has the private shell API the quick
settings button relies on and how the extensions.gnome.org review is answered.

## Licence

GPL-2.0-or-later. See [LICENSE](LICENSE).
