const { SlashCommandBuilder } = require("discord.js");
const ui = require("../../functions/ui");

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
        embeds: [ui.buildNotice(client, "You must be in a voice channel!", { error: true })],
        ephemeral: true,
      });
    }
    if (
      interaction.guild.members.me.voice.channelId &&
      interaction.guild.members.me.voice.channelId !== interaction.member.voice.channelId
    ) {
      return interaction.reply({
        embeds: [ui.buildNotice(client, "You need to be on the same voice channel as the Bot!", { error: true })],
        ephemeral: true,
      });
    }

    const started = Date.now();
    await interaction.deferReply({ ephemeral: true });

    try {
      const song = await client.player.play(interaction.channel, voiceChannel, keyword, interaction.member);
      const embed = song.type === 'playlist' ? ui.buildAddedPlaylist(client, song) : ui.buildAdded(client, song);
      await ui.waitUntil(started);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await ui.waitUntil(started);
      await interaction.editReply({ embeds: [ui.buildNotice(client, `Error: ${err.message}`, { error: true })] });
    }
  },
};
