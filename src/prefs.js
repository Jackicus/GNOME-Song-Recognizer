import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// A combo row over a string key with <choices>, in the order of `values`.
function choiceRow(settings, key, title, values, labels) {
    const row = new Adw.ComboRow({
        title,
        model: Gtk.StringList.new(labels),
        selected: values.indexOf(settings.get_string(key)),
    });
    row.connect('notify::selected', () => settings.set_string(key, values[row.selected]));
    return row;
}

export default class SongRecognizerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();

        const button = new Adw.PreferencesGroup({title: 'Button'});
        button.add(choiceRow(settings, 'location', 'Location', ['panel', 'quick-settings'],
            ['Top Bar, with History', 'Quick Settings, beside Screenshot']));
        page.add(button);

        const listening = new Adw.PreferencesGroup({title: 'Listening'});
        const microphone = new Adw.SwitchRow({
            title: 'Use the Microphone',
            subtitle: 'Instead of the sound this computer is playing',
        });
        settings.bind('microphone', microphone, 'active', Gio.SettingsBindFlags.DEFAULT);
        listening.add(microphone);
        const seconds = Adw.SpinRow.new_with_range(4, 20, 1);
        seconds.title = 'Listening Time';
        seconds.subtitle = 'Seconds recorded each time';
        settings.bind('listen-seconds', seconds, 'value', Gio.SettingsBindFlags.DEFAULT);
        listening.add(seconds);
        page.add(listening);

        const results = new Adw.PreferencesGroup({title: 'Results'});
        results.add(choiceRow(settings, 'click-action', 'Clicking a Song', ['open', 'copy'],
            ['Opens Its Shazam Page', 'Copies Its Title and Artist']));
        const notify = new Adw.SwitchRow({
            title: 'Notify',
            subtitle: 'When the menu is closed. In quick settings, always.',
        });
        settings.bind('notify', notify, 'active', Gio.SettingsBindFlags.DEFAULT);
        results.add(notify);
        page.add(results);

        const history = new Adw.PreferencesGroup({title: 'History'});
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
