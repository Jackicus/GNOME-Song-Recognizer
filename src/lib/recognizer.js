import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

Gio._promisify(Gio.Subprocess.prototype, 'wait_async');
Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

const SIGINT = 2;

// pw-record has no length option: it is stopped with SIGINT, which makes it finish the WAV header.
async function record(path, seconds, microphone, cancellable) {
    const argv = ['pw-record', '--rate', '16000', '--channels', '1', path];
    if (!microphone)
        argv.splice(1, 0, '-P', '{ stream.capture.sink=true }');
    const proc = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDERR_SILENCE);
    const stop = () => proc.send_signal(SIGINT);
    let timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, seconds, () => {
        timer = 0;
        stop();
        return GLib.SOURCE_REMOVE;
    });
    const handler = cancellable.connect(stop);
    await proc.wait_async(null);
    cancellable.disconnect(handler);
    if (timer)
        GLib.Source.remove(timer);
}

async function match(path, cancellable) {
    const proc = Gio.Subprocess.new(['songrec', 'audio-file-to-recognized-song', path],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
    const handler = cancellable.connect(() => proc.force_exit());
    try {
        const [stdout, stderr] = await proc.communicate_utf8_async(null, cancellable);
        if (!proc.get_successful())
            throw new Error(stderr.trim().split('\n').pop() || 'SongRec failed');
        return JSON.parse(stdout);
    } finally {
        cancellable.disconnect(handler);
    }
}

export function isInstalled() {
    return GLib.find_program_in_path('songrec') !== null;
}

// Records the computer's sound (or the microphone) and asks SongRec what it is.
// Resolves to a history entry, or null when nothing matched.
export async function recognize({seconds, microphone, cancellable, onSearching}) {
    const [file, stream] = Gio.File.new_tmp('song-recognizer-XXXXXX.wav');
    stream.close(null);
    try {
        await record(file.get_path(), seconds, microphone, cancellable);
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
