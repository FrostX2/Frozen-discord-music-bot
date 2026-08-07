const { EmbedBuilder } = require("discord.js");

const RESPONSE_DELAY = 3000;
const BAR_SIZE = 14;

function fmt(ms) {
  if (!ms) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function progressBar(position, duration, size = BAR_SIZE) {
  if (!duration) return "━".repeat(size);
  const pct = Math.min(1, Math.max(0, position / duration));
  const filled = Math.round(pct * size);
  return `${"━".repeat(filled)}●${"━".repeat(Math.max(0, size - filled))}`;
}

function waitUntil(started, delay = RESPONSE_DELAY) {
  const remaining = delay - (Date.now() - started);
  return remaining > 0
    ? new Promise((resolve) => setTimeout(resolve, remaining))
    : Promise.resolve();
}

function avatar(client) {
  return client?.user?.displayAvatarURL({ size: 256 });
}

function buildNotice(client, description, opts = {}) {
  return new EmbedBuilder()
    .setColor(opts.error ? client.config.colorError : client.config.colorDefault)
    .setAuthor({ name: opts.title || "FuriMusic", iconURL: avatar(client) })
    .setDescription(description);
}

function buildAdded(client, song) {
  const title = song?.title || song?.name || "Unknown song";
  const url = song?.url || song?.info?.uri || null;
  const duration = song?.formattedDuration || fmt(song?.duration || (song?.durationInSec ? song.durationInSec * 1000 : 0));
  const author = song?.uploader?.name || song?.info?.author || "Unknown";
  const thumb = song?.thumbnail || song?.info?.artworkUrl || null;

  const embed = new EmbedBuilder()
    .setColor(client.config.colorDefault)
    .setAuthor({ name: "Added to Queue", iconURL: avatar(client) })
    .setDescription(url ? `🎶 **[${title}](${url})**` : `🎶 **${title}**`)
    .addFields([
      { name: "Duration", value: `\`${duration}\``, inline: true },
      { name: "Channel", value: author, inline: true },
    ])
    .setFooter({ text: "FuriMusic" });

  if (thumb) embed.setThumbnail(thumb);
  return embed;
}

function buildAddedPlaylist(client, playlist) {
  return new EmbedBuilder()
    .setColor(client.config.colorDefault)
    .setAuthor({ name: "Playlist Added", iconURL: avatar(client) })
    .setDescription(`Added **${playlist.count}** songs from playlist **${playlist.title}**`)
    .setFooter({ text: "FuriMusic" });
}

function buildNowPlaying(client, { track, queue, player, position }) {
  const info = track?.info || {};
  const title = info.title || track?.title || "Unknown song";
  const url = info.uri || track?.url || null;
  const author = info.author || track?.uploader?.name || "Unknown";
  const duration = info.duration || (track?.durationInSec ? track.durationInSec * 1000 : 0);
  const artwork = info.artworkUrl || track?.thumbnail || null;
  const pos = position ?? player?.position ?? 0;
  const repeatMode = player?.repeatMode || (queue?.loop ? "queue" : "off");
  const repeatLabel = repeatMode === "queue" ? "List" : repeatMode === "track" ? "Song" : "Off";
  const volume = player?.volume ?? queue?.volume ?? 50;
  const requester = track?.userData?.requester || queue?.current?.member || "Unknown";
  const queueLen = queue?.songs?.length || 0;

  const embed = new EmbedBuilder()
    .setColor(client.config.colorDefault)
    .setAuthor({ name: "Now Playing", iconURL: avatar(client) })
    .setTitle(title)
    .setDescription(`\`\`\`fix\n${progressBar(pos, duration)} ${fmt(pos)} / ${fmt(duration)}\`\`\``)
    .addFields([
      { name: "Artist", value: author, inline: true },
      { name: "Volume", value: `\`${volume}%\``, inline: true },
      { name: "Loop", value: `\`${repeatLabel}\``, inline: true },
    ])
    .setFooter({ text: `Requested by ${requester} • ${queueLen} song${queueLen === 1 ? "" : "s"} in queue` });

  if (url) embed.setURL(url);
  if (artwork) embed.setThumbnail(artwork);
  return embed;
}

module.exports = {
  RESPONSE_DELAY,
  fmt,
  progressBar,
  waitUntil,
  avatar,
  buildNotice,
  buildAdded,
  buildAddedPlaylist,
  buildNowPlaying,
};
