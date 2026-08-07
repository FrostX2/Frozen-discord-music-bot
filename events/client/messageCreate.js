const ui = require("../../functions/ui");

const textHandlers = {
  async play(client, message, args, ctx) {
    const keyword = args.join(" ");
    if (!keyword) return ctx.reply({ embeds: [ui.buildNotice(client, "Provide a song name or URL!", { error: true })] });
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return ctx.reply({ embeds: [ui.buildNotice(client, "You must be in a voice channel!", { error: true })] });
    try {
      const song = await client.player.play(message.channel, voiceChannel, keyword, message.member);
      const embed = song.type === 'playlist' ? ui.buildAddedPlaylist(client, song) : ui.buildAdded(client, song);
      await ctx.reply({ embeds: [embed] });
    } catch (err) {
      await ctx.reply({ embeds: [ui.buildNotice(client, `Error: ${err.message}`, { error: true })] });
    }
  },
  async skip(client, message, args, ctx) {
    try {
      client.player.skip(message.guildId);
      await ctx.reply({ embeds: [ui.buildNotice(client, "Skipped!", { title: "Skip" })] });
    } catch (err) {
      await ctx.reply({ embeds: [ui.buildNotice(client, `Error: ${err.message}`, { error: true, title: "Skip" })] });
    }
  },
  async stop(client, message, args, ctx) {
    await client.player.stop(message.guildId);
    await ctx.reply({ embeds: [ui.buildNotice(client, "Stopped!", { title: "Stop" })] });
  },
  async pause(client, message, args, ctx) {
    await client.player.pause(message.guildId);
    await ctx.reply({ embeds: [ui.buildNotice(client, "Paused!", { title: "Pause" })] });
  },
  async resume(client, message, args, ctx) {
    await client.player.resume(message.guildId);
    await ctx.reply({ embeds: [ui.buildNotice(client, "Resumed!", { title: "Resume" })] });
  },
  async volume(client, message, args, ctx) {
    const vol = parseInt(args[0]);
    if (isNaN(vol) || vol < 0 || vol > 200) return ctx.reply({ embeds: [ui.buildNotice(client, "Volume must be 0-200!", { error: true, title: "Volume" })] });
    client.player.setVolume(message.guildId, vol);
    await ctx.reply({ embeds: [ui.buildNotice(client, `Volume set to ${vol}%`, { title: "Volume" })] });
  },
  async loop(client, message, args, ctx) {
    const type = args[0]?.toLowerCase();
    if (type === "off" || type === "0") {
      client.player.setLoop(message.guildId, false);
      await ctx.reply({ embeds: [ui.buildNotice(client, "Loop off!", { title: "Loop" })] });
    } else {
      client.player.setLoop(message.guildId, true);
      await ctx.reply({ embeds: [ui.buildNotice(client, "Loop on!", { title: "Loop" })] });
    }
  },
  async queue(client, message, args, ctx) {
    const queue = client.player.getQueue(message.guildId);
    if (!queue.songs.length) return ctx.reply({ embeds: [ui.buildNotice(client, "Queue is empty!", { title: "Queue" })] });
    const tracks = queue.songs.map((s, i) => `**${i + 1}.** [${s.title}](${s.url})`).join("\n");
    await ctx.reply({ embeds: [ui.buildNotice(client, tracks.slice(0, 4000), { title: "Queue" })] });
  },
  async nowplaying(client, message, args, ctx) {
    const player = require('../../lavalink').getLavalink()?.getPlayer(message.guildId);
    if (!player || !player.queue.current) {
      return ctx.reply({ embeds: [ui.buildNotice(client, "Nothing is playing right now.", { error: true, title: "Now Playing" })] });
    }
    const track = player.queue.current;
    const queue = client.player.getQueue(message.guildId);
    const embed = ui.buildNowPlaying(client, { track, queue, player });
    await ctx.reply({ embeds: [embed] });
  },
  async remove(client, message, args, ctx) {
    const id = parseInt(args[0]);
    if (isNaN(id) || id < 1) return ctx.reply({ embeds: [ui.buildNotice(client, "Provide a valid song ID!", { error: true, title: "Remove" })] });
    try {
      const removed = client.player.remove(message.guildId, id);
      await ctx.reply({ embeds: [ui.buildNotice(client, `Removed ${removed.title} from queue!`, { title: "Remove" })] });
    } catch (err) {
      await ctx.reply({ embeds: [ui.buildNotice(client, err.message, { error: true, title: "Remove" })] });
    }
  },
  async back(client, message, args, ctx) {
    try {
      await client.player.previous(message.guildId);
      await ctx.reply({ embeds: [ui.buildNotice(client, "Going back!", { title: "Back" })] });
    } catch (err) {
      await ctx.reply({ embeds: [ui.buildNotice(client, err.message, { error: true, title: "Back" })] });
    }
  },
  async filter(client, message, args, ctx) {
    const filters = ["off", "3d", "bassboost", "echo", "karaoke", "nightcore", "surround"];
    const choice = args[0]?.toLowerCase();
    if (!choice) return ctx.reply({ embeds: [ui.buildNotice(client, `Filters: ${filters.join(", ")}`, { title: "Filter" })] });
    if (choice === "off" || filters.includes(choice)) {
      await ctx.reply({ embeds: [ui.buildNotice(client, `Filter \`${choice}\` applied!`, { title: "Filter" })] });
    }
  },
  async help(client, message, args, ctx) {
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
      `\`${prefix}reconnect\` — Re-forge Lavalink connection`,
      `\`${prefix}fixme\` — Diagnose and repair the bot`,
    ].join('\n');
    await ctx.reply({ embeds: [ui.buildNotice(client, desc, { title: "Help" })] });
  },
};

textHandlers.np = textHandlers.nowplaying;
textHandlers.p = textHandlers.play;
textHandlers.vol = textHandlers.volume;
textHandlers.s = textHandlers.stop;

textHandlers.reconnect = async (client, message, args, ctx) => {
  const lavalink = require('../../lavalink');
  if (lavalink.isConnected()) {
    return ctx.reply({ embeds: [ui.buildNotice(client, "The bond to the music node pulses strong. No re-forging needed.", { title: "Reconnect" })] });
  }
  try {
    await lavalink.reconnect();
    await ctx.reply({ embeds: [ui.buildNotice(client, "Connection restored. The music node answers once more.", { title: "Reconnect" })] });
  } catch (err) {
    await ctx.reply({ embeds: [ui.buildNotice(client, `Re-forge failed: ${err.message}`, { error: true, title: "Reconnect" })] });
  }
};

textHandlers.fixme = async (client, message, args, ctx) => {
  const lavalinkMod = require('../../lavalink');
  const lavalinkOnline = lavalinkMod.isConnected();
  const wsPing = client.ws.ping;
  const guildCount = client.guilds.cache.size;
  const voiceCount = client.guilds.cache.filter(g => g.members.me.voice.channelId).size;
  const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  const uptime = Math.floor(process.uptime());

  const lines = [
    `Lavalink Node  :: ${lavalinkOnline ? "CONNECTED" : "DISCONNECTED"}`,
    `Discord WS     :: ${wsPing}ms`,
    `Guilds         :: ${guildCount}`,
    `Active Voices  :: ${voiceCount}`,
    `Memory         :: ${memUsage} MB`,
    `Uptime         :: ${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
  ];

  let fixes = [];
  if (!lavalinkOnline) {
    try {
      await lavalinkMod.reconnect();
      fixes.push(lavalinkMod.isConnected() ? "Lavalink node revived" : "Could not revive Lavalink node");
    } catch (err) {
      fixes.push(`Lavalink revival failed: ${err.message}`);
    }
  }

  if (lavalinkMod.isConnected()) {
    for (const [, guild] of client.guilds.cache) {
      if (guild.members.me.voice.channelId) {
        const player = lavalinkMod.getLavalink()?.getPlayer(guild.id);
        if (player && !player.voiceConnected) {
          try { player.connect(); fixes.push(`Reconnected voice in ${guild.name}`); } catch {}
        }
      }
    }
  }

  const desc = [`\`\`\`asciidoc`, ...lines, `\`\`\``, ...(fixes.length ? [`**Mending performed:**`, ...fixes.map(f => `> ${f}`)] : [])].join("\n");
  await ctx.reply({ embeds: [ui.buildNotice(client, desc, { error: !lavalinkOnline })] });
};

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;
    if (message.channel.type === "dm") return;

    const prefix = message.client.config.prefix;

    // Prefix commands — delete the command message and reply after 3 seconds
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const cmd = args.shift().toLowerCase();

      const handler = textHandlers[cmd];
      if (!handler) return;

      message.delete().catch(() => {});

      const ctx = {
        message,
        started: Date.now(),
        async reply(payload, opts = {}) {
          await ui.waitUntil(ctx.started, opts.delay ?? ui.RESPONSE_DELAY);
          return message.channel.send(payload);
        },
      };

      try {
        await handler(message.client, message, args, ctx);
      } catch (err) {
        console.error("Text command error:", err);
        await ctx
          .reply({ embeds: [ui.buildNotice(message.client, `Error: ${err.message}`, { error: true })] })
          .catch(() => {});
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

    message.delete().catch(() => {});

    try {
      const song = await message.client.player.play(message.channel, voiceChannel, query, message.member);
      const embed = song.type === 'playlist'
        ? ui.buildAddedPlaylist(message.client, song)
        : ui.buildAdded(message.client, song);
      const reply = await message.channel.send({ embeds: [embed] });
      setTimeout(() => {
        reply.delete().catch(() => {});
        message.delete().catch(() => {});
      }, ui.RESPONSE_DELAY);
    } catch (err) {
      console.error("Auto-play error:", err);
      const reply = await message.channel
        .send({ embeds: [ui.buildNotice(message.client, `Error: ${err.message}`, { error: true })] })
        .catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), ui.RESPONSE_DELAY);
    }
  },
};
