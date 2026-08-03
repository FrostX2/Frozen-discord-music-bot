const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'musicbot.db');
let db;

function init() {
  db = new DatabaseSync(DB_PATH);
  // DELETE journal mode -> keeps everything in one .db file (no -wal / -shm sidecars)
  db.exec('PRAGMA journal_mode = DELETE');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS queue (
      guild_id TEXT PRIMARY KEY,
      songs TEXT NOT NULL,
      saved_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      guild_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY (guild_id, key)
    );
    CREATE TABLE IF NOT EXISTS custom_bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token TEXT NOT NULL,
      client_id TEXT NOT NULL,
      prefix TEXT DEFAULT '!',
      status TEXT DEFAULT 'online',
      status_type TEXT DEFAULT 'playing',
      status_text TEXT DEFAULT '',
      active INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

function saveQueue(guildId, songs) {
  if (!db) return;
  const data = JSON.stringify(songs.map(s => ({
    url: s.url,
    title: s.title,
    name: s.name,
    durationInSec: s.durationInSec,
    formattedDuration: s.formattedDuration,
    thumbnail: s.thumbnail,
    uploader: s.uploader,
    user: s.user,
  })));
  db.prepare(`INSERT OR REPLACE INTO queue (guild_id, songs, saved_at) VALUES (?, ?, ?)`).run(guildId, data, Date.now());
}

function loadQueue(guildId) {
  if (!db) return null;
  const row = db.prepare(`SELECT songs FROM queue WHERE guild_id = ?`).get(guildId);
  if (!row) return null;
  return JSON.parse(row.songs);
}

function clearQueue(guildId) {
  if (!db) return;
  db.prepare(`DELETE FROM queue WHERE guild_id = ?`).run(guildId);
}

function setSetting(guildId, key, value) {
  if (!db) return;
  db.prepare(`INSERT OR REPLACE INTO settings (guild_id, key, value) VALUES (?, ?, ?)`).run(guildId, key, String(value));
}

function getSetting(guildId, key) {
  if (!db) return null;
  const row = db.prepare(`SELECT value FROM settings WHERE guild_id = ? AND key = ?`).get(guildId, key);
  return row ? row.value : null;
}

function addBot(name, token, clientId, prefix) {
  if (!db) return null;
  const result = db.prepare(`INSERT INTO custom_bots (name, token, client_id, prefix, created_at) VALUES (?, ?, ?, ?, ?)`).run(name, token, clientId, prefix || '!', Date.now());
  return Number(result.lastInsertRowid);
}

function getBots() {
  if (!db) return [];
  return db.prepare(`SELECT * FROM custom_bots ORDER BY created_at DESC`).all();
}

function getBot(id) {
  if (!db) return null;
  return db.prepare(`SELECT * FROM custom_bots WHERE id = ?`).get(id);
}

function deleteBot(id) {
  if (!db) return;
  db.prepare(`DELETE FROM custom_bots WHERE id = ?`).run(id);
}

function setActiveBot(id) {
  if (!db) return;
  db.prepare(`UPDATE custom_bots SET active = 0`).run();
  db.prepare(`UPDATE custom_bots SET active = 1 WHERE id = ?`).run(id);
}

function getActiveBot() {
  if (!db) return null;
  return db.prepare(`SELECT * FROM custom_bots WHERE active = 1`).get();
}

function getQueueSettings(guildId) {
  if (!db) return null;
  const row = db.prepare(`SELECT value FROM settings WHERE guild_id = ? AND key = 'voiceChannelId'`).get(guildId);
  const row2 = db.prepare(`SELECT value FROM settings WHERE guild_id = ? AND key = 'textChannelId'`).get(guildId);
  if (!row) return null;
  return { voiceChannelId: row.value, textChannelId: row2?.value };
}

function saveQueueSettings(guildId, voiceChannelId, textChannelId) {
  if (!db) return;
  setSetting(guildId, 'voiceChannelId', voiceChannelId);
  setSetting(guildId, 'textChannelId', textChannelId);
}

module.exports = { init, saveQueue, loadQueue, clearQueue, setSetting, getSetting, addBot, getBots, getBot, deleteBot, setActiveBot, getActiveBot, getQueueSettings, saveQueueSettings };
