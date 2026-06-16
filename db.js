const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'musicbot.db');
let db;

function init() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
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

module.exports = { init, saveQueue, loadQueue, clearQueue, setSetting, getSetting };
