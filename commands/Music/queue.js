const { SlashCommandBuilder } = require("discord.js");
const ui = require("../../functions/ui");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("See the list of songs in the queue!"),

    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        const queue = await client.distube.getQueue(interaction);
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    ui.buildNotice(client, "You must be in a voice channel to use this command!", { error: true }),
                ],
            });
        }
        if (
            interaction.guild.members.me.voice.channelId !==
            interaction.member.voice.channelId
        ) {
            return interaction.reply({
                embeds: [
                    ui.buildNotice(client, "You need to be on the same voice channel as the Bot!", { error: true }),
                ],
            });
        }

        const tracks = queue.songs.map(
            (song, i) => `**${i + 1}** - [${song.name}](${song.url}) | ${song.formattedDuration}\nRequest by: ${song.user}`
        );

        const songs = queue.songs.length;
        const nextSongs =
            songs > 10
                ? `And **${songs - 10}** songs...`
                : `Playlist **${songs}** songs...`;

        const embed = ui.buildNotice(client, `${tracks.slice(0, 10).join("\n")}\n\n${nextSongs}`, { title: "Queue" })
            .addFields([
                {
                    name: "> Playing:",
                    value: `[${queue.songs[0].name}](${queue.songs[0].url}) - ${queue.songs[0].formattedDuration} | Request by: ${queue.songs[0].user}`,
                    inline: true,
                },
                {
                    name: "> Total times:",
                    value: `${queue.formattedDuration}`,
                    inline: true,
                },
                {
                    name: "> Total songs:",
                    value: `${songs}`,
                    inline: true,
                },
            ]);

        interaction.reply({ embeds: [embed] });
    },
};
