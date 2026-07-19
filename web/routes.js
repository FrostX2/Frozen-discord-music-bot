const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

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
  if (req.session && req.session.authenticated) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

router.post('/api/login', (req, res) => {
  const { password, remember } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    if (remember) req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'wrong password' });
});

router.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.use(requireAuth);

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Public API (no auth required, for the bot status page)
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
    activeGuilds,
    lavalinkConnected: ready ? require('../lavalink').isConnected() : false,
    version: '2.2.0',
  });
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
    version: '2.2.0',
  });
});

router.get('/api/lavalink', (req, res) => {
  const lavalink = require('../lavalink');
  const connected = lavalink.isConnected();
  res.json({ connected });
});

module.exports = router;
