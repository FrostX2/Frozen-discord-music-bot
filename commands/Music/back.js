const { SlashCommandBuilder } = require("discord.js");
const ui = require("../../functions/ui");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("back")
        .setDescription("Playback the played song!"),

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
        if (interaction.guild.members.me.voice.channelId !== interaction.member.voice.channelId) {
            return interaction.reply({
                embeds: [
                    ui.buildNotice(client, "You need to be on the same voice channel as the Bot!", { error: true }),
                ],
            });
        }
        try {
            await client.distube.previous(interaction);
            await interaction.reply({
                embeds: [
                    ui.buildNotice(client, "Previous song!", { title: "Back" }),
                ],
            });
        } catch (err) {
            await interaction.reply({
                embeds: [
                    ui.buildNotice(client, "Cannot go back to previous song!", { error: true, title: "Back" }),
                ],
                ephemeral: true,
            });
        }
    },
};
