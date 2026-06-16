# FuriMusic — NotFrost

A Discord music bot with instant audio — supports YouTube, Spotify, YouTube Music, SoundCloud.

## Features

- Auto-creates styled music channels per server
- Search fallback: YouTube Music → YouTube → SoundCloud
- `/play`, `/p` — Play songs or playlists (URL or name)
- `/stop`, `/s` — Stop and leave
- `/volume`, `/vol` — Adjust volume (0-200)
- `/skip`, `/pause`, `/resume`, `/loop`, `/queue`, `/remove`, `/back`, `/filter`
- Auto-leave: 2 minutes after queue ends, instantly if no one in voice
- Now-playing embed with requester info

## Run Locally

1. Clone and install:
```console
git clone https://github.com/FrostX2/Frozen-discord-music-bot.git
cd Frozen-discord-music-bot
npm install --include=dev --ignore-scripts
```

2. Copy and fill `.env`:
```console
cp .env.example .env
```
Edit `DISCORD_TOKEN` and `CLIENT_ID` with your bot credentials from [Discord Developer Portal](https://discord.com/developers/applications).

3. Start:
```console
node start.js
```

## Deploy on Render

1. Create a **Web Service** on Render, connect your GitHub repo
2. Set:
   - **Build Command**: `npm install --include=dev --ignore-scripts`
   - **Start Command**: `node start.js`
   - **Node Version**: `>=22.22.2`
3. Add environment variables in Render dashboard:
   - `DISCORD_TOKEN` — your bot token
   - `CLIENT_ID` — your application ID
   - `LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_PASSWORD`, `LAVALINK_SECURE` — optional external Lavalink
   - `WAIT_FOR_NODE=false` — skip waiting for Lavalink node on startup
4. Deploy — Render will build and start automatically

> [!TIP]
> For external Lavalink, set the env vars above. Without them, NodeLink runs locally alongside the bot.

## Commands

| Prefix | Slash | Description |
|--------|-------|-------------|
| `!play` / `!p` | `/play` `/p` | Play a song |
| `!skip` | `/skip` | Skip current track |
| `!stop` / `!s` | `/stop` `/s` | Stop and leave |
| `!pause` | `/pause` | Pause playback |
| `!resume` | `/resume` | Resume playback |
| `!volume` / `!vol` | `/volume` `/vol` | Set volume (0-200) |
| `!loop` | `/loop` | Toggle loop |
| `!queue` | `/queue` | Show queue |
| `!nowplaying` / `!np` | `/nowplaying` `/np` | Show current song |
| `!remove` | `/remove` | Remove song from queue |
| `!back` | `/back` | Previous song |
| `!filter` | `/filter` | Apply audio filter |
| `!help` | `/help` | Show this help |

## License

Based on [hongducdev/Music-Bot-Discord.js-v14](https://github.com/hongducdev/Music-Bot-Discord.js-v14)
