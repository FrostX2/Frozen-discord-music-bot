const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  category: "Music",
  data: new SlashCommandBuilder()
    .setName("reconnect")
    .setDescription("Re-forge the connection to the music node"),

  async execute(interaction, client) {
    await interaction.deferReply();

    const lavalink = require("../../lavalink");

    if (lavalink.isConnected()) {
      const embed = new EmbedBuilder()
        .setColor(client.config.colorDefault)
        .setAuthor({ name: "Connection is already alive", iconURL: client.user.displayAvatarURL() })
        .setDescription("The bond to the music node pulses strong. No re-forging needed.");
      return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(client.config.colorDefault)
      .setAuthor({ name: "Re-forging the connection...", iconURL: client.user.displayAvatarURL() })
      .setDescription("Severed threads are being woven anew. Stand by.");

    await interaction.editReply({ embeds: [embed] });

    try {
      await lavalink.reconnect();
      const success = new EmbedBuilder()
        .setColor(0x00FF00)
        .setAuthor({ name: "Connection restored", iconURL: client.user.displayAvatarURL() })
        .setDescription("The music node answers once more. The harmony is whole.");
      await interaction.editReply({ embeds: [success] });
    } catch (err) {
      const fail = new EmbedBuilder()
        .setColor(client.config.colorError)
        .setAuthor({ name: "Re-forge failed", iconURL: client.user.displayAvatarURL() })
        .setDescription(`The threads would not bind: \`${err.message}\``);
      await interaction.editReply({ embeds: [fail] });
    }
  },
};
