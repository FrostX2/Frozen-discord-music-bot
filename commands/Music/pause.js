const { SlashCommandBuilder } = require("discord.js");
const ui = require("../../functions/ui");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("pause")
        .setDescription("Pause!"),

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

        queue.pause();
        await interaction.reply({
            embeds: [
                ui.buildNotice(client, "Pause playing current song!", { title: "Pause" }),
            ],
        });
    },
};
