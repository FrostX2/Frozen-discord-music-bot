#!/usr/bin/env bash
set -e

# Install yt-dlp binary
curl -sL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod +x /usr/local/bin/yt-dlp

# Install ffmpeg
apt-get update -qq && apt-get install -y -qq ffmpeg
