window.Screens = window.Screens || {};

Screens.newbornForm = function (container) {
  const categoryOptions = FINANCE_CATEGORY.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/herd">&larr; Cancel</button>
      <h1>Log Newborns</h1>
      <p class="subtitle">Add a batch of newborns of one sex to the youngest age bracket.</p>
      <form id="newborn-form">
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

        <label class="field-label">How many *</label>
        <input class="text-input" type="number" min="1" step="1" name="count" required placeholder="e.g. 3" />

        <label class="field-label">Birth date</label>
        <input class="text-input" type="date" name="date" value="${todayStr()}" />

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

  qs('newborn-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    Storage.addNewborns({
      category: fd.get('category'),
      owner: fd.get('owner'),
      sex: fd.get('sex'),
      count: fd.get('count'),
      date: fd.get('date') || todayStr(),
      notes: fd.get('notes').trim(),
    });
    toast('Newborns logged');
    window.location.hash = '#/herd';
  });
};
