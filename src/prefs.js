import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const CLICK_ACTIONS = ['open', 'copy'];

export default class SongRecognizerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();

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
        const click = new Adw.ComboRow({
            title: 'Clicking a Song',
            model: Gtk.StringList.new(['Opens Its Shazam Page', 'Copies Its Title and Artist']),
            selected: CLICK_ACTIONS.indexOf(settings.get_string('click-action')),
        });
        click.connect('notify::selected',
            () => settings.set_string('click-action', CLICK_ACTIONS[click.selected]));
        results.add(click);
        const notify = new Adw.SwitchRow({
            title: 'Notify',
            subtitle: 'When the menu was closed while listening',
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
