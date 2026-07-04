window.Screens = window.Screens || {};

Screens.auditForm = function (container) {
  const previousGrid = Storage.herdSummary();

  function cellValue(category, owner, sex, bracket) {
    const row = previousGrid.find(r => r.category === category && r.owner === owner && r.sex === sex && r.bracket === bracket);
    return row ? row.count : 0;
  }

  function ownerSection(category, owner) {
    const rows = AGE_BRACKETS.map(b => {
      const male = cellValue(category, owner, 'male', b.id);
      const female = cellValue(category, owner, 'female', b.id);
      return `
        <tr>
          <td>${b.label}</td>
          <td><input class="cell-input text-input" type="number" min="0" data-category="${category}" data-owner="${escapeHtml(owner)}" data-sex="male" data-bracket="${b.id}" value="${male}" /></td>
          <td><input class="cell-input text-input" type="number" min="0" data-category="${category}" data-owner="${escapeHtml(owner)}" data-sex="female" data-bracket="${b.id}" value="${female}" /></td>
        </tr>
      `;
    }).join('');
    const total = previousGrid.filter(r => r.category === category && r.owner === owner).reduce((s, r) => s + r.count, 0);
    return `
      <details ${total > 0 ? 'open' : ''} class="owner-audit-section">
        <summary>${escapeHtml(owner)} <span class="owner-count">${total}</span></summary>
        <table class="grid-table">
          <thead><tr><th>Age</th><th>Male</th><th>Female</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </details>
    `;
  }

  function renderEditPhase() {
    const cattleSections = Storage.ownersForCategory('cattle').map(o => ownerSection('cattle', o)).join('');
    const camelSection = ownerSection('camel', CAMEL_SOLE_OWNER);
    const goatSheepSection = ownerSection('goatsheep', GOAT_SHEEP_JOINT_OWNER);

    container.innerHTML = `
      <div class="screen">
        <button class="link-back" data-nav="#/herd">&larr; Cancel</button>
        <h1>New Audit</h1>
        <p class="subtitle">Counts are pre-filled from today's computed ages. Correct any cell to match your headcount.</p>

        <label class="field-label">Audit date</label>
        <input class="text-input" type="date" id="audit-date" value="${todayStr()}" />

        <h2>${Storage.financeCategoryIcon('cattle')} Cattle</h2>
        ${cattleSections}
        <h2>${Storage.financeCategoryIcon('camel')} Camel</h2>
        ${camelSection}
        <h2>${Storage.financeCategoryIcon('goatsheep')} Goats & Sheep</h2>
        ${goatSheepSection}

        <button class="btn btn-primary btn-full" id="review-btn">Review Changes</button>
      </div>
    `;

    container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));
    qs('review-btn').addEventListener('click', onReview);
  }

  function readFinalGrid() {
    return Array.from(container.querySelectorAll('.cell-input')).map(input => ({
      category: input.dataset.category,
      owner: input.dataset.owner,
      sex: input.dataset.sex,
      bracket: input.dataset.bracket,
      count: Number(input.value) || 0,
    }));
  }

  function onReview() {
    const finalGrid = readFinalGrid();
    const auditDate = qs('audit-date').value || todayStr();
    const decreases = [];
    finalGrid.forEach(row => {
      const before = cellValue(row.category, row.owner, row.sex, row.bracket);
      if (row.count < before) decreases.push({ ...row, countLost: before - row.count });
    });
    renderReviewPhase(finalGrid, decreases, auditDate);
  }

  function renderReviewPhase(finalGrid, decreases, auditDate) {
    const totalBefore = previousGrid.reduce((s, r) => s + r.count, 0);
    const totalAfter = finalGrid.reduce((s, r) => s + r.count, 0);

    const decreaseRows = decreases.map((d, i) => `
      <div class="exit-prompt">
        <p><strong>${Storage.financeCategoryLabel(d.category)}</strong> — ${escapeHtml(d.owner)}, ${d.sex}, ${bracketLabel(d.bracket)}: down by ${d.countLost}</p>
        <select class="select-input exit-reason" data-idx="${i}">
          <option value="">Not sure / skip</option>
          ${EXIT_REASONS.map(r => `<option value="${r.id}">${r.label}</option>`).join('')}
        </select>
        <input class="text-input exit-amount" data-idx="${i}" type="number" min="0" placeholder="Sale amount (KES), if sold" style="margin-top:8px; display:none;" />
      </div>
    `).join('');

    container.innerHTML = `
      <div class="screen">
        <button class="link-back" id="back-to-edit">&larr; Back to counts</button>
        <h1>Review Audit</h1>
        <p class="subtitle">${formatDate(auditDate)} — total ${totalBefore} &rarr; ${totalAfter}</p>

        ${decreases.length ? `
          <h2>What happened to the missing animals?</h2>
          <p class="subtitle">Optional — helps keep income and history accurate.</p>
          <div id="exit-prompts">${decreaseRows}</div>
        ` : '<p class="empty">No decreases — nothing to explain.</p>'}

        <button class="btn btn-primary btn-full" id="save-audit-btn">Save Audit</button>
      </div>
    `;

    qs('back-to-edit').addEventListener('click', renderEditPhase);

    container.querySelectorAll('.exit-reason').forEach(sel => {
      sel.addEventListener('change', () => {
        const amountInput = sel.closest('.exit-prompt').querySelector('.exit-amount');
        amountInput.style.display = sel.value === 'sold' ? '' : 'none';
      });
    });

    qs('save-audit-btn').addEventListener('click', () => {
      const exits = decreases.map((d, i) => {
        const reasonSel = container.querySelector(`.exit-reason[data-idx="${i}"]`);
        const amountInput = container.querySelector(`.exit-amount[data-idx="${i}"]`);
        const reason = reasonSel.value;
        if (!reason) return null;
        return {
          category: d.category, owner: d.owner, sex: d.sex, bracket: d.bracket,
          countLost: d.countLost, reason,
          amount: reason === 'sold' ? Number(amountInput.value) || 0 : null,
        };
      }).filter(Boolean);

      Storage.submitAudit({ date: auditDate, finalGrid, exits });
      toast('Audit saved');
      window.location.hash = '#/herd';
    });
  }

  renderEditPhase();
};

Screens.auditHistory = function (container) {
  const audits = Storage.getAudits();
  const rows = audits.length ? audits.map(a => {
    const before = a.previousGrid.reduce((s, r) => s + r.count, 0);
    const after = a.finalGrid.reduce((s, r) => s + r.count, 0);
    return `
      <button class="owner-row" data-nav="#/audits/${a.id}">
        <span>${formatDate(a.date)}</span>
        <span class="owner-count">${before} &rarr; ${after}</span>
      </button>
    `;
  }).join('') : '<p class="empty">No audits recorded yet.</p>';

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/herd">&larr; Back to Herd</button>
      <h1>Audit History</h1>
      <div class="owner-list">${rows}</div>
    </div>
  `;
  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));
};

Screens.auditDetail = function (container, params) {
  const audit = Storage.getAudit(params.id);
  if (!audit) {
    container.innerHTML = '<div class="screen"><p class="empty">Audit not found.</p></div>';
    return;
  }

  const ascAudits = Storage.getAudits().slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || ''));
  const idx = ascAudits.findIndex(a => a.id === audit.id);
  const priorAudit = idx > 0 ? ascAudits[idx - 1] : null;

  function diffRows(beforeGrid, afterGrid, title) {
    const keys = new Set([...beforeGrid.map(r => r.category + '|' + r.owner + '|' + r.sex + '|' + r.bracket), ...afterGrid.map(r => r.category + '|' + r.owner + '|' + r.sex + '|' + r.bracket)]);
    const rows = [];
    keys.forEach(key => {
      const [category, owner, sex, bracket] = key.split('|');
      const before = beforeGrid.find(r => r.category === category && r.owner === owner && r.sex === sex && r.bracket === bracket);
      const after = afterGrid.find(r => r.category === category && r.owner === owner && r.sex === sex && r.bracket === bracket);
      const b = before ? before.count : 0;
      const af = after ? after.count : 0;
      if (b !== af) rows.push({ category, owner, sex, bracket, before: b, after: af, delta: af - b });
    });
    if (!rows.length) return `<h2>${title}</h2><p class="empty">No change.</p>`;
    return `
      <h2>${title}</h2>
      <table class="grid-table">
        <thead><tr><th>Category</th><th>Owner</th><th>Sex</th><th>Age</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${Storage.financeCategoryLabel(r.category)}</td>
              <td>${escapeHtml(r.owner)}</td>
              <td>${r.sex}</td>
              <td>${bracketLabel(r.bracket)}</td>
              <td>${r.before}</td>
              <td>${r.after}</td>
              <td>${r.delta > 0 ? '+' : ''}${r.delta}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  const sinceLastSection = priorAudit
    ? diffRows(priorAudit.finalGrid, audit.previousGrid, 'Since Last Audit (aging + newborns)')
    : `<h2>Since Last Audit (aging + newborns)</h2><p class="empty">This is the first audit — no prior baseline.</p>`;

  const correctionsSection = diffRows(audit.previousGrid, audit.finalGrid, 'Corrections Made In This Audit');

  const exitsSection = audit.exits.length ? `
    <h2>Recorded Exits</h2>
    <div class="timeline">
      ${audit.exits.map(ex => `
        <div class="timeline-row">
          <span class="timeline-date">${ex.countLost}x</span>
          <span class="timeline-text">
            <strong>${Storage.financeCategoryLabel(ex.category)}</strong> — ${escapeHtml(ex.owner)}, ${ex.sex}, ${bracketLabel(ex.bracket)}:
            ${EXIT_REASONS.find(r => r.id === ex.reason)?.label || ex.reason}
            ${ex.amount ? ` (KES ${Number(ex.amount).toLocaleString()})` : ''}
          </span>
        </div>
      `).join('')}
    </div>
  ` : '';

  const totalBefore = audit.previousGrid.reduce((s, r) => s + r.count, 0);
  const totalAfter = audit.finalGrid.reduce((s, r) => s + r.count, 0);

  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/audits">&larr; Back to Audit History</button>
      <h1>Audit: ${formatDate(audit.date)}</h1>
      <p class="subtitle">Total ${totalBefore} &rarr; ${totalAfter}</p>
      ${sinceLastSection}
      ${correctionsSection}
      ${exitsSection}
    </div>
  `;
  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));
};
