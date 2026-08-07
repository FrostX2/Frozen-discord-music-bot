<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=120&section=header"/>
  
  # FuriMusic — NotFrost
  ### *Drop beats, not packets*

  [![GitHub top language](https://img.shields.io/github/languages/top/FrostX2/Frozen-discord-music-bot?style=for-the-badge&logo=javascript&color=ff69b4)](https://github.com/FrostX2/Frozen-discord-music-bot)
  [![GitHub last commit](https://img.shields.io/github/last-commit/FrostX2/Frozen-discord-music-bot?style=for-the-badge&color=9cf)](https://github.com/FrostX2/Frozen-discord-music-bot)
  [![GitHub license](https://img.shields.io/github/license/FrostX2/Frozen-discord-music-bot?style=for-the-badge&color=success)](https://github.com/FrostX2/Frozen-discord-music-bot)
  [![Visits Badge](https://badges.pufler.dev/visits/FrostX2/Frozen-discord-music-bot?style=for-the-badge)](https://badges.pufler.dev)
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
- **Queue persistence** — SQLite-backed queue survives bot restarts, auto-join and resume if users are in voice
- **Redesigned now-playing embed** — a single embed in the music channel that auto-replaces itself, with a live progress bar, artist, volume, loop state and requester info
- **Added-to-queue notifications** — paste a song name or link and get a *"Added to Queue"* card that cleans itself up after 3 seconds
- **Clean command handling** — command messages are deleted and the bot replies 3 seconds later
- **Admin panel** — web dashboard at `0.0.0.0:13426`
- **Custom bots** — add and manage multiple bot tokens
- **Invite generator** — one-click bot invite links
- **Password-protected** — session auth with "Remember me" option

---

## Music Channel

Every server gets a **🎵┊𝓯𝓾𝓻𝓲𝓶𝓾𝓼𝓲𝓬** text channel. It's a self-cleaning music hub:

- **Paste a song name or link** — the bot plays it and posts an *"Added to Queue"* card (song title, duration, channel). Both your message and the card are deleted after **3 seconds**.
- **One persistent now-playing embed** — when a track starts, any existing embed in the channel is cleared silently and a single redesigned now-playing embed takes its place. It stays until the track ends.
- **Commands** — command messages are deleted immediately, and the bot replies **3 seconds** later so the channel stays clean.

---

## Quick Start

### 1. Clone & install
```bash
git clone https://github.com/FrostX2/furimusic-based.git
cd furimusic-based
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
| `LAVALINK_HOST` | No | External Lavalink main node (defaults to local NodeLink if unset) |
| `LAVALINK_PORT` | No | Main node port (default: 443, or 80 if not secure) |
| `LAVALINK_PASSWORD` | No | Main node auth password |
| `LAVALINK_SECURE` | No | Use WSS (default: true) |
| `ALT_LAVALINK_HOST_1.._10` | No | Alternative (failover) Lavalink nodes, one block per index |
| `ALT_LAVALINK_PORT_<n>` | No | Alt node port (default: 443, or 80 if not secure) |
| `ALT_LAVALINK_PASSWORD_<n>` | No | Alt node password (default: `LAVALINK_PASSWORD`) |
| `ALT_LAVALINK_SECURE_<n>` | No | Alt node WSS (default: true) |
| `ALT_LAVALINK_TYPE_<n>` | No | Alt node type — `Lavalink` or `NodeLink` (default: `Lavalink`) |
| `ALT_LAVALINK_ID_<n>` | No | Alt node id (default: `alt<index>`) |
| `NODELINK_PORT` | No | Local NodeLink port (default: 2333) |
| `NODELINK_PASSWORD` | No | Local NodeLink auth password (default: youshallnotpass) |
| `SKIP_NODELINK` | No | Set `true` to not start the local NodeLink fallback |
| `RECONNECT_COOLDOWN` | No | Auto-reconnect cooldown when all nodes are down, in ms (default: 900000 = 15 min) |
| `RECONNECT_CHECK_INTERVAL` | No | How often to check for auto-reconnect, in ms (default: 60000) |
| `WEB_PORT` | No | Admin panel port (default: 13426) |
| `ADMIN_PASSWORD` | No | Admin panel password (default: admin123) |
| `SESSION_SECRET` | No | Session encryption key (auto-generated if empty) |
| `WAIT_FOR_NODE` | No | Set `false` to skip waiting for Lavalink node |

---

## Audio Server & Failover

The bot connects to up to **1 main + 10 alt + 1 local NodeLink** nodes.
Playback automatically fails over to the next available node when the current one drops.

```
main  ->  alt1  ->  alt2  ->  ...  ->  alt5  ->  nodelink (bottom fallback)
```

Nodes are always picked in priority order (main first, then alt1→alt5, then NodeLink).
On a node disconnect, active players are moved to the highest-priority connected node,
reconnects try to bring **all** configured nodes back up, and players automatically
migrate back to `main` (or the next higher-priority node) once it recovers.

When **all** nodes are down, the bot checks every `RECONNECT_CHECK_INTERVAL` and only
auto-retries after `RECONNECT_COOLDOWN` (default 15 min). Run `/reconnect` (or
`!reconnect`) anytime to force a reconnect attempt immediately.

- **Main** — set `LAVALINK_HOST` for an external Lavalink server.
- **Alts** — add one indexed block per backup node:
  ```
  ALT_LAVALINK_HOST_1=alt1.example.com
  ALT_LAVALINK_PORT_1=443
  ALT_LAVALINK_PASSWORD_1=pass1
  ALT_LAVALINK_SECURE_1=true
  ALT_LAVALINK_TYPE_1=Lavalink
  ALT_LAVALINK_ID_1=alt1
  ```
- **NodeLink** — the bundled self-hosted server is always started as the bottom fallback (`node start.js`). If all external nodes are commented out, it becomes the only node. Set `SKIP_NODELINK=true` to disable.

---

## Deploy on Render

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install --include=dev --ignore-scripts` |
| **Start Command** | `node start.js` |
| **Node Version** | `>=22.22.2` |

---

## Web Panel

Two views, split by access:

- **Public status page** (`/`) — live bot status, stats, and now-playing, no login required
- **Admin dashboard** (`/admin`) — full control, protected by username + password

The admin dashboard provides:

- **Dashboard** — bot status, guild count, active players, latency, Lavalink status, uptime
- **Guilds** — list all servers with icons, member count, music channel
- **Players** — view/control active players with full playback controls, queue management (clear queue), volume, loop
- **Custom Bots** — add/remove/activate custom bot tokens
- **Invite Bot** — one-click invite link generator

Default login: `admin` / `admin123` (change via `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`)

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
