module.exports = {
  name: "guildDelete",
  async execute(guild) {
    const client = guild.client;
    if (client.musicSetup && client.musicSetup[guild.id]) {
      delete client.musicSetup[guild.id];
      console.log(`Cleaned up FuriMusic setup for ${guild.name} (${guild.id})`);
    }
  },
};
