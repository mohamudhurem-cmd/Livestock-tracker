window.Screens = window.Screens || {};

Screens.animalDetail = function (container, params) {
  const animal = Storage.getAnimal(params.id);
  if (!animal) {
    container.innerHTML = '<div class="screen"><p class="empty">Animal not found.</p><button class="btn btn-secondary" data-nav="#/animals">Back to Animals</button></div>';
    container.querySelector('[data-nav]').addEventListener('click', (e) => { window.location.hash = e.target.getAttribute('data-nav'); });
    return;
  }
  render();

  function render() {
    const events = Storage.getEventsForAnimal(animal.id);
    const statusLabel = STATUS.find(s => s.id === animal.status)?.label || animal.status;
    const acqLabel = ACQUISITION.find(a => a.id === animal.acquisition)?.label || animal.acquisition;

    const eventRows = events.length ? events.map(e => `
      <div class="timeline-row">
        <span class="timeline-date">${formatDate(e.date)}</span>
        <span class="timeline-text">${escapeHtml(e.description)}</span>
      </div>
    `).join('') : '<p class="empty">No history yet.</p>';

    container.innerHTML = `
      <div class="screen">
        <button class="link-back" data-nav="#/animals">&larr; Back</button>
        <div class="detail-header">
          <span class="species-icon-lg">${Storage.speciesIcon(animal.species)}</span>
          <div>
            <h1>${escapeHtml(animal.tag || 'Untagged')}</h1>
            <span class="badge badge-${animal.status}">${statusLabel}</span>
          </div>
        </div>

        <div class="detail-grid">
          <div><span class="label">Species</span><span>${Storage.speciesLabel(animal.species)}</span></div>
          <div><span class="label">Sex</span><span>${animal.sex}</span></div>
          <div><span class="label">Age</span><span>${ageLabel(animal.birthDate, animal.birthEstimated)}</span></div>
          <div><span class="label">Born</span><span>${formatDate(animal.birthDate)}</span></div>
          <div><span class="label">Owner</span><span>${escapeHtml(animal.owner)}</span></div>
          <div><span class="label">Mother tag</span><span>${escapeHtml(animal.motherTag || '—')}</span></div>
          <div><span class="label">Father tag</span><span>${escapeHtml(animal.fatherTag || '—')}</span></div>
          <div><span class="label">Acquired</span><span>${acqLabel}</span></div>
        </div>

        ${animal.notes ? `<div class="notes-box"><span class="label">Notes</span><p>${escapeHtml(animal.notes)}</p></div>` : ''}

        <div class="quick-actions">
          <button class="btn btn-secondary" data-nav="#/animals/${animal.id}/edit">Edit</button>
          <button class="btn btn-secondary" id="newborn-from-mother">Log Newborn From Her</button>
        </div>

        ${animal.status === 'alive' ? `
        <div class="quick-actions">
          <button class="btn btn-outline btn-full" data-nav="#/animals/${animal.id}/exit">Update Status (Sold, Died, Stolen, Zakat, Gift, Slaughtered, Lost)</button>
        </div>` : ''}

        <button class="btn btn-danger" id="delete-animal">Delete Record</button>

        <h2>History</h2>
        <div class="timeline">${eventRows}</div>
      </div>
    `;

    container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));

    const newbornBtn = qs('newborn-from-mother');
    if (newbornBtn) newbornBtn.addEventListener('click', () => { window.location.hash = `#/newborn?mother=${animal.id}`; });

    qs('delete-animal').addEventListener('click', () => {
      if (confirmAction(`Permanently delete the record for ${animal.tag || 'this animal'}? This cannot be undone.`)) {
        Storage.deleteAnimal(animal.id);
        toast('Animal deleted');
        window.location.hash = '#/animals';
      }
    });
  }
};

