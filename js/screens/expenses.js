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
          — ${escapeHtml(e.type)}${e.notes ? ' (' + escapeHtml(e.notes) + ')' : ''}
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
