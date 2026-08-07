const ICONS = {
  nodes: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>',
  servers: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  bots: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>',
  invite: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  play: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>',
  pause: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>',
  skip: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/><line x1="19" y1="3" x2="19" y2="21" stroke="currentColor" stroke-width="2"/></svg>',
  stop: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>',
  back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"/></svg>',
  chevron: '<svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
  volume: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
};

const App = {
  statusInterval: null,
  expandedGuilds: {},

  init() {
    this.bindLogout();
    this.renderDashboard();
    this.startStatusPolling();
  },

  bindLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/login';
    });
  },

  async renderDashboard() {
    const el = document.getElementById('pageContent');
    el.innerHTML = '<div class="loading-spinner">Loading...</div>';

    const [status, players, lavalink, guilds, bots, invite, settings] = await Promise.all([
      this.fetchJSON('/api/status'),
      this.fetchJSON('/api/players'),
      this.fetchJSON('/api/lavalink'),
      this.fetchJSON('/api/guilds'),
      this.fetchJSON('/api/bots'),
      this.fetchJSON('/api/invite'),
      this.fetchJSON('/api/settings'),
    ]);

    const nodes = lavalink?.nodes || [];
    const connectedNodes = nodes.filter(n => n.connected).length;
    const playerByGuild = {};
    (players?.players || []).forEach(p => { playerByGuild[p.guildId] = p; });

    const version = status?.version || '';

    el.innerHTML = `
      <div class="hero">
        <div>
          <h2 class="hero-title">Dashboard</h2>
          <p class="hero-sub">${status?.guilds || 0} servers · ${players?.players?.length || 0} active players · one page, everything at a glance</p>
        </div>
        <span class="version-badge js-version">v${version || '&ndash;'}</span>
      </div>

      ${this.statsCardsHTML(status, nodes, connectedNodes)}

      <div class="section-heading">
        <h2>${ICONS.nodes} Lavalink Nodes</h2>
        <span class="tag ${connectedNodes ? 'tag-green' : 'tag-red'}">${connectedNodes}/${nodes.length} Connected</span>
      </div>
      <div id="lavalinkNodesCard">${this.nodesCardsHTML(lavalink)}</div>

      <div class="section-heading">
        <h2>${ICONS.servers} Servers</h2>
        <span class="tag tag-blue">${guilds?.count || 0}</span>
      </div>
      ${(guilds?.guilds?.length)
        ? `<div class="guild-list">${guilds.guilds.map(g => this.guildCardHTML(g, playerByGuild[g.id])).join('')}</div>`
        : '<div class="empty-state">No servers found</div>'}

      <div class="section-heading">
        <h2>${ICONS.bots} Custom Bots</h2>
        <button class="btn btn-primary btn-sm" onclick="App.showAddBotModal()">+ Add Bot</button>
      </div>
      <div class="card">
        ${(bots?.bots?.length) ? this.botsTableHTML(bots.bots) : '<div class="empty-state">No custom bots added yet. Click "Add Bot" to add one.</div>'}
      </div>

      <div class="section-heading">
        <h2>${ICONS.invite} Invite Bot</h2>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
          <p style="color:var(--text-dim);font-size:13px">Invite FuriMusic to any server in one click.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a href="${invite?.url || '#'}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Open Invite Link</a>
            <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${invite?.url || ''}');App.toast('Link copied!','success')">Copy Link</button>
          </div>
        </div>
        <div class="invite-box">${invite?.url || 'N/A'}</div>
      </div>
    `;
  },

  statsCardsHTML(status, nodes, connectedNodes) {
    const card = (label, value, opts = {}) => `
      <div class="stat-card">
        <div class="stat-label">${label}</div>
        <div class="stat-value ${opts.cls || ''}" ${opts.id ? `id="${opts.id}"` : ''} style="${opts.small ? 'font-size:20px' : ''}">${value}${opts.suffix || ''}</div>
      </div>`;
    return `
      <div class="stats-grid">
        ${card('Status', status?.ready ? 'Online' : 'Offline', { cls: status?.ready ? 'green' : 'red' })}
        ${card('Servers', status?.guilds || 0, { cls: 'blue' })}
        ${card('Active Players', status?.playingCount || 0, { cls: 'yellow' })}
        ${card('Latency', status?.latency || 0, { suffix: '<span style="font-size:14px;font-weight:600;color:var(--text-muted)">ms</span>' })}
        ${card('Lavalink', status?.lavalinkConnected ? 'Connected' : 'Disconnected', { cls: status?.lavalinkConnected ? 'green' : 'red', id: 'statLavalink' })}
        ${card('Nodes', `${connectedNodes}/${nodes.length}`, { cls: connectedNodes ? 'green' : 'red', id: 'statNodes' })}
        ${card('Uptime', this.formatUptime(status?.uptime || 0), { small: true })}
        ${card('Version', `v${status?.version || '&ndash;'}`, { cls: 'purple' })}
      </div>`;
  },

  guildCardHTML(g, player) {
    const status = player
      ? (player.playing ? '<span class="tag tag-green">Playing</span>' : player.paused ? '<span class="tag tag-yellow">Paused</span>' : '<span class="tag tag-red">Stopped</span>')
      : '<span class="tag">Idle</span>';
    const icon = g.icon
      ? `<img class="guild-icon" src="${g.icon}" alt="">
`
      : `<div class="guild-icon" style="background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">${this.escapeHtml(g.name.charAt(0).toUpperCase())}</div>
`;
    return `
      <div class="guild-card" id="guildCard-${g.id}">
        <div class="guild-head" onclick="App.toggleGuild('${g.id}')">
          ${icon}
          <div class="guild-main">
            <div class="guild-name">${this.escapeHtml(g.name)}</div>
            <div class="guild-meta">${g.memberCount} members · ${g.musicChannel ? `<code>${this.escapeHtml(g.musicChannel)}</code>` : 'no music channel'}</div>
          </div>
          ${status}
          ${ICONS.chevron}
        </div>
        <div class="guild-detail" id="guildDetail-${g.id}" hidden></div>
      </div>
    `;
  },

  async toggleGuild(guildId) {
    const card = document.getElementById('guildCard-' + guildId);
    const detail = document.getElementById('guildDetail-' + guildId);
    if (!card || !detail) return;
    card.classList.toggle('open');
    if (detail.hidden) {
      detail.hidden = false;
      detail.innerHTML = '<div class="loading-spinner" style="padding:24px">Loading player...</div>';
      await this.renderGuildDetail(guildId, detail);
    } else {
      detail.hidden = true;
    }
  },

  async renderGuildDetail(guildId, el) {
    const data = await this.fetchJSON(`/api/players/${guildId}`);
    const guildsData = await this.fetchJSON('/api/guilds');
    const g = guildsData?.guilds?.find(x => x.id === guildId);
    const name = g?.name || guildId;

    if (!data || !data.connected) {
      el.innerHTML = `<div class="empty-state">No active player in <strong>${this.escapeHtml(name)}</strong>.</div>`;
      return;
    }

    el.innerHTML = `
      <div class="gd-top">
        <div class="gd-head">
          <strong>${this.escapeHtml(name)}</strong>
          <span class="tag ${data.playing ? 'tag-green' : data.paused ? 'tag-yellow' : 'tag-red'}">${data.playing ? 'Playing' : data.paused ? 'Paused' : 'Stopped'}</span>
        </div>
        <div class="player-controls">
          <button class="ctrl-btn" onclick="App.playerAction('back','${guildId}')" title="Previous">${ICONS.back}</button>
          ${data.paused
            ? `<button class="ctrl-btn" onclick="App.playerAction('resume','${guildId}')" title="Resume">${ICONS.play}</button>`
            : `<button class="ctrl-btn" onclick="App.playerAction('pause','${guildId}')" title="Pause">${ICONS.pause}</button>`}
          <button class="ctrl-btn" onclick="App.playerAction('skip','${guildId}')" title="Skip">${ICONS.skip}</button>
          <button class="ctrl-btn danger" onclick="App.playerAction('stop','${guildId}')" title="Stop">${ICONS.stop}</button>
        </div>
        <div class="gd-sliders">
          <div style="display:flex;align-items:center;gap:8px">
            ${ICONS.volume}
            <input type="range" class="volume-slider" min="0" max="200" value="${data.volume}" onchange="App.setVolume('${guildId}', this.value)" title="Volume">
            <span style="font-size:12px;color:var(--text-muted);min-width:34px">${data.volume}%</span>
          </div>
          <button class="btn btn-sm ${data.loop ? 'btn-primary' : 'btn-ghost'}" onclick="App.toggleLoop('${guildId}', ${!data.loop})">Loop: ${data.loop ? 'On' : 'Off'}</button>
        </div>
      </div>

      ${data.current ? `
        <div class="gd-current">
          ${data.current.thumbnail ? `<img src="${data.current.thumbnail}" width="52" height="52" style="border-radius:10px;object-fit:cover;flex-shrink:0">` : ''}
          <div style="min-width:0">
            <div class="gd-nowplaying">Now Playing</div>
            <div class="gd-track-title">${this.escapeHtml(data.current.title)}</div>
            <div class="gd-track-meta">${data.current.duration}</div>
          </div>
        </div>
      ` : ''}

      <div class="gd-queue-head">
        <span>Queue (${data.songs.length} songs)</span>
        ${data.songs.length ? `<button class="btn btn-sm btn-danger" onclick="App.clearQueue('${guildId}')">Clear Queue</button>` : ''}
      </div>
      ${data.songs.length ? `
        <ul class="queue-list">
          ${data.songs.map((s, i) => `
            <li class="queue-item ${i === 0 && data.current ? 'current' : ''}">
              <span class="queue-num">${s.id}</span>
              <div class="queue-info">
                <div class="queue-title">${this.escapeHtml(s.title)}</div>
                <div class="queue-meta">${s.duration} · ${this.escapeHtml(s.uploader)} · Requested by ${this.escapeHtml(s.user)}</div>
              </div>
              <div class="queue-actions">
                <button class="btn btn-sm btn-ghost" onclick="App.removeSong('${guildId}', ${s.id})">Remove</button>
              </div>
            </li>
          `).join('')}
        </ul>
      ` : '<div class="empty-state">Queue is empty</div>'}

      <div class="gd-play">
        <input type="text" id="playQuery-${guildId}" class="gd-input" placeholder="Enter song name or URL...">
        <button class="btn btn-primary" onclick="App.playSong('${guildId}')">Play</button>
      </div>
    `;
  },

  nodesCardsHTML(lavalink) {
    if (!lavalink) return '';
    const nodes = lavalink.nodes || [];
    const connected = nodes.filter(n => n.connected).length;
    return `
      ${nodes.length ? `
        <div class="node-grid">
          ${nodes.map(n => `
            <div class="node-card ${n.connected ? '' : 'offline'}">
              <div class="node-head">
                <span class="status-dot ${n.connected ? 'online' : 'offline'}"></span>
                <span class="node-name">${this.escapeHtml(n.id)}</span>
                ${n.active ? '<span class="tag tag-blue">Active</span>' : ''}
                <span class="tag ${n.connected ? 'tag-green' : 'tag-red'}">${n.connected ? 'Up' : 'Down'}</span>
              </div>
              <div class="node-addr">${this.escapeHtml(n.host || '')}:${n.port ?? ''}</div>
              <div class="node-stats">
                <span class="node-stat-pill">${n.type === 'NodeLink' ? 'NodeLink' : 'Lavalink'}</span>
                <span class="node-stat-pill">Playing ${n.playingPlayers}</span>
                <span class="node-stat-pill">Queue ${n.players}</span>
                <span class="node-stat-pill">Up ${this.formatUptime(Math.floor((n.uptime || 0) / 1000))}</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<div class="empty-state">No nodes configured</div>'}
    `;
  },

  botsTableHTML(bots) {
    return `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Client ID</th><th>Prefix</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            ${bots.map(b => `
              <tr>
                <td data-label="Name"><strong>${this.escapeHtml(b.name)}</strong></td>
                <td data-label="Client ID"><code>${this.escapeHtml(b.client_id)}</code></td>
                <td data-label="Prefix"><code>${this.escapeHtml(b.prefix)}</code></td>
                <td data-label="Active">${b.active ? '<span class="tag tag-blue">Active</span>' : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td data-label="Actions">
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    ${!b.active ? `<button class="btn btn-sm btn-success" onclick="App.activateBot(${b.id})">Activate</button>` : ''}
                    <button class="btn btn-sm btn-danger" onclick="App.deleteBot(${b.id})">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // ===== Actions =====
  async playerAction(action, guildId) {
    try {
      await this.fetchJSON(`/api/player/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId })
      });
      this.toast(`${action} sent`, 'success');
      this.refreshGuild(guildId);
    } catch (e) { this.toast(`Failed: ${e.message}`, 'error'); }
  },

  async setVolume(guildId, vol) {
    await this.fetchJSON('/api/player/volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, volume: parseInt(vol) })
    });
    this.toast(`Volume set to ${vol}%`, 'info');
  },

  async toggleLoop(guildId, loop) {
    await this.fetchJSON('/api/player/loop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, loop })
    });
    this.toast(`Loop ${loop ? 'enabled' : 'disabled'}`, 'info');
    this.refreshGuild(guildId);
  },

  async removeSong(guildId, id) {
    await this.fetchJSON('/api/player/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, id })
    });
    this.toast('Song removed', 'success');
    this.refreshGuild(guildId);
  },

  async clearQueue(guildId) {
    if (!confirm('Remove all songs from the queue?')) return;
    const res = await this.fetchJSON('/api/player/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId })
    });
    if (res?.ok) {
      this.toast(`Cleared ${res.count} songs`, 'success');
      this.refreshGuild(guildId);
    }
  },

  async playSong(guildId) {
    const input = document.getElementById('playQuery-' + guildId);
    const query = input?.value?.trim();
    if (!query) return;
    const res = await this.fetchJSON('/api/player/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, query })
    });
    if (res?.ok) {
      this.toast('Playing!', 'success');
      input.value = '';
      this.refreshGuild(guildId);
    } else {
      this.toast(res?.error || 'Failed to play', 'error');
    }
  },

  async refreshGuild(guildId) {
    const detail = document.getElementById('guildDetail-' + guildId);
    if (!detail || detail.hidden) return;
    await this.renderGuildDetail(guildId, detail);
    const status = await this.fetchJSON('/api/status');
    const players = await this.fetchJSON('/api/players');
    this.updateStatusUI(status);
    const player = (players?.players || []).find(p => p.guildId === guildId);
    const card = document.getElementById('guildCard-' + guildId);
    if (card) {
      const head = card.querySelector('.guild-head');
      if (head && head.querySelector('.tag')) {
        const tag = player
          ? (player.playing ? '<span class="tag tag-green">Playing</span>' : player.paused ? '<span class="tag tag-yellow">Paused</span>' : '<span class="tag tag-red">Stopped</span>')
          : '<span class="tag">Idle</span>';
        head.querySelector('.tag').outerHTML = tag;
      }
    }
  },

  // ===== Custom Bots =====
  showAddBotModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>Add Custom Bot</h2>
        <div class="input-group"><input id="botName" placeholder="Bot Name" required></div>
        <div class="input-group"><input id="botToken" placeholder="Bot Token" type="password" required></div>
        <div class="input-group"><input id="botClientId" placeholder="Client ID" required></div>
        <div class="input-group"><input id="botPrefix" placeholder="Prefix (!)" value="!"></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="App.submitAddBot(this)">Add Bot</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  },

  async submitAddBot(btn) {
    const name = document.getElementById('botName').value.trim();
    const token = document.getElementById('botToken').value.trim();
    const clientId = document.getElementById('botClientId').value.trim();
    const prefix = document.getElementById('botPrefix').value.trim() || '!';
    if (!name || !token || !clientId) { this.toast('All fields required', 'error'); return; }
    const res = await this.fetchJSON('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, token, clientId, prefix })
    });
    if (res?.ok) {
      this.toast('Bot added!', 'success');
      document.querySelector('.modal-overlay')?.remove();
      this.renderDashboard();
    } else {
      this.toast(res?.error || 'Failed', 'error');
    }
  },

  async deleteBot(id) {
    if (!confirm('Delete this bot?')) return;
    await this.fetchJSON(`/api/bots/${id}/delete`, { method: 'POST' });
    this.toast('Bot deleted', 'success');
    this.renderDashboard();
  },

  async activateBot(id) {
    await this.fetchJSON(`/api/bots/${id}/activate`, { method: 'POST' });
    this.toast('Bot activated', 'success');
    this.renderDashboard();
  },

  // ===== Status polling =====
  async startStatusPolling() {
    const poll = async () => {
      const status = await this.fetchJSON('/api/status');
      if (status) this.updateStatusUI(status);
      const lavalink = await this.fetchJSON('/api/lavalink');
      const card = document.getElementById('lavalinkNodesCard');
      const nodesStat = document.getElementById('statNodes');
      const lavalinkStat = document.getElementById('statLavalink');
      if (card) card.innerHTML = this.nodesCardsHTML(lavalink);
      if (nodesStat && lavalink?.nodes) {
        const nodes = lavalink.nodes || [];
        const connected = nodes.filter(n => n.connected).length;
        nodesStat.innerHTML = `${connected}/${nodes.length}`;
        nodesStat.className = 'stat-value ' + (connected ? 'green' : 'red');
      }
      if (lavalinkStat && lavalink) {
        lavalinkStat.textContent = lavalink.connected ? 'Connected' : 'Disconnected';
        lavalinkStat.className = 'stat-value ' + (lavalink.connected ? 'green' : 'red');
      }
    };
    poll();
    this.statusInterval = setInterval(poll, 10000);
  },

  updateStatusUI(status) {
    if (!status) return;
    const online = !!status.ready;
    document.getElementById('topbarDot').className = 'status-dot ' + (online ? 'online' : 'connecting');
    document.getElementById('topbarStatus').textContent = online ? `Online · ${status.guilds} servers · ${status.latency}ms` : 'Connecting';
    if (status.version) {
      document.querySelectorAll('.js-version').forEach(el => { el.textContent = `v${status.version}`; });
    }
  },

  // ===== Utils =====
  async fetchJSON(url, opts) {
    try {
      const res = await fetch(url, opts);
      if (res.status === 401) { window.location.href = '/login'; return null; }
      if (!res.ok) return null;
      const text = await res.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  },

  formatUptime(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${seconds % 60}s`;
    return `${seconds}s`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  toast(msg, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
