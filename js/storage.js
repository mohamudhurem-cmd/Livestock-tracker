// Storage layer: everything lives in localStorage as plain JSON.
// Kept dependency-free so the app runs with zero build step, fully offline.

const SPECIES = [
  { id: 'cattle', label: 'Cattle', icon: '\u{1F404}' },
  { id: 'camel', label: 'Camel', icon: '\u{1F42B}' },
  { id: 'goat', label: 'Goat', icon: '\u{1F410}' },
  { id: 'sheep', label: 'Sheep', icon: '\u{1F411}' },
];

const STATUS = [
  { id: 'alive', label: 'Alive' },
  { id: 'sold', label: 'Sold' },
  { id: 'deceased', label: 'Died' },
  { id: 'theft', label: 'Stolen' },
  { id: 'zakat', label: 'Given (Zakat)' },
  { id: 'gift', label: 'Given (Gift)' },
  { id: 'slaughtered', label: 'Slaughtered' },
  { id: 'lost', label: 'Lost / Missing' },
];

const ACQUISITION = [
  { id: 'born', label: 'Born here' },
  { id: 'purchased', label: 'Purchased' },
  { id: 'gift', label: 'Gift' },
  { id: 'other', label: 'Other' },
];

const FINANCE_CATEGORY = [
  { id: 'cattle', label: 'Cattle', icon: '\u{1F404}' },
  { id: 'camel', label: 'Camel', icon: '\u{1F42B}' },
  { id: 'goatsheep', label: 'Goats & Sheep', icon: '\u{1F410}' },
];

const EXPENSE_TYPES = ['Feed', 'Veterinary / Medicine', 'Labor', 'Water', 'Transport', 'Other'];

const CATTLE_OWNERS_SEED = ['Me', 'Abdullahi', 'Musa', 'Gini', 'Farhiya', 'Zeinab', 'Kaltuma', 'Lathan', 'Mohamedqadar', 'Ali Yarrow', 'Abdi'];
const GOAT_SHEEP_JOINT_OWNER = 'Joint: Me, Dekow & Abdirizak';
const CAMEL_SOLE_OWNER = 'Me';

const KEYS = {
  animals: 'livestock_animals',
  owners: 'livestock_owners',
  events: 'livestock_events',
  expenses: 'livestock_expenses',
  income: 'livestock_income',
  vaccinations: 'livestock_vaccinations',
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('Failed to read', key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const Storage = {
  init() {
    if (!localStorage.getItem(KEYS.owners)) {
      writeJSON(KEYS.owners, CATTLE_OWNERS_SEED.slice());
    }
    if (!localStorage.getItem(KEYS.animals)) {
      writeJSON(KEYS.animals, []);
    }
    if (!localStorage.getItem(KEYS.events)) {
      writeJSON(KEYS.events, []);
    }
    if (!localStorage.getItem(KEYS.expenses)) {
      writeJSON(KEYS.expenses, []);
    }
    if (!localStorage.getItem(KEYS.income)) {
      writeJSON(KEYS.income, []);
    }
    if (!localStorage.getItem(KEYS.vaccinations)) {
      writeJSON(KEYS.vaccinations, []);
    }
  },

  // --- Owners ---
  getOwners() {
    return readJSON(KEYS.owners, []);
  },
  addOwner(name) {
    const owners = this.getOwners();
    if (!name || owners.includes(name)) return owners;
    owners.push(name);
    writeJSON(KEYS.owners, owners);
    return owners;
  },
  removeOwner(name) {
    const inUse = this.getAnimals().some(a => a.owner === name);
    if (inUse) return { ok: false, reason: 'Owner has animals assigned. Reassign them first.' };
    const owners = this.getOwners().filter(o => o !== name);
    writeJSON(KEYS.owners, owners);
    return { ok: true };
  },

  // --- Animals ---
  getAnimals() {
    return readJSON(KEYS.animals, []);
  },
  getAnimal(id) {
    return this.getAnimals().find(a => a.id === id) || null;
  },
  saveAnimals(list) {
    writeJSON(KEYS.animals, list);
  },
  addAnimal(data) {
    const animals = this.getAnimals();
    const now = new Date().toISOString();
    const animal = {
      id: uid(),
      tag: data.tag || '',
      species: data.species,
      sex: data.sex || 'unknown',
      birthDate: data.birthDate || null,
      birthEstimated: !!data.birthEstimated,
      owner: data.owner,
      motherTag: data.motherTag || null,
      fatherTag: data.fatherTag || null,
      status: data.status || 'alive',
      acquisition: data.acquisition || 'other',
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now,
    };
    animals.push(animal);
    this.saveAnimals(animals);
    this.addEvent(animal.id, data.eventType || 'created', data.eventDate || todayStr(),
      data.eventDescription || `${this.speciesLabel(animal.species)} added to herd`);
    return animal;
  },
  updateAnimal(id, changes) {
    const animals = this.getAnimals();
    const idx = animals.findIndex(a => a.id === id);
    if (idx === -1) return null;
    const before = animals[idx];
    const updated = { ...before, ...changes, updatedAt: new Date().toISOString() };
    animals[idx] = updated;
    this.saveAnimals(animals);
    return updated;
  },
  deleteAnimal(id) {
    const animals = this.getAnimals().filter(a => a.id !== id);
    this.saveAnimals(animals);
    const events = this.getEvents().filter(e => e.animalId !== id);
    writeJSON(KEYS.events, events);
  },
  speciesLabel(id) {
    const s = SPECIES.find(s => s.id === id);
    return s ? s.label : id;
  },
  speciesIcon(id) {
    const s = SPECIES.find(s => s.id === id);
    return s ? s.icon : '';
  },

  // --- Events ---
  getEvents() {
    return readJSON(KEYS.events, []).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  },
  getEventsForAnimal(animalId) {
    return this.getEvents().filter(e => e.animalId === animalId);
  },
  addEvent(animalId, type, date, description) {
    const events = readJSON(KEYS.events, []);
    const event = {
      id: uid(),
      animalId,
      type,
      date: date || todayStr(),
      description: description || '',
      createdAt: new Date().toISOString(),
    };
    events.push(event);
    writeJSON(KEYS.events, events);
    return event;
  },

  // --- Finance category ---
  financeCategoryForSpecies(speciesId) {
    return (speciesId === 'goat' || speciesId === 'sheep') ? 'goatsheep' : speciesId;
  },
  financeCategoryLabel(id) {
    const c = FINANCE_CATEGORY.find(c => c.id === id);
    return c ? c.label : id;
  },
  financeCategoryIcon(id) {
    const c = FINANCE_CATEGORY.find(c => c.id === id);
    return c ? c.icon : '';
  },

  // --- Expenses ---
  getExpenses() {
    return readJSON(KEYS.expenses, []).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },
  addExpense(data) {
    const expenses = readJSON(KEYS.expenses, []);
    const expense = {
      id: uid(),
      category: data.category,
      amount: Number(data.amount) || 0,
      date: data.date || todayStr(),
      type: data.type || 'Other',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };
    expenses.push(expense);
    writeJSON(KEYS.expenses, expenses);
    return expense;
  },
  deleteExpense(id) {
    writeJSON(KEYS.expenses, readJSON(KEYS.expenses, []).filter(e => e.id !== id));
  },

  // --- Income ---
  getIncome() {
    return readJSON(KEYS.income, []).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },
  addIncome(data) {
    const income = readJSON(KEYS.income, []);
    const entry = {
      id: uid(),
      category: data.category,
      source: data.source || 'other',
      amount: Number(data.amount) || 0,
      date: data.date || todayStr(),
      animalId: data.animalId || null,
      liters: data.liters != null ? Number(data.liters) : null,
      pricePerLiter: data.pricePerLiter != null ? Number(data.pricePerLiter) : null,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };
    income.push(entry);
    writeJSON(KEYS.income, income);
    return entry;
  },
  deleteIncome(id) {
    writeJSON(KEYS.income, readJSON(KEYS.income, []).filter(e => e.id !== id));
  },

  // --- Vaccinations ---
  getVaccinations() {
    return readJSON(KEYS.vaccinations, []).sort((a, b) => (b.dateGiven || '').localeCompare(a.dateGiven || ''));
  },
  addVaccination(data) {
    const vaccinations = readJSON(KEYS.vaccinations, []);
    const record = {
      id: uid(),
      category: data.category,
      vaccine: data.vaccine || '',
      dateGiven: data.dateGiven || todayStr(),
      nextDue: data.nextDue || null,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };
    vaccinations.push(record);
    writeJSON(KEYS.vaccinations, vaccinations);
    return record;
  },
  deleteVaccination(id) {
    writeJSON(KEYS.vaccinations, readJSON(KEYS.vaccinations, []).filter(v => v.id !== id));
  },
  vaccinationAlerts() {
    const vaccinations = this.getVaccinations();
    const today = todayStr();
    const alerts = {};
    FINANCE_CATEGORY.forEach(c => {
      const latest = vaccinations.find(v => v.category === c.id && v.nextDue);
      if (!latest) { alerts[c.id] = null; return; }
      const daysUntil = Math.round((new Date(latest.nextDue) - new Date(today)) / 86400000);
      let level = 'ok';
      if (daysUntil < 0) level = 'overdue';
      else if (daysUntil <= 30) level = 'upcoming';
      alerts[c.id] = { vaccine: latest.vaccine, nextDue: latest.nextDue, daysUntil, level };
    });
    return alerts;
  },

  // --- Money totals ---
  _tallyTotals(expenses, income) {
    const totals = {};
    FINANCE_CATEGORY.forEach(c => { totals[c.id] = { expense: 0, income: 0 }; });
    expenses.forEach(e => { if (totals[e.category]) totals[e.category].expense += e.amount; });
    income.forEach(i => { if (totals[i.category]) totals[i.category].income += i.amount; });
    FINANCE_CATEGORY.forEach(c => { totals[c.id].net = totals[c.id].income - totals[c.id].expense; });
    return totals;
  },
  monthlyTotals(month) {
    const m = month || todayStr().slice(0, 7);
    const expenses = this.getExpenses().filter(e => e.date.slice(0, 7) === m);
    const income = this.getIncome().filter(i => i.date.slice(0, 7) === m);
    return this._tallyTotals(expenses, income);
  },
  allTimeTotals() {
    return this._tallyTotals(this.getExpenses(), this.getIncome());
  },

  // --- Aggregates ---
  countsBySpecies(filterFn) {
    const animals = this.getAnimals().filter(a => a.status === 'alive').filter(filterFn || (() => true));
    const counts = {};
    SPECIES.forEach(s => (counts[s.id] = 0));
    animals.forEach(a => { counts[a.species] = (counts[a.species] || 0) + 1; });
    return counts;
  },
  countsByOwner() {
    const animals = this.getAnimals().filter(a => a.status === 'alive');
    const counts = {};
    animals.forEach(a => { counts[a.owner] = (counts[a.owner] || 0) + 1; });
    return counts;
  },
  totalAlive() {
    return this.getAnimals().filter(a => a.status === 'alive').length;
  },

  // --- Backup / restore ---
  exportData() {
    return {
      exportedAt: new Date().toISOString(),
      owners: this.getOwners(),
      animals: this.getAnimals(),
      events: readJSON(KEYS.events, []),
      expenses: readJSON(KEYS.expenses, []),
      income: readJSON(KEYS.income, []),
      vaccinations: readJSON(KEYS.vaccinations, []),
    };
  },
  importData(data, mode) {
    if (!data || !Array.isArray(data.animals)) throw new Error('Invalid backup file');
    if (mode === 'replace') {
      writeJSON(KEYS.owners, data.owners || CATTLE_OWNERS_SEED.slice());
      writeJSON(KEYS.animals, data.animals || []);
      writeJSON(KEYS.events, data.events || []);
      writeJSON(KEYS.expenses, data.expenses || []);
      writeJSON(KEYS.income, data.income || []);
      writeJSON(KEYS.vaccinations, data.vaccinations || []);
    } else {
      // merge: add records whose id isn't already present
      const owners = new Set([...this.getOwners(), ...(data.owners || [])]);
      writeJSON(KEYS.owners, [...owners]);

      const animals = this.getAnimals();
      const existingIds = new Set(animals.map(a => a.id));
      (data.animals || []).forEach(a => { if (!existingIds.has(a.id)) animals.push(a); });
      writeJSON(KEYS.animals, animals);

      const events = readJSON(KEYS.events, []);
      const existingEventIds = new Set(events.map(e => e.id));
      (data.events || []).forEach(e => { if (!existingEventIds.has(e.id)) events.push(e); });
      writeJSON(KEYS.events, events);

      const mergeById = (key, incoming) => {
        const current = readJSON(key, []);
        const ids = new Set(current.map(r => r.id));
        (incoming || []).forEach(r => { if (!ids.has(r.id)) current.push(r); });
        writeJSON(key, current);
      };
      mergeById(KEYS.expenses, data.expenses);
      mergeById(KEYS.income, data.income);
      mergeById(KEYS.vaccinations, data.vaccinations);
    }
  },
  resetAllData() {
    writeJSON(KEYS.animals, []);
    writeJSON(KEYS.events, []);
    writeJSON(KEYS.expenses, []);
    writeJSON(KEYS.income, []);
    writeJSON(KEYS.vaccinations, []);
  },
};

Storage.init();
