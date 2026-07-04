// Wires up routes and the bottom navigation, then boots the router.

Router.register('/dashboard', Screens.dashboard);
Router.register('/herd', Screens.herdOverview);
Router.register('/herd/newborns', Screens.newbornForm);
Router.register('/herd/purchase', Screens.purchaseForm);
Router.register('/herd/:category/:owner', (c, p) => Screens.herdOwnerDetail(c, { category: p.category, owner: p.owner }));
Router.register('/audit/new', Screens.auditForm);
Router.register('/audits', Screens.auditHistory);
Router.register('/audits/:id', (c, p) => Screens.auditDetail(c, { id: p.id }));
Router.register('/money', Screens.money);
Router.register('/expenses', Screens.expensesList);
Router.register('/expenses/new', Screens.expenseForm);
Router.register('/expenses/cattle-shares', Screens.cattleShares);
Router.register('/income', Screens.incomeList);
Router.register('/income/new', Screens.incomeForm);
Router.register('/income/milk', Screens.milkLogForm);
Router.register('/vaccinations', Screens.vaccinationsList);
Router.register('/vaccinations/new', Screens.vaccinationForm);
Router.register('/settings', Screens.settings);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker failed to register', err));
  });
}

Router.start('app');

// Best-effort: pull the latest shared data (if configured + online) and re-render
// the current screen if anything changed. Silently does nothing otherwise — the
// app already works fully offline from local data.
if (typeof Sync !== 'undefined') {
  Sync.init().then(changed => { if (changed) Router.resolve(); });
}
