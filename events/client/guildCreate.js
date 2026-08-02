const { ChannelType, PermissionsBitField } = require("discord.js");

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

      let channel = guild.channels.cache.find(c => c.name === channelName && c.type === ChannelType.GuildText);
      if (!channel) {
        channel = await guild.channels.create({
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

        const { buildIntroEmbed } = require('../../functions/intro');
        await channel.send({ embeds: [buildIntroEmbed(client)] });
      }

      let voice = guild.channels.cache.find(c => c.name === voiceName && c.type === ChannelType.GuildVoice);
      if (!voice) {
        await guild.channels.create({
          name: voiceName,
          type: ChannelType.GuildVoice,
          parent: category.id,
        });
      }

      if (!client.musicSetup) client.musicSetup = {};
      if (channel) client.musicSetup[guild.id] = channel.id;

      console.log(`Setup music channels in ${guild.name} (${guild.id})`);
    } catch (err) {
      console.error(`Failed to setup music channels in ${guild.name}:`, err.message);
    }
  },
};
