window.Screens = window.Screens || {};

const EXIT_REASONS = [
  { id: 'sold', label: 'Sold' },
  { id: 'deceased', label: 'Died' },
  { id: 'theft', label: 'Stolen' },
  { id: 'zakat', label: 'Given as Zakat' },
  { id: 'gift', label: 'Given as Gift' },
  { id: 'slaughtered', label: 'Slaughtered (guests / consumption)' },
  { id: 'lost', label: 'Lost / Missing' },
];

Screens.animalExit = function (container, params) {
  const animal = Storage.getAnimal(params.id);
  if (!animal) {
    container.innerHTML = '<div class="screen"><p class="empty">Animal not found.</p></div>';
    return;
  }

  const reasonOptions = EXIT_REASONS.map(r => `<option value="${r.id}">${r.label}</option>`).join('');

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/animals/${animal.id}">&larr; Cancel</button>
      <h1>Update Status: ${escapeHtml(animal.tag || 'Untagged')}</h1>

      <form id="exit-form">
        <label class="field-label">What happened *</label>
        <select class="select-input" name="reason" id="reason-select" required>${reasonOptions}</select>

        <label class="field-label">Date</label>
        <input class="text-input" type="date" name="date" value="${todayStr()}" />

        <div id="sold-fields">
          <label class="field-label">Sale price (KES) *</label>
          <input class="text-input" type="number" min="0" step="1" name="salePrice" placeholder="e.g. 25000" />
          <label class="field-label">Buyer (optional)</label>
          <input class="text-input" name="buyer" placeholder="Name or place" />
        </div>

        <div id="recipient-fields" style="display:none;">
          <label class="field-label">Given to / Occasion (optional)</label>
          <input class="text-input" name="recipient" placeholder="e.g. Eid guests, cousin's wedding" />
        </div>

        <label class="field-label">Notes</label>
        <textarea class="text-input" name="notes" rows="2"></textarea>

        <button type="submit" class="btn btn-primary btn-full">Save</button>
      </form>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));

  function syncFields() {
    const reason = qs('reason-select').value;
    qs('sold-fields').style.display = reason === 'sold' ? '' : 'none';
    qs('recipient-fields').style.display = ['zakat', 'gift', 'slaughtered'].includes(reason) ? '' : 'none';
  }
  qs('reason-select').addEventListener('change', syncFields);
  syncFields();

  qs('exit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const reason = fd.get('reason');
    const date = fd.get('date') || todayStr();
    const notes = fd.get('notes').trim();
    const reasonLabel = EXIT_REASONS.find(r => r.id === reason).label;

    if (reason === 'sold' && !fd.get('salePrice')) {
      toast('Enter a sale price');
      return;
    }

    Storage.updateAnimal(animal.id, { status: reason });

    let description = reasonLabel;
    if (reason === 'sold') {
      const buyer = fd.get('buyer').trim();
      description = `Sold${buyer ? ' to ' + buyer : ''} for KES ${Number(fd.get('salePrice')).toLocaleString()}`;
      Storage.addIncome({
        category: Storage.financeCategoryForSpecies(animal.species),
        source: 'sale',
        amount: fd.get('salePrice'),
        date,
        animalId: animal.id,
        notes: buyer ? `Buyer: ${buyer}` : '',
      });
    } else if (['zakat', 'gift', 'slaughtered'].includes(reason)) {
      const recipient = fd.get('recipient').trim();
      description = `${reasonLabel}${recipient ? ' — ' + recipient : ''}`;
    }
    if (notes) description += ` (${notes})`;

    Storage.addEvent(animal.id, 'status-change', date, description);
    toast('Updated');
    window.location.hash = `#/animals/${animal.id}`;
  });
};
