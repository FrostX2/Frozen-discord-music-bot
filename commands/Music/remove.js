const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("remove")
        .setDescription("Remove song from queue!")
        .addNumberOption((option) =>
            option
                .setName("id")
                .setDescription("ID")
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addBooleanOption((option) =>
            option
                .setName("all")
                .setDescription("Remove all songs from queue")
                .setRequired(false)
        ),

    async execute(interaction, client) {
        try {
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(client.config.colorError)
                            .setDescription(
                                `🚫 | You must be in a voice channel to use this command!`
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
                                `🚫 | You need to be on the same voice channel as the Bot!`
                            ),
                    ],
                });
            }

            const playerMod = require('../../player');
            const queue = playerMod.getQueue(interaction.guild.id);

            if (!queue.songs.length && !queue.current) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(client.config.colorError)
                            .setDescription(
                                `🚫 | There are no songs in the playlist!`
                            ),
                    ],
                });
            }

            const removeAll = interaction.options.getBoolean("all");

            if (removeAll) {
                const count = queue.songs.length;
                queue.songs = [];
                playerMod.saveQueue(interaction.guild.id);
                const msg = await queue.textChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(client.config.colorDefault)
                            .setAuthor({
                                name: "Cleared queue",
                                iconURL: client.user.displayAvatarURL(),
                            })
                            .setDescription(
                                `🗑️ | Removed all ${count} songs from the playlist!`
                            ),
                    ],
                });
                setTimeout(() => { msg.delete(); }, 5000);
            } else {
                const id = interaction.options.getNumber("id");
                if (!id) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(client.config.colorError)
                                .setDescription(
                                    `🚫 | Please provide a song ID or use \`all: true\`!`
                                ),
                        ],
                        ephemeral: true,
                    });
                }
                const song = playerMod.remove(interaction.guild.id, id);
                const msg = await queue.textChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(client.config.colorDefault)
                            .setAuthor({
                                name: "Removed song",
                                iconURL: client.user.displayAvatarURL(),
                            })
                            .setDescription(
                                `🎵 | Removed ${song.name} from the playlist!`
                            ),
                    ],
                });
                setTimeout(() => { msg.delete(); }, 5000);
            }
        } catch (err) {
            console.log(err);
            const msg = await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.colorError)
                        .setAuthor({
                            name: "Error",
                            iconURL: client.user.displayAvatarURL(),
                        })
                        .setDescription(
                            `🚫 | Error!\n\`\`\`${err}\`\`\``
                        ),
                ],
                ephemeral: true,
            });
        }
    },

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const playerMod = require('../../player');
        const queue = playerMod.getQueue(interaction.guild.id);

        const tracks = queue.songs.slice(0, 25).map((song, i) => ({
            name: `${i + 1}. ${song.name}`,
            value: i + 1,
        }));
        const filtered = tracks.filter((track) =>
            track.name.startsWith(focusedValue)
        );
        await interaction.respond(
            filtered.map((track) => ({
                name: track.name,
                value: track.value,
            }))
        );
    },
};
