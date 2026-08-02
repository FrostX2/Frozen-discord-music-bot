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
const nowPlayingMessages = new Map();
let autoReconnectTimer = null;
let lastReconnectAttempt = 0;

const RECONNECT_COOLDOWN = parseInt(process.env.RECONNECT_COOLDOWN, 10) || 15 * 60 * 1000; // 15 min
const RECONNECT_CHECK_INTERVAL = parseInt(process.env.RECONNECT_CHECK_INTERVAL, 10) || 60 * 1000; // 60s

function clearLeaveTimer(guildId) {
  const timer = leaveTimers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    leaveTimers.delete(guildId);
  }
}

function deleteNowPlaying(guildId) {
  const msg = nowPlayingMessages.get(guildId);
  if (msg) {
    nowPlayingMessages.delete(guildId);
    msg.delete().catch(() => {});
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
  return Array.from(lavalink.nodeManager.nodes.values()).some((node) => node?.connected === true);
}

let nodePriority = [];

// First connected node in priority order: main -> alt1..alt5 -> nodelink
function getPreferredNodeId() {
  if (!lavalink) return null;
  for (const id of nodePriority) {
    if (lavalink.nodeManager.nodes.get(id)?.connected) return id;
  }
  return null;
}

// Move players back to the highest-priority connected node (e.g. when main recovers)
function rebalancePlayers() {
  if (!lavalink) return;
  const best = getPreferredNodeId();
  if (!best) return;
  for (const player of lavalink.players.values()) {
    if (!player?.node) continue;
    if (player.node.options.id === best) continue;
    if (player.getData?.('internal_nodeChanging')) continue;
    const lastChange = player.getData?.('lastNodeChange') || 0;
    if (Date.now() - lastChange < 15000) continue; // 15s cooldown to avoid flapping
    player.setData?.('lastNodeChange', Date.now());
    player.changeNode(best).catch((err) => {
      console.error(`[Lavalink] Failed to rebalance player ${player.guildId} to "${best}":`, err.message);
    });
  }
}

async function reconnect() {
  if (!lavalink) {
    if (!botClient) throw new Error('No Lavalink instance or client available to reconnect');
    await init(botClient);
    return true;
  }

  if (lavalink.nodeManager.nodes.size === 0) {
    console.warn('[Lavalink] No nodes found, reinitializing...');
    lavalink.nodeManager.removeAllListeners();
    lavalink.removeAllListeners();
    lavalink = null;
    await init(botClient);
    return true;
  }

  const ids = nodePriority.length ? nodePriority : Array.from(lavalink.nodeManager.nodes.keys());
  const targets = ids
    .map((id) => lavalink.nodeManager.nodes.get(id))
    .filter((n) => n && n.id);

  const disconnected = targets.filter((n) => !n.connected);
  if (!disconnected.length) {
    console.log('[Lavalink] All nodes connected, nothing to do');
    return true;
  }

  console.log(`[Lavalink] Reconnecting ${disconnected.length} node(s): ${disconnected.map((n) => n.id).join(', ')}`);
  lastReconnectAttempt = Date.now();
  for (const node of disconnected) {
    node.disconnect();
    await new Promise((r) => setTimeout(r, 2000));
    node.connect();
  }

  for (let i = 0; i < 30; i++) {
    if (disconnected.every((n) => n.connected)) {
      console.log('[Lavalink] Reconnect successful');
      return true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  const stillDown = disconnected.filter((n) => !n.connected).map((n) => n.id).join(', ');
  console.warn(`[Lavalink] Reconnect timed out for node(s): ${stillDown} — will retry on next auto-reconnect`);
  return false;
}

function startAutoReconnect() {
  if (autoReconnectTimer) clearInterval(autoReconnectTimer);
  console.log(`[Lavalink] Auto-reconnect scheduled every ${RECONNECT_CHECK_INTERVAL}ms — when all nodes are down, retry at most every ${RECONNECT_COOLDOWN}ms`);
  autoReconnectTimer = setInterval(async () => {
    if (isConnected()) return;
    if (Date.now() - lastReconnectAttempt < RECONNECT_COOLDOWN) {
      console.log(`[Lavalink] All nodes down — next auto-reconnect in ${Math.max(0, Math.ceil((RECONNECT_COOLDOWN - (Date.now() - lastReconnectAttempt)) / 1000))}s (or use /reconnect)`);
      return;
    }
    lastReconnectAttempt = Date.now();
    console.log('[Lavalink] Auto-reconnect trigger: all nodes down, reconnecting...');
    try {
      await reconnect();
    } catch (err) {
      console.error('[Lavalink] Auto-reconnect failed:', err.message);
    }
  }, RECONNECT_CHECK_INTERVAL);
}

async function init(client) {
  botClient = client;

  const altNodes = [];
  for (let i = 1; i <= 10; i++) {
    const host = process.env[`ALT_LAVALINK_HOST_${i}`];
    if (!host) continue;
    const secure = process.env[`ALT_LAVALINK_SECURE_${i}`] !== 'false';
    altNodes.push({
      id: process.env[`ALT_LAVALINK_ID_${i}`] || `alt${i}`,
      host,
      port: parsePort(process.env[`ALT_LAVALINK_PORT_${i}`], secure ? 443 : 80, `ALT_LAVALINK_PORT_${i}`),
      authorization: process.env[`ALT_LAVALINK_PASSWORD_${i}`] || process.env.LAVALINK_PASSWORD || 'BatuManaBisa',
      secure,
      nodeType: (process.env[`ALT_LAVALINK_TYPE_${i}`] || '').toLowerCase() === 'nodelink' ? NodeType.NodeLink : NodeType.Lavalink,
      retryAmount: 10,
      retryDelay: 5000,
    });
  }

  const nodes = [];

  // External main node (if configured)
  if (process.env.LAVALINK_HOST) {
    nodes.push({
      id: 'main',
      host: process.env.LAVALINK_HOST,
      port: parsePort(process.env.LAVALINK_PORT, process.env.LAVALINK_SECURE === 'false' ? 80 : 443, 'LAVALINK_PORT'),
      authorization: process.env.LAVALINK_PASSWORD || 'BatuManaBisa',
      secure: process.env.LAVALINK_SECURE !== 'false',
      nodeType: NodeType.Lavalink,
      retryAmount: 10,
      retryDelay: 5000,
    });
  }

  // Alt nodes — failover when main is down
  nodes.push(...altNodes);

  // Local NodeLink — added LAST as the bottom fallback node, unless SKIP_NODELINK=true.
  // If no external nodes are configured, this becomes the only node.
  if (process.env.SKIP_NODELINK !== 'true') {
    nodes.push({
      id: 'nodelink',
      host: 'localhost',
      port: parsePort(process.env.NODELINK_PORT, 2333, 'NODELINK_PORT'),
      authorization: process.env.NODELINK_PASSWORD || 'youshallnotpass',
      secure: false,
      nodeType: NodeType.NodeLink,
      retryAmount: 10,
      retryDelay: 5000,
    });
  }

  if (nodes.length === 0) {
    throw new Error('No Lavalink nodes configured: set LAVALINK_HOST or unset SKIP_NODELINK');
  }

  const usingLocalNodeLink = nodes.length === 1;

  nodePriority = nodes.map((n) => n.id);

  if (altNodes.length) {
    console.log(`[Lavalink] ${altNodes.length} alt node(s) configured: ${altNodes.map((n) => n.id).join(', ')}`);
  }

  try {
    console.log('[Lavalink] Node options:', nodes);
    lavalink = new LavalinkManager({
      nodes,
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
      autoMove: false, // manual failover below → prefers main, then alt1..alt5, then nodelink
      autoSkip: true,
      queueOptions: { maxPreviousTracks: 0 },
    });
  } catch (err) {
    console.error('[Lavalink] Failed to initialize LavalinkManager:', err?.message || err);
    throw err;
  }

  lavalink.nodeManager.on('connect', (node) => {
    console.log(`[Lavalink] Node "${node.options.id}" connected (${node.options.host}:${node.options.port})`);
    rebalancePlayers();
  });

  lavalink.nodeManager.on('error', (node, error) => {
    console.error(`[Lavalink] Node "${node.options.id}" error:`, error?.message || error || 'unknown');
  });

  lavalink.nodeManager.on('disconnect', (node) => {
    console.warn(`[Lavalink] Node "${node.options.id}" disconnected`);

    // Move any players on the dead node to the highest-priority connected node
    const fallback = getPreferredNodeId();
    if (!fallback) return;
    for (const player of lavalink.players.values()) {
      if (player?.node?.options?.id !== node.options.id) continue;
      if (player.getData?.('internal_nodeChanging')) continue;
      player.setData?.('lastNodeChange', Date.now());
      player.changeNode(fallback).catch((err) => {
        console.error(`[Lavalink] Failed to move player ${player.guildId} to "${fallback}":`, err.message);
      });
    }
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

    // Send now-playing embed (music channel if set up, otherwise the channel that started playback)
    const channelId = botClient?.musicSetup?.[player.guildId] || player.textChannelId;
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
        channel.send({ embeds: [embed] })
          .then((msg) => nowPlayingMessages.set(player.guildId, msg))
          .catch(() => {});
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
    deleteNowPlaying(player.guildId);
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
    deleteNowPlaying(player.guildId);
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
    deleteNowPlaying(player.guildId);
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
  lavalink.utils.SourcesRecord = NodeLinkDefaultSources;
  console.log(`[Lavalink] Nodes: ${nodes.map((n) => `${n.id}@${n.host}:${n.port}${n.nodeType === 'NodeLink' ? ' (NodeLink)' : ''}`).join(', ')}`);
  if (usingLocalNodeLink) console.log('[Lavalink] No external nodes configured — using local NodeLink only');

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

      lavalink.nodeManager.on('connect', () => cleanup());
      lavalink.nodeManager.on('ready', () => cleanup());

      if (isConnected()) cleanup();
    });
  }

  return lavalink;
}

module.exports = { init, getLavalink: () => lavalink, isConnected, getPreferredNodeId, clearLeaveTimer, scheduleLeave, reconnect, startAutoReconnect };
