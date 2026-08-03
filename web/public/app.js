const App = {
  currentPage: 'dashboard',
  statusInterval: null,
  playerInterval: null,
  selectedGuild: null,

  init() {
    this.bindNav();
    this.bindMenu();
    this.bindMobileNav();
    this.bindLogout();
    this.navigate('dashboard');
    this.startStatusPolling();
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(el.dataset.page);
        this.closeMenu();
      });
    });
  },

  bindMobileNav() {
    document.querySelectorAll('.mobile-nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(el.dataset.page);
      });
    });
  },

  bindMenu() {
    document.getElementById('menuToggle').addEventListener('click', () => {
      const open = document.querySelector('.sidebar').classList.toggle('open');
      document.getElementById('sidebarOverlay').classList.toggle('show', open);
    });
    document.getElementById('sidebarOverlay').addEventListener('click', () => this.closeMenu());
  },

  closeMenu() {
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
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
    document.querySelectorAll('.mobile-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    document.getElementById('pageTitle').textContent = this.getPageTitle(page);
    this.stopPlayerPolling();
    this.loadPage(page);
    if (page === 'players') this.startPlayerPolling();
    window.scrollTo(0, 0);
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
      content.innerHTML = `<div class="card" style="color:var(--danger)">Error loading page: ${this.escapeHtml(err.message)}</div>`;
    }
  },

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

  async startStatusPolling() {
    const poll = async () => {
      try {
        const data = await this.fetchJSON('/api/status');
        if (!data) return;
        const online = !!data.ready;
        document.querySelectorAll('#statusDot, #topbarDot').forEach(d => {
          d.className = 'status-dot ' + (online ? 'online' : 'connecting');
        });
        document.getElementById('statusText').textContent = online ? `Online · ${data.guilds} servers · ${data.latency}ms` : 'Connecting...';
        document.getElementById('topbarStatus').textContent = online ? `Online · ${data.latency}ms` : 'Connecting';
        if (data.version) {
          document.querySelectorAll('.js-version').forEach(el => { el.textContent = `v${data.version}`; });
        }
      } catch {}
      this.refreshLavalinkNodes();
    };
    poll();
    this.statusInterval = setInterval(poll, 10000);
  },

  startPlayerPolling() {
    this.stopPlayerPolling();
    this.playerInterval = setInterval(() => {
      if (this.currentPage === 'players') this.loadPage('players');
    }, 15000);
  },

  stopPlayerPolling() {
    if (this.playerInterval) { clearInterval(this.playerInterval); this.playerInterval = null; }
  },

  // ===== Dashboard =====
  async renderDashboard(el) {
    const [status, players, lavalink] = await Promise.all([
      this.fetchJSON('/api/status'),
      this.fetchJSON('/api/players'),
      this.fetchJSON('/api/lavalink')
    ]);

    const nodes = lavalink?.nodes || [];
    const connectedNodes = nodes.filter(n => n.connected).length;
    const version = status?.version || '';

    el.innerHTML = `
      <div class="hero">
        <div>
          <h2 class="hero-title">Dashboard</h2>
          <p class="hero-sub">Overview of your music bot across all servers</p>
        </div>
        <span class="version-badge js-version">v${version || '&ndash;'}</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Status</div>
          <div class="stat-value ${status?.ready ? 'green' : 'red'}">${status?.ready ? 'Online' : 'Offline'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Servers</div>
          <div class="stat-value blue">${status?.guilds || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active Players</div>
          <div class="stat-value yellow">${status?.playingCount || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Latency</div>
          <div class="stat-value">${status?.latency || 0}<span style="font-size:14px;font-weight:600;color:var(--text-muted)">ms</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Lavalink</div>
          <div class="stat-value ${status?.lavalinkConnected ? 'green' : 'red'}" id="statLavalink">${status?.lavalinkConnected ? 'Connected' : 'Disconnected'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Nodes</div>
          <div class="stat-value ${connectedNodes ? 'green' : 'red'}" id="statNodes">${connectedNodes}/${nodes.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Uptime</div>
          <div class="stat-value" style="font-size:20px">${this.formatUptime(status?.uptime || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Version</div>
          <div class="stat-value purple" id="statVersion">v${version || '&ndash;'}</div>
        </div>
      </div>

      <div class="card" id="lavalinkNodesCard">${this.nodesCardsHTML(lavalink)}</div>

      <div class="card">
        <div class="card-title"><span>Active Players</span></div>
        ${players?.players?.length ? `
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Guild</th><th>Status</th><th>Now Playing</th><th>Queue</th><th>Volume</th><th>Actions</th></tr></thead>
              <tbody>
                ${players.players.map(p => `
                  <tr>
                    <td data-label="Guild"><strong>${this.escapeHtml(p.guildId)}</strong></td>
                    <td data-label="Status">${this.statusTag(p)}</td>
                    <td data-label="Now Playing" class="td-ellipsis">${p.current?.title ? this.escapeHtml(p.current.title) : 'None'}</td>
                    <td data-label="Queue">${p.queueLength}</td>
                    <td data-label="Volume">${p.volume}%</td>
                    <td data-label="Actions">
                      <div class="player-controls">
                        <button class="ctrl-btn" onclick="App.playerAction('skip','${p.guildId}')" title="Skip">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/><line x1="19" y1="3" x2="19" y2="21" stroke="currentColor" stroke-width="2"/></svg>
                        </button>
                        <button class="ctrl-btn danger" onclick="App.playerAction('stop','${p.guildId}')" title="Stop">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<div class="empty-state">No active players</div>'}
      </div>
    `;
  },

  statusTag(p) {
    if (p.playing) return '<span class="tag tag-green">Playing</span>';
    if (p.paused) return '<span class="tag tag-yellow">Paused</span>';
    return '<span class="tag tag-red">Stopped</span>';
  },

  nodesCardsHTML(lavalink) {
    if (!lavalink) return '';
    const nodes = lavalink.nodes || [];
    const connected = nodes.filter(n => n.connected).length;
    return `
      <div class="card-title">
        <span>Lavalink Nodes</span>
        <span class="tag ${connected ? 'tag-green' : 'tag-red'}">${connected}/${nodes.length} Connected</span>
      </div>
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

  async refreshLavalinkNodes() {
    if (this.currentPage !== 'dashboard') return;
    const card = document.getElementById('lavalinkNodesCard');
    const nodesStat = document.getElementById('statNodes');
    const lavalinkStat = document.getElementById('statLavalink');
    if (!card && !nodesStat) return;
    const lavalink = await this.fetchJSON('/api/lavalink');
    if (!lavalink) return;
    if (card) card.innerHTML = this.nodesCardsHTML(lavalink);
    if (nodesStat) {
      const nodes = lavalink.nodes || [];
      const connected = nodes.filter(n => n.connected).length;
      nodesStat.textContent = `${connected}/${nodes.length}`;
      nodesStat.className = 'stat-value ' + (connected ? 'green' : 'red');
    }
    if (lavalinkStat) {
      lavalinkStat.textContent = lavalink.connected ? 'Connected' : 'Disconnected';
      lavalinkStat.className = 'stat-value ' + (lavalink.connected ? 'green' : 'red');
    }
  },

  // ===== Guilds =====
  async renderGuilds(el) {
    const data = await this.fetchJSON('/api/guilds');
    if (!data?.guilds) { el.innerHTML = '<div class="card"><div class="empty-state">Failed to load guilds</div></div>'; return; }

    el.innerHTML = `
      <div class="card">
        <div class="card-title"><span>Servers</span><span class="tag tag-blue">${data.count}</span></div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Icon</th><th>Name</th><th>ID</th><th>Members</th><th>Music Channel</th><th>Actions</th></tr></thead>
            <tbody>
              ${data.guilds.map(g => `
                <tr>
                  <td data-label="Icon">${g.icon ? `<img src="${g.icon}" width="34" height="34" style="border-radius:50%;object-fit:cover">` : `<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff">${this.escapeHtml(g.name.charAt(0).toUpperCase())}</div>`}</td>
                  <td data-label="Name"><strong>${this.escapeHtml(g.name)}</strong></td>
                  <td data-label="ID"><code>${this.escapeHtml(g.id)}</code></td>
                  <td data-label="Members">${g.memberCount}</td>
                  <td data-label="Music Channel">${g.musicChannel ? `<code>${this.escapeHtml(g.musicChannel)}</code>` : '<span style="color:var(--text-muted)">None</span>'}</td>
                  <td data-label="Actions">
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

  // ===== Players =====
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
        <div class="card-title">
          <span>Active Players</span>
          ${playersData?.players?.length ? `<button class="btn btn-sm btn-danger" onclick="App.clearAllQueues()">Clear All Queues</button>` : ''}
        </div>
        ${playersData?.players?.length ? `
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Guild</th><th>Status</th><th>Now Playing</th><th>Queue</th><th>Volume</th><th>Loop</th><th>Actions</th></tr></thead>
              <tbody>
                ${playersData.players.map(p => `
                  <tr>
                    <td data-label="Guild"><strong>${this.escapeHtml(guildMap[p.guildId] || p.guildId)}</strong></td>
                    <td data-label="Status">${this.statusTag(p)}</td>
                    <td data-label="Now Playing" class="td-ellipsis">${p.current?.title ? this.escapeHtml(p.current.title) : 'None'}</td>
                    <td data-label="Queue">${p.queueLength}</td>
                    <td data-label="Volume">${p.volume}%</td>
                    <td data-label="Loop">${p.loop ? '<span class="tag tag-blue">On</span>' : '<span style="color:var(--text-muted)">Off</span>'}</td>
                    <td data-label="Actions">
                      <div class="player-controls">
                        <button class="ctrl-btn" onclick="App.playerAction('skip','${p.guildId}')" title="Skip">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/><line x1="19" y1="3" x2="19" y2="21" stroke="currentColor" stroke-width="2"/></svg>
                        </button>
                        <button class="ctrl-btn danger" onclick="App.playerAction('stop','${p.guildId}')" title="Stop">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="App.selectedGuild='${p.guildId}';App.navigate('players')">Queue</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<div class="empty-state">No active players</div>'}
      </div>
    `;
  },

  async renderPlayerDetail(el, guildId, guildMap) {
    const data = await this.fetchJSON(`/api/players/${guildId}`);
    if (!data) { el.innerHTML = '<div class="card"><div class="empty-state">Failed to load player</div></div>'; return; }

    el.innerHTML = `
      <div style="margin-bottom:14px">
        <button class="btn btn-ghost btn-sm" onclick="App.selectedGuild=null;App.navigate('players')">← Back to Players</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Guild</div>
          <div class="stat-value" style="font-size:17px">${this.escapeHtml(guildMap[guildId] || guildId)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Status</div>
          <div class="stat-value ${data.playing ? 'green' : data.paused ? 'yellow' : 'red'}" style="font-size:17px">${data.playing ? 'Playing' : data.paused ? 'Paused' : data.connected ? 'Idle' : 'Disconnected'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Volume</div>
          <div class="stat-value" style="font-size:17px">${data.volume}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Loop</div>
          <div class="stat-value" style="font-size:17px">${data.loop ? 'On' : 'Off'}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Controls</div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
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
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            <input type="range" class="volume-slider" min="0" max="200" value="${data.volume}" onchange="App.setVolume('${guildId}', this.value)" title="Volume">
            <span style="font-size:12px;color:var(--text-muted);min-width:36px">${data.volume}%</span>
          </div>
          <button class="btn btn-sm ${data.loop ? 'btn-primary' : 'btn-ghost'}" onclick="App.toggleLoop('${guildId}', ${!data.loop})">
            Loop: ${data.loop ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      ${data.current ? `
        <div class="card">
          <div class="card-title">Now Playing</div>
          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
            ${data.current.thumbnail ? `<img src="${data.current.thumbnail}" width="80" height="80" style="border-radius:12px;object-fit:cover">` : ''}
            <div style="min-width:0">
              <div style="font-weight:700;font-size:16px;word-break:break-word">${this.escapeHtml(data.current.title)}</div>
              <div style="color:var(--text-dim);font-size:13px;margin-top:4px">${data.current.duration}</div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-title">
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
      </div>

      <div class="card">
        <div class="card-title">Play a Song</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input type="text" id="playQuery" class="input-group" style="flex:1;min-width:200px" placeholder="Enter song name or URL...">
          <button class="btn btn-primary" onclick="App.playSong('${guildId}')">Play</button>
        </div>
      </div>
    `;
  },

  // ===== Custom Bots =====
  async renderBots(el) {
    const data = await this.fetchJSON('/api/bots');

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">
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
                    <td data-label="Name"><strong>${this.escapeHtml(b.name)}</strong></td>
                    <td data-label="Client ID"><code>${this.escapeHtml(b.client_id)}</code></td>
                    <td data-label="Prefix"><code>${this.escapeHtml(b.prefix)}</code></td>
                    <td data-label="Status"><span class="tag tag-green">Added</span></td>
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
        ` : '<div class="empty-state">No custom bots added yet. Click "Add Bot" to add one.</div>'}
      </div>

      <div class="card">
        <div class="card-title">How Custom Bots Work</div>
        <p style="color:var(--text-dim);font-size:13px;line-height:1.7">
          Add your own bot tokens here. Each bot needs a <strong>name</strong>, <strong>token</strong>, and <strong>Client ID</strong> from the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener" style="color:var(--accent)">Discord Developer Portal</a>.
          You can activate one custom bot at a time. The active bot will be stored in the database for reference.
        </p>
      </div>
    `;
  },

  // ===== Invite =====
  async renderInvite(el) {
    const data = await this.fetchJSON('/api/invite');
    const settings = await this.fetchJSON('/api/settings');

    el.innerHTML = `
      <div class="card">
        <div class="card-title">Invite ${settings?.clientId ? 'Current Bot' : 'Bot'}</div>
        <p style="color:var(--text-dim);font-size:13px;margin-bottom:14px">
          Click the button below to invite the bot to your Discord server, or copy the link.
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <a href="${data?.url || '#'}" target="_blank" rel="noopener" class="btn btn-primary">Open Invite Link</a>
          <button class="btn btn-ghost" onclick="navigator.clipboard.writeText('${data?.url || ''}');App.toast('Link copied!','success')">Copy Link</button>
        </div>
        <div class="invite-box">${data?.url || 'N/A'}</div>
      </div>

      <div class="card">
        <div class="card-title">Permissions Included</div>
        <div class="perms-grid">
          <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Send Messages</div>
          <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Connect to Voice</div>
          <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Speak in Voice</div>
          <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Use Voice Activity</div>
          <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Slash Commands</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Custom Bot Invite</div>
        <p style="color:var(--text-dim);font-size:13px;margin-bottom:14px">
          To invite a custom bot, go to the <a href="/bots" onclick="App.navigate('bots');return false" style="color:var(--accent)">Custom Bots</a> page, add your bot, then use this URL format:
        </p>
        <div class="invite-box">https://discord.com/api/oauth2/authorize?client_id=<strong>YOUR_CLIENT_ID</strong>&permissions=379968&scope=bot%20applications.commands</div>
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

  async clearAllQueues() {
    if (!confirm('Remove all songs from ALL queues?')) return;
    const playersData = await this.fetchJSON('/api/players');
    if (!playersData?.players?.length) return this.toast('No active players', 'info');
    let total = 0;
    for (const p of playersData.players) {
      const res = await this.fetchJSON('/api/player/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: p.guildId })
      });
      if (res?.ok) total += res.count;
    }
    this.toast(`Cleared ${total} songs from ${playersData.players.length} queues`, 'success');
    setTimeout(() => this.loadPage('players'), 300);
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

  // ===== Utils =====
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
