const App = {
  currentPage: 'dashboard',
  statusInterval: null,
  playerInterval: null,
  selectedGuild: null,

  init() {
    this.bindNav();
    this.bindMenu();
    this.bindLogout();
    this.navigate('dashboard');
    this.startStatusPolling();
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(el.dataset.page);
        document.querySelector('.sidebar').classList.remove('open');
      });
    });
  },

  bindMenu() {
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
    });
  },

  bindLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/login';
    });
  },

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    document.getElementById('pageTitle').textContent = this.getPageTitle(page);
    this.loadPage(page);
  },

  getPageTitle(page) {
    const titles = { dashboard: 'Dashboard', guilds: 'Guilds', players: 'Players', bots: 'Custom Bots', invite: 'Invite Bot' };
    return titles[page] || 'Dashboard';
  },

  async loadPage(page) {
    const content = document.getElementById('pageContent');
    content.innerHTML = '<div class="loading-spinner">Loading...</div>';
    try {
      switch (page) {
        case 'dashboard': await this.renderDashboard(content); break;
        case 'guilds': await this.renderGuilds(content); break;
        case 'players': await this.renderPlayers(content); break;
        case 'bots': await this.renderBots(content); break;
        case 'invite': await this.renderInvite(content); break;
      }
    } catch (err) {
      content.innerHTML = `<div class="card" style="color:var(--danger)">Error loading page: ${err.message}</div>`;
    }
  },

  async fetchJSON(url, opts) {
    const res = await fetch(url, opts);
    if (res.status === 401) { window.location.href = '/login'; return null; }
    return res.json();
  },

  async startStatusPolling() {
    const poll = async () => {
      try {
        const data = await this.fetchJSON('/api/status');
        if (!data) return;
        const dot = document.getElementById('statusDot');
        const txt = document.getElementById('statusText');
        if (data.ready) {
          dot.className = 'status-dot online';
          txt.textContent = `Online | ${data.guilds} guilds | ${data.latency}ms`;
        } else {
          dot.className = 'status-dot offline';
          txt.textContent = 'Connecting...';
        }
        const vtag = document.getElementById('versionTag');
        if (vtag && data.version) vtag.textContent = `v${data.version}`;
      } catch {}
    };
    poll();
    this.statusInterval = setInterval(poll, 10000);
  },

  async renderDashboard(el) {
    const [status, players] = await Promise.all([
      this.fetchJSON('/api/status'),
      this.fetchJSON('/api/players')
    ]);

    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Status</div>
          <div class="stat-value ${status?.ready ? 'green' : 'red'}">${status?.ready ? 'Online' : 'Offline'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Guilds</div>
          <div class="stat-value blue">${status?.guilds || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active Players</div>
          <div class="stat-value yellow">${status?.playingCount || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Latency</div>
          <div class="stat-value">${status?.latency || 0}ms</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Lavalink</div>
          <div class="stat-value ${status?.lavalinkConnected ? 'green' : 'red'}">${status?.lavalinkConnected ? 'Connected' : 'Disconnected'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Uptime</div>
          <div class="stat-value">${this.formatUptime(status?.uptime || 0)}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Active Players</div>
        ${players?.players?.length ? `
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Guild</th><th>Status</th><th>Now Playing</th><th>Queue</th><th>Volume</th><th>Actions</th></tr></thead>
              <tbody>
                ${players.players.map(p => `
                  <tr>
                    <td><strong>${p.guildId}</strong></td>
                    <td>${p.playing ? '<span class="tag tag-green">Playing</span>' : p.paused ? '<span class="tag tag-yellow">Paused</span>' : '<span class="tag tag-red">Stopped</span>'}</td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.current?.title || 'None'}</td>
                    <td>${p.queueLength}</td>
                    <td>${p.volume}%</td>
                    <td>
                      <div class="player-controls">
                        <button class="ctrl-btn" onclick="App.playerAction('skip','${p.guildId}')" title="Skip">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/><line x1="19" y1="3" x2="19" y2="21" stroke="currentColor" stroke-width="2"/></svg>
                        </button>
                        <button class="ctrl-btn danger" onclick="App.playerAction('stop','${p.guildId}')" title="Stop">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="color:var(--text-muted)">No active players</p>'}
      </div>
    `;
  },

  async renderGuilds(el) {
    const data = await this.fetchJSON('/api/guilds');
    if (!data?.guilds) { el.innerHTML = '<div class="card">Failed to load guilds</div>'; return; }

    el.innerHTML = `
      <div class="card">
        <div class="card-title">Servers (${data.count})</div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Icon</th><th>Name</th><th>ID</th><th>Members</th><th>Music Channel</th><th>Actions</th></tr></thead>
            <tbody>
              ${data.guilds.map(g => `
                <tr>
                  <td>${g.icon ? `<img src="${g.icon}" width="32" height="32" style="border-radius:50%">` : '<div style="width:32px;height:32px;border-radius:50%;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:var(--accent)">${g.name.charAt(0)}</div>'}</td>
                  <td><strong>${this.escapeHtml(g.name)}</strong></td>
                  <td><code style="font-size:11px;color:var(--text-muted)">${g.id}</code></td>
                  <td>${g.memberCount}</td>
                  <td>${g.musicChannel ? `<code style="font-size:11px">${g.musicChannel}</code>` : '<span style="color:var(--text-muted)">None</span>'}</td>
                  <td>
                    <button class="btn btn-sm btn-ghost" onclick="App.selectedGuild='${g.id}';App.navigate('players')">View Players</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async renderPlayers(el) {
    const [playersData, statusData] = await Promise.all([
      this.fetchJSON('/api/players'),
      this.fetchJSON('/api/status')
    ]);

    const guildsData = await this.fetchJSON('/api/guilds');
    const guildMap = {};
    if (guildsData?.guilds) guildsData.guilds.forEach(g => { guildMap[g.id] = g.name; });

    if (this.selectedGuild) {
      await this.renderPlayerDetail(el, this.selectedGuild, guildMap);
      return;
    }

    el.innerHTML = `
      <div class="card">
        <div class="card-title">Active Players</div>
        ${playersData?.players?.length ? `
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Guild</th><th>Status</th><th>Now Playing</th><th>Queue</th><th>Volume</th><th>Loop</th><th>Actions</th></tr></thead>
              <tbody>
                ${playersData.players.map(p => `
                  <tr>
                    <td><strong>${guildMap[p.guildId] || p.guildId}</strong></td>
                    <td>${p.playing ? '<span class="tag tag-green">Playing</span>' : p.paused ? '<span class="tag tag-yellow">Paused</span>' : '<span class="tag tag-red">Stopped</span>'}</td>
                    <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.current?.title || 'None'}</td>
                    <td>${p.queueLength}</td>
                    <td>${p.volume}%</td>
                    <td>${p.loop ? '<span class="tag tag-blue">On</span>' : 'Off'}</td>
                    <td>
                      <div class="player-controls">
                        <button class="ctrl-btn" onclick="App.playerAction('skip','${p.guildId}')" title="Skip">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/><line x1="19" y1="3" x2="19" y2="21" stroke="currentColor" stroke-width="2"/></svg>
                        </button>
                        <button class="ctrl-btn danger" onclick="App.playerAction('stop','${p.guildId}')" title="Stop">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="App.selectedGuild='${p.guildId}';App.navigate('players')">Queue</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="color:var(--text-muted)">No active players</p>'}
      </div>
    `;
  },

  async renderPlayerDetail(el, guildId, guildMap) {
    const data = await this.fetchJSON(`/api/players/${guildId}`);
    if (!data) { el.innerHTML = '<div class="card">Failed to load player</div>'; return; }

    el.innerHTML = `
      <div style="margin-bottom:16px">
        <button class="btn btn-ghost btn-sm" onclick="App.selectedGuild=null;App.navigate('players')">← Back to Players</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Guild</div>
          <div class="stat-value" style="font-size:16px">${guildMap[guildId] || guildId}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Status</div>
          <div class="stat-value ${data.playing ? 'green' : data.paused ? 'yellow' : 'red'}" style="font-size:16px">${data.playing ? 'Playing' : data.paused ? 'Paused' : data.connected ? 'Idle' : 'Disconnected'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Volume</div>
          <div class="stat-value" style="font-size:16px">${data.volume}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Loop</div>
          <div class="stat-value" style="font-size:16px">${data.loop ? 'On' : 'Off'}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Controls</div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div class="player-controls">
            <button class="ctrl-btn" onclick="App.playerAction('back','${guildId}')" title="Previous">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            ${data.paused ? `
              <button class="ctrl-btn" onclick="App.playerAction('resume','${guildId}')" title="Resume">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
              </button>
            ` : `
              <button class="ctrl-btn" onclick="App.playerAction('pause','${guildId}')" title="Pause">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>
              </button>
            `}
            <button class="ctrl-btn" onclick="App.playerAction('skip','${guildId}')" title="Skip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/><line x1="19" y1="3" x2="19" y2="21" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <button class="ctrl-btn danger" onclick="App.playerAction('stop','${guildId}')" title="Stop">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            <input type="range" class="volume-slider" min="0" max="200" value="${data.volume}" onchange="App.setVolume('${guildId}', this.value)" title="Volume">
            <span style="font-size:12px;color:var(--text-muted);min-width:32px">${data.volume}%</span>
          </div>
          <button class="btn btn-sm ${data.loop ? 'btn-primary' : 'btn-ghost'}" onclick="App.toggleLoop('${guildId}', ${!data.loop})">
            Loop: ${data.loop ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      ${data.current ? `
        <div class="card">
          <div class="card-title">Now Playing</div>
          <div style="display:flex;gap:16px;align-items:center">
            ${data.current.thumbnail ? `<img src="${data.current.thumbnail}" width="80" height="80" style="border-radius:8px;object-fit:cover">` : ''}
            <div>
              <div style="font-weight:600;font-size:16px">${this.escapeHtml(data.current.title)}</div>
              <div style="color:var(--text-secondary);font-size:13px;margin-top:4px">${data.current.duration}</div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
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
        ` : '<p style="color:var(--text-muted)">Queue is empty</p>'}
      </div>

      <div class="card">
        <div class="card-title">Play a Song</div>
        <div style="display:flex;gap:8px">
          <input type="text" id="playQuery" class="input-group" style="flex:1" placeholder="Enter song name or URL...">
          <button class="btn btn-primary" onclick="App.playSong('${guildId}')">Play</button>
        </div>
      </div>
    `;
  },

  async renderBots(el) {
    const data = await this.fetchJSON('/api/bots');

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div class="card-title" style="margin-bottom:0">Custom Bots</div>
        <button class="btn btn-primary" onclick="App.showAddBotModal()">+ Add Bot</button>
      </div>

      <div class="card">
        ${data?.bots?.length ? `
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Name</th><th>Client ID</th><th>Prefix</th><th>Status</th><th>Active</th><th>Actions</th></tr></thead>
              <tbody>
                ${data.bots.map(b => `
                  <tr>
                    <td><strong>${this.escapeHtml(b.name)}</strong></td>
                    <td><code style="font-size:11px">${b.client_id}</code></td>
                    <td><code>${b.prefix}</code></td>
                    <td><span class="tag tag-green">Added</span></td>
                    <td>${b.active ? '<span class="tag tag-blue">Active</span>' : ''}</td>
                    <td>
                      <div style="display:flex;gap:6px">
                        ${!b.active ? `<button class="btn btn-sm btn-success" onclick="App.activateBot(${b.id})">Activate</button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="App.deleteBot(${b.id})">Delete</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="color:var(--text-muted)">No custom bots added yet. Click "Add Bot" to add one.</p>'}
      </div>

      <div class="card">
        <div class="card-title">How Custom Bots Work</div>
        <p style="color:var(--text-secondary);font-size:13px;line-height:1.6">
          Add your own bot tokens here. Each bot needs a <strong>name</strong>, <strong>token</strong>, and <strong>Client ID</strong> from the <a href="https://discord.com/developers/applications" target="_blank" style="color:var(--accent)">Discord Developer Portal</a>.
          You can activate one custom bot at a time. The active bot will be stored in the database for reference.
        </p>
      </div>
    `;
  },

  async renderInvite(el) {
    const data = await this.fetchJSON('/api/invite');
    const settings = await this.fetchJSON('/api/settings');

    el.innerHTML = `
      <div class="card">
        <div class="card-title">Invite ${settings?.clientId ? 'Current Bot' : 'Bot'}</div>
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">
          Click the button below to invite the bot to your Discord server, or copy the link.
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <a href="${data?.url || '#'}" target="_blank" class="btn btn-primary">Open Invite Link</a>
          <button class="btn btn-ghost" onclick="navigator.clipboard.writeText('${data?.url || ''}');App.toast('Link copied!','success')">Copy Link</button>
        </div>
        <div class="invite-box">${data?.url || 'N/A'}</div>
      </div>

      <div class="card">
        <div class="card-title">Permissions Included</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;font-size:13px;color:var(--text-secondary)">
          <div>✓ Send Messages</div>
          <div>✓ Connect to Voice</div>
          <div>✓ Speak in Voice</div>
          <div>✓ Use Voice Activity</div>
          <div>✓ Slash Commands</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Custom Bot Invite</div>
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">
          To invite a custom bot, go to the <a href="/bots" onclick="App.navigate('bots');return false" style="color:var(--accent)">Custom Bots</a> page, add your bot, then use this URL format:
        </p>
        <div class="invite-box">https://discord.com/api/oauth2/authorize?client_id=<strong>YOUR_CLIENT_ID</strong>&permissions=379968&scope=bot%20applications.commands</div>
      </div>
    `;
  },

  // Actions
  async playerAction(action, guildId) {
    try {
      await this.fetchJSON(`/api/player/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId })
      });
      this.toast(`${action} sent`, 'success');
      if (this.currentPage === 'players') setTimeout(() => this.loadPage('players'), 500);
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
    if (this.currentPage === 'players') setTimeout(() => this.loadPage('players'), 300);
  },

  async removeSong(guildId, id) {
    await this.fetchJSON('/api/player/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, id })
    });
    this.toast('Song removed', 'success');
    setTimeout(() => this.loadPage('players'), 300);
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
      setTimeout(() => this.loadPage('players'), 300);
    }
  },

  async playSong(guildId) {
    const input = document.getElementById('playQuery');
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
      setTimeout(() => this.loadPage('players'), 500);
    } else {
      this.toast(res?.error || 'Failed to play', 'error');
    }
  },

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
      this.loadPage('bots');
    } else {
      this.toast(res?.error || 'Failed', 'error');
    }
  },

  async deleteBot(id) {
    if (!confirm('Delete this bot?')) return;
    await this.fetchJSON(`/api/bots/${id}/delete`, { method: 'POST' });
    this.toast('Bot deleted', 'success');
    this.loadPage('bots');
  },

  async activateBot(id) {
    await this.fetchJSON(`/api/bots/${id}/activate`, { method: 'POST' });
    this.toast('Bot activated', 'success');
    this.loadPage('bots');
  },

  // Utils
  formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
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
