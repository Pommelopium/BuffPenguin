// ApiClient.js — Encapsulates all backend API calls and localStorage config.

const URL_KEY = 'bp_url';
const SESSION_KEY = 'bp_session_id';

export class ApiClient {
  constructor(i18n) {
    this.i18n = i18n;
  }

  // ── Config ──────────────────────────────────────────────

  getUrl() { return (localStorage.getItem(URL_KEY) || '').replace(/\/$/, ''); }
  saveUrl(u) { localStorage.setItem(URL_KEY, u.replace(/\/$/, '')); }
  getSessionId() { return localStorage.getItem(SESSION_KEY); }
  saveSessionId(id) { id ? localStorage.setItem(SESSION_KEY, id) : localStorage.removeItem(SESSION_KEY); }

  // ── HTTP ────────────────────────────────────────────────

  async request(path, opts = {}) {
    const base = this.getUrl();
    if (!base) throw new Error(this.i18n.t('error.noUrl'));
    const hasBody = opts.body !== undefined;
    const res = await fetch(base + path, {
      headers: hasBody ? { 'Content-Type': 'application/json' } : {},
      ...opts,
      body: hasBody ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 204) return null;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    return json;
  }

  // ── Locale-aware query suffix ───────────────────────────

  localeParam() {
    const l = this.i18n.getLocale();
    return l && l !== 'en' ? `locale=${l}` : '';
  }

  appendLocale(path) {
    const lp = this.localeParam();
    if (!lp) return path;
    return path.includes('?') ? `${path}&${lp}` : `${path}?${lp}`;
  }

  // ── API methods ─────────────────────────────────────────

  health()          { return this.request('/health'); }
  getMuscleGroups() { return this.request(this.appendLocale('/api/v1/muscle-groups')); }
  getExercises()    { return this.request(this.appendLocale('/api/v1/exercises')); }
  addExercise(d)    { return this.request('/api/v1/exercises', { method: 'POST', body: d }); }
  getSessions(n=20) { return this.request(`/api/v1/sessions?limit=${n}`); }
  getSession(id)    { return this.request(`/api/v1/sessions/${id}`); }
  newSession()      { return this.request('/api/v1/sessions', { method: 'POST' }); }
  endSession(id, notes) {
    return this.request(`/api/v1/sessions/${id}`, {
      method: 'PATCH',
      body: { ended_at: Math.floor(Date.now() / 1000), notes: notes || null },
    });
  }
  addSet(sid, d)          { return this.request(`/api/v1/sessions/${sid}/sets`, { method: 'POST', body: d }); }
  delSet(sid, setId)      { return this.request(`/api/v1/sessions/${sid}/sets/${setId}`, { method: 'DELETE' }); }

  // Weight
  getWeightEntries(from, to) {
    let path = '/api/v1/weight';
    const params = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (params.length) path += '?' + params.join('&');
    return this.request(path);
  }
  addWeight(d)              { return this.request('/api/v1/weight', { method: 'POST', body: d }); }
  updateWeight(id, d)       { return this.request(`/api/v1/weight/${id}`, { method: 'PUT', body: d }); }
  deleteWeight(id)          { return this.request(`/api/v1/weight/${id}`, { method: 'DELETE' }); }

  // Calories
  getCalorieEntries(from, to) {
    let path = '/api/v1/calories';
    const params = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (params.length) path += '?' + params.join('&');
    return this.request(path);
  }
  addCalories(d)            { return this.request('/api/v1/calories', { method: 'POST', body: d }); }
  updateCalories(id, d)     { return this.request(`/api/v1/calories/${id}`, { method: 'PUT', body: d }); }
  deleteCalories(id)        { return this.request(`/api/v1/calories/${id}`, { method: 'DELETE' }); }
}
