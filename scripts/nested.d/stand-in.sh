# The stand-in world for 'start --stand-in' (and so 'shots'), since the pictures go into a public
# repository: invented songs whose covers are drawn here, and songrec and pw-record as stand-ins
# (EXT_STAND_IN_BINS), so nothing is recorded or sent while shooting.

# nested_stand_in HOME STAGE: once per start. One SVG cover per stand-in song, in HOME/covers.
nested_stand_in() {
    local dir="$1/covers" i colours
    colours=('#e66100 #613583' '#2ec27e #1c71d8' '#f5c211 #c01c28' '#3584e4 #241f31' '#dc8add #26a269')
    mkdir -p "$dir"
    for i in "${!colours[@]}"; do
        read -r a b <<< "${colours[$i]}"
        cat > "$dir/$i.svg" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="$a"/><stop offset="1" stop-color="$b"/>
  </linearGradient></defs>
  <rect width="128" height="128" fill="url(#g)"/>
  <circle cx="$((40 + i * 12))" cy="$((88 - i * 8))" r="$((22 + i * 4))" fill="#ffffff" fill-opacity="0.25"/>
  <circle cx="$((96 - i * 10))" cy="$((36 + i * 6))" r="14" fill="#000000" fill-opacity="0.2"/>
</svg>
SVG
    done
}

# The stand-in history: GVariant text for the 'history' key, newest first, covers from nested_stand_in.
stand_in_history() {
    local now songs i=0 out=""
    now="$(date +%s)"
    songs=('Paper Lanterns|The Quiet Hours' 'Slow Orbit|Northbound Static' 'Glasshouse|Ada Moreno'
        'Late Bloom|Copper Fields' 'Neon Tide|Mira Vale')
    for song in "${songs[@]}"; do
        out+="${out:+, }{'key': '$i', 'title': '${song%%|*}', 'artist': '${song#*|}',"
        out+=" 'cover': 'file://$STAND_IN_HOME/covers/$i.svg', 'url': '',"
        out+=" 'time': '$((now - i * i * 40000 - i * 900))'}"
        i=$((i + 1))
    done
    echo "[$out]"
}
