const { EmbedBuilder, ChannelType, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "guildCreate",
  async execute(guild, client) {
    const channelName = '🎵┊𝓯𝓾𝓻𝓲𝓶𝓾𝓼𝓲𝓬';
    const voiceName = '🔊┊𝓿𝓸𝓲𝓬𝓮';
    const categoryName = '🎵┊𝓶𝓾𝓼𝓲𝓬';
    try {
      let category = guild.channels.cache.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory);
      if (!category) {
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
        });
      }
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: "Paste a song name or link here to play music",
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
          },
        ],
      });

      // also create the voice channel
      const voiceExists = guild.channels.cache.find(c => c.name === voiceName && c.type === ChannelType.GuildVoice);
      if (!voiceExists) {
        await guild.channels.create({
          name: voiceName,
          type: ChannelType.GuildVoice,
          parent: category.id,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(client.config.colorDefault || "#00FF00")
        .setTitle("FuriMusic")
        .setDescription("Paste the song name or link here\n\n**Support:** YouTube, Spotify, SoundCloud")
        .setFooter({ text: "FuriMusic — Paste a song name or link to play" });

      await channel.send({ embeds: [embed] });

      if (!client.musicSetup) client.musicSetup = {};
      client.musicSetup[guild.id] = channel.id;

      console.log(`Created music channel in ${guild.name} (${guild.id})`);
    } catch (err) {
      console.error(`Failed to create music channel in ${guild.name}:`, err.message);
    }
  },
};
