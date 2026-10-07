# Publishing

How SongRec Button answers the extensions.gnome.org review, against
https://gjs.guide/extensions/review-guidelines/review-guidelines.html and
https://gjs.guide/extensions/review-guidelines/best-practices.html, read 2026-10-05.
It has not been uploaded yet.

| Guideline | How it is met |
|---|---|
| Nothing before `enable()`; `disable()` undoes it | `extension.js` makes the app in `enable()`; `SongRecButtonApp.disable()` disconnects the settings, cancels the recognition, destroys the notification source, the quick settings toggle (which destroys its menu) and its indicator. Module scope holds constants and two `Gio._promisify` calls. |
| Signals and sources | Settings signals go through `connectObject` and are taken back in `disable()` or with the view's destruction. The one timer (`record()`) is removed when the recording ends, which the cancellable forces. |
| Imports | `prefs.js` imports Gio, GLib, Gtk and Adw, and runs `pw-dump` once to list audio devices; `lib/recognizer.js` Gio and GLib; the shell side never imports Gtk or Adw. |
| `metadata.json` | `uuid` `songrec-button@jackicus`, `shell-version` `["50"]` (run on it), `url` the repository, `settings-schema` used through `getSettings()`, no `version`, no `session-modes`. |
| Schema | `org.gnome.shell.extensions.songrec-button` at `/org/gnome/shell/extensions/songrec-button/`, shipped as `schemas/<id>.gschema.xml`; `make pack` leaves `gschemas.compiled` out. |
| Subprocesses | No binary ships. `pw-record` (PipeWire) and the user-installed `songrec` are spawned per recognition and stopped with the recognition (SIGINT, `force_exit()`); neither is privileged. SongRec has no D-Bus interface, so it is run as a command. |
| Clipboard | Only the `copy` click action writes it, on the user's click; declared in the description; no shortcut. |
| Network and telemetry | The description and README say that SongRec sends a fingerprint of the recording to Shazam, and that covers load from Apple's image servers. The `search` click action opens the user's own search link in the browser. Nothing else goes online; no telemetry. |
| Logging | `console.error` on a failed recognition, and in the preferences when `pw-dump` fails. |
| Private API | None: the pill is a `QuickMenuToggle` added with `addExternalIndicator()`. |
| Trademarks | The icon (`audio-x-generic-symbolic`) carries no brand. "SongRec" in the name says whose program it runs (GPL-3.0 software, no trademark); the description says it is not affiliated with SongRec. "Shazam" names only the service whose page is opened. |
| Licence | GPL-2.0-or-later; `LICENSE` is in the zip. |
| The zip | `make pack`: `extension.js`, `prefs.js`, `lib/`, `stylesheet.css`, `metadata.json`, the schema XML and `LICENSE`; `make pack` fails if the zip holds anything else. |

The upload notes should repeat the subprocess and network lines above.
