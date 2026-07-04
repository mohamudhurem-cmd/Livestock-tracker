// Cross-device sync: pulls the latest data on app open, pushes after every local
// change. Best-effort only — if there's no signal, everything silently falls back
// to the local copy already in localStorage, and the app keeps working exactly as
// it always has. Not live/instant: the other phone picks up changes next time it
// opens the app (or taps "Sync Now"), which is the model the user asked for.
//
// Backend: a single JSON file in a private GitHub repo, read/written via the
// GitHub Contents API. Chosen over a cloud database because it needs no billing
// account and reuses a GitHub account the user already has.

const SYNC_META_KEY = 'livestock_sync_meta';
const PUSH_DEBOUNCE_MS = 1500;
const FETCH_TIMEOUT_MS = 10000;

function readSyncMeta() {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function writeSyncMeta(meta) {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
}

function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const Sync = {
  _pushTimer: null,
  _suppressPush: false,
  _state: 'never', // 'never' | 'syncing' | 'synced' | 'offline' | 'error'
  _lastError: '',

  _ready() {
    return typeof GITHUB_OWNER !== 'undefined' && GITHUB_OWNER && GITHUB_OWNER !== 'REPLACE_ME'
      && typeof GITHUB_REPO !== 'undefined' && GITHUB_REPO && GITHUB_REPO !== 'REPLACE_ME'
      && typeof GITHUB_TOKEN !== 'undefined' && GITHUB_TOKEN && GITHUB_TOKEN !== 'REPLACE_ME';
  },

  _contentsUrl() {
    return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
  },

  _headers() {
    return { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' };
  },

  async init() {
    if (!this._ready()) { this._state = 'never'; return false; }
    return this.pull();
  },

  async pull() {
    if (!this._ready() || !navigator.onLine) { this._state = 'offline'; return false; }
    this._state = 'syncing';
    try {
      const resp = await fetchWithTimeout(this._contentsUrl(), { headers: this._headers() });
      if (resp.status === 404) { this._state = 'synced'; return false; }
      if (!resp.ok) throw new Error(`GitHub GET failed (${resp.status})`);
      const json = await resp.json();
      const payload = JSON.parse(base64ToUtf8(json.content));
      const remoteMillis = payload.updatedAt ? new Date(payload.updatedAt).getTime() : 0;
      const meta = readSyncMeta();
      if (remoteMillis > (meta.lastKnownRemoteMillis || 0)) {
        this._suppressPush = true;
        Storage.importData(payload.data, 'replace');
        this._suppressPush = false;
        meta.lastKnownRemoteMillis = remoteMillis;
        meta.lastPulledAt = new Date().toISOString();
        writeSyncMeta(meta);
        this._state = 'synced';
        return true;
      }
      this._state = 'synced';
      return false;
    } catch (e) {
      console.warn('Sync pull failed', e);
      this._state = 'error';
      this._lastError = e.message || String(e);
      return false;
    }
  },

  push() {
    if (this._suppressPush || !this._ready()) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this._pushNow(), PUSH_DEBOUNCE_MS);
  },

  async _pushNow() {
    if (!this._ready() || !navigator.onLine) { this._state = 'offline'; return; }
    this._state = 'syncing';
    try {
      let sha;
      const getResp = await fetchWithTimeout(this._contentsUrl(), { headers: this._headers() });
      if (getResp.ok) { const j = await getResp.json(); sha = j.sha; }
      else if (getResp.status !== 404) throw new Error(`GitHub GET (pre-push) failed (${getResp.status})`);

      const updatedAt = new Date().toISOString();
      const body = {
        message: `Sync update ${updatedAt}`,
        content: utf8ToBase64(JSON.stringify({ updatedAt, data: Storage.exportData() })),
      };
      if (sha) body.sha = sha;

      const resp = await fetchWithTimeout(this._contentsUrl(), {
        method: 'PUT',
        headers: { ...this._headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(`GitHub PUT failed (${resp.status})`);

      const meta = readSyncMeta();
      meta.lastPushedAt = updatedAt;
      meta.lastKnownRemoteMillis = new Date(updatedAt).getTime();
      writeSyncMeta(meta);
      this._state = 'synced';
    } catch (e) {
      console.warn('Sync push failed', e);
      this._state = 'error';
      this._lastError = e.message || String(e);
    }
  },

  async syncNow() {
    await this.pull();
    await this._pushNow();
  },

  status() {
    const meta = readSyncMeta();
    return {
      configured: this._ready(),
      state: this._ready() ? this._state : 'never',
      lastPulledAt: meta.lastPulledAt || null,
      lastPushedAt: meta.lastPushedAt || null,
      lastError: this._lastError,
    };
  },
};
