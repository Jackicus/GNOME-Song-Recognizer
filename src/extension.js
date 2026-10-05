import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {SongRecognizerApp} from './lib/app.js';

export default class SongRecognizerExtension extends Extension {
    enable() {
        this._app = new SongRecognizerApp(this);
        this._app.enable();
    }

    disable() {
        this._app.disable();
        this._app = null;
    }
}
