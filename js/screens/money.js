window.Screens = window.Screens || {};

Screens.money = function (container) {
  const thisMonth = todayStr().slice(0, 7);
  const monthTotals = Storage.monthlyTotals(thisMonth);
  const allTotals = Storage.allTimeTotals();
  const alerts = Storage.vaccinationAlerts();
  const monthLabel = new Date(thisMonth + '-01T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

  const alertRows = FINANCE_CATEGORY
    .map(c => ({ c, a: alerts[c.id] }))
    .filter(({ a }) => a && (a.level === 'overdue' || a.level === 'upcoming'))
    .map(({ c, a }) => `
      <div class="alert-banner ${a.level === 'overdue' ? 'alert-overdue' : 'alert-upcoming'}" data-nav="#/vaccinations">
        ${c.icon} <strong>${c.label}</strong> — ${escapeHtml(a.vaccine)} ${a.level === 'overdue'
          ? `was due ${Math.abs(a.daysUntil)} day${Math.abs(a.daysUntil) === 1 ? '' : 's'} ago`
          : `due in ${a.daysUntil} day${a.daysUntil === 1 ? '' : 's'}`}
      </div>
    `).join('');

  const categoryCards = FINANCE_CATEGORY.map(c => {
    const m = monthTotals[c.id];
    return `
      <div class="card money-card">
        <span class="species-icon">${c.icon}</span>
        <span class="species-label">${c.label}</span>
        <div class="money-row"><span>Income</span><span class="money-amt money-in">KES ${m.income.toLocaleString()}</span></div>
        <div class="money-row"><span>Expense</span><span class="money-amt money-out">KES ${m.expense.toLocaleString()}</span></div>
        <div class="money-row money-net"><span>Net</span><span class="money-amt">KES ${m.net.toLocaleString()}</span></div>
      </div>
    `;
  }).join('');

  const allTimeRows = FINANCE_CATEGORY.map(c => {
    const a = allTotals[c.id];
    return `
      <div class="owner-row">
        <span>${c.icon} ${c.label}</span>
        <span class="owner-count">Net KES ${a.net.toLocaleString()}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="screen">
      <h1>Money</h1>
      <p class="subtitle">${monthLabel}</p>

      ${alertRows}

      <div class="species-grid money-grid">${categoryCards}</div>

      <div class="quick-actions">
        <button class="btn btn-primary" data-nav="#/expenses/new">+ Add Expense</button>
        <button class="btn btn-secondary" data-nav="#/income/new">+ Add Income</button>
      </div>
      <div class="quick-actions">
        <button class="btn btn-secondary" data-nav="#/income/milk">+ Log Milk Sale</button>
        <button class="btn btn-outline" data-nav="#/vaccinations/new">+ Record Vaccination</button>
      </div>

      <h2>All Time</h2>
      <div class="owner-list">${allTimeRows}</div>

      <h2>Records</h2>
      <div class="owner-list">
        <button class="owner-row" data-nav="#/expenses"><span>Expenses</span><span>&rarr;</span></button>
        <button class="owner-row" data-nav="#/income"><span>Income</span><span>&rarr;</span></button>
        <button class="owner-row" data-nav="#/vaccinations"><span>Vaccinations</span><span>&rarr;</span></button>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));
};
