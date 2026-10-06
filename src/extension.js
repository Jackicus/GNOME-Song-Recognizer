import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {SongRecButtonApp} from './lib/app.js';

export default class SongRecButtonExtension extends Extension {
    enable() {
        this._app = new SongRecButtonApp(this);
        this._app.enable();
    }

    disable() {
        this._app.disable();
        this._app = null;
    }
}
