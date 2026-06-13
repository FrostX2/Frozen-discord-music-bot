const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  category: "Music",
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song")
    .addStringOption((option) =>
      option
        .setName("keyword")
        .setDescription("Song name or URL")
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const isMsg = interaction.isMessage === true;
    const keyword = isMsg ? interaction.options.getString("keyword") : interaction.options.getString("keyword");
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      const err = { embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription("You must be in a voice channel!")] };
      return isMsg ? interaction.reply(err) : interaction.reply({ ...err, ephemeral: true });
    }

    if (!isMsg) {
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription("Looking for song...")], ephemeral: true });
    }

    try {
      const song = await client.player.play(interaction.channel, voiceChannel, keyword, interaction.member);
      const embed = new EmbedBuilder()
        .setColor(client.config.colorDefault)
        .setDescription(`Added [${song.title}](${song.url}) to the queue`);
      if (isMsg) {
        interaction.reply({ embeds: [embed] });
      } else {
        interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      const errEmbed = { embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription(`Error: ${err.message}`)] };
      if (isMsg) interaction.reply(errEmbed);
      else interaction.editReply(errEmbed);
    }
  },
};
