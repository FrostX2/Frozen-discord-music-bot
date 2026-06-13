const { createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus, joinVoiceChannel, AudioPlayerStatus, demuxProbe, StreamType } = require('@discordjs/voice');
const play = require('play-dl');
const { join } = require('path');

const COOKIES_PATH = join(__dirname, 'cookies.txt');

// Authenticate with cookies if available
try {
  const { readFileSync } = require('fs');
  const cookies = readFileSync(COOKIES_PATH, 'utf8');
  if (cookies.includes('.youtube.com')) {
    play.setToken({ youtube: { cookie: cookies } });
  }
} catch {}

const queues = new Map();

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
  try {
    const audioStream = await play.stream(song.url, { quality: 0 });
    const probe = await demuxProbe(audioStream.stream);
    const resource = createAudioResource(probe.stream, { inputType: probe.type, inlineVolume: true });
    resource.volume.setVolumeLogarithmic(queue.volume / 100);
    queue.player.play(resource);
    queue.connection.subscribe(queue.player);
    queue.player.once(AudioPlayerStatus.Idle, () => {
      if (queue.loop) {
        queue.songs.push(queue.songs.shift());
      } else {
        queue.songs.shift();
      }
      playSong(guildId);
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
    let song;
    if (isUrl) {
      const info = await play.video_info(query);
      song = { url: info.video_details.url, title: info.video_details.title };
    } else {
      const results = await play.search(query, { limit: 1 });
      if (!results.length) throw new Error(`No results for "${query}"`);
      song = { url: results[0].url, title: results[0].title };
    }
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
    const queue = getQueue(guildId);
    queue.player.stop();
  },

  stop(guildId) {
    const queue = getQueue(guildId);
    queue.songs = [];
    queue.loop = false;
    queue.player.stop();
    queue.connection?.destroy();
    queue.connection = null;
    queue.current = null;
    queues.delete(guildId);
  },

  pause(guildId) {
    const queue = getQueue(guildId);
    queue.player.pause();
  },

  resume(guildId) {
    const queue = getQueue(guildId);
    queue.player.unpause();
  },

  setVolume(guildId, vol) {
    const queue = getQueue(guildId);
    queue.volume = vol;
  },

  setLoop(guildId, loop) {
    const queue = getQueue(guildId);
    queue.loop = loop;
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
};
