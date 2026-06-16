const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  category: "Music",
  data: new SlashCommandBuilder()
    .setName("p")
    .setDescription("Play a song (alias for /play)")
    .addStringOption((option) =>
      option
        .setName("keyword")
        .setDescription("Song name or URL")
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const keyword = interaction.options.getString("keyword");
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription("You must be in a voice channel!")],
        ephemeral: true,
      });
    }
    if (
      interaction.guild.members.me.voice.channelId &&
      interaction.guild.members.me.voice.channelId !== interaction.member.voice.channelId
    ) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription("You need to be on the same voice channel as the Bot!")],
        ephemeral: true,
      });
    }

    await interaction.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription("Looking for song...")], ephemeral: true });

    try {
      const song = await client.player.play(interaction.channel, voiceChannel, keyword, interaction.member);
      const desc = song.type === 'playlist'
        ? `Added **${song.count}** songs from playlist **${song.title}**`
        : `Added [${song.title}](${song.url}) to the queue`;
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription(desc)] });
    } catch (err) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription(`Error: ${err.message}`)] });
    }
  },
};
