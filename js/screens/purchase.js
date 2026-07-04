window.Screens = window.Screens || {};

Screens.purchaseForm = function (container) {
  const categoryOptions = FINANCE_CATEGORY.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
  const bracketOptions = AGE_BRACKETS.map(b => `<option value="${b.id}">${b.label}</option>`).join('');

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/herd">&larr; Cancel</button>
      <h1>Log Purchase</h1>
      <p class="subtitle">Record animals bought (not born here) — increases the owner's herd.</p>
      <form id="purchase-form">
        <label class="field-label">Category *</label>
        <select class="select-input" name="category" id="category-select" required>${categoryOptions}</select>

        <div id="owner-field-wrap">
          <label class="field-label">Owner *</label>
          <select class="select-input" name="owner" id="owner-select" required></select>
        </div>
        <p id="owner-fixed-note" class="subtitle" style="display:none; margin: 14px 0 0;"></p>

        <label class="field-label">Sex *</label>
        <select class="select-input" name="sex" required>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>

        <label class="field-label">Age *</label>
        <select class="select-input" name="bracket" required>${bracketOptions}</select>

        <label class="field-label">How many *</label>
        <input class="text-input" type="number" min="1" step="1" name="count" required placeholder="e.g. 2" />

        <label class="field-label">Purchase date</label>
        <input class="text-input" type="date" name="date" value="${todayStr()}" />

        <label class="field-label">Total cost (KES, optional)</label>
        <input class="text-input" type="number" min="0" step="1" name="cost" placeholder="Recorded as an expense if entered" />

        <label class="field-label">Notes</label>
        <textarea class="text-input" name="notes" rows="2"></textarea>

        <button type="submit" class="btn btn-primary btn-full">Save</button>
      </form>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));

  function syncOwnerField() {
    const category = qs('category-select').value;
    const wrap = qs('owner-field-wrap');
    const note = qs('owner-fixed-note');
    const ownerSelect = qs('owner-select');
    if (category === 'cattle') {
      wrap.style.display = '';
      note.style.display = 'none';
      ownerSelect.required = true;
      ownerSelect.innerHTML = Storage.getOwners().map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
    } else {
      wrap.style.display = 'none';
      ownerSelect.required = false;
      const fixed = Storage.ownersForCategory(category)[0];
      ownerSelect.innerHTML = `<option value="${escapeHtml(fixed)}">${escapeHtml(fixed)}</option>`;
      note.style.display = '';
      note.textContent = `Owner: ${fixed} (fixed — not individually owned within this category)`;
    }
  }
  qs('category-select').addEventListener('change', syncOwnerField);
  syncOwnerField();

  qs('purchase-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const category = fd.get('category');
    const bracket = fd.get('bracket');
    const date = fd.get('date') || todayStr();
    const cost = fd.get('cost');
    const notes = fd.get('notes').trim();

    Storage.addCohort({
      category,
      owner: fd.get('owner'),
      sex: fd.get('sex'),
      assumedBirthDate: subtractMonths(date, bracketMidpointMonths(bracket)),
      count: fd.get('count'),
      notes: notes ? `Purchased — ${notes}` : 'Purchased',
    });

    if (cost) {
      Storage.addExpense({
        category,
        amount: cost,
        date,
        type: 'Animal Purchase',
        notes: `${fd.get('count')} ${fd.get('sex')} (${bracketLabel(bracket)}), ${fd.get('owner')}`,
      });
    }

    toast('Purchase logged');
    window.location.hash = '#/herd';
  });
};
