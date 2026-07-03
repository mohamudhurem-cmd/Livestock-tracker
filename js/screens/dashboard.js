window.Screens = window.Screens || {};

Screens.dashboard = function (container) {
  const counts = Storage.countsBySpecies();
  const ownerCounts = Storage.countsByOwner();
  const total = Storage.totalAlive();
  const recentEvents = Storage.getEvents().slice(0, 8);

  const speciesCards = SPECIES.map(s => `
    <button class="card species-card" data-nav="#/animals?species=${s.id}">
      <span class="species-icon">${s.icon}</span>
      <span class="species-count">${counts[s.id] || 0}</span>
      <span class="species-label">${s.label}</span>
    </button>
  `).join('');

  const ownerRows = Object.keys(ownerCounts).length
    ? Object.entries(ownerCounts).map(([owner, count]) => `
        <button class="owner-row" data-nav="#/animals?owner=${encodeURIComponent(owner)}">
          <span>${escapeHtml(owner)}</span>
          <span class="owner-count">${count}</span>
        </button>
      `).join('')
    : '<p class="empty">No animals yet.</p>';

  const activityRows = recentEvents.length
    ? recentEvents.map(e => {
        const animal = Storage.getAnimal(e.animalId);
        const tag = animal ? (animal.tag || Storage.speciesLabel(animal.species)) : '(deleted)';
        return `
          <div class="activity-row" data-nav="#/animals/${e.animalId}">
            <span class="activity-date">${formatDate(e.date)}</span>
            <span class="activity-text"><strong>${escapeHtml(tag)}</strong> — ${escapeHtml(e.description)}</span>
          </div>
        `;
      }).join('')
    : '<p class="empty">No activity logged yet.</p>';

  container.innerHTML = `
    <div class="screen">
      <h1>My Herd</h1>
      <p class="subtitle">${total} animal${total === 1 ? '' : 's'} alive right now</p>

      <div class="species-grid">${speciesCards}</div>

      <div class="quick-actions">
        <button class="btn btn-primary" data-nav="#/animals/new">+ Add Animal</button>
        <button class="btn btn-secondary" data-nav="#/newborn">+ Log Newborn</button>
      </div>

      <h2>By Owner</h2>
      <div class="owner-list">${ownerRows}</div>

      <h2>Recent Activity</h2>
      <div class="activity-list">${activityRows}</div>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(node => {
    node.addEventListener('click', () => { window.location.hash = node.getAttribute('data-nav'); });
  });
};

