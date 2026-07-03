window.Screens = window.Screens || {};

Screens.milkLogForm = function (container) {
  container.innerHTML = `
    <div class="screen">
      <button class="link-back" data-nav="#/money">&larr; Cancel</button>
      <h1>Log Milk Sale</h1>
      <p class="subtitle">Camel milk sold today</p>
      <form id="milk-form">
        <label class="field-label">Date</label>
        <input class="text-input" type="date" name="date" value="${todayStr()}" />

        <label class="field-label">Liters sold *</label>
        <input class="text-input" type="number" min="0" step="0.5" name="liters" required placeholder="e.g. 10" />

        <label class="field-label">Price per liter (KES) *</label>
        <input class="text-input" type="number" min="0" step="1" name="pricePerLiter" required placeholder="e.g. 100" />

        <p class="subtitle">Total: <strong id="milk-total">KES 0</strong></p>

        <label class="field-label">Notes</label>
        <textarea class="text-input" name="notes" rows="2"></textarea>

        <button type="submit" class="btn btn-primary btn-full">Save</button>
      </form>
    </div>
  `;

  container.querySelectorAll('[data-nav]').forEach(n => n.addEventListener('click', () => { window.location.hash = n.getAttribute('data-nav'); }));

  const form = qs('milk-form');
  function updateTotal() {
    const liters = Number(form.querySelector('[name="liters"]').value) || 0;
    const price = Number(form.querySelector('[name="pricePerLiter"]').value) || 0;
    qs('milk-total').textContent = `KES ${(liters * price).toLocaleString()}`;
  }
  form.querySelector('[name="liters"]').addEventListener('input', updateTotal);
  form.querySelector('[name="pricePerLiter"]').addEventListener('input', updateTotal);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const liters = Number(fd.get('liters'));
    const pricePerLiter = Number(fd.get('pricePerLiter'));
    Storage.addIncome({
      category: 'camel',
      source: 'milk',
      amount: liters * pricePerLiter,
      date: fd.get('date') || todayStr(),
      liters,
      pricePerLiter,
      notes: fd.get('notes').trim(),
    });
    toast('Milk sale logged');
    window.location.hash = '#/income';
  });
};
