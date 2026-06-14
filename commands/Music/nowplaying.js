const { EmbedBuilder } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

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
          new EmbedBuilder()
            .setColor(client.config.colorError)
            .setDescription("You must be in a voice channel to use this command!"),
        ],
      });
    }
    if (
      interaction.guild.members.me.voice.channelId !== interaction.member.voice.channelId
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(client.config.colorError)
            .setDescription("You need to be on the same voice channel as the Bot!"),
        ],
      });
    }

    const player = require('../../lavalink').getLavalink()?.getPlayer(interaction.guildId);
    if (!player || !player.queue.current) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(client.config.colorError)
            .setDescription("Nothing is playing right now."),
        ],
      });
    }

    const track = player.queue.current;
    const playerMod = require('../../player');
    const queue = playerMod.getQueue(interaction.guildId);
    const repeatMode = player.repeatMode;
    const repeatLabel = repeatMode === 'queue' ? "List" : repeatMode === 'track' ? "Song" : "Off";
    const status = `Volume: \`${player.volume}%\` | Repeat: \`${repeatLabel}\``;

    const embed = new EmbedBuilder()
      .setColor(client.config.colorDefault)
      .setAuthor({ name: "Now Playing", iconURL: client.user.displayAvatarURL() })
      .setDescription(`> [${track.info.title}](${track.info.uri})`)
      .addFields([
        { name: "Status", value: status, inline: false },
        { name: "Duration", value: `${fmt(player.position)} / ${fmt(track.info.duration)}`, inline: true },
        { name: "Author", value: track.info.author || "Unknown", inline: true },
        { name: "Request by", value: queue?.current?.member?.toString() || "Unknown", inline: true },
      ])
      .setImage(track.info.artworkUrl)
      .setFooter({ text: `${queue?.songs?.length || 0} songs in queue` });

    await interaction.reply({ embeds: [embed] });
  },
};
