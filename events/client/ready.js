const { ActivityType, ChannelType, PermissionsBitField, EmbedBuilder } = require("discord.js");

async function ensureMusicChannels(client) {
  const setup = {};
  const name = '🎵┊𝓯𝓾𝓻𝓲𝓶𝓾𝓼𝓲𝓬';
  for (const guild of client.guilds.cache.values()) {
    let channel;
    try {
      const channels = await guild.channels.fetch();
      channel = channels.find(c => c.name === name && c.type === ChannelType.GuildText);
    } catch {}
    if (!channel) {
      try {
        channel = await guild.channels.create({
          name,
          type: ChannelType.GuildText,
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
        console.error(`Failed to create music channel in ${guild.name}:`, err.message);
        continue;
      }
    }
    setup[guild.id] = channel.id;
  }
  client.musicSetup = setup;
}

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        console.log(`${client.user.tag} is ready!`);
        ensureMusicChannels(client);

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
