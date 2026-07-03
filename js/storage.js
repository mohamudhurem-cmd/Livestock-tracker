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
  { id: 'deceased', label: 'Deceased' },
  { id: 'lost', label: 'Lost / Missing' },
];

const ACQUISITION = [
  { id: 'born', label: 'Born here' },
  { id: 'purchased', label: 'Purchased' },
  { id: 'gift', label: 'Gift' },
  { id: 'other', label: 'Other' },
];

const KEYS = {
  animals: 'livestock_animals',
  owners: 'livestock_owners',
  events: 'livestock_events',
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
      writeJSON(KEYS.owners, ['Me']);
    }
    if (!localStorage.getItem(KEYS.animals)) {
      writeJSON(KEYS.animals, []);
    }
    if (!localStorage.getItem(KEYS.events)) {
      writeJSON(KEYS.events, []);
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
    };
  },
  importData(data, mode) {
    if (!data || !Array.isArray(data.animals)) throw new Error('Invalid backup file');
    if (mode === 'replace') {
      writeJSON(KEYS.owners, data.owners || ['Me']);
      writeJSON(KEYS.animals, data.animals || []);
      writeJSON(KEYS.events, data.events || []);
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
    }
  },
};

Storage.init();
