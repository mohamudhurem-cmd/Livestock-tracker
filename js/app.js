// Wires up routes and the bottom navigation, then boots the router.

Router.register('/dashboard', Screens.dashboard);
Router.register('/animals', Screens.animalsList);
Router.register('/animals/new', (c) => Screens.animalForm(c, {}));
Router.register('/animals/:id/edit', (c, p) => Screens.animalForm(c, { id: p.id }));
Router.register('/animals/:id/exit', (c, p) => Screens.animalExit(c, { id: p.id }));
Router.register('/animals/:id', (c, p) => Screens.animalDetail(c, { id: p.id }));
Router.register('/newborn', Screens.newborn);
Router.register('/money', Screens.money);
Router.register('/expenses', Screens.expensesList);
Router.register('/expenses/new', Screens.expenseForm);
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
