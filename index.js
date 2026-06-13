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

try {
  const setupPath = require("path").join(__dirname, "music-setup.json");
  client.musicSetup = require("fs").existsSync(setupPath) ? JSON.parse(require("fs").readFileSync(setupPath, "utf8")) : {};
} catch { client.musicSetup = {}; }

// Pre-download yt-dlp so first play is instant
const player = require("./player");
player.ensureYtDlp().catch(() => {});
const ffmpegPath = require("ffmpeg-static");
console.log(`ffmpeg: ${require("fs").existsSync(ffmpegPath) ? "ok" : "MISSING"} (${ffmpegPath})`);



client.handleEvents();
client.handleComponents();
client.handleCommands();

// Render port binding
const http = require("http");
const port = process.env.PORT || 3000;
http.createServer((req, res) => res.end("ok")).listen(port, () => console.log(`Server listening on port ${port}`));

//anticrash
process.on("unhandledRejection", (reason, p) => {
    console.log(reason, p)
})
process.on("uncaughtException", (err, origin) => {
    console.log(err, origin)
})

client.login(token);
