const { createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus, joinVoiceChannel, AudioPlayerStatus, demuxProbe } = require('@discordjs/voice');
const play = require('play-dl');
const { spawn, execSync } = require('child_process');
const { existsSync, chmodSync } = require('fs');
const { join } = require('path');

const queues = new Map();
const YTDLP_PATH = join(__dirname, 'yt-dlp');

function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildSong(info, member) {
  return {
    url: info.url,
    title: info.title,
    name: info.title,
    durationInSec: info.durationInSec || 0,
    formattedDuration: formatDuration(info.durationInSec || 0),
    thumbnail: info.thumbnails?.[0]?.url || null,
    views: info.views || 0,
    uploader: info.channel ? { name: info.channel.name, url: info.channel.url } : { name: "Unknown", url: "" },
    user: member?.user?.tag || member?.tag || "Unknown",
  };
}

async function ensureYtDlp() {
  if (existsSync(YTDLP_PATH)) return;
  const arch = execSync('uname -m', { encoding: 'utf8' }).trim();
  const bin = arch === 'aarch64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${bin}`;
  console.log(`Downloading yt-dlp (${bin})...`);
  execSync(`curl -fsL "${url}" -o "${YTDLP_PATH}"`, { stdio: 'inherit' });
  chmodSync(YTDLP_PATH, 0o755);
  console.log('yt-dlp downloaded');
}

function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, {
      songs: [],
      current: null,
      volume: 50,
      loop: false,
      player: createAudioPlayer(),
      connection: null,
      textChannel: null,
      startTime: 0,
    });
  }
  return queues.get(guildId);
}

async function playSong(guildId) {
  const queue = getQueue(guildId);
  if (!queue.songs.length || !queue.connection) {
    queue.current = null;
    return;
  }
  const song = queue.songs[0];
  queue.current = song;
  queue.startTime = Date.now();
  try {
    await ensureYtDlp();
    const ytArgs = [
      '--no-warnings',
      '--no-playlist',
      '-f', 'ba[ext=webm]/ba/b',
      '-o', '-',
    ];
    if (existsSync(join(__dirname, 'cookies.txt'))) {
      ytArgs.unshift('--cookies', join(__dirname, 'cookies.txt'));
    }
    const proc = spawn(YTDLP_PATH, ytArgs.concat(song.url), { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stderr.on('data', () => {});
    const stream = proc.stdout;

    const probe = await demuxProbe(stream);
    const resource = createAudioResource(probe.stream, { inputType: probe.type, inlineVolume: true });
    resource.volume.setVolumeLogarithmic(queue.volume / 100);
    queue.player.play(resource);
    queue.connection.subscribe(queue.player);

    const cleanup = () => {
      proc.kill();
      queue.player.removeAllListeners(AudioPlayerStatus.Idle);
    };

    queue.player.removeAllListeners(AudioPlayerStatus.Idle);
    queue.player.once(AudioPlayerStatus.Idle, () => {
      cleanup();
      if (queue.loop) {
        queue.songs.push(queue.songs.shift());
      } else {
        queue.songs.shift();
      }
      playSong(guildId);
    });

    proc.on('error', () => cleanup());
    proc.on('close', (code) => {
      if (code !== 0 && queue.player.state.status !== AudioPlayerStatus.Idle) {
        queue.player.stop();
      }
    });
  } catch (err) {
    queue.songs.shift();
    queue.textChannel?.send(`Error playing: ${err.message}`);
    playSong(guildId);
  }
}

module.exports = {
  async play(textChannel, voiceChannel, query, member) {
    const guildId = voiceChannel.guildId;
    const queue = getQueue(guildId);
    queue.textChannel = textChannel;

    const isUrl = query.match(/https?:\/\/\S+/i);
    let info;
    if (isUrl) {
      info = (await play.video_info(query)).video_details;
    } else {
      const results = await play.search(query, { limit: 1 });
      if (!results.length) throw new Error(`No results for "${query}"`);
      info = results[0];
    }

    const song = buildSong(info, member);
    queue.songs.push(song);

    if (!queue.connection) {
      queue.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });
      await entersState(queue.connection, VoiceConnectionStatus.Ready, 20000);
    }

    if (!queue.current || queue.player.state.status === AudioPlayerStatus.Idle) {
      playSong(guildId);
    }
    return song;
  },

  skip(guildId) {
    getQueue(guildId).player.stop();
  },

  stop(guildId) {
    const queue = getQueue(guildId);
    queue.songs = [];
    queue.player.stop();
    queue.connection?.destroy();
    queue.connection = null;
    queue.current = null;
    queues.delete(guildId);
  },

  pause(guildId) {
    getQueue(guildId).player.pause();
  },

  resume(guildId) {
    getQueue(guildId).player.unpause();
  },

  setVolume(guildId, vol) {
    getQueue(guildId).volume = vol;
  },

  setLoop(guildId, loop) {
    getQueue(guildId).loop = loop;
  },

  getQueue(guildId) {
    return queues.get(guildId);
  },

  previous(guildId) {
    const queue = getQueue(guildId);
    if (queue.songs.length > 1) {
      queue.songs.unshift(queue.songs.pop());
      queue.player.stop();
    }
  },

  remove(guildId, id) {
    const queue = getQueue(guildId);
    if (id > 0 && id <= queue.songs.length) {
      return queue.songs.splice(id - 1, 1)[0];
    }
  },

  jump(guildId, id) {
    const queue = getQueue(guildId);
    if (id >= 0 && id < queue.songs.length) {
      queue.songs.splice(0, id);
      queue.player.stop();
    }
  },
};
