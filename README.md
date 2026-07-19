<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=120&section=header"/>
  
  # FuriMusic v2.2.0 — NotFrost
  ### *Drop beats, not packets*

  [![LOC](https://tokei.rs/b1/github/FrostX2/Frozen-discord-music-bot?category=code)](https://github.com/FrostX2/Frozen-discord-music-bot)
  [![GitHub top language](https://img.shields.io/github/languages/top/FrostX2/Frozen-discord-music-bot?style=for-the-badge&logo=javascript&color=ff69b4)](https://github.com/FrostX2/Frozen-discord-music-bot)
  [![GitHub last commit](https://img.shields.io/github/last-commit/FrostX2/Frozen-discord-music-bot?style=for-the-badge&color=9cf)](https://github.com/FrostX2/Frozen-discord-music-bot)
  [![GitHub license](https://img.shields.io/github/license/FrostX2/Frozen-discord-music-bot?style=for-the-badge&color=success)](https://github.com/FrostX2/Frozen-discord-music-bot)
  [![Visits Badge](https://badges.pufler.dev/visits/FrostX2/Frozen-discord-music-bot?style=for-the-badge)](https://badges.pufler.dev)
  
  [![Readme Card](https://github-readme-stats.vercel.app/api/pin/?username=FrostX2&repo=Frozen-discord-music-bot&theme=dracula)](https://github.com/FrostX2/Frozen-discord-music-bot)
</div>

---

> **"My music bot has better rhythm than I do. Sad."**

A **FuriMusic** with instant audio, supporting **YouTube**, **Spotify**, **YouTube Music**, and **SoundCloud**. Drop a link, type a name, and let the frozen vibes take over.

---

## Features

- **Auto-styled music channels** — every server gets its own vibe
- **Smart search fallback** — YouTube Music -> YouTube -> SoundCloud
- **Full playback control** — play, pause, skip, loop, queue, remove, clear queue, go back
- **Volume control** — 0 to 200
- **Auto-leave** — 2 min after queue ends, instantly if everyone ghosts
- **Now-playing embed** — with requester info
- **Admin panel** — web dashboard at `0.0.0.0:13426`
- **Custom bots** — add and manage multiple bot tokens
- **Invite generator** — one-click bot invite links
- **Password-protected** — session auth with "Remember me" option

---

## Quick Start

### 1. Clone & install
```bash
git clone https://github.com/FrostX2/Frozen-discord-music-bot.git
cd Frozen-discord-music-bot
npm install
```

### 2. Fill in the blanks
```bash
cp .env.example .env
```
Edit `.env` with your values from the [**Discord Developer Portal**](https://discord.com/developers/applications).

### 3. Start the bot
```bash
node start.js
```

The admin panel will be available at `http://0.0.0.0:13426`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Your bot token |
| `CLIENT_ID` | Yes | Your application ID |
| `GUILD_ID` | No | Scope slash commands to one guild (instant registration) |
| `PREFIX` | No | Command prefix (default: `!`) |
| `LAVALINK_HOST` | No | External Lavalink server (skips local NodeLink) |
| `LAVALINK_PORT` | No | Lavalink port (default: 443 external, 2333 local) |
| `LAVALINK_PASSWORD` | No | Lavalink auth password |
| `LAVALINK_SECURE` | No | Use WSS (default: true for external) |
| `WEB_PORT` | No | Admin panel port (default: 13426) |
| `ADMIN_PASSWORD` | No | Admin panel password (default: admin123) |
| `SESSION_SECRET` | No | Session encryption key (auto-generated if empty) |
| `WAIT_FOR_NODE` | No | Set `false` to skip waiting for Lavalink node |

---

## Deploy on Render

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install --include=dev --ignore-scripts` |
| **Start Command** | `node start.js` |
| **Node Version** | `>=22.22.2` |

---

## Admin Panel

The web dashboard provides:

- **Dashboard** — bot status, guild count, active players, latency, Lavalink status, uptime
- **Guilds** — list all servers with icons, member count, music channel
- **Players** — view/control active players with full playback controls, queue management (clear queue), volume, loop
- **Custom Bots** — add/remove/activate custom bot tokens
- **Invite Bot** — one-click invite link generator

Default password: `admin123` (change via `ADMIN_PASSWORD` in `.env`)

---

## Commands

| Prefix | Slash | Does what? |
|--------|-------|------------|
| `!play` / `!p` | `/play` `/p` | Drop a track |
| `!skip` | `/skip` | Next! |
| `!stop` / `!s` | `/stop` `/s` | Shut it down |
| `!pause` | `/pause` | Pause |
| `!resume` | `/resume` | Resume |
| `!volume` / `!vol` | `/volume` `/vol` | Crank it (0-200) |
| `!loop` | `/loop` | Forever and ever |
| `!queue` | `/queue` | What's next? |
| `!nowplaying` / `!np` | `/nowplaying` `/np` | What's this? |
| `!remove` | `/remove` | Remove a song (or `/remove all:true` to clear queue) |
| `!back` | `/back` | Previous track |
| `!filter` | `/filter` | Audio filters |
| `!help` | `/help` | You're looking at it |

---

## Credits

Based on [hongducdev/Music-Bot-Discord.js-v14](https://github.com/hongducdev/Music-Bot-Discord.js-v14) — remixed and frozen by **NotFrost**.

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=120&section=footer"/>
