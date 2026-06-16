const { ActivityType, ChannelType, PermissionsBitField, EmbedBuilder } = require("discord.js");

async function ensureMusicChannels(client) {
  const setup = {};
  const channelName = '🎵┊𝓯𝓾𝓻𝓲𝓶𝓾𝓼𝓲𝓬';
  const voiceName = '🔊┊𝓿𝓸𝓲𝓬𝓮';
  const categoryName = '🎵┊𝓶𝓾𝓼𝓲𝓬';
  for (const guild of client.guilds.cache.values()) {
    // Ensure category exists
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

    // Ensure text channel exists
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

    // Ensure voice channel exists
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

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        console.log(`${client.user.tag} is ready!`);
        ensureMusicChannels(client);

        // Restore saved queues from database
        const { getQueue, restoreQueue } = require('../../player');
        const db = require('../../db');
        for (const guild of client.guilds.cache.values()) {
            const saved = restoreQueue(guild.id);
            if (saved && saved.length > 0) {
                console.log(`[DB] Restored ${saved.length} songs in queue for ${guild.name} (${guild.id})`);
            }
        }

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
