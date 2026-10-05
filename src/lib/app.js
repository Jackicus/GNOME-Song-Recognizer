import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {isInstalled, recognize} from './recognizer.js';

const ICON = 'audio-x-generic-symbolic';
const DIM_OPACITY = 160;
// A breathing pulse while listening: a state, not a transition, so slower than the shell's motion.
const PULSE_MS = 900;

function formatTime(unix) {
    const time = GLib.DateTime.new_from_unix_local(Number(unix));
    const today = GLib.DateTime.new_now_local();
    return time.format(time.get_ymd().join() === today.get_ymd().join() ? '%R' : '%e %b').trim();
}

const SongRecognizerSongItem = GObject.registerClass(
class SongRecognizerSongItem extends PopupMenu.PopupBaseMenuItem {
    constructor(song, {large = false, onRemove = null} = {}) {
        super({style_class: large ? 'song-recognizer-latest' : 'song-recognizer-song'});

        this.add_child(new St.Icon({
            style_class: 'song-recognizer-cover',
            gicon: song.cover ? new Gio.FileIcon({file: Gio.File.new_for_uri(song.cover)}) : null,
            fallback_icon_name: ICON,
            icon_size: large ? 64 : 32,
            y_align: Clutter.ActorAlign.CENTER,
        }));

        const text = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        text.add_child(new St.Label({text: song.title, style_class: 'song-recognizer-title'}));
        text.add_child(new St.Label({
            text: `${song.artist} · ${formatTime(song.time)}`,
            opacity: DIM_OPACITY,
        }));
        this.add_child(text);

        if (onRemove) {
            const remove = new St.Button({
                style_class: 'icon-button song-recognizer-remove',
                child: new St.Icon({icon_name: 'window-close-symbolic'}),
                accessible_name: 'Remove from History',
                y_align: Clutter.ActorAlign.CENTER,
            });
            remove.connect('clicked', () => onRemove(song));
            this.add_child(remove);
        }
    }
});

const SongRecognizerIndicator = GObject.registerClass(
class SongRecognizerIndicator extends PanelMenu.Button {
    _init(extension, settings) {
        super._init(0.5, extension.metadata.name);
        this._name = extension.metadata.name;
        this._settings = settings;

        this._icon = new St.Icon({icon_name: ICON, style_class: 'system-status-icon'});
        this.add_child(this._icon);

        const header = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style_class: 'song-recognizer-header',
        });
        const box = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
        });
        this._button = new St.Button({
            style_class: 'song-recognizer-record',
            can_focus: true,
            accessible_name: 'Recognize',
            x_align: Clutter.ActorAlign.CENTER,
            child: new St.Icon({icon_name: ICON}),
        });
        this._button.connect('clicked', () => this._toggle());
        this._status = new St.Label({
            style_class: 'song-recognizer-status',
            x_align: Clutter.ActorAlign.CENTER,
        });
        box.add_child(this._button);
        box.add_child(this._status);
        header.add_child(box);
        this.menu.addMenuItem(header);

        this._latest = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._latest);
        this._history = new PopupMenu.PopupSubMenuMenuItem('History');
        this.menu.addMenuItem(this._history);

        this._settings.connectObject(
            'changed::history', () => this._syncHistory(),
            'changed::history-size', () => this._setHistory(this._songs()),
            this);
        this._setStatus();
        this._syncHistory();
    }

    _songs() {
        return this._settings.get_value('history').recursiveUnpack();
    }

    _setHistory(songs) {
        songs = songs.slice(0, this._settings.get_int('history-size'));
        this._settings.set_value('history', new GLib.Variant('aa{ss}', songs));
    }

    _syncHistory() {
        const songs = this._songs();
        this._latest.removeAll();
        this._history.menu.removeAll();
        this._history.visible = songs.length > 0;
        if (songs.length === 0)
            return;

        this._latest.addMenuItem(this._songItem(songs[0], {large: true}));
        this._history.label.text = `History (${songs.length})`;
        const onRemove = song => this._setHistory(this._songs().filter(s => s.time !== song.time));
        for (const song of songs)
            this._history.menu.addMenuItem(this._songItem(song, {onRemove}));
    }

    _songItem(song, params) {
        const item = new SongRecognizerSongItem(song, params);
        item.connect('activate', () => this._activate(song));
        return item;
    }

    _activate(song) {
        if (this._settings.get_string('click-action') === 'copy') {
            St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD,
                `${song.title} – ${song.artist}`);
        } else {
            Gio.AppInfo.launch_default_for_uri(song.url,
                global.create_app_launch_context(0, -1));
        }
    }

    _setStatus(text = isInstalled() ? 'Recognize the Song Playing' : 'Install SongRec to Recognize Songs') {
        this._status.text = text;
    }

    _setBusy(busy) {
        this._button.child.icon_name = busy ? 'media-playback-stop-symbolic' : ICON;
        this._button.accessible_name = busy ? 'Stop' : 'Recognize';
        if (busy) {
            this._icon.add_style_class_name('song-recognizer-busy');
            this._button.ease({
                opacity: DIM_OPACITY,
                duration: PULSE_MS,
                mode: Clutter.AnimationMode.EASE_IN_OUT_SINE,
                autoReverse: true,
                repeatCount: -1,
            });
        } else {
            this._icon.remove_style_class_name('song-recognizer-busy');
            this._button.remove_all_transitions();
            this._button.opacity = 255;
        }
    }

    _toggle() {
        if (this._cancellable) {
            this._cancellable.cancel();
            return;
        }
        if (!isInstalled()) {
            this._setStatus();
            return;
        }
        const cancellable = new Gio.Cancellable();
        this._cancellable = cancellable;
        this._setBusy(true);
        this._listen(cancellable).catch(e => {
            if (!e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
                console.error(`[Song Recognizer] ${e.message}`);
                this._report('Recognition Failed', e.message);
            }
        }).finally(() => {
            // A destroyed indicator has already dropped its cancellable.
            if (this._cancellable !== cancellable)
                return;
            this._cancellable = null;
            this._setBusy(false);
            if (cancellable.is_cancelled())
                this._setStatus();
        });
    }

    async _listen(cancellable) {
        this._setStatus('Listening…');
        const song = await recognize({
            seconds: this._settings.get_int('listen-seconds'),
            microphone: this._settings.get_boolean('microphone'),
            cancellable,
            onSearching: () => this._setStatus('Searching…'),
        });
        if (!song) {
            this._report('No Match', 'Try again while the music is playing');
            return;
        }
        const songs = this._songs();
        if (songs.length > 0 && songs[0].key === song.key)
            songs.shift();
        this._setHistory([song, ...songs]);
        this._report(song.title, song.artist, song);
    }

    // Says it in the menu, and in a notification when the menu was closed meanwhile.
    _report(title, body, song = null) {
        this._setStatus(song ? 'Recognize the Song Playing' : `${title}. ${body}.`);
        if (this.menu.isOpen || !this._settings.get_boolean('notify'))
            return;
        if (!this._source) {
            this._source = new MessageTray.Source({title: this._name, iconName: ICON});
            this._source.connect('destroy', () => (this._source = null));
            Main.messageTray.add(this._source);
        }
        const notification = new MessageTray.Notification({
            source: this._source,
            title,
            body,
            gicon: song?.cover ? new Gio.FileIcon({file: Gio.File.new_for_uri(song.cover)}) : null,
            isTransient: true,
        });
        if (song?.url)
            notification.connect('activated', () => this._activate(song));
        this._source.addNotification(notification);
    }

    destroy() {
        this._cancellable?.cancel();
        this._cancellable = null;
        this._source?.destroy();
        super.destroy();
    }
});

export class SongRecognizerApp {
    constructor(extension) {
        this._extension = extension;
    }

    enable() {
        this._indicator = new SongRecognizerIndicator(this._extension, this._extension.getSettings());
        Main.panel.addToStatusArea(this._extension.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
