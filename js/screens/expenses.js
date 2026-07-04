window.Screens = window.Screens || {};

Screens.expensesList = function (container, params) {
  const state = { category: params.category || '' };
  render();

  function render() {
    let expenses = Storage.getExpenses();
    if (state.category) expenses = expenses.filter(e => e.category === state.category);

    const categoryOptions = FINANCE_CATEGORY.map(c =>
      `<option value="${c.id}" ${state.category === c.id ? 'selected' : ''}>${c.icon} ${c.label}</option>`).join('');

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const rows = expenses.length ? expenses.map(e => `
      <div class="timeline-row expense-row">
        <span class="timeline-date">${formatDate(e.date)}</span>
        <span class="timeline-text">
          <strong>${Storage.financeCategoryIcon(e.category)} ${Storage.financeCategoryLabel(e.category)}</strong>
          — ${escapeHtml(e.type)}${e.notes ? ' (' + escapeHtml(e.notes) + ')' : ''}${e.category === 'cattle' ? ' · shared by headcount' : ''}
        </span>
        <span class="money-amt money-out">KES ${e.amount.toLocaleString()}</span>
      </div>
    `).join('') : '<p class="empty">No expenses recorded yet.</p>';

    container.innerHTML = `
      <div class="screen">
        <div class="screen-header">
          <h1>Expenses</h1>
          <button class="btn btn-primary btn-small" data-nav="#/expenses/new">+ Add</button>
        </div>
        <select id="filter-category" class="select-input">
          <option value="">All categories</option>
          ${categoryOptions}
        </select>
        <p class="subtitle">Total: KES ${total.toLocaleString()}</p>
        <button class="btn btn-outline btn-full" data-nav="#/expenses/cattle-shares">View Cattle Owner Shares</button>
        <div class="timeline">${rows}</div>
      </div>
    `;

    container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));
    qs('filter-category').addEventListener('change', (e) => { state.category = e.target.value; render(); });
  }
};

Screens.expenseForm = function (container) {
  const categoryOptions = FINANCE_CATEGORY.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
  const typeOptions = EXPENSE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/money">&larr; Cancel</button>
      <h1>Add Expense</h1>
      <form id="expense-form">
        <label class="field-label">Category *</label>
        <select class="select-input" name="category" required>${categoryOptions}</select>

        <label class="field-label">Amount (KES) *</label>
        <input class="text-input" type="number" min="0" step="1" name="amount" required placeholder="e.g. 3000" />

        <label class="field-label">Date</label>
        <input class="text-input" type="date" name="date" value="${todayStr()}" />

        <label class="field-label">Type</label>
        <select class="select-input" name="type">${typeOptions}</select>

        <label class="field-label">Notes</label>
        <textarea class="text-input" name="notes" rows="2"></textarea>

        <button type="submit" class="btn btn-primary btn-full">Save Expense</button>
      </form>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));

  qs('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    Storage.addExpense({
      category: fd.get('category'),
      amount: fd.get('amount'),
      date: fd.get('date') || todayStr(),
      type: fd.get('type'),
      notes: fd.get('notes').trim(),
    });
    toast('Expense saved');
    window.location.hash = '#/expenses';
  });
};

Screens.cattleShares = function (container) {
  const dues = Storage.cattleOwnerDues();
  const cattleCounts = Storage.countsByOwner();
  const owners = Storage.getOwners();
  const cattleExpenses = Storage.getExpenses().filter(e => e.category === 'cattle' && e.split);

  const dueRows = owners.map(o => `
    <tr>
      <td>${escapeHtml(o)}</td>
      <td>${cattleCounts[o] || 0}</td>
      <td><strong>KES ${(dues[o] || 0).toLocaleString()}</strong></td>
    </tr>
  `).join('');

  const expenseDetails = cattleExpenses.length ? cattleExpenses.map(e => `
    <details class="owner-audit-section">
      <summary>${formatDate(e.date)} — ${escapeHtml(e.type)} <span class="owner-count">KES ${e.amount.toLocaleString()}</span></summary>
      <table class="grid-table">
        <thead><tr><th>Owner</th><th>Headcount then</th><th>Share</th></tr></thead>
        <tbody>
          ${e.split.filter(s => s.share > 0).map(s => `
            <tr><td>${escapeHtml(s.owner)}</td><td>${s.headcount}</td><td>KES ${s.share.toLocaleString()}</td></tr>
          `).join('')}
        </tbody>
      </table>
    </details>
  `).join('') : '<p class="empty">No cattle expenses recorded yet.</p>';

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/expenses">&larr; Back to Expenses</button>
      <h1>Cattle Owner Shares</h1>
      <p class="subtitle">Every cattle expense is split across owners by how many cattle each owned at the time it was recorded.</p>

      <table class="grid-table">
        <thead><tr><th>Owner</th><th>Cattle now</th><th>Total due</th></tr></thead>
        <tbody>${dueRows}</tbody>
      </table>

      <h2>Expense Breakdown</h2>
      ${expenseDetails}
    </div>
  `;
  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));
};
