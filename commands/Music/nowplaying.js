const { SlashCommandBuilder } = require("@discordjs/builders");
const ui = require("../../functions/ui");

module.exports = {
  category: "Music",
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Show the currently playing song!"),

  async execute(interaction, client) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        embeds: [
          ui.buildNotice(client, "You must be in a voice channel to use this command!", { error: true }),
        ],
      });
    }
    if (
      interaction.guild.members.me.voice.channelId !== interaction.member.voice.channelId
    ) {
      return interaction.reply({
        embeds: [
          ui.buildNotice(client, "You need to be on the same voice channel as the Bot!", { error: true }),
        ],
      });
    }

    const player = require('../../lavalink').getLavalink()?.getPlayer(interaction.guildId);
    if (!player || !player.queue.current) {
      return interaction.reply({
        embeds: [
          ui.buildNotice(client, "Nothing is playing right now.", { error: true }),
        ],
      });
    }

    const track = player.queue.current;
    const playerMod = require('../../player');
    const queue = playerMod.getQueue(interaction.guildId);
    const embed = ui.buildNowPlaying(client, { track, queue, player });

    await interaction.reply({ embeds: [embed] });
  },
};
