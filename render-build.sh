#!/usr/bin/env bash
set -e

# Install yt-dlp via pip (user-level, no root needed)
pip install --user yt-dlp -q
export PATH="$HOME/.local/bin:$PATH"
echo "yt-dlp: $(which yt-dlp)"

# Install ffmpeg static binary
FFMPEG_DIR="$HOME/ffmpeg"
mkdir -p "$FFMPEG_DIR"
curl -sL "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" | tar xJ -C "$FFMPEG_DIR" --strip-components=1
export PATH="$FFMPEG_DIR:$PATH"
echo "ffmpeg: $(which ffmpeg)"
