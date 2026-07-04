window.Screens = window.Screens || {};

Screens.dashboard = function (container) {
  const counts = Storage.countsByCategory();
  const ownerCounts = Storage.countsByOwner();
  const total = Storage.totalCount();

  const categoryCards = FINANCE_CATEGORY.map(c => `
    <button class="card species-card" data-nav="#/herd">
      <span class="species-icon">${c.icon}</span>
      <span class="species-count">${counts[c.id] || 0}</span>
      <span class="species-label">${c.label}</span>
    </button>
  `).join('');

  const ownerRows = Object.keys(ownerCounts).length
    ? Object.entries(ownerCounts).map(([owner, count]) => `
        <button class="owner-row" data-nav="#/herd">
          <span>${escapeHtml(owner)}</span>
          <span class="owner-count">${count}</span>
        </button>
      `).join('')
    : '<p class="empty">No animals recorded yet.</p>';

  const activity = [
    ...Storage.getAudits().map(a => ({
      date: a.date, nav: `#/audits/${a.id}`,
      text: `Audit — total ${a.previousGrid.reduce((s, r) => s + r.count, 0)} → ${a.finalGrid.reduce((s, r) => s + r.count, 0)}`,
    })),
    ...Storage.getIncome().map(i => ({
      date: i.date, nav: '#/income',
      text: `${Storage.financeCategoryLabel(i.category)} income — KES ${i.amount.toLocaleString()} (${i.source})`,
    })),
    ...Storage.getExpenses().map(e => ({
      date: e.date, nav: '#/expenses',
      text: `${Storage.financeCategoryLabel(e.category)} expense — KES ${e.amount.toLocaleString()} (${e.type})`,
    })),
    ...Storage.getVaccinations().map(v => ({
      date: v.dateGiven, nav: '#/vaccinations',
      text: `${Storage.financeCategoryLabel(v.category)} vaccinated — ${v.vaccine}`,
    })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);

  const activityRows = activity.length
    ? activity.map(a => `
        <div class="activity-row" data-nav="${a.nav}">
          <span class="activity-date">${formatDate(a.date)}</span>
          <span class="activity-text">${escapeHtml(a.text)}</span>
        </div>
      `).join('')
    : '<p class="empty">No activity logged yet.</p>';

  container.innerHTML = `
    <div class="screen">
      <h1>My Herd</h1>
      <p class="subtitle">${total} animal${total === 1 ? '' : 's'} recorded</p>

      <div class="species-grid">${categoryCards}</div>

      <div class="quick-actions">
        <button class="btn btn-primary" data-nav="#/herd/newborns">+ Log Newborns</button>
        <button class="btn btn-secondary" data-nav="#/audit/new">+ Start Audit</button>
      </div>

      <h2>By Owner</h2>
      <div class="owner-list">${ownerRows}</div>

      <h2>Recent Activity</h2>
      <div class="activity-list">${activityRows}</div>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(node => {
    node.addEventListener('click', () => { window.location.hash = node.getAttribute('data-nav'); });
  });
};
