const { createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus, joinVoiceChannel, AudioPlayerStatus, demuxProbe } = require('@discordjs/voice');
const play = require('play-dl');
const { spawn } = require('child_process');
const https = require('https');
const { existsSync, chmodSync } = require('fs');
const { join } = require('path');
const { PassThrough } = require('stream');

const queues = new Map();
const YTDLP_PATH = join(__dirname, 'yt-dlp');
const FFMPEG_PATH = join(__dirname, 'ffmpeg');

let ytDlpPromise = null;
let ffmpegPromise = null;

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

function detectArch() {
  try {
    const arch = require('child_process').execSync('uname -m', { encoding: 'utf8' }).trim();
    return arch === 'aarch64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
  } catch {
    return 'yt-dlp_linux';
  }
}

async function ensureYtDlp() {
  if (existsSync(YTDLP_PATH)) return;
  if (ytDlpPromise) return ytDlpPromise;
  const bin = detectArch();
  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${bin}`;
  ytDlpPromise = downloadFile(url, YTDLP_PATH).then(() => {
    chmodSync(YTDLP_PATH, 0o755);
    console.log('yt-dlp downloaded');
  }).catch(err => {
    ytDlpPromise = null;
    throw new Error(`Failed to download yt-dlp: ${err.message}`);
  });
  return ytDlpPromise;
}

async function ensureFfmpeg() {
  if (existsSync(FFMPEG_PATH)) return;
  if (ffmpegPromise) return ffmpegPromise;
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-linux-${arch}`;
  ffmpegPromise = downloadFile(url, FFMPEG_PATH).then(() => {
    chmodSync(FFMPEG_PATH, 0o755);
    console.log('ffmpeg downloaded');
  }).catch(err => {
    ffmpegPromise = null;
    throw new Error(`Failed to download ffmpeg: ${err.message}`);
  });
  return ffmpegPromise;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(dest);
    const request = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        require('fs').unlink(dest, () => {});
        resolve(downloadFile(res.headers.location, dest));
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        require('fs').unlink(dest, () => {});
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', (err) => { file.close(); require('fs').unlink(dest, () => {}); reject(err); });
      res.on('error', (err) => { file.close(); require('fs').unlink(dest, () => {}); reject(err); });
    });
    request.on('error', (err) => { file.close(); require('fs').unlink(dest, () => {}); reject(err); });
    request.setTimeout(60000, () => { request.destroy(); file.close(); require('fs').unlink(dest, () => {}); reject(new Error('timeout')); });
  });
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

function findCookies() {
  const paths = [
    join(__dirname, 'cookies.txt'),
    '/etc/secrets/cookies.txt',
  ];
  return paths.find(existsSync) || null;
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
    const cookiePath = findCookies();

    if (!cookiePath) {
      throw new Error('No cookies.txt found. YouTube blocks Render IPs. '
        + 'Export cookies from Chrome with "cookies.txt" extension and '
        + 'upload as a Render Secret File (/etc/secrets/cookies.txt) or '
        + 'place cookies.txt in the bot directory.');
    }

    await ensureFfmpeg();

    const ytArgs = [
      '--cookies', cookiePath,
      '--no-warnings', '--no-playlist',
      '--js-runtime', 'node',
      '--extractor-args', 'youtube:player_client=android',
      '-f', 'b',
      '-o', '-',
    ];
    const ffArgs = [
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-f', 'opus',
      '-ar', '48000',
      '-ac', '2',
      '-b:a', '128k',
      'pipe:1',
    ];

    const ytProc = spawn(YTDLP_PATH, ytArgs.concat(song.url), { stdio: ['ignore', 'pipe', 'pipe'] });

    const ffProc = spawn(FFMPEG_PATH, ffArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

    ytProc.stdout.pipe(ffProc.stdin);

    let ytStderr = '';
    ytProc.stderr.on('data', (d) => { ytStderr += d; });

    const pass = new PassThrough();
    ffProc.stdout.pipe(pass);

    const firstChunk = await Promise.race([
      new Promise((resolve, reject) => {
        pass.once('data', resolve);
        ytProc.on('close', (code) => {
          if (code !== 0 && ffProc.killed) reject(new Error(`yt-dlp exited ${code}: ${ytStderr.split('\n').slice(-3).join('\\n')}`));
          else if (code !== 0) reject(new Error(`yt-dlp exited ${code}: ${ytStderr.split('\n').slice(-3).join('\\n')}`));
        });
        ffProc.on('close', (code) => {
          if (code !== 0 && pass.readableLength === 0) reject(new Error(`ffmpeg exited ${code}`));
        });
        ytProc.on('error', reject);
        ffProc.on('error', reject);
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('yt-dlp timed out (30s)')), 30000)),
    ]);

    pass.unshift(firstChunk);
    const probe = await demuxProbe(pass);
    const resource = createAudioResource(probe.stream, { inputType: probe.type, inlineVolume: true });
    resource.volume.setVolumeLogarithmic(queue.volume / 100);
    queue.player.play(resource);
    queue.connection.subscribe(queue.player);
    if (queue.textChannel) {
      queue.textChannel.send({ content: `🎵 Now playing: ${song.title} — ${song.url || song.url}` }).catch(() => {});
    }

    const cleanup = () => {
      ytProc.kill();
      ffProc.kill();
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

    ytProc.on('close', (code) => {
      if (code !== 0 && queue.player.state.status !== AudioPlayerStatus.Idle) {
        queue.player.stop();
      }
    });
    ffProc.on('close', () => {
      if (queue.player.state.status !== AudioPlayerStatus.Idle) {
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
  ensureYtDlp,
  ensureFfmpeg,
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
