const { SlashCommandBuilder } = require("@discordjs/builders");
const nowplaying = require("./nowplaying.js");

module.exports = {
  category: "Music",
  data: new SlashCommandBuilder()
    .setName("np")
    .setDescription("Show the currently playing song!"),
  execute: nowplaying.execute,
};
