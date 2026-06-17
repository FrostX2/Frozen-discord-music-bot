<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=120&section=header"/>
  
  # 🎵 FuriMusic — NotFrost
  ### *Drop beats, not packets*

  [![LOC](https://tokei.rs/b1/github/FrostX2/Frozen-discord-music-bot?category=code)](https://github.com/FrostX2/Frozen-discord-music-bot)
  [![GitHub top language](https://img.shields.io/github/languages/top/FrostX2/Frozen-discord-music-bot?style=for-the-badge&logo=javascript&color=ff69b4)](https://github.com/FrostX2/Frozen-discord-music-bot)
  [![GitHub last commit](https://img.shields.io/github/last-commit/FrostX2/Frozen-discord-music-bot?style=for-the-badge&color=9cf)](https://github.com/FrostX2/Frozen-discord-music-bot)
  [![GitHub license](https://img.shields.io/github/license/FrostX2/Frozen-discord-music-bot?style=for-the-badge&color=success)](https://github.com/FrostX2/Frozen-discord-music-bot)
  [![Visits Badge](https://badges.pufler.dev/visits/FrostX2/Frozen-discord-music-bot?style=for-the-badge)](https://badges.pufler.dev)
  
  [![Readme Card](https://github-readme-stats.vercel.app/api/pin/?username=FrostX2&repo=Frozen-discord-music-bot&theme=dracula)](https://github.com/FrostX2/Frozen-discord-music-bot)
</div>

---

> **"My music bot has better rhythm than I do. Sad."** 🥁

A **FuriMusic** with instant audio, supporting **YouTube**, **Spotify**, **YouTube Music**, and **SoundCloud**. Drop a link, type a name, and let the frozen vibes take over.

---

## 🎧 Features

- 🎨 **Auto-styled music channels** — every server gets its own vibe
- 🔍 **Smart search fallback** — YouTube Music → YouTube → SoundCloud
- ⏯️ **Full playback control** — play, pause, skip, loop, queue, remove, go back
- 🎛️ **Audio filters** — because vanilla gets boring
- 🔊 **Volume control** — 0 to 200 (yes, you can go to 11)
- 🕒 **Auto-leave** — 2 min after queue ends, instantly if everyone ghosts
- 📦 **Now-playing embed** — with requester flex

---

## 🚀 Quick Start

### 1. Clone & install
```console
git clone https://github.com/FrostX2/Frozen-discord-music-bot.git
cd Frozen-discord-music-bot
npm install --include=dev --ignore-scripts
```

### 2. Fill in the blanks
```console
cp .env.example .env
```
Edit `DISCORD_TOKEN` and `CLIENT_ID` from the [**Discord Developer Portal**](https://discord.com/developers/applications).

### 3. Let the music play 🎶
```console
node start.js
```

---

## ☁️ Deploy on Render

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install --include=dev --ignore-scripts` |
| **Start Command** | `node start.js` |
| **Node Version** | `>=22.22.2` |

**Environment Variables:**
| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your bot token |
| `CLIENT_ID` | Your app ID |
| `LAVALINK_HOST` / `PORT` / `PASSWORD` / `SECURE` | External Lavalink (optional) |
| `WAIT_FOR_NODE=false` | Skip waiting for Lavalink node |

> [!TIP]
> No Lavalink config? No problem — NodeLink runs locally alongside the bot.

---

## 🎮 Commands

| Prefix | Slash | Does what? |
|--------|-------|------------|
| `!play` / `!p` | `/play` `/p` | Drop a track |
| `!skip` | `/skip` | Next! |
| `!stop` / `!s` | `/stop` `/s` | Shut it down |
| `!pause` | `/pause` | Shhh... |
| `!resume` | `/resume` | And we're back |
| `!volume` / `!vol` | `/volume` `/vol` | Crank it (0-200) |
| `!loop` | `/loop` | Forever and ever |
| `!queue` | `/queue` | What's next? |
| `!nowplaying` / `!np` | `/nowplaying` `/np` | What's this? |
| `!remove` | `/remove` | Yeet that song |
| `!back` | `/back` | Rewind time |
| `!filter` | `/filter` | Spice it up |
| `!help` | `/help` | You're looking at it |

---

## 📜 Credits

Based on [hongducdev/Music-Bot-Discord.js-v14](https://github.com/hongducdev/Music-Bot-Discord.js-v14) — remixed and frozen by **NotFrost**.

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=120&section=footer"/>
