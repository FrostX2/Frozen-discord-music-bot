const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

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
                    new EmbedBuilder()
                        .setColor(client.config.colorError)
                        .setDescription("You must be in a voice channel to use this command!"),
                ],
            });
        }
        if (interaction.guild.members.me.voice.channelId !== interaction.member.voice.channelId) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.colorError)
                        .setDescription("You need to be on the same voice channel as the Bot!"),
                ],
            });
        }
        try {
            await client.distube.previous(interaction);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.colorDefault)
                        .setDescription("Previous song!"),
                ],
            });
        } catch (err) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.colorError)
                        .setDescription("Cannot go back to previous song!"),
                ],
                ephemeral: true,
            });
        }
    },
};
