const { EmbedBuilder } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    category: "Information",
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show all available commands")
        .addStringOption((option) =>
            option
                .setName("command")
                .setDescription("Command name")
                .setRequired(false)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const choices = client.commands.map((c) => c.data.name);
        const filtered = choices.filter((choice) =>
            choice.startsWith(focusedValue)
        );
        await interaction.respond(
            filtered.map((choice) => ({ name: choice, value: choice }))
        );
    },

    async execute(interaction, client) {
        const command = interaction.options.get("command");
        if (command) {
            getCommand(client, interaction);
        } else {
            getAll(client, interaction);
        }
    },
};

const getAll = (client, interaction) => {
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Command List`, iconURL: client.user.displayAvatarURL() })
        .setColor(client.config.colorDefault)
        .setDescription(`> Total commands: ${client.commands.size}`)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: `Use /help + command name for details` });

    const categories = client.commands
        .map((c) => c.category)
        .filter((c, i, a) => a.indexOf(c) === i);
    categories.forEach((category) => {
        const commands = client.commands.filter((c) => c.category === category);
        embed.addFields({
            name: `> ${category}[${commands.size}]`,
            value: commands.map((c) => `\`\\${c.data.name}\``).join(" "),
        });
    });

    interaction.reply({ embeds: [embed] });
};

const getCommand = (client, interaction) => {
    const command = interaction.options.get("command");
    const commandData = client.commands.find(
        (c) => c.data.name === command.value
    );
    if (!commandData) {
        interaction.reply("Command not found");
        return;
    }
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Command Details`, iconURL: client.user.displayAvatarURL() })
        .setTitle(`Info about \`${command.value}\``)
        .setColor(client.config.colorDefault)
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
            {
                name: "Name",
                value: commandData.data.name,
                inline: true,
            },
            {
                name: "Category",
                value: commandData.category,
                inline: true,
            },
            {
                name: "Description",
                value: commandData.data.description,
                inline: true,
            }
        );
    interaction.reply({ embeds: [embed] });
};
