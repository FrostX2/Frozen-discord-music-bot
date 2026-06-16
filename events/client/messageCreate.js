const { EmbedBuilder } = require("discord.js");

function fmt(ms) {
  if (!ms) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const textHandlers = {
  async play(client, message, args) {
    const keyword = args.join(" ");
    if (!keyword) return message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription("Provide a song name or URL!")] });
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription("You must be in a voice channel!")] });
    const msg = await message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription("Finding song...")] });
    try {
      const song = await client.player.play(message.channel, voiceChannel, keyword, message.member);
      const desc = song.type === 'playlist'
        ? `Added **${song.count}** songs from playlist **${song.title}**`
        : `Added [${song.title}](${song.url}) to the queue`;
      const embed = new EmbedBuilder().setColor(client.config.colorDefault).setDescription(desc);
      msg.edit({ embeds: [embed] });
    } catch (err) {
      msg.edit({ embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription(`Error: ${err.message}`)] });
    }
  },
  async skip(client, message) {
    try {
      client.player.skip(message.guildId);
      message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription("Skipped!")] });
    } catch (err) {
      message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription(`Error: ${err.message}`)] });
    }
  },
  async stop(client, message) {
    await client.player.stop(message.guildId);
    message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription("Stopped!")] });
  },
  async pause(client, message) {
    await client.player.pause(message.guildId);
    message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription("Paused!")] });
  },
  async resume(client, message) {
    await client.player.resume(message.guildId);
    message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription("Resumed!")] });
  },
  async volume(client, message, args) {
    const vol = parseInt(args[0]);
    if (isNaN(vol) || vol < 0 || vol > 200) return message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription("Volume must be 0-200!")] });
    client.player.setVolume(message.guildId, vol);
    message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription(`Volume set to ${vol}%`)] });
  },
  async loop(client, message, args) {
    const type = args[0]?.toLowerCase();
    if (type === "off" || type === "0") {
      client.player.setLoop(message.guildId, false);
      message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription("Loop off!")] });
    } else {
      client.player.setLoop(message.guildId, true);
      message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription("Loop on!")] });
    }
  },
  async queue(client, message) {
    const queue = client.player.getQueue(message.guildId);
    if (!queue.songs.length) return message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription("Queue is empty!")] });
    const tracks = queue.songs.map((s, i) => `**${i + 1}.** [${s.title}](${s.url})`).join("\n");
    message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription(tracks.slice(0, 4000))] });
  },
  async nowplaying(client, message) {
    const player = require('../../lavalink').getLavalink()?.getPlayer(message.guildId);
    if (!player || !player.queue.current) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription("Nothing is playing right now.")] });
    }
    const track = player.queue.current;
    const queue = client.player.getQueue(message.guildId);
    const repeatMode = player.repeatMode;
    const repeatLabel = repeatMode === 'queue' ? "List" : repeatMode === 'track' ? "Song" : "Off";
    const status = `Volume: \`${player.volume}%\` | Repeat: \`${repeatLabel}\``;
    const embed = new EmbedBuilder()
      .setColor(client.config.colorDefault)
      .setAuthor({ name: "Now Playing", iconURL: client.user.displayAvatarURL() })
      .setDescription(`> [${track.info.title}](${track.info.uri})`)
      .addFields([
        { name: "Status", value: status, inline: false },
        { name: "Duration", value: `${fmt(player.position)} / ${fmt(track.info.duration)}`, inline: true },
        { name: "Author", value: track.info.author || "Unknown", inline: true },
        { name: "Request by", value: queue?.current?.member?.toString() || "Unknown", inline: true },
      ])
      .setImage(track.info.artworkUrl)
      .setFooter({ text: `${queue?.songs?.length || 0} songs in queue` });
    await message.reply({ embeds: [embed] });
  },
  async remove(client, message, args) {
    const id = parseInt(args[0]);
    if (isNaN(id) || id < 1) return message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription("Provide a valid song ID!")] });
    try {
      const removed = client.player.remove(message.guildId, id);
      message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription(`Removed ${removed.title} from queue!`)] });
    } catch (err) {
      message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription(err.message)] });
    }
  },
  async back(client, message) {
    try {
      await client.player.previous(message.guildId);
      message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription("Going back!")] });
    } catch (err) {
      message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorError).setDescription(err.message)] });
    }
  },
  async filter(client, message, args) {
    const filters = ["off", "3d", "bassboost", "echo", "karaoke", "nightcore", "surround"];
    const choice = args[0]?.toLowerCase();
    if (!choice) return message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription(`Filters: ${filters.join(", ")}`)] });
    if (choice === "off" || filters.includes(choice)) {
      message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription(`Filter \`${choice}\` applied!`)] });
    }
  },
  async help(client, message) {
    const prefix = client.config.prefix;
    const desc = [
      `**Music**`,
      `\`${prefix}play\` / \`${prefix}p\` — Play a song`,
      `\`${prefix}skip\` — Skip current song`,
      `\`${prefix}stop\` / \`${prefix}s\` — Stop and leave`,
      `\`${prefix}pause\` — Pause`,
      `\`${prefix}resume\` — Resume`,
      `\`${prefix}volume\` / \`${prefix}vol\` — Set volume (0-200)`,
      `\`${prefix}loop\` — Toggle loop`,
      `\`${prefix}queue\` — Show queue`,
      `\`${prefix}nowplaying\` / \`${prefix}np\` — Current song`,
      `\`${prefix}remove\` — Remove song from queue`,
      `\`${prefix}back\` — Previous song`,
      `\`${prefix}filter\` — Apply audio filter`,
    ].join('\n');
    message.reply({ embeds: [new EmbedBuilder().setColor(client.config.colorDefault).setDescription(desc)] });
  },
};

textHandlers.np = textHandlers.nowplaying;
textHandlers.p = textHandlers.play;
textHandlers.vol = textHandlers.volume;
textHandlers.s = textHandlers.stop;

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;
    if (message.channel.type === "dm") return;

    const prefix = message.client.config.prefix;

    // Prefix commands
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const cmd = args.shift().toLowerCase();

      const handler = textHandlers[cmd];
      if (!handler) return;

      try {
        await handler(message.client, message, args);
      } catch (err) {
        console.error("Text command error:", err);
        message.reply({ embeds: [new EmbedBuilder().setColor(message.client.config.colorError).setDescription(`Error: ${err.message}`)] });
      }
      return;
    }

    // Auto-detect in designated music channel — URLs and search terms
    const setup = message.client.musicSetup || {};
    if (setup[message.guildId] !== message.channel.id) return;

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return;

    const urlMatch = message.content.match(/https?:\/\/\S+/i);
    const query = urlMatch ? urlMatch[0] : message.content.trim();

    try {
      const song = await message.client.player.play(message.channel, voiceChannel, query, message.member);
      const desc = song.type === 'playlist'
        ? `Added **${song.count}** songs from playlist **${song.title}**`
        : `Added [${song.title}](${song.url}) to the queue`;
      message.reply({ embeds: [new EmbedBuilder().setColor(message.client.config.colorDefault).setDescription(desc)] });
    } catch (err) {
      console.error("Auto-play error:", err);
      message.reply({ embeds: [new EmbedBuilder().setColor(message.client.config.colorError).setDescription(`Error: ${err.message}`)] }).catch(() => {});
    }
  },
};
