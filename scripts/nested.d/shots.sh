#   ./scripts/nested.sh shots [--out DIR]
#                                     start a stand-in nested shell (headless), photograph
#                                     the menu with its history and the quick settings
#                                     button into docs/screenshots/ (or DIR), and stop it
#

# Click points on a 1600x900 monitor, measured with the driver's recording indicator in the bar
# (it shifts the buttons left of it). Re-measure with 'start --stand-in --headless' and
# 'do "click 1383 16" "shot FILE 0 0 1600 36"'.
SHOTS_BUTTON="1383 16"
SHOTS_HISTORY="1300 255"
SHOTS_QUICK_SETTINGS="1540 16"

cmd_shots() {
    local out="$REPO_DIR/docs/screenshots" status=0
    while (( $# )); do
        case "$1" in
            --out) out="${2:-}"; [[ -n "$out" ]] || die "--out takes a directory."; shift ;;
            *)     die "Unknown shots option '$1'. Usage: shots [--out DIR]" ;;
        esac
        shift
    done
    is_running && die "A nested shell is running: './scripts/nested.sh stop' it first. Shots start one of their own, over stand-in data."
    mkdir -p "$out"
    out="$(cd "$out" && pwd)"

    cmd_start --stand-in --headless || return 1
    shots_take "$out" || status=1
    stop_session "" || status=1
    (( status == 0 )) || return 1
    if command -v oxipng >/dev/null 2>&1; then
        oxipng --quiet --opt 4 --strip safe "$out"/*.png
    else
        warn "oxipng is not installed: the shots still carry their text chunks. Strip them before committing."
    fi
    info "Screenshots in ${out#"$REPO_DIR"/}/"
}

shots_set() {
    cmd_run timeout 5 gsettings --schemadir "$STAGE_DIR/schemas" set "org.gnome.shell.extensions.${EXT_UUID%@*}" "$@"
}

# One driver run per click: the recording indicator leaves the bar only when the driver exits,
# and outlives it by a few seconds, so each picture waits for it to go.
shots_do() {
    cmd_do "$@" >/dev/null || { warn "The driver could not run: $*"; return 1; }
}

shots_take() {
    local out="$1"
    shots_set click-action copy || return 1
    shots_set history "$(stand_in_history)" || return 1

    info "Photographing the menu..."
    shots_do "click $SHOTS_BUTTON" "wait 1" "click $SHOTS_HISTORY" "wait 1" || return 1
    shots_do "wait 6" "shot $out/menu.png 1200 0 400 600" || return 1
    shots_do "key Escape" || return 1

    info "Photographing quick settings..."
    shots_set location quick-settings || return 1
    shots_do "click $SHOTS_QUICK_SETTINGS" "wait 1" || return 1
    shots_do "wait 6" "shot $out/quick-settings.png 1170 0 430 130" || return 1
    shots_do "key Escape" || return 1
}
