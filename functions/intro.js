const { EmbedBuilder } = require("discord.js");

function buildIntroEmbed(client) {
  return new EmbedBuilder()
    .setColor(client.config.colorDefault || "#00FF00")
    .setTitle("FuriMusic")
    .setDescription("Paste the song name or link here\n\n**Support:** YouTube, Spotify, SoundCloud")
    .setFooter({ text: "FuriMusic — Paste a song name or link to play" });
}

function isIntroMessage(msg) {
  return msg.embeds?.some((e) => e.title === "FuriMusic" && e.footer?.text?.startsWith("FuriMusic — Paste a song"));
}

module.exports = { buildIntroEmbed, isIntroMessage };
