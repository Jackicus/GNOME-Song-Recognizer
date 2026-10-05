# Publishing

How Song Recognizer answers the extensions.gnome.org review, against
https://gjs.guide/extensions/review-guidelines/review-guidelines.html and
https://gjs.guide/extensions/review-guidelines/best-practices.html, read 2026-10-05.
It has not been uploaded yet.

| Guideline | How it is met |
|---|---|
| Nothing before `enable()`; `disable()` undoes it | `extension.js` makes the app in `enable()`; `SongRecognizerApp.disable()` disconnects the settings, cancels the recognition, destroys the notification source and the view. Module scope holds constants and two `Gio._promisify` calls. |
| Signals and sources | Settings signals go through `connectObject` and are taken back in `disable()` or with the view's destruction. The one timer (`record()`) is removed when the recording ends, which the cancellable forces. |
| Imports | `prefs.js` imports Gio, GLib, Gtk and Adw; `lib/recognizer.js` Gio and GLib; the shell side never imports Gtk or Adw. |
| `metadata.json` | `uuid` `song-recognizer@jackicus`, `shell-version` `["50"]` (run on it), `url` the repository, `settings-schema` used through `getSettings()`, no `version`, no `session-modes`. |
| Schema | `org.gnome.shell.extensions.song-recognizer` at `/org/gnome/shell/extensions/song-recognizer/`, shipped as `schemas/<id>.gschema.xml`; `make pack` leaves `gschemas.compiled` out. |
| Subprocesses | No binary ships. `pw-record` (PipeWire) and the user-installed `songrec` are spawned per recognition and stopped with the recognition (SIGINT, `force_exit()`); neither is privileged. SongRec has no D-Bus interface, so it is run as a command. |
| Clipboard | Only the `copy` click action writes it, on the user's click; declared in the description; no shortcut. |
| Network and telemetry | The description and README say that SongRec sends a fingerprint of the recording to Shazam, and that covers load from Apple's image servers. Nothing else goes online; no telemetry. |
| Logging | `console.error` on a failed recognition or a failed quick settings placement only. |
| Private API | `docs/private-api.md`: the quick settings row and the screenshot button, with the fallback when they move. |
| Trademarks | The name, UUID and icon (`audio-x-generic-symbolic`) carry no brand. "Shazam" names the service whose page is opened, and "SongRec" the program the user installed. |
| Licence | GPL-2.0-or-later; `LICENSE` is in the zip. |
| The zip | `make pack`: `extension.js`, `prefs.js`, `lib/`, `stylesheet.css`, `metadata.json`, the schema XML and `LICENSE`; `make pack` fails if the zip holds anything else. |

The upload notes should repeat the subprocess and network lines above.
