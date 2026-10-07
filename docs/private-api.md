# Private shell API

What SongRec Button relies on that GNOME Shell does not offer as API, checked against
Shell 50's `ui/quickSettings.js` and `ui/popupMenu.js`. Each entry says what breaks when
the shell changes it.

## The history's `_delegate`

`SongRecButtonHistory` (`src/lib/app.js`) is a `PopupMenuSection` whose `actor` is an
`St.ScrollView` around its `box`, with `actor._delegate` set to the section, as the shell's
own `PopupSubMenu` does. `PopupMenuBase._getMenuItems()` finds a menu's items by the
`_delegate` of `box`'s children, and `removeAll()` and `destroy()` go through it.

If the shell stops finding items that way, the menu no longer destroys the history with
itself: the section's `Main.sessionMode` handler outlives every disable, and the history
leaves the menu's keyboard and separator bookkeeping. Nothing shows on screen; the history
still draws and scrolls.

## The toggle's menu is ours to destroy

Not a private call, but a reliance on the shell's behaviour: `QuickSettingsMenu` puts a
toggle's `menu.actor` in its overlay (`_completeAddItem`) and never removes it, so
`SongRecButtonToggle` destroys its menu when it is destroyed. If the shell starts
destroying the menu itself, ours is a second `destroy()` of the same menu: the actor is
already gone and the menu emits `destroy` twice.

## Not private

The top-bar icon is an `St.Icon` with the shell's `system-status-icon` class, added to the
`SystemIndicator` (an `St.BoxLayout`), which is shown only while listening. The shell's
`SystemIndicator._addIndicator()` does the same and is not used.
