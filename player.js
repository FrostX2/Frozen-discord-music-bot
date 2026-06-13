const { createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const { spawn, execSync } = require('child_process');
const { unlink, mkdir, access } = require('fs/promises');
const { join } = require('path');
const { randomBytes } = require('crypto');

// Extend PATH for user-installed binaries (Render)
process.env.PATH = `${process.env.HOME}/.local/bin:${process.env.HOME}/ffmpeg:${process.env.PATH}`;

// Resolve yt-dlp path
const YTDLP = process.env.YT_DLP || (() => {
  try {
    const p = execSync('which yt-dlp 2>/dev/null || command -v yt-dlp 2>/dev/null').toString().trim();
    return p || 'yt-dlp';
  } catch { return 'yt-dlp'; }
})();

// Resolve ffmpeg path
const FFMPEG = process.env.FFMPEG_PATH || (() => {
  try {
    const p = execSync('which ffmpeg 2>/dev/null || command -v ffmpeg 2>/dev/null').toString().trim();
    return p || 'ffmpeg';
  } catch { return 'ffmpeg'; }
})();
const { existsSync } = require('fs');

const TEMP_DIR = '/tmp/furimusic';
const COOKIES_PATH = join(__dirname, 'cookies.txt');

const queues = new Map();
const progressIntervals = new Map();

function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, {
      songs: [],
      player: createAudioPlayer(),
      connection: null,
      current: null,
      loop: false,
      startTime: 0,
      volume: 100,
      resource: null,
      textChannel: null,
    });
  }
  return queues.get(guildId);
}

function ytArgs(extra = []) {
  const args = [
    '--cookies', COOKIES_PATH,
    '--geo-bypass',
    '--no-warnings',
    '--extractor-retries', '3',
    '--extractor-args', 'youtube:player_skip=js',
  ];
  if (extra) args.push(...extra);
  return args;
}

function execAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    proc.on('error', reject);
    proc.on('exit', code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `Exit code ${code}`));
    });
  });
}

async function search(query) {
  const isUrl = query.match(/https?:\/\/\S+/i);
  let searchQuery = query;
  if (isUrl) {
    const isYt = query.match(/youtube\.com|youtu\.be|music\.youtube/i);
    if (isYt) return { url: query };
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(query, { signal: controller.signal });
      clearTimeout(timer);
      const html = await res.text();
      const m = html.match(/<meta\s+(?:property|name)="(?:og:)?title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
      if (m) searchQuery = m[1].replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c));
    } catch { }
  }

  const stdout = await execAsync(YTDLP, [
    '--cookies', COOKIES_PATH,
    '--geo-bypass',
    '--no-warnings',
    '--extractor-args', 'youtube:player_skip=js',
    '--dump-single-json', '--flat-playlist', '--no-playlist',
    `ytsearch:${searchQuery}`,
  ]);
  const data = JSON.parse(stdout);
  const entries = data.entries || [];
  if (!entries.length) throw new Error(`No results found for "${searchQuery}"`);
  const entry = entries[0];
  return { url: entry.url || entry.webpage_url, title: entry.title };
}

async function resolveInfo(url) {
  const stdout = await execAsync(YTDLP, [
    '--cookies', COOKIES_PATH,
    '--geo-bypass',
    '--no-warnings',
    '--extractor-args', 'youtube:player_skip=js',
    '--dump-single-json', '--no-playlist',
    url,
  ]);
  return JSON.parse(stdout);
}

async function downloadSong(song) {
  await mkdir(TEMP_DIR, { recursive: true });
  const fileId = randomBytes(8).toString('hex');
  const outputPath = join(TEMP_DIR, `${fileId}.%(ext)s`);
  await execAsync(YTDLP, [
    '--cookies', COOKIES_PATH,
    '--geo-bypass',
    '--no-warnings',
    '--extractor-retries', '3',
    '--extractor-args', 'youtube:player_skip=js',
    '-f', 'best', '--extract-audio', '--audio-format', 'mp3',
    '-o', outputPath, '--no-playlist', song.url,
  ]);
  return join(TEMP_DIR, `${fileId}.mp3`);
}

async function playSong(guildId) {
  const queue = getQueue(guildId);
  if (queue.songs.length === 0) {
    queue.current = null;
    clearInterval(progressIntervals.get(guildId));
    progressIntervals.delete(guildId);
    return;
  }

  const song = queue.songs[0];
  queue.current = song;

  try {
    const filePath = await downloadSong(song);
    song.filePath = filePath;

    const ffmpeg = spawn(FFMPEG, [
      '-i', filePath, '-f', 'opus', '-ar', '48000', '-ac', '2',
      '-b:a', '128k', '-loglevel', 'error', 'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    const stream = ffmpeg.stdout;
    ffmpeg.stderr.on('data', () => {});
    ffmpeg.on('error', err => console.error('ffmpeg error:', err.message));

    queue.resource = createAudioResource(stream, { inlineVolume: true });
    queue.resource.volume.setVolume(queue.volume / 100);
    queue.player.play(queue.resource);
    queue.startTime = Date.now();

    if (queue.connection) queue.connection.subscribe(queue.player);

    queue.player.removeAllListeners(AudioPlayerStatus.Idle);
    queue.player.removeAllListeners('error');

    queue.player.once(AudioPlayerStatus.Idle, () => {
      if (queue.current?.filePath) unlink(queue.current.filePath).catch(() => {});
      if (queue.loop && queue.current) queue.songs.unshift({ ...queue.current, filePath: undefined });
      queue.songs.shift();
      playSong(guildId).catch(err => console.error('playSong idle error:', err.message));
    });

    queue.player.once('error', err => {
      console.error('Player error:', err.message);
      if (queue.current?.filePath) unlink(queue.current.filePath).catch(() => {});
      queue.songs.shift();
      playSong(guildId).catch(e => console.error('playSong player error:', e.message));
    });
  } catch (err) {
    console.error('Play error:', err.message);
    if (queue.current?.filePath) unlink(queue.current.filePath).catch(() => {});
    queue.songs.shift();
    playSong(guildId).catch(e => console.error('playSong catch error:', e.message));
  }
}

module.exports = {
  getQueue,
  play: async (textChannel, voiceChannel, query, member) => {
    const guildId = voiceChannel.guild.id;
    const queue = getQueue(guildId);
    queue.textChannel = textChannel;

    if (!queue.connection || queue.connection.state.status !== VoiceConnectionStatus.Ready) {
      queue.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });
      await entersState(queue.connection, VoiceConnectionStatus.Ready, 20000);
    }

    const result = await search(query);
    const info = await resolveInfo(result.url);
    const song = {
      url: result.url,
      title: result.title || info.title || 'Unknown',
      duration: info.duration || 0,
      thumbnail: info.thumbnail || '',
      requestedBy: member.user.tag,
      uploader: info.uploader || info.channel || 'Unknown',
      views: info.view_count || 0,
    };

    queue.songs.push(song);
    if (queue.songs.length === 1) playSong(guildId);
    return song;
  },
  skip: async (guildId) => {
    const queue = getQueue(guildId);
    if (!queue.current) return null;
    queue.player.stop();
    const skipped = queue.current;
    return skipped;
  },
  stop: async (guildId) => {
    const queue = getQueue(guildId);
    queue.songs = [];
    queue.player.stop();
    queue.current = null;
    if (queue.connection) {
      queue.connection.destroy();
      queue.connection = null;
    }
    clearInterval(progressIntervals.get(guildId));
    progressIntervals.delete(guildId);
  },
  pause: async (guildId) => {
    const queue = getQueue(guildId);
    queue.player.pause();
  },
  resume: async (guildId) => {
    const queue = getQueue(guildId);
    queue.player.unpause();
  },
  setVolume: (guildId, vol) => {
    const queue = getQueue(guildId);
    queue.volume = vol;
    if (queue.resource) queue.resource.volume.setVolume(vol / 100);
  },
  setLoop: (guildId, loop) => {
    const queue = getQueue(guildId);
    queue.loop = loop;
  },
  previous: async (guildId) => {
    const queue = getQueue(guildId);
    if (queue.songs.length < 2) throw new Error('No previous song');
    queue.player.stop();
  },
  remove: (guildId, index) => {
    const queue = getQueue(guildId);
    if (index < 0 || index >= queue.songs.length) throw new Error('Invalid index');
    const removed = queue.songs.splice(index, 1);
    return removed[0];
  },
};
