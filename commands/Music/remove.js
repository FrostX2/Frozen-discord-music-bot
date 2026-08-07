const { SlashCommandBuilder } = require("discord.js");
const ui = require("../../functions/ui");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("remove")
        .setDescription("Remove song!")
        .addNumberOption((option) =>
            option
                .setName("id")
                .setDescription("ID")
                .setRequired(false)
                .setAutocomplete(true)
        ),

    async execute(interaction, client) {
        try {
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
            if (!queue) {
                return interaction.reply({
                    embeds: [
                        ui.buildNotice(client, "There are no songs in the playlist!", { error: true }),
                    ],
                });
            }

            const id = interaction.options.getNumber("id");
            let song = queue.songs.splice(id - 1, 1);
            const msg = await queue.textChannel.send({
                embeds: [
                    ui.buildNotice(client, `Removed ${song[0].name} from the playlist!`, { title: "Removed song" }),
                ],
            });
            setTimeout(() => {
                msg.delete();
            }, 5000);
        } catch (err) {
            console.log(err);
            const msg = await interaction.reply({
                embeds: [
                    ui.buildNotice(client, `Error!\n\`\`\`${err}\`\`\``, { error: true, title: "Error" }),
                ],
                ephemeral: true,
            });
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
