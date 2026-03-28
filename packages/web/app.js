'use strict';

// ── Config (localStorage) ────────────────────────────────────────────────────

const URL_KEY     = 'bp_url';
const SESSION_KEY = 'bp_session_id';

function getUrl()        { return (localStorage.getItem(URL_KEY) || '').replace(/\/$/, ''); }
function saveUrl(u)      { localStorage.setItem(URL_KEY, u.replace(/\/$/, '')); }
function getSessionId()  { return localStorage.getItem(SESSION_KEY); }
function saveSessionId(id) { id ? localStorage.setItem(SESSION_KEY, id) : localStorage.removeItem(SESSION_KEY); }

// ── State ────────────────────────────────────────────────────────────────────

const S = {
  exercises:    null,   // cached array from GET /exercises
  muscleGroups: null,   // cached array from GET /muscle-groups
  session:      null,   // active session { id, startedAt, sets[] } or null
  timerHandle:  null,
};

// ── API ──────────────────────────────────────────────────────────────────────

async function req(path, opts = {}) {
  const base = getUrl();
  if (!base) throw new Error('Backend URL not set — check Settings');
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

const api = {
  health:       ()          => req('/health'),
  muscles:      ()          => req('/api/v1/muscle-groups'),
  exercises:    ()          => req('/api/v1/exercises'),
  addExercise:  (d)         => req('/api/v1/exercises', { method: 'POST', body: d }),
  sessions:     (n = 20)    => req(`/api/v1/sessions?limit=${n}`),
  session:      (id)        => req(`/api/v1/sessions/${id}`),
  newSession:   ()          => req('/api/v1/sessions', { method: 'POST' }),
  endSession:   (id, notes) => req(`/api/v1/sessions/${id}`, {
    method: 'PATCH',
    body: { ended_at: Math.floor(Date.now() / 1000), notes: notes || null },
  }),
  addSet: (sid, d) => req(`/api/v1/sessions/${sid}/sets`, { method: 'POST', body: d }),
  delSet: (sid, setId) => req(`/api/v1/sessions/${sid}/sets/${setId}`, { method: 'DELETE' }),
};

// ── Toast ────────────────────────────────────────────────────────────────────

let toastTimer = null;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast hidden'; }, 2800);
}

// ── Timer ────────────────────────────────────────────────────────────────────

function stopTimer() { clearInterval(S.timerHandle); S.timerHandle = null; }

function elapsed(startTs) {
  const s = Math.floor(Date.now() / 1000) - startTs;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0
    ? `${h}:${pad(m)}:${pad(sec)}`
    : `${m}:${pad(sec)}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

// ── Formatting helpers ───────────────────────────────────────────────────────

function fmtDate(ts) {
  return new Date(ts * 1000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(start, end) {
  if (!end) return 'In progress';
  const m = Math.floor((end - start) / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ── Navigation ───────────────────────────────────────────────────────────────

function navigate(view) {
  stopTimer();
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.nav === view)
  );
  const main = document.getElementById('main');
  main.innerHTML = '<div class="loading">Loading…</div>';
  ({ dashboard: showDashboard, exercises: showExercises, settings: showSettings }[view] || showDashboard)();
}

// ── Dashboard ────────────────────────────────────────────────────────────────

async function showDashboard() {
  const main = document.getElementById('main');
  try {
    const sessions = await api.sessions(20);

    // Detect active (no endedAt) session
    const active = sessions.find(s => !s.endedAt);
    if (active) {
      S.session = await api.session(active.id);
      saveSessionId(active.id);
    } else {
      S.session = null;
      saveSessionId(null);
    }

    const past = sessions.filter(s => s.endedAt);

    let html = '';

    if (S.session) {
      html += `
        <div class="session-banner">
          <div>
            <div style="font-size:0.78rem;color:var(--muted);margin-bottom:2px">Active session</div>
            <div class="timer" id="dash-timer">${elapsed(S.session.startedAt)}</div>
            <div style="font-size:0.78rem;color:var(--muted);margin-top:2px">${S.session.sets.length} set(s) logged</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
            <button class="btn btn-primary" onclick="openSession()">Continue</button>
            <button class="btn btn-danger btn-sm" onclick="confirmEndSession()">End</button>
          </div>
        </div>`;
    } else {
      html += `
        <div style="margin-bottom:16px">
          <button class="btn btn-primary btn-lg btn-full" onclick="startSession()">Start New Workout</button>
        </div>`;
    }

    html += '<div class="card"><div class="card-title">Recent Sessions</div>';

    if (past.length === 0) {
      html += '<div class="empty"><div class="empty-icon">🏋️</div>No workouts yet. Start your first!</div>';
    } else {
      html += past.slice(0, 10).map(s => `
        <div class="session-row" onclick="viewSession(${s.id})">
          <div>
            <div class="sr-date">${fmtDate(s.startedAt)}</div>
            <div class="sr-meta">${fmtTime(s.startedAt)} &middot; ${fmtDuration(s.startedAt, s.endedAt)}</div>
          </div>
          <span class="sr-badge">View</span>
        </div>`).join('');
    }

    html += '</div>';
    main.innerHTML = html;

    if (S.session) {
      const el = document.getElementById('dash-timer');
      S.timerHandle = setInterval(() => {
        if (el && document.contains(el)) el.textContent = elapsed(S.session.startedAt);
        else stopTimer();
      }, 1000);
    }
  } catch (err) {
    main.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <div>${err.message}</div>
        <button class="btn btn-secondary" style="margin-top:14px" onclick="navigate('settings')">Check Settings</button>
      </div>`;
  }
}

async function viewSession(id) {
  const main = document.getElementById('main');
  try {
    const s = await api.session(id);
    if (!S.exercises) S.exercises = await api.exercises();
    const exMap = Object.fromEntries(S.exercises.map(e => [e.id, e.name]));

    // Group sets by exercise name
    const grouped = {};
    for (const set of s.sets) {
      const name = exMap[set.exerciseId] || `Exercise #${set.exerciseId}`;
      (grouped[name] = grouped[name] || []).push(set);
    }

    let html = `
      <button class="btn btn-ghost" onclick="showDashboard()" style="margin-bottom:14px">&#8592; Back</button>
      <div class="card">
        <div class="card-title">Session</div>
        <div style="display:flex;gap:24px;flex-wrap:wrap">
          <div><div class="form-label">Date</div><strong>${fmtDate(s.startedAt)}</strong></div>
          <div><div class="form-label">Duration</div><strong>${fmtDuration(s.startedAt, s.endedAt)}</strong></div>
          <div><div class="form-label">Sets</div><strong>${s.sets.length}</strong></div>
        </div>
        ${s.notes ? `<p class="text-muted" style="margin-top:10px">${s.notes}</p>` : ''}
      </div>`;

    for (const [name, sets] of Object.entries(grouped)) {
      html += `
        <div class="card">
          <div class="card-title">${name}</div>
          <table class="table">
            <tr><th>Set</th><th>Reps</th><th>Weight</th></tr>
            ${sets.map(set => `
              <tr>
                <td>${set.setNumber}</td>
                <td>${set.reps ?? '&mdash;'}</td>
                <td>${set.weightKg != null ? set.weightKg + ' kg' : set.bodyweight ? 'BW' : '&mdash;'}</td>
              </tr>`).join('')}
          </table>
        </div>`;
    }

    main.innerHTML = html;
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ── Session Logging ──────────────────────────────────────────────────────────

async function startSession() {
  try {
    const s = await api.newSession();
    S.session = { id: s.id, startedAt: s.startedAt, sets: [] };
    saveSessionId(s.id);
    openSession();
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function openSession() {
  if (!S.session) return;
  stopTimer();

  // Remove nav highlight — session is a pseudo-view
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  if (!S.exercises) {
    try { S.exercises = await api.exercises(); } catch (e) { toast(e.message, 'err'); return; }
  }

  // Refresh sets from server
  try {
    const fresh = await api.session(S.session.id);
    S.session.sets = fresh.sets;
  } catch (_) { /* use cached */ }

  renderSession();
}

function renderSession() {
  const main = document.getElementById('main');
  const ses  = S.session;
  const exs  = S.exercises || [];
  const exMap = Object.fromEntries(exs.map(e => [e.id, e.name]));

  const setsBody = ses.sets.length === 0
    ? '<tr><td colspan="5" class="text-muted" style="padding:12px 0">No sets logged yet.</td></tr>'
    : ses.sets.map(s => `
        <tr>
          <td>${exMap[s.exerciseId] || s.exerciseId}</td>
          <td>${s.setNumber}</td>
          <td>${s.reps ?? '&mdash;'}</td>
          <td>${s.weightKg != null ? s.weightKg + ' kg' : s.bodyweight ? 'BW' : '&mdash;'}</td>
          <td><button class="btn btn-danger btn-sm" onclick="removeSet(${s.id})">&times;</button></td>
        </tr>`).join('');

  const exOptions = exs
    .map(e => `<option value="${e.id}">${e.name}</option>`)
    .join('');

  main.innerHTML = `
    <div class="row-spaced" style="margin-bottom:16px">
      <div>
        <div style="font-size:0.78rem;color:var(--muted)">Active Session</div>
        <div class="timer" id="ses-timer">${elapsed(ses.startedAt)}</div>
      </div>
      <button class="btn btn-ghost" onclick="showDashboard()">&#8592; Back</button>
    </div>

    <div class="card">
      <div class="card-title">Log Set</div>
      <div class="form-group">
        <label class="form-label">Exercise</label>
        <select class="form-select" id="sel-exercise" onchange="onExChange()">
          <option value="">— select exercise —</option>
          ${exOptions}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Reps</label>
          <input class="form-input" type="number" id="inp-reps" min="1" placeholder="12">
        </div>
        <div class="form-group">
          <label class="form-label">Weight (kg)</label>
          <input class="form-input" type="number" id="inp-weight" min="0" step="0.5" placeholder="60">
        </div>
      </div>
      <label class="check-row" style="margin-bottom:14px">
        <input type="checkbox" id="inp-bw"> Bodyweight exercise
      </label>
      <button class="btn btn-primary btn-full" id="btn-log" onclick="logSet()">Log Set</button>
    </div>

    <div class="card">
      <div class="card-title">This Session &mdash; ${ses.sets.length} set(s)</div>
      <table class="table">
        <tr><th>Exercise</th><th>Set</th><th>Reps</th><th>Weight</th><th></th></tr>
        ${setsBody}
      </table>
    </div>

    <button class="btn btn-danger btn-full" style="margin-top:4px" onclick="confirmEndSession()">End Session</button>`;

  S.timerHandle = setInterval(() => {
    const el = document.getElementById('ses-timer');
    if (el && document.contains(el)) el.textContent = elapsed(ses.startedAt);
    else stopTimer();
  }, 1000);
}

// Auto-fill reps/weight from the last logged set for this exercise
function onExChange() {
  const exId = parseInt(document.getElementById('sel-exercise').value);
  if (!exId || !S.session) return;
  const last = [...S.session.sets].reverse().find(s => s.exerciseId === exId);
  if (!last) return;
  if (last.reps)     document.getElementById('inp-reps').value   = last.reps;
  if (last.weightKg) document.getElementById('inp-weight').value = last.weightKg;
}

async function logSet() {
  const exId   = parseInt(document.getElementById('sel-exercise').value);
  const reps   = parseInt(document.getElementById('inp-reps').value)    || null;
  const weight = parseFloat(document.getElementById('inp-weight').value) || null;
  const bw     = document.getElementById('inp-bw').checked;

  if (!exId) { toast('Select an exercise', 'err'); return; }

  const btn = document.getElementById('btn-log');
  btn.disabled = true; btn.textContent = 'Logging…';

  const setNum = S.session.sets.filter(s => s.exerciseId === exId).length + 1;

  try {
    const set = await api.addSet(S.session.id, {
      exercise_id: exId,
      set_number:  setNum,
      reps,
      weight_kg: weight,
      bodyweight: bw,
    });
    S.session.sets.push(set);
    toast(`Set ${setNum} logged!`);
    renderSession();
  } catch (err) {
    toast(err.message, 'err');
    btn.disabled = false; btn.textContent = 'Log Set';
  }
}

async function removeSet(setId) {
  if (!confirm('Remove this set?')) return;
  try {
    await api.delSet(S.session.id, setId);
    S.session.sets = S.session.sets.filter(s => s.id !== setId);
    toast('Set removed');
    renderSession();
  } catch (err) {
    toast(err.message, 'err');
  }
}

function confirmEndSession() {
  // Use a simple textarea via prompt; for a nicer UX we show a small inline form
  const notes = prompt('Add session notes (optional):');
  if (notes === null) return; // user cancelled
  endSession(notes.trim() || null);
}

async function endSession(notes) {
  try {
    await api.endSession(S.session.id, notes);
    S.session = null;
    saveSessionId(null);
    toast('Session saved!');
    navigate('dashboard');
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ── Exercises ────────────────────────────────────────────────────────────────

// Slugs that belong to the anterior (front) view — used to section the muscle grid
const FRONT_SLUGS = new Set([
  'sternocleidomastoid','pectoralis-major-upper','pectoralis-major-lower',
  'serratus-anterior','anterior-deltoid','lateral-deltoid','biceps-brachii',
  'brachialis','brachioradialis','forearm-flexors','rectus-abdominis',
  'external-obliques','internal-obliques','transversus-abdominis','iliopsoas',
  'tensor-fasciae-latae','sartorius','rectus-femoris','vastus-lateralis',
  'vastus-medialis','adductor-magnus','adductor-longus','gracilis',
  'tibialis-anterior','peroneus-longus',
]);

async function showExercises() {
  const main = document.getElementById('main');
  try {
    if (!S.muscleGroups) S.muscleGroups = await api.muscles();
    if (!S.exercises)    S.exercises    = await api.exercises();

    const front = S.muscleGroups.filter(m =>  FRONT_SLUGS.has(m.slug));
    const back  = S.muscleGroups.filter(m => !FRONT_SLUGS.has(m.slug));

    const gridHtml = `
      <div class="muscle-grid" id="mg-grid">
        <div class="mg-section">Front (Anterior)</div>
        ${front.map(mgRow).join('')}
        <div class="mg-section">Back (Posterior)</div>
        ${back.map(mgRow).join('')}
      </div>`;

    const listHtml = S.exercises.length === 0
      ? '<div class="empty">No exercises yet.</div>'
      : S.exercises.map(ex => `
          <div class="ex-row">
            <div class="ex-name">${ex.name}</div>
            <div class="ex-chips">
              ${ex.muscleGroups.length
                ? ex.muscleGroups.map(m => `<span class="chip chip-${m.role}">${m.name}</span>`).join('')
                : '<span class="text-muted" style="font-size:0.8rem">No muscles mapped</span>'}
            </div>
          </div>`).join('');

    main.innerHTML = `
      <div class="card">
        <div class="card-title">Add Exercise</div>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="form-input" id="inp-exname" type="text" placeholder="e.g. Barbell Squat">
        </div>
        <div class="form-group">
          <label class="form-label">Muscle Groups</label>
          ${gridHtml}
        </div>
        <button class="btn btn-primary" onclick="saveExercise()">Save Exercise</button>
      </div>

      <div class="card">
        <div class="card-title">All Exercises (${S.exercises.length})</div>
        ${listHtml}
      </div>`;
  } catch (err) {
    main.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div>${err.message}</div>`;
  }
}

function mgRow(m) {
  return `
    <div class="mg-item">
      <input type="checkbox" id="mg-${m.id}" data-id="${m.id}" onchange="onMgToggle(${m.id})">
      <label for="mg-${m.id}">${m.name}</label>
      <select class="mg-role" id="mgr-${m.id}">
        <option value="primary">Primary</option>
        <option value="secondary">Secondary</option>
      </select>
    </div>`;
}

function onMgToggle(id) {
  const cb  = document.getElementById(`mg-${id}`);
  const sel = document.getElementById(`mgr-${id}`);
  if (sel) sel.style.display = cb.checked ? 'inline-block' : 'none';
}

async function saveExercise() {
  const name = document.getElementById('inp-exname').value.trim();
  if (!name) { toast('Enter a name', 'err'); return; }

  const muscle_groups = [];
  document.querySelectorAll('#mg-grid input[type=checkbox]:checked').forEach(cb => {
    const id   = parseInt(cb.dataset.id);
    const role = document.getElementById(`mgr-${id}`)?.value || 'primary';
    muscle_groups.push({ id, role });
  });

  try {
    await api.addExercise({ name, muscle_groups });
    S.exercises = null; // invalidate cache
    toast(`"${name}" added!`);
    showExercises();
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ── Settings ─────────────────────────────────────────────────────────────────

function showSettings() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="card">
      <div class="card-title">Backend Connection</div>
      <div class="form-group">
        <label class="form-label">Backend URL</label>
        <input class="form-input" id="inp-url" type="url" value="${getUrl()}"
               placeholder="http://raspberrypi.local:3000">
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="saveSettings()">Save</button>
        <button class="btn btn-secondary" onclick="testConn()">Test Connection</button>
        <span id="conn-status"></span>
      </div>
    </div>
    <div class="card text-muted" style="font-size:0.82rem;line-height:1.8">
      <p>Enter the URL of your BuffPenguin backend.</p>
      <p style="margin-top:8px">Examples:</p>
      <ul style="margin-left:18px">
        <li><code>http://localhost:3000</code> &mdash; local dev</li>
        <li><code>http://raspberrypi.local:3000</code> &mdash; Pi on LAN</li>
        <li><code>http://192.168.1.42:3000</code> &mdash; Pi by IP</li>
      </ul>
    </div>`;
}

function saveSettings() {
  saveUrl(document.getElementById('inp-url').value.trim());
  toast('Saved');
  testConn();
}

async function testConn() {
  const el = document.getElementById('conn-status');
  if (el) { el.className = 'conn-status'; el.textContent = 'Testing…'; }
  try {
    await api.health();
    if (el) { el.className = 'conn-status conn-ok'; el.textContent = '✓ Connected'; }
    toast('Connected!');
  } catch (err) {
    if (el) { el.className = 'conn-status conn-err'; el.textContent = '✗ ' + err.message; }
    toast('Connection failed', 'err');
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-nav]').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.nav))
  );
  navigate(getUrl() ? 'dashboard' : 'settings');
});
