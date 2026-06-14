const { LavalinkManager } = require('lavalink-client');

let lavalink = null;

function init(client) {
  lavalink = new LavalinkManager({
    nodes: [
      {
        id: 'main',
        host: process.env.LAVALINK_HOST || 'localhost',
        port: parseInt(process.env.LAVALINK_PORT || '2333'),
        authorization: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
        secure: process.env.LAVALINK_SECURE === 'true',
      },
    ],
    client: {
      id: client.user.id,
      username: client.user.username,
    },
    sendToShard: (guildId, payload) => {
      client.guilds.cache.get(guildId)?.shard?.send(payload);
    },
    playerOptions: {
      defaultSearchPlatform: 'ytsearch',
      onEmptyQueue: { destroyAfterMs: 60000 },
    },
    autoSkip: true,
    queueOptions: { maxPreviousTracks: 0 },
  });

  lavalink.on('trackStart', (player, track) => {
    const playerMod = require('./player');
    const queue = playerMod.getQueue(player.guildId);
    if (queue) {
      queue.current = queue.songs[0] || null;
    }
  });

  lavalink.on('trackEnd', (player, track) => {
    const playerMod = require('./player');
    const queue = playerMod.getQueue(player.guildId);
    if (queue) {
      queue.songs.shift();
      queue.current = queue.songs[0] || null;
    }
  });

  lavalink.on('trackError', (player, track, error) => {
    console.error(`Track error on ${player.guildId}:`, error.message);
  });

  lavalink.on('playerDisconnect', (player) => {
    const playerMod = require('./player');
    const queue = playerMod.getQueue(player.guildId);
    if (queue) {
      queue.songs = [];
      queue.current = null;
      queue.lavalinkPlayer = null;
    }
  });

  lavalink.on('playerDestroy', (player) => {
    const playerMod = require('./player');
    const queue = playerMod.getQueue(player.guildId);
    if (queue) {
      queue.lavalinkPlayer = null;
    }
  });

  lavalink.init(client.user.id);
  return lavalink;
}

function getLavalink() {
  return lavalink;
}

module.exports = { init, getLavalink };
