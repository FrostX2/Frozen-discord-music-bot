const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("s")
        .setDescription("Stop playing music (alias for /stop)"),

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
            interaction.guild.members.me.voice.channelId !==
            interaction.member.voice.channelId
        ) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.colorError)
                        .setDescription("You need to be on the same voice channel as the Bot!"),
                ],
            });
        }

        client.player.stop(interaction.guildId);
        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(client.config.colorDefault)
                    .setDescription("Stopped playing music!"),
            ],
        });
    },
};
