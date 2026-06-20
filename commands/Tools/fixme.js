const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

const DIAG_ICONS = { ok: "●", warn: "○", dead: "✕" };

module.exports = {
  category: "Tools",
  data: new SlashCommandBuilder()
    .setName("fixme")
    .setDescription("Diagnose and mend the bot's vital signs"),

  async execute(interaction, client) {
    await interaction.deferReply();

    const lavalinkMod = require("../../lavalink");
    const lavalinkOnline = lavalinkMod.isConnected();
    const wsPing = client.ws.ping;
    const guildCount = client.guilds.cache.size;
    const voiceCount = client.guilds.cache.filter(g => g.members.me.voice.channelId).size;
    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const uptime = Math.floor(process.uptime());

    let diagnosis = [];
    let actions = [];

    // Check lavalink
    if (!lavalinkOnline) {
      diagnosis.push("✕ Lavalink node is silent — attempting reconnection");
      try {
        await lavalinkMod.reconnect();
        if (lavalinkMod.isConnected()) {
          actions.push("✓ Lavalink node revived");
        } else {
          actions.push("✕ Could not revive Lavalink node");
        }
      } catch (err) {
        actions.push(`✕ Lavalink revival failed: ${err.message}`);
      }
    } else {
      diagnosis.push("● Lavalink node is alive");
    }

    // Check voice state corruption
    for (const [, guild] of client.guilds.cache) {
      if (guild.members.me.voice.channelId) {
        const player = lavalinkMod.getLavalink()?.getPlayer(guild.id);
        if (player && !player.voiceConnected) {
          try {
            player.connect();
            actions.push(`✓ Reconnected voice in ${guild.name}`);
          } catch {
            actions.push(`✕ Could not fix voice in ${guild.name}`);
          }
        }
      }
    }

    if (!actions.length) {
      diagnosis.push("● Voice states clean");
    }

    const finalLavalink = lavalinkMod.isConnected();
    const finalIcon = finalLavalink ? DIAG_ICONS.ok : DIAG_ICONS.dead;

    const embed = new EmbedBuilder()
      .setColor(finalLavalink ? client.config.colorDefault : client.config.colorError)
      .setAuthor({ name: "Vital Signs Report", iconURL: client.user.displayAvatarURL() })
      .setDescription([
        `\`\`\`asciidoc`,
        `${finalIcon} Lavalink Node  :: ${finalLavalink ? "CONNECTED" : "DISCONNECTED"}`,
        `${DIAG_ICONS.ok} Discord WS    :: ${wsPing}ms`,
        `${DIAG_ICONS.ok} Guilds         :: ${guildCount}`,
        `${DIAG_ICONS.ok} Active Voices  :: ${voiceCount}`,
        `${DIAG_ICONS.ok} Memory         :: ${memUsage} MB`,
        `${DIAG_ICONS.ok} Uptime         :: ${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        `\`\`\``,
        ...(actions.length ? [`**Mending performed:**`, ...actions.map(a => `> ${a}`)] : []),
      ].join("\n"));

    await interaction.editReply({ embeds: [embed] });
  },
};
