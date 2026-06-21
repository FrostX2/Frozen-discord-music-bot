const path = require('path');
const fs = require('fs');

// Load environment variables from /etc/secret/.env or fallback to .env
const secretEnvPath = '/etc/secret/.env';
const localEnvPath = path.join(__dirname, '.env');
const envPath = fs.existsSync(secretEnvPath) ? secretEnvPath : localEnvPath;

require('dotenv').config({ path: envPath });

const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
} = require("discord.js");
let config;
try { config = require("./config.json"); } catch { config = {}; }
const token = process.env.DISCORD_TOKEN || config.token;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
    ],
    shards: "auto",
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Reaction,
        Partials.GuildScheduledEvent,
        Partials.User,
        Partials.ThreadMember,
    ],
});
module.exports = client;

client.commands = new Collection();
client.category = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.commandArray = [];
client.config = {
    ...config,
    token: process.env.DISCORD_TOKEN || config.token,
    clientId: process.env.CLIENT_ID || config.clientId,
    guildId: process.env.GUILD_ID || config.guildId || "",
    prefix: process.env.PREFIX || config.prefix || "!",
};

const functionFolders = fs.readdirSync("./functions");
for (const folder of functionFolders) {
    const functionFiles = fs
        .readdirSync(`./functions/${folder}`)
        .filter((file) => file.endsWith(".js"));

    for (const file of functionFiles)
        require(`./functions/${folder}/${file}`)(client);
}

require( "./distube/index");
require('./db').init();

client.musicSetup = {};

client.handleEvents();
client.handleComponents();
client.handleCommands();

// Initialize Lavalink when client is ready
client.once('ready', async () => {
  const lavalink = require('./lavalink');
  await lavalink.init(client);
  lavalink.startAutoReconnect();
  console.log('Lavalink initialized — auto-reconnect every 60 minutes');
});

// HTTP server with API endpoints
const http = require("http");
const port = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.end();

  if (req.url === '/api/status') {
    res.setHeader('Content-Type', 'application/json');
    const ready = client?.isReady?.();
    const playerMod = require('./player');
    const activeGuilds = ready ? playerMod.getActiveGuilds() : [];
    const playingCount = activeGuilds.filter(g => g.playing).length;

    return res.end(JSON.stringify({
      type: 'music',
      status: ready ? 'online' : 'connecting',
      ready: !!ready,
      uptime: process.uptime(),
      guilds: client?.guilds?.cache?.size || 0,
      latency: client?.ws?.ping || 0,
      playing: playingCount > 0,
      playingCount,
      activeGuilds,
      lavalinkConnected: ready ? require('./lavalink').isConnected() : false,
      version: '2.0.1',
    }));
  }

  if (req.url === '/api/guilds' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    const ready = client?.isReady?.();
    if (!ready) return res.end(JSON.stringify({ error: 'not ready' }));
    const guilds = client.guilds.cache.map(g => ({
      id: g.id,
      name: g.name,
      memberCount: g.memberCount,
    }));
    const botUser = client.user;
    return res.end(JSON.stringify({ guilds, count: guilds.length, bot: { tag: botUser?.tag, id: botUser?.id } }));
  }

  if (req.url === '/api/players' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    const ready = client?.isReady?.();
    if (!ready) return res.end(JSON.stringify({ error: 'not ready' }));
    const playerMod = require('./player');
    const active = playerMod.getActiveGuilds();
    return res.end(JSON.stringify({ players: active, count: active.length }));
  }

  if (['/api/player/skip', '/api/player/stop', '/api/player/volume', '/api/player/loop'].includes(req.url) && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const { guildId } = data;
        if (!guildId) return res.end(JSON.stringify({ error: 'no guildId' }));
        const playerMod = require('./player');
        res.setHeader('Content-Type', 'application/json');
        if (req.url === '/api/player/skip') { playerMod.skip(guildId); }
        else if (req.url === '/api/player/stop') { playerMod.stop(guildId); }
        else if (req.url === '/api/player/volume') { playerMod.setVolume(guildId, Math.max(0, Math.min(100, parseInt(data.volume)))); }
        else if (req.url === '/api/player/loop') { playerMod.setLoop(guildId, !!data.loop); }
        res.end(JSON.stringify({ ok: true }));
      } catch (e) { res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  if (req.url === '/api/settings' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ prefix: client.config?.prefix || '!' }));
  }

  res.end("ok");
});
server.listen(port, '0.0.0.0', () => console.log(`Server listening on port ${port}`));

//anticrash
process.on("unhandledRejection", (reason, p) => {
    console.log(reason, p)
})
process.on("uncaughtException", (err, origin) => {
    console.log(err, origin)
})

client.login(token);
