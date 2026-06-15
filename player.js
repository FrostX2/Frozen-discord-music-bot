const queues = new Map();

function formatDuration(ms) {
  if (!ms) return "0:00";
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildSong(track, member) {
  return {
    url: track.info.uri,
    title: track.info.title,
    name: track.info.title,
    durationInSec: Math.floor(track.info.duration / 1000),
    formattedDuration: formatDuration(track.info.duration),
    thumbnail: track.info.artworkUrl || null,
    uploader: { name: track.info.author || "Unknown" },
    user: member?.user?.tag || member?.tag || "Unknown",
    member,
  };
}

function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, {
      songs: [],
      current: null,
      volume: 50,
      loop: false,
      player: null,
      textChannel: null,
      lavalinkPlayer: null,
    });
  }
  return queues.get(guildId);
}

module.exports = {
  getQueue,
  async play(textChannel, voiceChannel, query, member) {
    const guildId = voiceChannel.guildId;
    const queue = getQueue(guildId);
    queue.textChannel = textChannel;

    require('./lavalink').clearLeaveTimer(guildId);

    const lavalink = require('./lavalink').getLavalink();
    const { isConnected } = require('./lavalink');

    // Wait up to 15s for a node to connect
    for (let i = 0; i < 30; i++) {
      if (isConnected()) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (!isConnected()) throw new Error('Lavalink node not connected yet — wait a few seconds and try again');

    let player = lavalink.getPlayer(guildId);

    if (!player) {
      player = lavalink.createPlayer({
        guildId,
        voiceChannelId: voiceChannel.id,
        textChannelId: textChannel.id,
        volume: queue.volume,
      });
      queue.lavalinkPlayer = player;
      player.connect();
    } else {
      player.voiceChannelId = voiceChannel.id;
      player.textChannelId = textChannel.id;
      if (!player.connected) player.connect();
    }

    const isUrl = query.match(/https?:\/\/\S+/i);
    let result;
    if (isUrl) {
      result = await player.search({ query, source: undefined }, member);
    } else {
      const sources = ['ytmsearch', 'ytsearch', 'scsearch'];
      for (const source of sources) {
        result = await player.search({ query, source }, member);
        if (result.tracks?.length) break;
      }
    }
    if (!result?.tracks?.length) throw new Error(`No results for "${query}"`);

    const tracks = result.tracks;
    const songs = tracks.map(t => buildSong(t, member));
    queue.songs.push(...songs);

    player.queue.add(tracks);

    if (!player.playing && !player.paused) {
      try {
        await player.play();
      } catch (err) {
        throw new Error(`Playback failed: ${err.message}`);
      }
    }

    if (result.playlist) {
      return {
        type: 'playlist',
        title: result.playlist.name || 'Playlist',
        count: tracks.length,
        song: songs[0],
      };
    }
    return songs[0];
  },

  skip(guildId) {
    const queue = getQueue(guildId);
    if (queue.lavalinkPlayer) queue.lavalinkPlayer.skip();
  },

  stop(guildId) {
    const queue = getQueue(guildId);
    queue.songs = [];
    if (queue.lavalinkPlayer) queue.lavalinkPlayer.destroy();
    queue.lavalinkPlayer = null;
    queue.current = null;
    queues.delete(guildId);
  },

  pause(guildId) {
    const queue = getQueue(guildId);
    if (queue.lavalinkPlayer) queue.lavalinkPlayer.pause();
  },

  resume(guildId) {
    const queue = getQueue(guildId);
    if (queue.lavalinkPlayer) queue.lavalinkPlayer.resume();
  },

  setVolume(guildId, vol) {
    const queue = getQueue(guildId);
    queue.volume = vol;
    if (queue.lavalinkPlayer) queue.lavalinkPlayer.setVolume(vol);
  },

  setLoop(guildId, loop) {
    const queue = getQueue(guildId);
    queue.loop = loop;
    if (queue.lavalinkPlayer) queue.lavalinkPlayer.setRepeatMode(loop ? 'queue' : 'off');
  },

  previous(guildId) {
    const queue = getQueue(guildId);
    if (queue.songs.length > 1) {
      queue.songs.unshift(queue.songs.pop());
      if (queue.lavalinkPlayer) queue.lavalinkPlayer.skip();
    }
  },

  remove(guildId, id) {
    const queue = getQueue(guildId);
    if (id < 1 || id > queue.songs.length) throw new Error(`Invalid song ID ${id} — queue has ${queue.songs.length} songs`);
    const song = queue.songs.splice(id - 1, 1)[0];
    return song;
  },

  jump(guildId, id) {
    const queue = getQueue(guildId);
    if (id >= 0 && id < queue.songs.length) {
      queue.songs.splice(0, id);
      if (queue.lavalinkPlayer) queue.lavalinkPlayer.skip();
    }
  },
};
