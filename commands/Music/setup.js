const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { join } = require("path");
const { existsSync, writeFileSync, readFileSync } = require("fs");

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
  category: "Music",
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Set the music channel for auto-play and commands")
    .addBooleanOption((o) =>
      o.setName("disable").setDescription("Disable setup and clear the music channel").setRequired(false)
    ),

  async execute(interaction, client) {
    const disable = interaction.options.getBoolean("disable");

    let setup = loadSetup();
    const guildId = interaction.guildId;

    if (disable) {
      delete setup[guildId];
      saveSetup(setup);
      client.musicSetup = setup;
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(client.config.colorDefault)
            .setDescription("Music channel cleared."),
        ],
      });
    }

    setup[guildId] = interaction.channel.id;
    saveSetup(setup);
    client.musicSetup = setup;

    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(client.config.colorDefault)
          .setDescription(`Music channel set to ${interaction.channel}. YouTube links posted here will auto-play.`),
      ],
    });
  },
};
