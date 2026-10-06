import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

// A combo row over a string key, in the order of `values`.
function choiceRow(settings, key, title, values, labels) {
    const row = new Adw.ComboRow({
        title,
        model: Gtk.StringList.new(labels),
        selected: Math.max(values.indexOf(settings.get_string(key)), 0),
    });
    row.connect('notify::selected', () => settings.set_string(key, values[row.selected]));
    return row;
}

// PipeWire's outputs (as '<name>.monitor', their sound) and inputs, as [value, label] pairs.
async function listDevices() {
    const proc = Gio.Subprocess.new(['pw-dump'], Gio.SubprocessFlags.STDOUT_PIPE);
    const [stdout] = await proc.communicate_utf8_async(null, null);
    const devices = [];
    for (const {type, info} of JSON.parse(stdout)) {
        const props = info?.props ?? {};
        if (type !== 'PipeWire:Interface:Node')
            continue;
        const label = props['node.description'] ?? props['node.name'];
        if (props['media.class'] === 'Audio/Sink')
            devices.push([`${props['node.name']}.monitor`, `Monitor of ${label}`]);
        else if (props['media.class'] === 'Audio/Source')
            devices.push([props['node.name'], label]);
    }
    return devices;
}

export default class SongRecButtonPreferences extends ExtensionPreferences {
    async fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();

        const listening = new Adw.PreferencesGroup({title: 'Listening'});
        let devices = [];
        try {
            devices = await listDevices();
        } catch (e) {
            console.error(`[SongRec Button] Could not list audio devices: ${e.message}`);
        }
        devices.unshift(['', 'Computer Sound'], ['microphone', 'Microphone']);
        const device = settings.get_string('device');
        if (!devices.some(([value]) => value === device))
            devices.push([device, `${device} (Not Connected)`]);
        listening.add(choiceRow(settings, 'device', 'Audio Input',
            devices.map(([value]) => value), devices.map(([, label]) => label)));
        const seconds = Adw.SpinRow.new_with_range(4, 20, 1);
        seconds.title = 'Listening Time';
        seconds.subtitle = 'Seconds recorded each time';
        settings.bind('listen-seconds', seconds, 'value', Gio.SettingsBindFlags.DEFAULT);
        listening.add(seconds);
        page.add(listening);

        const results = new Adw.PreferencesGroup({title: 'Results'});
        const notify = new Adw.SwitchRow({title: 'Notifications'});
        settings.bind('notify', notify, 'active', Gio.SettingsBindFlags.DEFAULT);
        results.add(notify);
        results.add(choiceRow(settings, 'click-action', 'Clicking a Song', ['open', 'search', 'copy'],
            ['Opens Its Shazam Page', 'Searches for It', 'Copies Its Title and Artist']));
        const searchUrl = new Adw.EntryRow({title: 'Search Link'});
        settings.bind('search-url', searchUrl, 'text', Gio.SettingsBindFlags.DEFAULT);
        results.add(searchUrl);
        page.add(results);

        const history = new Adw.PreferencesGroup({title: 'History'});
        const noDuplicates = new Adw.SwitchRow({
            title: 'No Duplicates',
            subtitle: 'A song found again moves to the top',
        });
        settings.bind('no-duplicates', noDuplicates, 'active', Gio.SettingsBindFlags.DEFAULT);
        history.add(noDuplicates);
        const size = Adw.SpinRow.new_with_range(1, 500, 1);
        size.title = 'Songs Kept';
        settings.bind('history-size', size, 'value', Gio.SettingsBindFlags.DEFAULT);
        history.add(size);
        const clear = new Adw.ButtonRow({title: 'Clear History'});
        clear.add_css_class('destructive-action');
        clear.connect('activated', () => settings.set_value('history', new GLib.Variant('aa{ss}', [])));
        history.add(clear);
        page.add(history);

        window.add(page);
    }
}
