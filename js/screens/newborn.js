window.Screens = window.Screens || {};

Screens.newborn = function (container, params) {
  const owners = Storage.getOwners();
  if (!owners.length) {
    container.innerHTML = `
      <div class="screen">
        <p class="empty">Add at least one owner in Settings before logging newborns.</p>
        <button class="btn btn-primary" data-nav="#/settings">Go to Settings</button>
      </div>`;
    container.querySelector('[data-nav]').addEventListener('click', (e) => { window.location.hash = e.target.getAttribute('data-nav'); });
    return;
  }

  const mothers = Storage.getAnimals().filter(a => a.status === 'alive' && a.sex === 'female');
  const preselectedMother = params.mother ? Storage.getAnimal(params.mother) : null;

  const motherOptions = ['<option value="">— No mother on record —</option>']
    .concat(mothers.map(m => `<option value="${m.id}" ${preselectedMother?.id === m.id ? 'selected' : ''}>${escapeHtml(m.tag || 'Untagged')} (${Storage.speciesLabel(m.species)}, ${escapeHtml(m.owner)})</option>`))
    .join('');
  const speciesOptions = SPECIES.map(s =>
    `<option value="${s.id}" ${preselectedMother?.species === s.id ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('');
  const ownerOptions = owners.map(o =>
    `<option value="${escapeHtml(o)}" ${preselectedMother?.owner === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/dashboard">&larr; Cancel</button>
      <h1>Log Newborn</h1>

      <form id="newborn-form">
        <label class="field-label">Mother</label>
        <select class="select-input" name="mother" id="mother-select">${motherOptions}</select>

        <label class="field-label">Species *</label>
        <select class="select-input" name="species" id="species-select" required>${speciesOptions}</select>

        <label class="field-label">Owner *</label>
        <select class="select-input" name="owner" id="owner-select" required>${ownerOptions}</select>

        <label class="field-label">Tag / Name</label>
        <input class="text-input" name="tag" placeholder="e.g. C-45 or a name" />

        <label class="field-label">Sex</label>
        <select class="select-input" name="sex">
          <option value="unknown" selected>Unknown yet</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>

        <label class="field-label">Birth date</label>
        <input class="text-input" type="date" name="birthDate" value="${todayStr()}" />

        <button type="submit" class="btn btn-primary btn-full">Save Newborn</button>
      </form>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));

  qs('mother-select').addEventListener('change', (e) => {
    const mother = Storage.getAnimal(e.target.value);
    if (mother) {
      qs('species-select').value = mother.species;
      qs('owner-select').value = mother.owner;
    }
  });

  qs('newborn-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const motherId = fd.get('mother');
    const mother = motherId ? Storage.getAnimal(motherId) : null;
    const data = {
      tag: fd.get('tag').trim(),
      species: fd.get('species'),
      sex: fd.get('sex'),
      owner: fd.get('owner'),
      birthDate: fd.get('birthDate') || todayStr(),
      motherTag: mother?.tag || '',
      acquisition: 'born',
      eventType: 'birth',
      eventDate: fd.get('birthDate') || todayStr(),
      eventDescription: mother ? `Born to ${mother.tag || 'untagged mother'}` : 'Newborn added',
    };
    const created = Storage.addAnimal(data);
    toast('Newborn logged');
    window.location.hash = `#/animals/${created.id}`;
  });
};

