const { join } = require("path");
const { readFileSync, writeFileSync } = require("fs");

const SETUP_PATH = join(__dirname, "../../music-setup.json");

module.exports = {
  name: "guildDelete",
  async execute(guild) {
    try {
      const setup = JSON.parse(readFileSync(SETUP_PATH, "utf8"));
      if (setup[guild.id]) {
        delete setup[guild.id];
        writeFileSync(SETUP_PATH, JSON.stringify(setup, null, 2));
        console.log(`Cleaned up FuriMusic setup for ${guild.name} (${guild.id})`);
      }
    } catch {}
  },
};
