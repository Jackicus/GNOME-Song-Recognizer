# Private shell API

What Song Recognizer reaches that the shell does not export, and what breaks when it moves.
Checked against GNOME Shell 50.

| Reach | Where | Why | When it moves |
|---|---|---|---|
| `Main.panel.statusArea.quickSettings._system._systemItem.child` | `lib/app.js`, `_place()` | The row of round buttons at the top of quick settings (`status/system.js`, `SystemItem`), where the `quick-settings` location puts its button | The `try` logs "No place in quick settings" and the button is not shown; the top-bar location is unaffected |
| The screenshot button found by `icon_name === 'screenshooter-symbolic'` | the same | `ScreenshotItem` is not exported; the button goes just before it | Not found: the button goes first in the row |
