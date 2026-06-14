module.exports = {
  name: "guildCreate",
  async execute(guild, client) {
    console.log(`Joined guild: ${guild.name} (${guild.id})`);
  },
};
