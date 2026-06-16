module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    if (oldState.channelId === newState.channelId) return;
    if (!oldState.channelId) return;

    const guildId = oldState.guild.id;
    const bot = oldState.guild.members.me;
    const botVoice = bot.voice.channel;
    if (!botVoice) return;

    const nonBot = botVoice.members.filter(m => !m.user.bot);
    if (nonBot.size > 0) return;

    const { getLavalink, clearLeaveTimer } = require('../../lavalink');
    const player = getLavalink()?.getPlayer(guildId);
    if (player) player.destroy();
    const { getQueue } = require('../../player');
    const q = getQueue(guildId);
    q.current = null;
    q.songs = [];
    q.lavalinkPlayer = null;
    clearLeaveTimer(guildId);
  },
};
