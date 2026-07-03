window.Screens = window.Screens || {};

Screens.animalForm = function (container, params) {
  const editing = !!params.id;
  const animal = editing ? Storage.getAnimal(params.id) : null;
  if (editing && !animal) {
    container.innerHTML = '<div class="screen"><p class="empty">Animal not found.</p></div>';
    return;
  }

  const owners = Storage.getOwners();
  if (!owners.length) {
    container.innerHTML = `
      <div class="screen">
        <p class="empty">Add at least one owner in Settings before adding animals.</p>
        <button class="btn btn-primary" data-nav="#/settings">Go to Settings</button>
      </div>`;
    container.querySelector('[data-nav]').addEventListener('click', (e) => { window.location.hash = e.target.getAttribute('data-nav'); });
    return;
  }

  const allTags = Storage.getAnimals().map(a => a.tag).filter(Boolean);

  const speciesOptions = SPECIES.map(s =>
    `<option value="${s.id}" ${animal?.species === s.id ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('');
  const ownerOptions = owners.map(o =>
    `<option value="${escapeHtml(o)}" ${animal?.owner === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
  const acqOptions = ACQUISITION.map(a =>
    `<option value="${a.id}" ${(animal?.acquisition || 'other') === a.id ? 'selected' : ''}>${a.label}</option>`).join('');

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/animals">&larr; Cancel</button>
      <h1>${editing ? 'Edit Animal' : 'Add Animal'}</h1>

      <form id="animal-form">
        <label class="field-label">Tag / Name</label>
        <input class="text-input" name="tag" placeholder="e.g. C-12 or a name" value="${escapeHtml(animal?.tag || '')}" />

        <label class="field-label">Species *</label>
        <select class="select-input" name="species" required>${speciesOptions}</select>

        <label class="field-label">Sex</label>
        <select class="select-input" name="sex">
          <option value="female" ${(animal?.sex || 'female') === 'female' ? 'selected' : ''}>Female</option>
          <option value="male" ${animal?.sex === 'male' ? 'selected' : ''}>Male</option>
          <option value="unknown" ${animal?.sex === 'unknown' ? 'selected' : ''}>Unknown</option>
        </select>

        <label class="field-label">Owner *</label>
        <select class="select-input" name="owner" required>${ownerOptions}</select>

        <label class="field-label">Birth date</label>
        <input class="text-input" type="date" name="birthDate" value="${animal?.birthDate || ''}" />
        <label class="checkbox-row">
          <input type="checkbox" name="birthEstimated" ${animal?.birthEstimated ? 'checked' : ''} />
          Estimated / not exact
        </label>

        <label class="field-label">Mother's tag</label>
        <input class="text-input" name="motherTag" list="tag-list" value="${escapeHtml(animal?.motherTag || '')}" />

        <label class="field-label">Father's tag</label>
        <input class="text-input" name="fatherTag" list="tag-list" value="${escapeHtml(animal?.fatherTag || '')}" />
        <datalist id="tag-list">${allTags.map(t => `<option value="${escapeHtml(t)}"></option>`).join('')}</datalist>

        <label class="field-label">How acquired</label>
        <select class="select-input" name="acquisition">${acqOptions}</select>

        <label class="field-label">Notes</label>
        <textarea class="text-input" name="notes" rows="3">${escapeHtml(animal?.notes || '')}</textarea>

        <button type="submit" class="btn btn-primary btn-full">${editing ? 'Save Changes' : 'Add Animal'}</button>
      </form>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));

  qs('animal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      tag: fd.get('tag').trim(),
      species: fd.get('species'),
      sex: fd.get('sex'),
      owner: fd.get('owner'),
      birthDate: fd.get('birthDate') || null,
      birthEstimated: fd.get('birthEstimated') === 'on',
      motherTag: fd.get('motherTag').trim(),
      fatherTag: fd.get('fatherTag').trim(),
      acquisition: fd.get('acquisition'),
      notes: fd.get('notes').trim(),
    };

    if (editing) {
      Storage.updateAnimal(animal.id, data);
      toast('Saved');
      window.location.hash = `#/animals/${animal.id}`;
    } else {
      const created = Storage.addAnimal(data);
      toast('Animal added');
      window.location.hash = `#/animals/${created.id}`;
    }
  });
};

