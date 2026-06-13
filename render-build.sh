#!/usr/bin/env bash
set -e

# Download static yt-dlp binary (bundles Python, no deps needed)
curl -sL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -o yt-dlp
chmod +x yt-dlp
echo "yt-dlp: $(./yt-dlp --version)"
