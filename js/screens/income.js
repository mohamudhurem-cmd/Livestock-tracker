window.Screens = window.Screens || {};

const INCOME_SOURCE_LABEL = { sale: 'Sale', milk: 'Milk', other: 'Other' };

Screens.incomeList = function (container, params) {
  const state = { category: params.category || '' };
  render();

  function render() {
    let income = Storage.getIncome();
    if (state.category) income = income.filter(i => i.category === state.category);

    const categoryOptions = FINANCE_CATEGORY.map(c =>
      `<option value="${c.id}" ${state.category === c.id ? 'selected' : ''}>${c.icon} ${c.label}</option>`).join('');

    const total = income.reduce((sum, i) => sum + i.amount, 0);

    const rows = income.length ? income.map(i => {
      const detail = i.source === 'milk'
        ? `${i.liters}L @ KES ${i.pricePerLiter}/L`
        : (i.notes || '');
      return `
        <div class="timeline-row expense-row">
          <span class="timeline-date">${formatDate(i.date)}</span>
          <span class="timeline-text">
            <strong>${Storage.financeCategoryIcon(i.category)} ${Storage.financeCategoryLabel(i.category)}</strong>
            — ${INCOME_SOURCE_LABEL[i.source] || i.source}${detail ? ' (' + escapeHtml(detail) + ')' : ''}
          </span>
          <span class="money-amt money-in">KES ${i.amount.toLocaleString()}</span>
        </div>
      `;
    }).join('') : '<p class="empty">No income recorded yet.</p>';

    container.innerHTML = `
      <div class="screen">
        <div class="screen-header">
          <h1>Income</h1>
          <button class="btn btn-primary btn-small" data-nav="#/income/new">+ Add</button>
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

Screens.incomeForm = function (container) {
  const categoryOptions = FINANCE_CATEGORY.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/money">&larr; Cancel</button>
      <h1>Add Income</h1>
      <form id="income-form">
        <label class="field-label">Category *</label>
        <select class="select-input" name="category" required>${categoryOptions}</select>

        <label class="field-label">Source</label>
        <select class="select-input" name="source">
          <option value="sale">Sale</option>
          <option value="other" selected>Other</option>
        </select>
        <p class="subtitle">Note: sales are usually recorded automatically from an animal's "Update Status" page. Use this only for a sale that wasn't captured there.</p>

        <label class="field-label">Amount (KES) *</label>
        <input class="text-input" type="number" min="0" step="1" name="amount" required placeholder="e.g. 20000" />

        <label class="field-label">Date</label>
        <input class="text-input" type="date" name="date" value="${todayStr()}" />

        <label class="field-label">Notes</label>
        <textarea class="text-input" name="notes" rows="2"></textarea>

        <button type="submit" class="btn btn-primary btn-full">Save Income</button>
      </form>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));

  qs('income-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    Storage.addIncome({
      category: fd.get('category'),
      source: fd.get('source'),
      amount: fd.get('amount'),
      date: fd.get('date') || todayStr(),
      notes: fd.get('notes').trim(),
    });
    toast('Income saved');
    window.location.hash = '#/income';
  });
};
