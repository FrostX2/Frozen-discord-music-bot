const { LavalinkManager, NodeType, NodeLinkDefaultSources } = require('lavalink-client');

let lavalink = null;

function isConnected() {
  if (!lavalink) return false;
  const node = lavalink.nodeManager.nodes.get('main');
  return node?.connected === true;
}

function init(client) {
  const isExternal = !!process.env.LAVALINK_HOST;

  lavalink = new LavalinkManager({
    nodes: [
      {
        id: 'main',
        host: process.env.LAVALINK_HOST || 'localhost',
        port: parseInt(process.env.LAVALINK_PORT || (isExternal ? '443' : '2333')),
        authorization: process.env.LAVALINK_PASSWORD || (isExternal ? 'BatuManaBisa' : 'youshallnotpass'),
        secure: isExternal ? (process.env.LAVALINK_SECURE !== 'false') : false,
        nodeType: isExternal ? undefined : NodeType.NodeLink,
        retryAmount: 10,
        retryDelay: 5000,
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

  lavalink.nodeManager.on('connect', (node) => {
    console.log(`[Lavalink] Node "${node.options.id}" connected (${node.options.host}:${node.options.port})`);
  });

  lavalink.nodeManager.on('error', (node, error) => {
    console.error(`[Lavalink] Node "${node.options.id}" error:`, error.message);
  });

  lavalink.nodeManager.on('disconnect', (node) => {
    console.warn(`[Lavalink] Node "${node.options.id}" disconnected`);
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
  if (!isExternal) {
    lavalink.utils.SourcesRecord = NodeLinkDefaultSources;
  }
  console.log(`[Lavalink] Target: ${isExternal ? process.env.LAVALINK_HOST + ':' + (process.env.LAVALINK_PORT || '443') : 'localhost:2333 (NodeLink)'}`);
  return lavalink;
}

module.exports = { init, getLavalink: () => lavalink, isConnected };
