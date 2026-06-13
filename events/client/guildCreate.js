const { EmbedBuilder, ChannelType, PermissionsBitField } = require("discord.js");
const { join } = require("path");
const { existsSync, readFileSync, writeFileSync } = require("fs");

const SETUP_PATH = join(__dirname, "../../music-setup.json");

function loadSetup() {
  try {
    return JSON.parse(readFileSync(SETUP_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveSetup(setup) {
  writeFileSync(SETUP_PATH, JSON.stringify(setup, null, 2));
}

module.exports = {
  name: "guildCreate",
  async execute(guild, client) {
    try {
      const channel = await guild.channels.create({
        name: "FuriMusic",
        type: ChannelType.GuildText,
        topic: "Paste a song name or link here to play music",
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
          },
        ],
      });

      const embed = new EmbedBuilder()
        .setColor(client.config.colorDefault || "#00FF00")
        .setTitle("FuriMusic")
        .setDescription("Paste the song name or link here\n\n**Support:** YouTube, Spotify, SoundCloud")
        .setFooter({ text: "FuriMusic — Paste a song name or link to play" });

      await channel.send({ embeds: [embed] });

      // Auto-setup this channel as the music channel
      const setup = loadSetup();
      setup[guild.id] = channel.id;
      saveSetup(setup);
      client.musicSetup = setup;

      console.log(`Created FuriMusic channel in ${guild.name} (${guild.id})`);
    } catch (err) {
      console.error(`Failed to create FuriMusic channel in ${guild.name}:`, err.message);
    }
  },
};
