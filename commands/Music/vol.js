const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("vol")
        .setDescription("Change volume (alias for /volume)")
        .addIntegerOption((option) =>
            option
                .setName("volume")
                .setDescription("Volume level (0-200)")
                .setMaxValue(200)
                .setMinValue(0)
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const volume = interaction.options.getInteger("volume");
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

        client.player.setVolume(interaction.guildId, volume);
        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(client.config.colorDefault)
                    .setDescription(`Volume set to ${volume}%`),
            ],
        });
    },
};
