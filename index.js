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

// Express web server with admin panel
const express = require('express');
const app = express();
const webPort = process.env.WEB_PORT || 13426;

app.set('client', client);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'web', 'public')));

// API routes
app.use('/', require('./web/routes'));

// Catch-all -> redirect to dashboard
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  res.redirect('/');
});

app.listen(webPort, '0.0.0.0', () => {
  console.log(`Admin panel: http://0.0.0.0:${webPort}`);
  console.log(`API available at http://0.0.0.0:${webPort}/api/status`);
});

//anticrash
process.on("unhandledRejection", (reason, p) => {
    console.log(reason, p)
})
process.on("uncaughtException", (err, origin) => {
    console.log(err, origin)
})

client.login(token);
