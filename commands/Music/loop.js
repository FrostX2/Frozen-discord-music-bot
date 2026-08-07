const { SlashCommandBuilder } = require("discord.js");
const ui = require("../../functions/ui");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("Loop the current song!")
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("Choose the type of loop!")
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const choices = [
            "Turn off repeat mode",
            "Repeat the song",
            "Repeat song list",
        ];
        const filtered = choices.filter((choice) =>
            choice.startsWith(focusedValue)
        );
        await interaction.respond(
            filtered.map((choice) => ({ name: choice, value: choice }))
        );
    },
    async execute(interaction, client) {
        const loop = interaction.options.getString("type");
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

        if (loop === "Turn off repeat mode") {
            queue.setRepeatMode(0);
            interaction.reply({
                embeds: [
                    ui.buildNotice(client, "Repeat mode is now off!", { title: "Loop" }),
                ],
            });
        } else if (loop === "Repeat the song") {
            queue.setRepeatMode(1);
            interaction.reply({
                embeds: [
                    ui.buildNotice(client, "Song loop mode is on!", { title: "Loop" }),
                ],
            });
        } else if (loop === "Repeat song list") {
            queue.setRepeatMode(2);
            interaction.reply({
                embeds: [
                    ui.buildNotice(client, "Playlist looping is enabled!", { title: "Loop" }),
                ],
            });
        }
    },
};
