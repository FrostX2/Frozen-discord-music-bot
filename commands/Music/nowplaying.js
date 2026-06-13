const { EmbedBuilder } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const Format = Intl.NumberFormat();
const status = (queue) =>
    `Volume: \`${queue.volume}%\` | Repeat: \`${
        queue.repeatMode
            ? queue.repeatMode === 2
                ? "List"
                : "Song"
            : "Off"
    }\``;

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("Show the currently playing song!"),

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        const queue = await client.distube.getQueue(interaction);
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.colorError)
                        .setDescription(
                            `You must be in a voice channel to use this command!`
                        ),
                ],
            });
        }
        if (
            interaction.guild.members.me.voice.channelId !==
            interaction.member.voice.channelId
        ) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.colorError)
                        .setDescription(
                            `You need to be on the same voice channel as the Bot!`
                        ),
                ],
            });
        }

        const song = queue.songs[0];
        const embed = new EmbedBuilder()
            .setColor(client.config.colorDefault)
            .setAuthor({
                name: "Now Playing",
                iconURL: client.user.displayAvatarURL(),
            })
            .setDescription(`> [${song.name}](${song.url})`)
            .addFields([
                {
                    name: "Status",
                    value: `${status(queue).toString()}`,
                    inline: false,
                },
                {
                    name: "Views",
                    value: `${Format.format(song.views)}`,
                    inline: true,
                },
                {
                    name: "Duration",
                    value: `${queue.formattedCurrentTime} / ${song.formattedDuration}`,
                    inline: true,
                },
                {
                    name: "Upload",
                    value: song.uploader?.url
                        ? `[${song.uploader.name}](${song.uploader.url})`
                        : song.uploader?.name || "Unknown",
                    inline: true,
                },
                {
                    name: "Request by",
                    value: `${song.user}`,
                    inline: true,
                },
            ])
            .setImage(song.thumbnail)
            .setFooter({
                text: `${Format.format(queue.songs.length)} songs in queue`,
            });

        const msg = await interaction.reply({ embeds: [embed] });
    },
};
