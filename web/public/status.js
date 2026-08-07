(function () {
  const els = {
    statusPill: document.getElementById('statusPill'),
    topbarDot: document.getElementById('topbarDot'),
    statusText: document.getElementById('statusText'),
    bigDot: document.getElementById('bigDot'),
    bigText: document.getElementById('bigText'),
    heroStatus: document.getElementById('heroStatus'),
    eq: document.getElementById('eq'),
    stats: document.getElementById('stats'),
    nowPlaying: document.getElementById('nowPlaying'),
    playingCount: document.getElementById('playingCount'),
  };

  const ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';

  async function fetchJSON(url) {
    try {
      const res = await fetch(url);
      return res.ok ? res.json() : null;
    } catch { return null; }
  }

  function formatUptime(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${seconds}s`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderStats(s) {
    els.stats.innerHTML = `
      <div class="stat">
        <div class="stat-label">Status</div>
        <div class="stat-value ${s.ready ? 'green' : 'red'}">${s.ready ? 'Online' : 'Offline'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Servers</div>
        <div class="stat-value blue">${s.guilds || 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Active Players</div>
        <div class="stat-value accent">${s.playingCount || 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Uptime</div>
        <div class="stat-value">${formatUptime(s.uptime)}</div>
      </div>
    `;
  }

  function npItemHTML(g) {
    const state = g.playing
      ? '<span class="tag tag-green">Playing</span>'
      : g.paused
        ? '<span class="tag tag-yellow">Paused</span>'
        : '<span class="tag tag-dim">Idle</span>';
    const thumb = g.current?.thumbnail
      ? `<img class="np-thumb" src="${g.current.thumbnail}" alt="" loading="lazy">`
      : `<div class="np-thumb np-thumb-placeholder">${ICON}</div>`;
    return `
      <div class="np-item">
        ${thumb}
        <div class="np-info">
          <div class="np-guild">${escapeHtml(g.name)}</div>
          <div class="np-title">${escapeHtml(g.current?.title || 'Nothing playing')}</div>
          <div class="np-meta">${g.current?.duration || '—'}${g.queueLength ? ` · ${g.queueLength} in queue` : ''}${g.volume ? ` · ${g.volume}%` : ''}</div>
        </div>
        <div class="np-state">${state}</div>
      </div>
    `;
  }

  function renderNowPlaying(s) {
    const list = s.activeGuilds || [];
    els.playingCount.textContent = `${list.length} active`;
    if (!list.length) {
      els.nowPlaying.innerHTML = '<div class="empty">No active players right now</div>';
      return;
    }
    els.nowPlaying.innerHTML = `<div class="np-list">${list.map(npItemHTML).join('')}</div>`;
  }

  async function poll() {
    const s = await fetchJSON('/api/status');
    if (!s) {
      els.statusText.textContent = 'Offline';
      els.topbarDot.className = 'dot offline';
      els.bigDot.className = 'big-dot offline';
      els.bigText.textContent = 'Offline';
      els.eq.classList.remove('active');
      return;
    }

    const online = !!s.ready;
    els.topbarDot.className = 'dot ' + (online ? 'online' : 'connecting');
    els.statusText.textContent = online ? `Online · ${s.guilds} servers · ${s.latency}ms` : 'Connecting';
    els.bigDot.className = 'big-dot ' + (online ? 'online' : 'connecting');
    els.bigText.textContent = online ? 'Online' : 'Connecting';

    els.eq.classList.toggle('active', online && s.playing);

    document.querySelectorAll('.js-version').forEach(el => {
      el.textContent = s.version ? `v${s.version}` : '';
    });

    renderStats(s);
    renderNowPlaying(s);
  }

  poll();
  setInterval(poll, 10000);
})();
