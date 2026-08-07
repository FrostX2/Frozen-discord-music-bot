const { SlashCommandBuilder } = require("@discordjs/builders");
const ui = require("../../functions/ui");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop playing music"),

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
            interaction.guild.members.me.voice.channelId !==
            interaction.member.voice.channelId
        ) {
            return interaction.reply({
                embeds: [
                    ui.buildNotice(client, "You need to be on the same voice channel as the Bot!", { error: true }),
                ],
            });
        }

        client.player.stop(interaction.guildId);
        interaction.reply({
            embeds: [
                ui.buildNotice(client, "Stopped playing music!", { title: "Stop" }),
            ],
        });
    },
};
