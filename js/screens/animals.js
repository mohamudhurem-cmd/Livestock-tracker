window.Screens = window.Screens || {};

Screens.animalsList = function (container, params) {
  const state = {
    species: params.species || '',
    owner: params.owner || '',
    status: params.status || 'alive',
    q: params.q || '',
  };

  render();

  function render() {
    const owners = Storage.getOwners();
    let animals = Storage.getAnimals();

    if (state.species) animals = animals.filter(a => a.species === state.species);
    if (state.owner) animals = animals.filter(a => a.owner === state.owner);
    if (state.status) animals = animals.filter(a => a.status === state.status);
    if (state.q) {
      const q = state.q.toLowerCase();
      animals = animals.filter(a =>
        (a.tag || '').toLowerCase().includes(q) ||
        (a.notes || '').toLowerCase().includes(q));
    }
    animals.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const speciesOptions = SPECIES.map(s =>
      `<option value="${s.id}" ${state.species === s.id ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('');
    const ownerOptions = owners.map(o =>
      `<option value="${escapeHtml(o)}" ${state.owner === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
    const statusOptions = STATUS.map(s =>
      `<option value="${s.id}" ${state.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('');

    const rows = animals.length ? animals.map(a => `
      <button class="animal-row" data-id="${a.id}">
        <span class="animal-icon">${Storage.speciesIcon(a.species)}</span>
        <span class="animal-info">
          <strong>${escapeHtml(a.tag || 'Untagged')}</strong>
          <span class="animal-sub">${escapeHtml(a.owner)} · ${ageLabel(a.birthDate, a.birthEstimated)}</span>
        </span>
        <span class="badge badge-${a.status}">${STATUS.find(s => s.id === a.status)?.label || a.status}</span>
      </button>
    `).join('') : '<p class="empty">No animals match these filters.</p>';

    container.innerHTML = `
      <div class="screen">
        <div class="screen-header">
          <h1>Animals</h1>
          <button class="btn btn-primary btn-small" data-nav="#/animals/new">+ Add</button>
        </div>

        <input type="search" id="search-box" class="text-input" placeholder="Search by tag or note..." value="${escapeHtml(state.q)}" />

        <div class="filter-row">
          <select id="filter-species" class="select-input">
            <option value="">All species</option>
            ${speciesOptions}
          </select>
          <select id="filter-owner" class="select-input">
            <option value="">All owners</option>
            ${ownerOptions}
          </select>
          <select id="filter-status" class="select-input">
            <option value="" ${state.status === '' ? 'selected' : ''}>All statuses</option>
            ${statusOptions}
          </select>
        </div>

        <div class="animal-list">${rows}</div>
      </div>
    `;

    qs('search-box').addEventListener('input', (e) => { state.q = e.target.value; render(); });
    qs('filter-species').addEventListener('change', (e) => { state.species = e.target.value; render(); });
    qs('filter-owner').addEventListener('change', (e) => { state.owner = e.target.value; render(); });
    qs('filter-status').addEventListener('change', (e) => { state.status = e.target.value; render(); });

    container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));
    container.querySelectorAll('.animal-row').forEach(n => n.addEventListener('click', () => { window.location.hash = `#/animals/${n.getAttribute('data-id')}`; }));
  }
};

