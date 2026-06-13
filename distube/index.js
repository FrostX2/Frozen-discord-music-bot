const client = require("../index.js");
const player = require("../player.js");

client.player = player;

function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildQueueProxy(guildId, queue) {
  return {
    songs: queue.songs,
    volume: queue.volume,
    filters: { names: [] },
    repeatMode: queue.loop ? 2 : 0,
    autoplay: false,
    formattedDuration: formatDuration(queue.songs.reduce((a, s) => a + (s.duration || 0), 0)),
    formattedCurrentTime: formatDuration(Math.floor((Date.now() - queue.startTime) / 1000)),
    textChannel: queue.textChannel,
    voiceChannel: { id: queue.connection?.joinConfig?.channelId },
    setVolume: (v) => player.setVolume(guildId, v),
    setRepeatMode: (m) => player.setLoop(guildId, m === 1 || m === 2),
    pause: () => player.pause(guildId),
    resume: () => player.resume(guildId),
    skip: () => player.skip(guildId),
    stop: () => player.stop(guildId),
    previous: () => player.previous(guildId),
  };
}

client.distube = {
  getQueue: (interaction) => {
    const queue = player.getQueue(interaction.guildId);
    if (!queue.songs.length) return null;
    return buildQueueProxy(interaction.guildId, queue);
  },
  play: (voiceChannel, keyword, opts) => {
    player.play(opts.textChannel, voiceChannel, keyword, opts.member);
  },
  voices: {
    leave: (interaction) => {
      player.stop(interaction.guildId);
    },
  },
};
