import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

const SIGINT = 2;

function lastLine(text) {
    return text.trim().split('\n').pop();
}

// pw-record has no length option: it is stopped with SIGINT, which makes it finish the WAV header.
// `device` is '' for the default output's sound, 'microphone' for the default input,
// an output's node name with '.monitor' for its sound, or an input's node name.
async function record(path, seconds, device, cancellable) {
    const argv = ['pw-record', '--rate', '16000', '--channels', '1'];
    const monitor = device === '' || device.endsWith('.monitor');
    if (monitor)
        argv.push('-P', '{ stream.capture.sink=true }');
    if (device !== '' && device !== 'microphone')
        argv.push('--target', monitor ? device.slice(0, -'.monitor'.length) : device);
    argv.push(path);
    const proc = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDERR_PIPE);
    const stop = () => proc.send_signal(SIGINT);
    let timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, seconds, () => {
        timer = 0;
        stop();
        return GLib.SOURCE_REMOVE;
    });
    const handler = cancellable.connect(stop);
    const [, stderr] = await proc.communicate_utf8_async(null, null);
    cancellable.disconnect(handler);
    // pw-record exits 1 even when SIGINT stops it, so a failure is an exit before the stop.
    if (timer) {
        GLib.Source.remove(timer);
        if (!cancellable.is_cancelled())
            throw new Error(`pw-record: ${lastLine(stderr) || 'stopped early'}`);
    }
}

async function match(path, cancellable) {
    const proc = Gio.Subprocess.new(['songrec', 'audio-file-to-recognized-song', path],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
    const handler = cancellable.connect(() => proc.force_exit());
    try {
        const [stdout, stderr] = await proc.communicate_utf8_async(null, cancellable);
        if (!proc.get_successful())
            throw new Error(lastLine(stderr) || 'SongRec failed');
        return JSON.parse(stdout);
    } finally {
        cancellable.disconnect(handler);
    }
}

export function isInstalled() {
    return GLib.find_program_in_path('songrec') !== null;
}

// Records the chosen device and asks SongRec what it is.
// Resolves to a history entry, or null when nothing matched.
export async function recognize({seconds, device, cancellable, onSearching}) {
    const [file, stream] = Gio.File.new_tmp('songrec-button-XXXXXX.wav');
    stream.close(null);
    try {
        await record(file.get_path(), seconds, device, cancellable);
        cancellable.set_error_if_cancelled();
        onSearching();
        const {track} = await match(file.get_path(), cancellable);
        if (!track)
            return null;
        return {
            key: track.key ?? '',
            title: track.title ?? '',
            artist: track.subtitle ?? '',
            cover: track.images?.coverart ?? '',
            url: track.url ?? '',
            time: String(Math.floor(Date.now() / 1000)),
        };
    } finally {
        file.delete(null);
    }
}
