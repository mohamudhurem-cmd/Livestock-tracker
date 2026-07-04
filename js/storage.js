// Storage layer: everything lives in localStorage as plain JSON.
// Kept dependency-free so the app runs with zero build step, fully offline.
//
// Core model: the herd isn't individually tagged, so animals are tracked as
// "cohorts" — a count of a given category/owner/sex that falls into an age
// bracket. A cohort's bracket is never stored directly; it's derived live
// from an assumed birth date (the midpoint of the bracket it was placed in),
// so cohorts automatically "age into" the next bracket over time with no
// migration step, the same way individual animal ages used to be computed
// from a birthDate.

const FINANCE_CATEGORY = [
  { id: 'cattle', label: 'Cattle', icon: '\u{1F404}' },
  { id: 'camel', label: 'Camel', icon: '\u{1F42B}' },
  { id: 'goatsheep', label: 'Goats & Sheep', icon: '\u{1F410}' },
];

const EXPENSE_TYPES = ['Feed', 'Veterinary / Medicine', 'Labor', 'Water', 'Transport', 'Animal Purchase', 'Other'];

const CATTLE_OWNERS_SEED = ['Me', 'Abdullahi', 'Musa', 'Gini', 'Farhiya', 'Zeinab', 'Kaltuma', 'Lathan', 'Mohamedqadar', 'Ali Yarrow', 'Abdi'];
const GOAT_SHEEP_JOINT_OWNER = 'Joint: Me, Dekow & Abdirizak';
const CAMEL_SOLE_OWNER = 'Me';

const AGE_BRACKETS = [
  { id: '0-6m', label: '0–6 months', min: 0, max: 6 },
  { id: '6-12m', label: '6 months – 1 year', min: 6, max: 12 },
  { id: '1-1.5y', label: '1 – 1.5 years', min: 12, max: 18 },
  { id: '1.5-2y', label: '1.5 – 2 years', min: 18, max: 24 },
  { id: '2-2.5y', label: '2 – 2.5 years', min: 24, max: 30 },
  { id: '2.5-3y', label: '2.5 – 3 years', min: 30, max: 36 },
  { id: '3-4y', label: '3 – 4 years', min: 36, max: 48 },
  { id: '4y+', label: '4+ years', min: 48, max: null },
];

const EXIT_REASONS = [
  { id: 'sold', label: 'Sold' },
  { id: 'deceased', label: 'Died' },
  { id: 'theft', label: 'Stolen' },
  { id: 'zakat', label: 'Given as Zakat' },
  { id: 'gift', label: 'Given as Gift' },
  { id: 'slaughtered', label: 'Slaughtered (guests / consumption)' },
  { id: 'lost', label: 'Lost / Missing' },
];

const INCREASE_REASONS = [
  { id: 'purchased', label: 'Purchased' },
  { id: 'gift-in', label: 'Given as Gift (received)' },
  { id: 'found', label: 'Found / Recount correction' },
  { id: 'other', label: 'Other' },
];

const KEYS = {
  owners: 'livestock_owners',
  cohorts: 'livestock_cohorts',
  audits: 'livestock_audits',
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

function monthsBetween(fromDateStr, toDateStr) {
  const from = new Date(fromDateStr + 'T00:00:00');
  const to = new Date(toDateStr + 'T00:00:00');
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

function subtractMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function bracketForMonths(months) {
  for (const b of AGE_BRACKETS) {
    if (b.max === null || months < b.max) return b.id;
  }
  return AGE_BRACKETS[AGE_BRACKETS.length - 1].id;
}

function bracketMidpointMonths(bracketId) {
  const b = AGE_BRACKETS.find(b => b.id === bracketId);
  if (!b) return 0;
  return b.max === null ? b.min + 12 : Math.round((b.min + b.max) / 2);
}

function bracketLabel(bracketId) {
  const b = AGE_BRACKETS.find(b => b.id === bracketId);
  return b ? b.label : bracketId;
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
  _afterWrite() {
    if (typeof Sync !== 'undefined') Sync.push();
  },
  init() {
    if (!localStorage.getItem(KEYS.owners)) {
      writeJSON(KEYS.owners, CATTLE_OWNERS_SEED.slice());
    }
    if (!localStorage.getItem(KEYS.cohorts)) {
      writeJSON(KEYS.cohorts, []);
    }
    if (!localStorage.getItem(KEYS.audits)) {
      writeJSON(KEYS.audits, []);
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
    this._afterWrite();
    return owners;
  },
  removeOwner(name) {
    const inUse = this.getCohorts().some(c => c.owner === name);
    if (inUse) return { ok: false, reason: 'Owner has animals recorded. Move them via an audit first.' };
    const owners = this.getOwners().filter(o => o !== name);
    writeJSON(KEYS.owners, owners);
    this._afterWrite();
    return { ok: true };
  },
  ownersForCategory(category) {
    if (category === 'cattle') return this.getOwners();
    if (category === 'camel') return [CAMEL_SOLE_OWNER];
    return [GOAT_SHEEP_JOINT_OWNER];
  },

  // --- Finance category labels ---
  financeCategoryLabel(id) {
    const c = FINANCE_CATEGORY.find(c => c.id === id);
    return c ? c.label : id;
  },
  financeCategoryIcon(id) {
    const c = FINANCE_CATEGORY.find(c => c.id === id);
    return c ? c.icon : '';
  },

  // --- Cohorts ---
  getCohorts() {
    return readJSON(KEYS.cohorts, []);
  },
  saveCohorts(list) {
    writeJSON(KEYS.cohorts, list);
  },
  currentBracketFor(cohort, asOf) {
    return bracketForMonths(monthsBetween(cohort.assumedBirthDate, asOf || todayStr()));
  },
  addCohort(data) {
    const cohorts = this.getCohorts();
    const now = new Date().toISOString();
    const cohort = {
      id: uid(),
      category: data.category,
      owner: data.owner,
      sex: data.sex,
      assumedBirthDate: data.assumedBirthDate,
      count: Number(data.count) || 0,
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now,
    };
    cohorts.push(cohort);
    this.saveCohorts(cohorts);
    this._afterWrite();
    return cohort;
  },
  addNewborns({ category, owner, sex, count, date, notes }) {
    return this.addCohort({ category, owner, sex, assumedBirthDate: date || todayStr(), count, notes });
  },
  // Flat rows of { category, owner, sex, bracket, count }, brackets computed live "as of" today.
  herdSummary() {
    const cohorts = this.getCohorts();
    const today = todayStr();
    const map = new Map();
    cohorts.forEach(c => {
      const bracket = this.currentBracketFor(c, today);
      const key = [c.category, c.owner, c.sex, bracket].join('|');
      if (!map.has(key)) map.set(key, { category: c.category, owner: c.owner, sex: c.sex, bracket, count: 0 });
      map.get(key).count += c.count;
    });
    return [...map.values()];
  },
  totalCount() {
    return this.getCohorts().reduce((sum, c) => sum + c.count, 0);
  },
  // 8 rows (one per age bracket) with {bracket, label, male, female} for one category/owner.
  bracketGridFor(category, owner) {
    const rows = this.herdSummary().filter(r => r.category === category && r.owner === owner);
    return AGE_BRACKETS.map(b => {
      const male = rows.find(r => r.bracket === b.id && r.sex === 'male');
      const female = rows.find(r => r.bracket === b.id && r.sex === 'female');
      return { bracket: b.id, label: b.label, male: male ? male.count : 0, female: female ? female.count : 0 };
    });
  },
  countsByCategory() {
    const counts = {};
    FINANCE_CATEGORY.forEach(c => (counts[c.id] = 0));
    this.getCohorts().forEach(c => { counts[c.category] = (counts[c.category] || 0) + c.count; });
    return counts;
  },
  countsByOwner() {
    const counts = {};
    this.getCohorts().forEach(c => { counts[c.owner] = (counts[c.owner] || 0) + c.count; });
    return counts;
  },

  // --- Audits ---
  getAudits() {
    return readJSON(KEYS.audits, []).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  },
  getAudit(id) {
    return this.getAudits().find(a => a.id === id) || null;
  },
  // finalGrid: [{category, owner, sex, bracket, count}]
  // exits: [{category, owner, sex, bracket, countLost, reason, amount, notes}] — reduces an owner's herd
  // increases: [{category, owner, sex, bracket, countGained, reason, amount, notes}] — grows an owner's herd
  submitAudit({ date, finalGrid, exits, increases, notes }) {
    const auditDate = date || todayStr();
    const previousGrid = this.herdSummary();
    const createdAt = new Date().toISOString();
    const audit = {
      id: uid(),
      date: auditDate,
      previousGrid,
      finalGrid,
      exits: exits || [],
      increases: increases || [],
      notes: notes || '',
      createdAt,
    };
    const audits = readJSON(KEYS.audits, []);
    audits.push(audit);
    writeJSON(KEYS.audits, audits);

    const newCohorts = finalGrid
      .filter(row => row.count > 0)
      .map(row => ({
        id: uid(),
        category: row.category,
        owner: row.owner,
        sex: row.sex,
        assumedBirthDate: subtractMonths(auditDate, bracketMidpointMonths(row.bracket)),
        count: row.count,
        notes: '',
        createdAt,
        updatedAt: createdAt,
      }));
    this.saveCohorts(newCohorts);

    (exits || []).forEach(ex => {
      if (ex.reason === 'sold' && ex.amount) {
        this.addIncome({
          category: ex.category,
          source: 'sale',
          amount: ex.amount,
          date: auditDate,
          notes: `Audit: ${ex.countLost} ${ex.sex} (${bracketLabel(ex.bracket)}), ${ex.owner}${ex.notes ? ' — ' + ex.notes : ''}`,
        });
      }
    });

    (increases || []).forEach(inc => {
      if (inc.reason === 'purchased' && inc.amount) {
        this.addExpense({
          category: inc.category,
          amount: inc.amount,
          date: auditDate,
          type: 'Animal Purchase',
          notes: `Audit: ${inc.countGained} ${inc.sex} (${bracketLabel(inc.bracket)}), ${inc.owner}${inc.notes ? ' — ' + inc.notes : ''}`,
        });
      }
    });

    this._afterWrite();
    return audit;
  },

  // --- Expenses ---
  // Cattle expenses are shared costs across individually-owned cattle: split proportionally
  // by each owner's headcount at the time the expense is recorded (locked in, so later
  // audits don't retroactively change what an owner already owes).
  computeCattleSplit(amount) {
    const counts = {};
    this.getOwners().forEach(o => { counts[o] = 0; });
    this.herdSummary().filter(r => r.category === 'cattle').forEach(r => { counts[r.owner] = (counts[r.owner] || 0) + r.count; });
    const owners = this.getOwners();
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    if (total === 0) {
      const equalShare = Math.round((amount / owners.length) * 100) / 100;
      return owners.map(o => ({ owner: o, headcount: 0, share: equalShare }));
    }
    return owners.map(o => ({
      owner: o,
      headcount: counts[o],
      share: Math.round((amount * counts[o] / total) * 100) / 100,
    }));
  },
  cattleOwnerDues() {
    const dues = {};
    this.getOwners().forEach(o => { dues[o] = 0; });
    this.getExpenses().filter(e => e.category === 'cattle' && e.split).forEach(e => {
      e.split.forEach(s => { dues[s.owner] = (dues[s.owner] || 0) + s.share; });
    });
    return dues;
  },
  getExpenses() {
    return readJSON(KEYS.expenses, []).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },
  addExpense(data) {
    const expenses = readJSON(KEYS.expenses, []);
    const amount = Number(data.amount) || 0;
    const expense = {
      id: uid(),
      category: data.category,
      amount,
      date: data.date || todayStr(),
      type: data.type || 'Other',
      notes: data.notes || '',
      split: data.category === 'cattle' ? this.computeCattleSplit(amount) : null,
      createdAt: new Date().toISOString(),
    };
    expenses.push(expense);
    writeJSON(KEYS.expenses, expenses);
    this._afterWrite();
    return expense;
  },
  deleteExpense(id) {
    writeJSON(KEYS.expenses, readJSON(KEYS.expenses, []).filter(e => e.id !== id));
    this._afterWrite();
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
      liters: data.liters != null ? Number(data.liters) : null,
      pricePerLiter: data.pricePerLiter != null ? Number(data.pricePerLiter) : null,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };
    income.push(entry);
    writeJSON(KEYS.income, income);
    this._afterWrite();
    return entry;
  },
  deleteIncome(id) {
    writeJSON(KEYS.income, readJSON(KEYS.income, []).filter(e => e.id !== id));
    this._afterWrite();
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
    this._afterWrite();
    return record;
  },
  deleteVaccination(id) {
    writeJSON(KEYS.vaccinations, readJSON(KEYS.vaccinations, []).filter(v => v.id !== id));
    this._afterWrite();
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

  // --- Backup / restore ---
  exportData() {
    return {
      exportedAt: new Date().toISOString(),
      owners: this.getOwners(),
      cohorts: this.getCohorts(),
      audits: readJSON(KEYS.audits, []),
      expenses: readJSON(KEYS.expenses, []),
      income: readJSON(KEYS.income, []),
      vaccinations: readJSON(KEYS.vaccinations, []),
    };
  },
  importData(data, mode) {
    if (!data || !Array.isArray(data.cohorts)) throw new Error('Invalid backup file');
    if (mode === 'replace') {
      writeJSON(KEYS.owners, data.owners || CATTLE_OWNERS_SEED.slice());
      writeJSON(KEYS.cohorts, data.cohorts || []);
      writeJSON(KEYS.audits, data.audits || []);
      writeJSON(KEYS.expenses, data.expenses || []);
      writeJSON(KEYS.income, data.income || []);
      writeJSON(KEYS.vaccinations, data.vaccinations || []);
    } else {
      const owners = new Set([...this.getOwners(), ...(data.owners || [])]);
      writeJSON(KEYS.owners, [...owners]);
      const mergeById = (key, incoming) => {
        const current = readJSON(key, []);
        const ids = new Set(current.map(r => r.id));
        (incoming || []).forEach(r => { if (!ids.has(r.id)) current.push(r); });
        writeJSON(key, current);
      };
      mergeById(KEYS.cohorts, data.cohorts);
      mergeById(KEYS.audits, data.audits);
      mergeById(KEYS.expenses, data.expenses);
      mergeById(KEYS.income, data.income);
      mergeById(KEYS.vaccinations, data.vaccinations);
    }
    this._afterWrite();
  },
  resetAllData() {
    writeJSON(KEYS.cohorts, []);
    writeJSON(KEYS.audits, []);
    writeJSON(KEYS.expenses, []);
    writeJSON(KEYS.income, []);
    writeJSON(KEYS.vaccinations, []);
    this._afterWrite();
  },
};

Storage.init();
