const { SlashCommandBuilder } = require("discord.js");
const ui = require("../../functions/ui");

module.exports = {
    category: "Music",
    data: new SlashCommandBuilder()
        .setName("filter")
        .setDescription("Filter the queue")
        .addStringOption((option) =>
            option
                .setName("filter")
                .setDescription("Filter the queue")
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const choices = [
            "off",
            "3d",
            "bassboost",
            "echo",
            "karaoke",
            "nightcore",
            "surround",
        ];
        const filtered = choices.filter((choice) =>
            choice.startsWith(focusedValue)
        );
        await interaction.respond(
            filtered.map((choice) => ({ name: choice, value: choice }))
        );
    },
    async execute(interaction, client) {
        const filter = interaction.options.getString("filter");
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

        if (filter === "off" && queue.filters.size) queue.filters.clear();
        else if (Object.keys(client.distube.filters).includes(filter)) {
            if (queue.filters.has(filter)) queue.filters.remove(filter);
            else queue.filters.add(filter);
        }
        interaction.reply({
            embeds: [
                ui.buildNotice(client, `Filters \`${filter}\` have been added to the audio!`, { title: "Filter" }),
            ],
        });
    },
};
