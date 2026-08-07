const { EmbedBuilder } = require("discord.js");
const ui = require("./ui");

function buildIntroEmbed(client) {
  const embed = new EmbedBuilder()
    .setColor(client.config.colorDefault || "#00FF00")
    .setAuthor({ name: "FuriMusic", iconURL: ui.avatar(client) })
    .setTitle("🎵 FuriMusic")
    .setDescription(
      "Paste a **song name** or **link** below to add it to the queue\n\n" +
        "**Support:** YouTube, Spotify, SoundCloud\n\n" +
        "_The currently playing song will show up here._"
    )
    .setFooter({ text: "FuriMusic — Paste a song name or link to play" });

  return embed;
}

function isIntroMessage(msg) {
  return msg.embeds?.some((e) => e.footer?.text?.startsWith("FuriMusic — Paste a song"));
}

module.exports = { buildIntroEmbed, isIntroMessage };
