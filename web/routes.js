const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const BOT_VERSION = require('../package.json').version;

const router = express.Router();

router.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  if (req.path === '/login' || req.path === '/api/login') return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'unauthorized' });
  return res.redirect('/login');
}

router.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

router.post('/api/login', (req, res) => {
  const { username, password, remember } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    if (remember) req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'invalid credentials' });
});

router.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// Public API (no auth required, for the public status page)
router.get('/api/status', (req, res) => {
  const client = req.app.get('client');
  const ready = client?.isReady?.();
  const playerMod = require('../player');
  const activeGuilds = ready ? playerMod.getActiveGuilds() : [];
  const playingCount = activeGuilds.filter(g => g.playing).length;

  res.json({
    type: 'music',
    status: ready ? 'online' : 'connecting',
    ready: !!ready,
    uptime: process.uptime(),
    guilds: client?.guilds?.cache?.size || 0,
    latency: client?.ws?.ping || 0,
    playing: playingCount > 0,
    playingCount,
    activeGuilds: activeGuilds.map(g => ({
      ...g,
      name: client?.guilds?.cache?.get(g.guildId)?.name || g.guildId,
    })),
    lavalinkConnected: ready ? require('../lavalink').isConnected() : false,
    version: BOT_VERSION,
  });
});

// Public status page — no login required
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'status.html'));
});

router.use(requireAuth);

router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

router.get('/api/guilds', (req, res) => {
  const client = req.app.get('client');
  const ready = client?.isReady?.();
  if (!ready) return res.json({ error: 'not ready' });
  const guilds = client.guilds.cache.map(g => ({
    id: g.id,
    name: g.name,
    memberCount: g.memberCount,
    icon: g.iconURL({ dynamic: true }),
    ownerId: g.ownerId,
    musicChannel: client.musicSetup?.[g.id] || null,
  }));
  const botUser = client.user;
  res.json({ guilds, count: guilds.length, bot: { tag: botUser?.tag, id: botUser?.id, avatar: botUser?.displayAvatarURL() } });
});

router.get('/api/players', (req, res) => {
  const client = req.app.get('client');
  const ready = client?.isReady?.();
  if (!ready) return res.json({ error: 'not ready' });
  const playerMod = require('../player');
  const active = playerMod.getActiveGuilds();
  res.json({ players: active, count: active.length });
});

router.get('/api/players/:guildId', (req, res) => {
  const playerMod = require('../player');
  const queue = playerMod.getQueue(req.params.guildId);
  res.json({
    guildId: req.params.guildId,
    songs: queue.songs.map((s, i) => ({
      id: i + 1,
      title: s.title,
      url: s.url,
      duration: s.formattedDuration,
      thumbnail: s.thumbnail,
      uploader: s.uploader?.name || 'Unknown',
      user: s.user || 'Unknown',
    })),
    current: queue.current ? {
      title: queue.current.title,
      url: queue.current.url,
      duration: queue.current.formattedDuration,
      thumbnail: queue.current.thumbnail,
    } : null,
    volume: queue.volume,
    loop: queue.loop,
    playing: queue.lavalinkPlayer?.playing || false,
    paused: queue.lavalinkPlayer?.paused || false,
    connected: queue.lavalinkPlayer?.connected || false,
  });
});

router.post('/api/player/play', (req, res) => {
  const { guildId, query } = req.body;
  if (!guildId || !query) return res.status(400).json({ error: 'guildId and query required' });
  const client = req.app.get('client');
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: 'guild not found' });
  const channelId = client.musicSetup?.[guildId];
  if (!channelId) return res.status(400).json({ error: 'no music channel set up' });
  const textChannel = guild.channels.cache.get(channelId);
  const member = guild.members.me;
  const voiceChannel = member?.voice?.channel;
  if (!voiceChannel) return res.status(400).json({ error: 'bot not in a voice channel' });
  const playerMod = require('../player');
  playerMod.play(textChannel, voiceChannel, query, member)
    .then(r => res.json({ ok: true, result: r }))
    .catch(e => res.status(500).json({ error: e.message }));
});

router.post('/api/player/skip', (req, res) => {
  const { guildId } = req.body;
  if (!guildId) return res.status(400).json({ error: 'guildId required' });
  require('../player').skip(guildId);
  res.json({ ok: true });
});

router.post('/api/player/stop', (req, res) => {
  const { guildId } = req.body;
  if (!guildId) return res.status(400).json({ error: 'guildId required' });
  require('../player').stop(guildId);
  res.json({ ok: true });
});

router.post('/api/player/pause', (req, res) => {
  const { guildId } = req.body;
  if (!guildId) return res.status(400).json({ error: 'guildId required' });
  require('../player').pause(guildId);
  res.json({ ok: true });
});

router.post('/api/player/resume', (req, res) => {
  const { guildId } = req.body;
  if (!guildId) return res.status(400).json({ error: 'guildId required' });
  require('../player').resume(guildId);
  res.json({ ok: true });
});

router.post('/api/player/volume', (req, res) => {
  const { guildId, volume } = req.body;
  if (!guildId) return res.status(400).json({ error: 'guildId required' });
  require('../player').setVolume(guildId, Math.max(0, Math.min(200, parseInt(volume) || 50)));
  res.json({ ok: true });
});

router.post('/api/player/loop', (req, res) => {
  const { guildId, loop } = req.body;
  if (!guildId) return res.status(400).json({ error: 'guildId required' });
  require('../player').setLoop(guildId, !!loop);
  res.json({ ok: true });
});

router.post('/api/player/remove', (req, res) => {
  const { guildId, id } = req.body;
  if (!guildId || !id) return res.status(400).json({ error: 'guildId and id required' });
  try {
    const song = require('../player').remove(guildId, parseInt(id));
    res.json({ ok: true, song });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/api/player/clear', (req, res) => {
  const { guildId } = req.body;
  if (!guildId) return res.status(400).json({ error: 'guildId required' });
  const count = require('../player').clearQueue(guildId);
  res.json({ ok: true, count });
});

router.post('/api/player/back', (req, res) => {
  const { guildId } = req.body;
  if (!guildId) return res.status(400).json({ error: 'guildId required' });
  require('../player').previous(guildId);
  res.json({ ok: true });
});

router.get('/api/invite', (req, res) => {
  const client = req.app.get('client');
  const clientId = client.config?.clientId || client.user?.id;
  const permissions = '6376472'; // Admin + Manage Channels + View Channel + Send Messages + Embed Links + Read Message History + Connect + Speak
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;
  res.json({ url, clientId, permissions });
});

// Custom bots
router.get('/api/bots', (req, res) => {
  const db = require('../db');
  const bots = db.getBots();
  res.json({ bots });
});

router.post('/api/bots', (req, res) => {
  const { name, token, clientId, prefix } = req.body;
  if (!name || !token || !clientId) return res.status(400).json({ error: 'name, token, and clientId required' });
  const db = require('../db');
  const id = db.addBot(name, token, clientId, prefix || '!');
  res.json({ ok: true, id });
});

router.post('/api/bots/:id/delete', (req, res) => {
  const db = require('../db');
  db.deleteBot(parseInt(req.params.id));
  res.json({ ok: true });
});

router.post('/api/bots/:id/activate', (req, res) => {
  const db = require('../db');
  db.setActiveBot(parseInt(req.params.id));
  res.json({ ok: true });
});

router.get('/api/settings', (req, res) => {
  const client = req.app.get('client');
  res.json({
    prefix: client.config?.prefix || '!',
    clientId: client.config?.clientId,
    version: BOT_VERSION,
  });
});

router.get('/api/lavalink', (req, res) => {
  const lavalink = require('../lavalink');
  const lm = lavalink.getLavalink();
  const connected = lavalink.isConnected();
  const activeNodeId = connected ? lavalink.getPreferredNodeId() : null;

  const seen = new Set();
  const nodes = [];

  // Live node list from the Lavalink manager (if initialized)
  if (lm?.nodeManager) {
    for (const [id, node] of lm.nodeManager.nodes) {
      const opts = node.options || {};
      const nodeId = opts.id || id;
      seen.add(nodeId);
      nodes.push({
        id: nodeId,
        host: opts.host,
        port: opts.port,
        type: opts.nodeType === 'NodeLink' ? 'NodeLink' : 'Lavalink',
        connected: !!node.connected,
        active: nodeId === activeNodeId,
        players: node.stats?.players ?? 0,
        playingPlayers: node.stats?.playingPlayers ?? 0,
        uptime: node.stats?.uptime ?? 0,
      });
    }
  }

  // Always show every configured node — missing/offline ones appear as Down
  const configured = [];
  if (process.env.LAVALINK_HOST) {
    configured.push({
      id: 'main',
      host: process.env.LAVALINK_HOST,
      port: process.env.LAVALINK_PORT || (process.env.LAVALINK_SECURE === 'false' ? 80 : 443),
      type: 'Lavalink',
    });
  }
  for (let i = 1; i <= 10; i++) {
    if (!process.env[`ALT_LAVALINK_HOST_${i}`]) continue;
    configured.push({
      id: process.env[`ALT_LAVALINK_ID_${i}`] || `alt${i}`,
      host: process.env[`ALT_LAVALINK_HOST_${i}`],
      port: process.env[`ALT_LAVALINK_PORT_${i}`] || 443,
      type: (process.env[`ALT_LAVALINK_TYPE_${i}`] || '').toLowerCase() === 'nodelink' ? 'NodeLink' : 'Lavalink',
    });
  }
  if (process.env.SKIP_NODELINK !== 'true') {
    configured.push({
      id: 'nodelink',
      host: 'localhost',
      port: process.env.NODELINK_PORT || 2333,
      type: 'NodeLink',
    });
  }

  for (const node of configured) {
    if (seen.has(node.id)) continue;
    nodes.push({
      id: node.id,
      host: node.host,
      port: node.port,
      type: node.type,
      connected: false,
      active: false,
      players: 0,
      playingPlayers: 0,
      uptime: 0,
    });
  }

  res.json({ connected, activeNodeId, nodes });
});

module.exports = router;
