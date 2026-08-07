const { SlashCommandBuilder } = require("discord.js");
const ui = require("../../functions/ui");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("volume")
        .setDescription("Change the volume of the currently playing song (0-200)!")
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

        client.player.setVolume(interaction.guildId, volume);
        interaction.reply({
            embeds: [
                ui.buildNotice(client, `Volume set to ${volume}%`, { title: "Volume" }),
            ],
        });
    },
};
