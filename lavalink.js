const { LavalinkManager, NodeType, NodeLinkDefaultSources } = require('lavalink-client');


function fmt(ms) {
  if (!ms) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function parsePort(rawPort, fallback, name) {
  if (typeof rawPort === 'undefined' || rawPort === null || rawPort === '') {
    return fallback;
  }

  const parsed = Number(rawPort);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    if (typeof rawPort === 'string' && /^https?:\/\//.test(rawPort)) {
      const url = new URL(rawPort);
      return url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    }
    throw new SyntaxError(`Invalid ${name}: expected a numeric port but got '${rawPort}'.`);
  }

  return Math.floor(parsed);
}

let lavalink = null;
let botClient = null;
const leaveTimers = new Map();
let autoReconnectTimer = null;

function clearLeaveTimer(guildId) {
  const timer = leaveTimers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    leaveTimers.delete(guildId);
  }
}

function scheduleLeave(guildId) {
  clearLeaveTimer(guildId);

  const player = lavalink?.getPlayer(guildId);
  if (!player) return;

  const guild = botClient?.guilds.cache.get(guildId);
  if (!guild) return;

  const voiceChannel = guild.channels.cache.get(player.voiceChannelId);
  const db = require('./db');

  if (!voiceChannel || voiceChannel.members.filter(m => !m.user.bot).size === 0) {
    console.log(`[Lavalink] No members in VC for ${guildId}, leaving instantly`);
    player.destroy();
    const { getQueue } = require('./player');
    const q = getQueue(guildId);
    q.current = null;
    q.lavalinkPlayer = null;
    return;
  }

  console.log(`[Lavalink] Queue empty for ${guildId}, leaving in 2 minutes`);
  const timer = setTimeout(() => {
    console.log(`[Lavalink] Leaving ${guildId} due to inactivity`);
    player.destroy();
    const { getQueue } = require('./player');
    const q = getQueue(guildId);
    q.current = null;
    q.lavalinkPlayer = null;
    leaveTimers.delete(guildId);
  }, 120000);

  leaveTimers.set(guildId, timer);
}

function isConnected() {
  if (!lavalink) return false;
  const node = lavalink.nodeManager.nodes.get('main');
  return node?.connected === true;
}

async function reconnect() {
  if (!lavalink) {
    if (!botClient) throw new Error('No Lavalink instance or client available to reconnect');
    await init(botClient);
    return true;
  }

  const node = lavalink.nodeManager.nodes.get('main');
  if (!node) {
    console.warn('[Lavalink] No "main" node found, reinitializing...');
    lavalink.nodeManager.removeAllListeners();
    lavalink.removeAllListeners();
    lavalink = null;
    await init(botClient);
    return true;
  }

  if (node.connected) {
    console.log('[Lavalink] Already connected, nothing to do');
    return true;
  }

  console.log('[Lavalink] Reconnecting node "main"...');
  node.disconnect();
  await new Promise(r => setTimeout(r, 2000));
  node.connect();

  for (let i = 0; i < 30; i++) {
    if (node.connected) {
      console.log('[Lavalink] Reconnect successful');
      return true;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.warn('[Lavalink] Node reconnect timed out, reinitializing...');
  lavalink.nodeManager.removeAllListeners();
  lavalink.removeAllListeners();
  lavalink = null;
  await init(botClient);
  return true;
}

function startAutoReconnect() {
  if (autoReconnectTimer) clearInterval(autoReconnectTimer);
  console.log('[Lavalink] Auto-reconnect scheduled every 60 minutes');
  autoReconnectTimer = setInterval(async () => {
    if (!isConnected()) {
      console.log('[Lavalink] Auto-reconnect trigger: node is down, reconnecting...');
      try {
        await reconnect();
        console.log('[Lavalink] Auto-reconnect completed');
      } catch (err) {
        console.error('[Lavalink] Auto-reconnect failed:', err.message);
      }
    }
  }, 3600000);
}

async function init(client) {
  botClient = client;
  const isExternal = !!process.env.LAVALINK_HOST;
  const nodeHost = process.env.LAVALINK_HOST || 'localhost';
  const nodePort = parsePort(process.env.LAVALINK_PORT, isExternal ? 443 : 2333, 'LAVALINK_PORT');
  const nodeSecure = isExternal ? (process.env.LAVALINK_SECURE !== 'false') : false;
  const nodeAuthorization = process.env.LAVALINK_PASSWORD || (isExternal ? 'BatuManaBisa' : 'youshallnotpass');

  const nodeOptions = {
    id: 'main',
    host: nodeHost,
    port: nodePort,
    authorization: nodeAuthorization,
    secure: nodeSecure,
    nodeType: isExternal ? NodeType.Lavalink : NodeType.NodeLink,
    retryAmount: 10,
    retryDelay: 5000,
  };

  try {
    console.log('[Lavalink] Node options:', nodeOptions);
    lavalink = new LavalinkManager({
      nodes: [nodeOptions],
      client: {
        id: client.user.id,
        username: client.user.username,
      },
      sendToShard: (guildId, payload) => {
        client.guilds.cache.get(guildId)?.shard?.send(payload);
      },
      playerOptions: {
        defaultSearchPlatform: 'ytmsearch',
        onEmptyQueue: { destroyAfterMs: null },
      },
      autoSkip: true,
      queueOptions: { maxPreviousTracks: 0 },
    });
  } catch (err) {
    console.error('[Lavalink] Failed to initialize LavalinkManager:', err?.message || err);
    throw err;
  }

  lavalink.nodeManager.on('connect', (node) => {
    console.log(`[Lavalink] Node "${node.options.id}" connected (${node.options.host}:${node.options.port})`);
  });

  lavalink.nodeManager.on('error', (node, error) => {
    console.error(`[Lavalink] Node "${node.options.id}" error:`, error?.message || error || 'unknown');
  });

  lavalink.nodeManager.on('disconnect', (node) => {
    console.warn(`[Lavalink] Node "${node.options.id}" disconnected`);
  });

  lavalink.on('trackStart', (player, track) => {
    console.log(`[Lavalink] trackStart: ${track.info.title} (${player.guildId})`);
    clearLeaveTimer(player.guildId);
    const playerMod = require('./player');
    const queue = playerMod.getQueue(player.guildId);
    if (queue) {
      queue.current = {
        url: track.info.uri,
        title: track.info.title,
        name: track.info.title,
        thumbnail: track.info.artworkUrl || null,
        formattedDuration: fmt(track.info.duration),
      };
    }

    // Send now-playing embed to the designated music channel
    const channelId = botClient?.musicSetup?.[player.guildId];
    if (channelId) {
      const channel = botClient.channels.cache.get(channelId);
      if (channel) {
        const { EmbedBuilder } = require('discord.js');
        const repeatMode = player.repeatMode;
        const repeatLabel = repeatMode === 'queue' ? "List" : repeatMode === 'track' ? "Song" : "Off";
        const status = `Volume: \`${player.volume}%\` | Repeat: \`${repeatLabel}\``;
        const embed = new EmbedBuilder()
          .setColor(botClient.config.colorDefault || 0x2B2D31)
          .setAuthor({ name: "Now Playing", iconURL: botClient.user.displayAvatarURL() })
          .setDescription(`[${track.info.title}](${track.info.uri})`)
          .addFields([
            { name: "Status", value: status, inline: false },
            { name: "Duration", value: `${fmt(player.position)} / ${fmt(track.info.duration)}`, inline: true },
            { name: "Author", value: track.info.author || "Unknown", inline: true },
            { name: "Request by", value: track.userData?.requester?.toString() || queue?.current?.member?.toString() || "Unknown", inline: true },
          ])
          .setImage(track.info.artworkUrl)
          .setFooter({ text: `${queue?.songs?.length || 0} songs in queue` });
        channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // Try to select Thai audio track if available (NodeLink only — silently ignored by external Lavalink)
    if (!process.env.LAVALINK_HOST) {
      lavalink.changeAudioTrackLanguage(player, 'th').catch(() => {});
    }
  });

  lavalink.on('playerUpdate', (player, state) => {
    if (state.position === 0) return; // skip initial
    console.log(`[Lavalink] playerUpdate ${player.guildId}: state=${player.state} position=${state.position} connected=${player.voiceConnected}`);
  });

  lavalink.on('trackEnd', (player, track) => {
    const playerMod = require('./player');
    const db = require('./db');
    const queue = playerMod.getQueue(player.guildId);
    if (queue) {
      queue.songs.shift();
      if (queue.songs.length > 0) {
        const next = queue.songs[0];
        queue.current = {
          url: next.url,
          title: next.title,
          name: next.name,
          thumbnail: next.thumbnail,
          formattedDuration: next.formattedDuration,
        };
      } else {
        queue.current = null;
      }
      db.saveQueue(player.guildId, queue.songs);
    }
    if (!player.queue.tracks.length && (!player.repeatMode || player.repeatMode === 'off')) {
      scheduleLeave(player.guildId);
    }
  });

  lavalink.on('trackError', (player, track, error) => {
    console.error(`[Lavalink] trackError on ${player.guildId}:`, error?.message || error);
  });

  lavalink.on('trackStuck', (player, track, threshold) => {
    console.warn(`[Lavalink] trackStuck on ${player.guildId}:`, track?.info?.title, threshold);
  });

  lavalink.on('playerDisconnect', (player) => {
    clearLeaveTimer(player.guildId);
    const playerMod = require('./player');
    const queue = playerMod.getQueue(player.guildId);
    if (queue) {
      queue.songs = [];
      queue.current = null;
      queue.lavalinkPlayer = null;
    }
  });

  lavalink.on('playerDestroy', (player) => {
    clearLeaveTimer(player.guildId);
    const playerMod = require('./player');
    const queue = playerMod.getQueue(player.guildId);
    if (queue) {
      queue.lavalinkPlayer = null;
    }
  });

  // Forward raw Discord gateway events so lavalink-client receives voice updates
  client.on('raw', (packet) => lavalink.sendRawData(packet).catch(() => {}));

  lavalink.init(client.user.id);
  if (!isExternal) {
    lavalink.utils.SourcesRecord = NodeLinkDefaultSources;
  }
  console.log(`[Lavalink] Target: ${isExternal ? process.env.LAVALINK_HOST + ':' + (process.env.LAVALINK_PORT || '443') : 'localhost:2333 (NodeLink)'}`);

  const waitForNode = process.env.WAIT_FOR_NODE !== 'false';
  if (waitForNode) {
    console.log('[Lavalink] Waiting for node "main" to connect...');
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[Lavalink] Timeout waiting for node connection, continuing anyway');
        resolve();
      }, 30000);

      const cleanup = () => {
        clearTimeout(timeout);
        resolve();
      };

      lavalink.nodeManager.on('connect', (node) => {
        if (node.options.id === 'main') cleanup();
      });
      lavalink.nodeManager.on('ready', (node) => {
        if (node.options.id === 'main') cleanup();
      });

      if (isConnected()) cleanup();
    });
  }

  return lavalink;
}

module.exports = { init, getLavalink: () => lavalink, isConnected, clearLeaveTimer, scheduleLeave, reconnect, startAutoReconnect };
