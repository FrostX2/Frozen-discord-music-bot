const { ActivityType, ChannelType, PermissionsBitField, EmbedBuilder } = require("discord.js");

async function ensureMusicChannels(client) {
  const setup = {};
  const channelName = '🎵┊𝓯𝓾𝓻𝓲𝓶𝓾𝓼𝓲𝓬';
  const voiceName = '🔊┊𝓿𝓸𝓲𝓬𝓮';
  const categoryName = '🎵┊𝓶𝓾𝓼𝓲𝓬';
  for (const guild of client.guilds.cache.values()) {
    let category;
    try {
      const channels = await guild.channels.fetch();
      category = channels.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory);
    } catch {}
    if (!category) {
      try {
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
        });
      } catch (err) {
        console.error(`Failed to create category in ${guild.name}:`, err.message);
      }
    }

    let channel;
    try {
      const channels = await guild.channels.fetch();
      channel = channels.find(c => c.name === channelName && c.type === ChannelType.GuildText);
    } catch {}
    if (!channel && category) {
      try {
        channel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: category.id,
          topic: "Paste a song name or link here to play music",
          permissionOverwrites: [{
            id: guild.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
          }],
        });
        const embed = new EmbedBuilder()
          .setColor(client.config.colorDefault || "#00FF00")
          .setTitle("FuriMusic")
          .setDescription("Paste the song name or link here\n\n**Support:** YouTube, Spotify, SoundCloud")
          .setFooter({ text: "FuriMusic — Paste a song name or link to play" });
        await channel.send({ embeds: [embed] });
      } catch (err) {
        console.error(`Failed to create text channel in ${guild.name}:`, err.message);
      }
    }

    let voice;
    try {
      const channels = await guild.channels.fetch();
      voice = channels.find(c => c.name === voiceName && c.type === ChannelType.GuildVoice);
    } catch {}
    if (!voice && category) {
      try {
        await guild.channels.create({
          name: voiceName,
          type: ChannelType.GuildVoice,
          parent: category.id,
        });
      } catch (err) {
        console.error(`Failed to create voice channel in ${guild.name}:`, err.message);
      }
    }

    if (channel) setup[guild.id] = channel.id;
  }
  client.musicSetup = setup;
}

async function autoPlayQueues(client) {
  const { getQueue, restoreQueue } = require('../../player');
  const db = require('../../db');
  const { getLavalink, isConnected } = require('../../lavalink');

  for (const guild of client.guilds.cache.values()) {
    const saved = restoreQueue(guild.id);
    if (!saved || !saved.length) continue;

    const settings = db.getQueueSettings(guild.id);
    if (!settings?.voiceChannelId) {
      console.log(`[AutoPlay] ${guild.name}: ${saved.length} songs saved but no voice channel recorded, skipping`);
      continue;
    }

    let voiceChannel;
    try {
      voiceChannel = await guild.channels.fetch(settings.voiceChannelId);
    } catch {}
    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
      console.log(`[AutoPlay] ${guild.name}: saved voice channel not found, skipping`);
      continue;
    }

    const nonBotMembers = voiceChannel.members.filter(m => !m.user.bot);
    if (nonBotMembers.size === 0) {
      console.log(`[AutoPlay] ${guild.name}: no users in ${voiceChannel.name}, queue kept in DB`);
      continue;
    }

    const lavalink = getLavalink();
    if (!lavalink || !isConnected()) {
      console.log(`[AutoPlay] ${guild.name}: Lavalink not connected yet, skipping`);
      continue;
    }

    const queue = getQueue(guild.id);
    const textChannel = settings.textChannelId ? guild.channels.cache.get(settings.textChannelId) : null;

    let player = lavalink.getPlayer(guild.id);
    if (!player) {
      player = lavalink.createPlayer({
        guildId: guild.id,
        voiceChannelId: voiceChannel.id,
        textChannelId: textChannel?.id || voiceChannel.id,
        volume: queue.volume,
      });
      queue.lavalinkPlayer = player;
      queue.textChannel = textChannel;
      player.connect();
    }

    const firstSong = queue.songs[0];
    if (firstSong?.url) {
      try {
        const result = await player.search({ query: firstSong.url }, client.user);
        if (result?.tracks?.length) {
          player.queue.add(result.tracks[0]);
          await player.play();
          console.log(`[AutoPlay] ${guild.name}: resumed "${firstSong.name}" in ${voiceChannel.name} (${nonBotMembers.size} users)`);
        } else {
          console.log(`[AutoPlay] ${guild.name}: track not found on Lavalink, skipping`);
          queue.songs.shift();
          db.saveQueue(guild.id, queue.songs);
        }
      } catch (err) {
        console.error(`[AutoPlay] ${guild.name}: failed to play:`, err.message);
      }
    }
  }
}

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        console.log(`${client.user.tag} is ready!`);
        ensureMusicChannels(client);

        // Wait for music channels to be set up
        await new Promise(r => setTimeout(r, 3000));

        // Auto-join and play saved queues
        await autoPlayQueues(client);

        let activities = [
                `music with NotFrost`,
                `${client.user.username}`,
                `${
                    client.guilds.cache.size
                } servers | ${client.guilds.cache.reduce(
                    (a, b) => a + b.memberCount,
                    0
                )} users`,
                `🐛${client.commands.size} commands!`,
            ],
            i = 0;
        setInterval(
            () =>
                client.user.setActivity({
                    name: `${activities[i++ % activities.length]}`,
                    type: ActivityType.Listening,
                }),
            5000
        );
    },
};
