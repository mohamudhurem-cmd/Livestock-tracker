window.Screens = window.Screens || {};

Screens.vaccinationsList = function (container) {
  const vaccinations = Storage.getVaccinations();
  const today = todayStr();

  const rows = vaccinations.length ? vaccinations.map(v => {
    let dueClass = '';
    let dueText = '—';
    if (v.nextDue) {
      const daysUntil = Math.round((new Date(v.nextDue) - new Date(today)) / 86400000);
      dueText = formatDate(v.nextDue);
      if (daysUntil < 0) { dueClass = 'due-overdue'; dueText += ` (overdue ${Math.abs(daysUntil)}d)`; }
      else if (daysUntil <= 30) { dueClass = 'due-upcoming'; dueText += ` (in ${daysUntil}d)`; }
    }
    return `
      <div class="timeline-row expense-row">
        <span class="timeline-date">${formatDate(v.dateGiven)}</span>
        <span class="timeline-text">
          <strong>${Storage.financeCategoryIcon(v.category)} ${Storage.financeCategoryLabel(v.category)}</strong>
          — ${escapeHtml(v.vaccine)}${v.notes ? ' (' + escapeHtml(v.notes) + ')' : ''}
        </span>
        <span class="due-badge ${dueClass}">${dueText}</span>
      </div>
    `;
  }).join('') : '<p class="empty">No vaccinations recorded yet.</p>';

  container.innerHTML = `
    <div class="screen">
      <div class="screen-header">
        <h1>Vaccinations</h1>
        <button class="btn btn-primary btn-small" data-nav="#/vaccinations/new">+ Add</button>
      </div>
      <p class="subtitle">Next due date shown per record.</p>
      <div class="timeline">${rows}</div>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));
};

Screens.vaccinationForm = function (container) {
  const categoryOptions = FINANCE_CATEGORY.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/vaccinations">&larr; Cancel</button>
      <h1>Record Vaccination</h1>
      <form id="vaccination-form">
        <label class="field-label">Category *</label>
        <select class="select-input" name="category" required>${categoryOptions}</select>

        <label class="field-label">Vaccine / Disease *</label>
        <input class="text-input" name="vaccine" required placeholder="e.g. FMD, PPR, Anthrax" />

        <label class="field-label">Date given</label>
        <input class="text-input" type="date" name="dateGiven" value="${todayStr()}" />

        <label class="field-label">Next due date</label>
        <input class="text-input" type="date" name="nextDue" />

        <label class="field-label">Notes</label>
        <textarea class="text-input" name="notes" rows="2" placeholder="Dosage, vet name, cost, etc."></textarea>

        <button type="submit" class="btn btn-primary btn-full">Save</button>
      </form>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));

  qs('vaccination-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    Storage.addVaccination({
      category: fd.get('category'),
      vaccine: fd.get('vaccine').trim(),
      dateGiven: fd.get('dateGiven') || todayStr(),
      nextDue: fd.get('nextDue') || null,
      notes: fd.get('notes').trim(),
    });
    toast('Vaccination recorded');
    window.location.hash = '#/vaccinations';
  });
};
