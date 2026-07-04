window.Screens = window.Screens || {};

function renderBracketGrid(grid) {
  const rows = grid.map(row => `
    <tr>
      <td>${row.label}</td>
      <td>${row.male}</td>
      <td>${row.female}</td>
      <td><strong>${row.male + row.female}</strong></td>
    </tr>
  `).join('');
  const totalMale = grid.reduce((s, r) => s + r.male, 0);
  const totalFemale = grid.reduce((s, r) => s + r.female, 0);
  return `
    <table class="grid-table">
      <thead><tr><th>Age</th><th>Male</th><th>Female</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td>Total</td><td>${totalMale}</td><td>${totalFemale}</td><td><strong>${totalMale + totalFemale}</strong></td></tr></tfoot>
    </table>
  `;
}

Screens.herdOverview = function (container) {
  const ownerCounts = Storage.countsByOwner();
  const cattleOwners = Storage.ownersForCategory('cattle');

  const cattleRows = cattleOwners.map(o => `
    <button class="owner-row" data-nav="#/herd/cattle/${encodeURIComponent(o)}">
      <span>${escapeHtml(o)}</span>
      <span class="owner-count">${ownerCounts[o] || 0}</span>
    </button>
  `).join('');

  const camelGrid = Storage.bracketGridFor('camel', CAMEL_SOLE_OWNER);
  const goatSheepGrid = Storage.bracketGridFor('goatsheep', GOAT_SHEEP_JOINT_OWNER);

  container.innerHTML = `
    <div class="screen">
      <h1>Herd</h1>
      <p class="subtitle">${Storage.totalCount()} animals recorded (last audit / newborns)</p>

      <div class="quick-actions">
        <button class="btn btn-primary" data-nav="#/herd/newborns">+ Log Newborns</button>
        <button class="btn btn-secondary" data-nav="#/herd/purchase">+ Log Purchase</button>
      </div>
      <div class="quick-actions">
        <button class="btn btn-outline" data-nav="#/audit/new">+ Start Audit</button>
        <button class="btn btn-outline" data-nav="#/audits">View Audit History</button>
      </div>

      <h2>${Storage.financeCategoryIcon('cattle')} Cattle — by owner</h2>
      <div class="owner-list">${cattleRows}</div>

      <h2>${Storage.financeCategoryIcon('camel')} Camel (Me)</h2>
      ${renderBracketGrid(camelGrid)}

      <h2>${Storage.financeCategoryIcon('goatsheep')} Goats & Sheep (Joint: Me, Dekow & Abdirizak)</h2>
      ${renderBracketGrid(goatSheepGrid)}
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));
};

Screens.herdOwnerDetail = function (container, params) {
  const owner = decodeURIComponent(params.owner);
  const grid = Storage.bracketGridFor('cattle', owner);

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/herd">&larr; Back to Herd</button>
      <h1>${escapeHtml(owner)}'s Cattle</h1>
      ${renderBracketGrid(grid)}
      <div class="quick-actions">
        <button class="btn btn-primary" data-nav="#/herd/newborns">+ Log Newborns</button>
        <button class="btn btn-secondary" data-nav="#/herd/purchase">+ Log Purchase</button>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));
};
