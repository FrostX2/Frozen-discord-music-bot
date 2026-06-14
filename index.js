require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
} = require("discord.js");
const fs = require("fs");
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

require ("./distube/index");

client.musicSetup = {};

client.handleEvents();
client.handleComponents();
client.handleCommands();

// Initialize Lavalink when client is ready
client.once('ready', () => {
  const lavalink = require('./lavalink');
  lavalink.init(client);
  console.log('Lavalink initialized');

  const channelName = '🎵|𝓯𝓾𝓻𝓲𝓶𝓾𝓼𝓲𝓬';
  const channelTopic = 'Paste a song name or link here to play music';

  client.guilds.cache.forEach(async (guild) => {
    try {
      const existing = guild.channels.cache.find(
        c => c.type === 0 && c.name.toLowerCase() === channelName.toLowerCase()
      );
      if (existing) {
        client.musicSetup[guild.id] = existing.id;
        return;
      }
      const channel = await guild.channels.create({
        name: channelName,
        type: 0,
        topic: channelTopic,
      });
      console.log(`[Setup] Created #${channel.name} in ${guild.name}`);
      client.musicSetup[guild.id] = channel.id;
    } catch (err) {
      console.warn(`[Setup] Could not setup music channel in ${guild.name}: ${err.message}`);
    }
  });
});

// Render port binding
const http = require("http");
const port = process.env.PORT || 10000;
http.createServer((req, res) => res.end("ok")).listen(port, () => console.log(`Server listening on port ${port}`));

//anticrash
process.on("unhandledRejection", (reason, p) => {
    console.log(reason, p)
})
process.on("uncaughtException", (err, origin) => {
    console.log(err, origin)
})

client.login(token);
