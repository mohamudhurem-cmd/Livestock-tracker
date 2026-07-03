window.Screens = window.Screens || {};

Screens.settings = function (container) {
  render();

  function render() {
    const owners = Storage.getOwners();
    const ownerRows = owners.map(o => `
      <div class="owner-manage-row">
        <span>${escapeHtml(o)}</span>
        <button class="btn btn-outline btn-small" data-remove="${escapeHtml(o)}">Remove</button>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="screen">
        <h1>Settings</h1>

        <h2>Owners</h2>
        <p class="subtitle">Whoever's cattle, camels, goats, or sheep are in the herd — add each person here so you can assign and filter animals by owner.</p>
        <div class="owner-manage-list">${ownerRows}</div>
        <form id="add-owner-form" class="inline-form">
          <input class="text-input" name="owner" placeholder="e.g. Brother - Ahmed" />
          <button type="submit" class="btn btn-secondary">Add Owner</button>
        </form>

        <h2>Backup</h2>
        <p class="subtitle">Everything is stored only on this device. Export a backup regularly, especially before a visit, and keep the file somewhere safe (email it to yourself, save to cloud storage, etc.).</p>
        <button class="btn btn-primary btn-full" id="export-btn">Export Backup (JSON)</button>

        <h2>Restore</h2>
        <p class="subtitle">Load a previously exported backup file.</p>
        <input type="file" id="import-file" accept="application/json" class="text-input" />
        <div class="quick-actions">
          <button class="btn btn-outline" id="import-merge">Merge Into Current Data</button>
          <button class="btn btn-outline" id="import-replace">Replace All Data</button>
        </div>

        <h2>About</h2>
        <p class="subtitle">Livestock Tracker works fully offline. Data lives only on this device unless you export a backup.</p>
      </div>
    `;

    qs('add-owner-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = fd.get('owner').trim();
      if (!name) return;
      Storage.addOwner(name);
      toast('Owner added');
      render();
    });

    container.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-remove');
        if (!confirmAction(`Remove owner "${name}"?`)) return;
        const result = Storage.removeOwner(name);
        if (!result.ok) { toast(result.reason); return; }
        toast('Owner removed');
        render();
      });
    });

    qs('export-btn').addEventListener('click', () => {
      const data = Storage.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `livestock-backup-${todayStr()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('Backup downloaded');
    });

    function doImport(mode) {
      const input = qs('import-file');
      const file = input.files[0];
      if (!file) { toast('Choose a backup file first'); return; }
      if (mode === 'replace' && !confirmAction('This replaces ALL current data with the backup file. Continue?')) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          Storage.importData(data, mode);
          toast('Import complete');
          render();
        } catch (err) {
          toast('Could not read that file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }

    qs('import-merge').addEventListener('click', () => doImport('merge'));
    qs('import-replace').addEventListener('click', () => doImport('replace'));
  }
};

