const { SlashCommandBuilder } = require("discord.js");
const ui = require("../../functions/ui");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip!")
        .addNumberOption((option) =>
            option
                .setName("id")
                .setDescription("ID")
                .setRequired(false)
                .setAutocomplete(true)
        ),

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

        const id = await interaction.options.getNumber("id");

        if (!id) {
            queue.skip();
            await interaction.reply({
                embeds: [
                    ui.buildNotice(client, "Skipped!", { title: "Skip" }),
                ],
            });
        }

        if (id) {
            await client.distube.jump(interaction, parseInt(id - 1));
            try {
                const songSkip = queue.songs[parseInt(id - 1)];
                await interaction.reply({
                    embeds: [
                        ui.buildNotice(client, `Moved to song with ID: ${id}: **${songSkip.name}**!`, { title: "Skip" }),
                    ],
                });
            } catch (err) {
                await interaction.reply({
                    embeds: [
                        ui.buildNotice(client, `Songs with ID not found: ${id}!`, { error: true, title: "Skip" }),
                    ],
                    ephemeral: true,
                });
            }
        }
    },

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const queue = await client.distube.getQueue(interaction);

        if (queue.songs.length > 25) {
            const tracks = queue.songs
                .map((song, i) => {
                    return {
                        name: `${i + 1}. ${song.name}`,
                        value: i + 1,
                    };
                })
                .slice(0, 25);
            const filtered = tracks.filter((track) =>
                track.name.startsWith(focusedValue)
            );
            await interaction.respond(
                filtered.map((track) => ({
                    name: track.name,
                    value: track.value,
                }))
            );
        } else {
            const tracks = queue.songs
                .map((song, i) => {
                    return {
                        name: `${i + 1}. ${song.name}`,
                        value: i + 1,
                    };
                })
                .slice(0, queue.songs.length);
            const filtered = tracks.filter((track) =>
                track.name.startsWith(focusedValue)
            );
            await interaction.respond(
                filtered.map((track) => ({
                    name: track.name,
                    value: track.value,
                }))
            );
        }
    },
};
