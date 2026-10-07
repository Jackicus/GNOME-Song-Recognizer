import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {QuickMenuToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';

import {isInstalled, recognize} from './recognizer.js';

const ICON = 'audio-x-generic-symbolic';
const READY = null;
const DIM_OPACITY = 160;

function formatTime(unix) {
    const time = GLib.DateTime.new_from_unix_local(Number(unix));
    const today = GLib.DateTime.new_now_local().format('%F');
    return time.format(time.format('%F') === today ? '%R' : '%e %b').trim();
}

function coverIcon(song) {
    return song.cover ? new Gio.FileIcon({file: Gio.File.new_for_uri(song.cover)}) : null;
}

const SongRecButtonSongItem = GObject.registerClass(
class SongRecButtonSongItem extends PopupMenu.PopupBaseMenuItem {
    constructor(song, onRemove) {
        super({style_class: 'songrec-button-song'});

        this.add_child(new St.Icon({
            gicon: coverIcon(song),
            fallback_icon_name: ICON,
            icon_size: 32,
            y_align: Clutter.ActorAlign.CENTER,
        }));

        const text = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        text.add_child(new St.Label({text: song.title, style_class: 'songrec-button-title'}));
        text.add_child(new St.Label({
            text: `${song.artist} · ${formatTime(song.time)}`,
            opacity: DIM_OPACITY,
        }));
        this.add_child(text);

        const remove = new St.Button({
            style_class: 'icon-button flat',
            child: new St.Icon({icon_name: 'window-close-symbolic'}),
            accessible_name: 'Remove from History',
            y_align: Clutter.ActorAlign.CENTER,
        });
        remove.connect('clicked', () => onRemove(song));
        this.add_child(remove);
    }
});

// Quick settings menus do not scroll, and a long history would outgrow the screen. The
// section's actor is a scroll view around its box, as the shell's PopupSubMenu has.
class SongRecButtonHistory extends PopupMenu.PopupMenuSection {
    constructor() {
        super();
        this.actor = new St.ScrollView({
            style_class: 'songrec-button-history vfade',
            hscrollbar_policy: St.PolicyType.NEVER,
            child: this.box,
        });
        this.actor._delegate = this;
    }
}

// The pill: clicking it listens (and stops listening), its menu holds the history.
const SongRecButtonToggle = GObject.registerClass(
class SongRecButtonToggle extends QuickMenuToggle {
    constructor(app) {
        super({title: 'SongRec', subtitle: READY, iconName: ICON, toggleMode: false});
        this._app = app;
        this.connect('clicked', () => app.toggle());
        // The shell puts the menu in quick settings and never takes it out.
        this.connect('destroy', () => this.menu.destroy());

        this.menu.setHeader(ICON, 'SongRec', 'History');

        this._songs = new SongRecButtonHistory();
        this.menu.addMenuItem(this._songs);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addAction('Settings', () => {
            Main.panel.closeQuickSettings();
            app.openPreferences();
        });

        app.settings.connectObject('changed::history', () => this._syncHistory(), this);
        this._syncHistory();
    }

    _syncHistory() {
        this._songs.removeAll();
        const songs = this._app.songs();
        if (songs.length === 0)
            this._songs.addMenuItem(new PopupMenu.PopupMenuItem('No Songs Yet', {reactive: false}));
        for (const song of songs) {
            const item = new SongRecButtonSongItem(song, s => this._app.remove(s));
            item.connect('activate', () => {
                Main.panel.closeQuickSettings();
                this._app.activate(song);
            });
            this._songs.addMenuItem(item);
        }
    }
});

const SongRecButtonIndicator = GObject.registerClass(
class SongRecButtonIndicator extends SystemIndicator {
    constructor(app) {
        super();
        // In the top bar only while listening.
        this._icon = this._addIndicator();
        this._icon.icon_name = ICON;
        this._icon.visible = false;
        this.toggle = new SongRecButtonToggle(app);
        this.quickSettingsItems.push(this.toggle);
    }

    setBusy(busy) {
        this._icon.visible = busy;
        this.toggle.checked = busy;
    }

    setStatus(text) {
        this.toggle.subtitle = text;
    }
});

export class SongRecButtonApp {
    constructor(extension) {
        this._extension = extension;
        this._cancellable = null;
    }

    enable() {
        this.settings = this._extension.getSettings();
        this.settings.connectObject('changed::history-size', () => this._setHistory(this.songs()), this);
        this._indicator = new SongRecButtonIndicator(this);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        this.settings.disconnectObject(this);
        this._cancellable?.cancel();
        this._cancellable = null;
        this._source?.destroy();
        this._indicator.toggle.destroy();
        this._indicator.destroy();
        this._indicator = null;
        this.settings = null;
    }

    openPreferences() {
        this._extension.openPreferences();
    }

    songs() {
        return this.settings.get_value('history').recursiveUnpack();
    }

    _setHistory(songs) {
        songs = songs.slice(0, this.settings.get_int('history-size'));
        this.settings.set_value('history', new GLib.Variant('aa{ss}', songs));
    }

    remove(song) {
        this._setHistory(this.songs().filter(s => s.time !== song.time));
    }

    activate(song) {
        const action = this.settings.get_string('click-action');
        const name = `${song.title} – ${song.artist}`;
        if (action === 'copy') {
            St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, name);
            return;
        }
        const uri = action === 'search'
            ? this.settings.get_string('search-url') + GLib.uri_escape_string(`${song.title} ${song.artist}`, null, false)
            : song.url;
        Gio.AppInfo.launch_default_for_uri(uri, global.create_app_launch_context(0, -1));
    }

    toggle() {
        if (this._cancellable) {
            this._cancellable.cancel();
            return;
        }
        if (!isInstalled()) {
            this._report('SongRec Is Missing', 'Install it to recognize songs');
            return;
        }
        const cancellable = new Gio.Cancellable();
        this._cancellable = cancellable;
        this._indicator.setBusy(true);
        this._listen(cancellable).catch(e => {
            if (!(e instanceof GLib.Error && e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))) {
                console.error(`[SongRec Button] ${e.message}`);
                this._report('Recognition Failed', e.message);
            }
        }).finally(() => {
            // After disable() the cancellable has already been dropped.
            if (this._cancellable !== cancellable)
                return;
            this._cancellable = null;
            this._indicator.setBusy(false);
            if (cancellable.is_cancelled())
                this._indicator.setStatus(READY);
        });
    }

    async _listen(cancellable) {
        this._indicator.setStatus('Listening…');
        const song = await recognize({
            seconds: this.settings.get_int('listen-seconds'),
            device: this.settings.get_string('device'),
            cancellable,
            onSearching: () => this._indicator.setStatus('Searching…'),
        });
        if (!song) {
            this._report('No Match', 'Try again while the music is playing');
            return;
        }
        let songs = this.songs();
        if (this.settings.get_boolean('no-duplicates'))
            songs = songs.filter(s => s.key !== song.key);
        this._setHistory([song, ...songs]);
        this._report(song.title, song.artist, song);
    }

    // The pill's subtitle keeps the last result; a notification says it when they are on.
    _report(title, body, song = null) {
        this._indicator.setStatus(song ? song.title : title);
        if (!this.settings.get_boolean('notify'))
            return;
        if (!this._source) {
            this._source = new MessageTray.Source({title: 'SongRec', iconName: ICON});
            this._source.connect('destroy', () => (this._source = null));
            Main.messageTray.add(this._source);
        }
        const notification = new MessageTray.Notification({
            source: this._source,
            title,
            body,
            gicon: song ? coverIcon(song) : null,
            isTransient: true,
        });
        if (song)
            notification.connect('activated', () => this.activate(song));
        this._source.addNotification(notification);
    }
}
