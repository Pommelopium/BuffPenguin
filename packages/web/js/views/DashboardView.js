// DashboardView.js — Dashboard, session management, and set logging.

import { fmtDate, fmtTime, fmtDuration, elapsed } from '../helpers/formatting.js';
import { MuscleOverlay } from '../helpers/MuscleOverlay.js';

export class DashboardView {
  constructor(app) {
    this.app = app;
  }

  destroy() {
    this.app.stopTimer();
  }

  async render() {
    const { api, i18n, state } = this.app;
    const main = document.getElementById('main');
    const t = (k, p) => i18n.t(k, p);

    try {
      const sessions = await api.getSessions(20);
      const active = sessions.find(s => !s.endedAt);
      if (active) {
        state.session = await api.getSession(active.id);
        api.saveSessionId(active.id);
      } else {
        state.session = null;
        api.saveSessionId(null);
      }
      const past = sessions.filter(s => s.endedAt);

      let html = '';
      if (state.session) {
        html += `
          <div class="session-banner">
            <div>
              <div style="font-size:0.78rem;color:var(--muted);margin-bottom:2px">${t('dashboard.activeSession')}</div>
              <div class="timer" id="dash-timer">${elapsed(state.session.startedAt)}</div>
              <div style="font-size:0.78rem;color:var(--muted);margin-top:2px">${t('common.sets', { n: state.session.sets.length })}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
              <button class="btn btn-primary" data-action="continue">${t('dashboard.continue')}</button>
              <button class="btn btn-danger btn-sm" data-action="end-session">${t('session.endSession')}</button>
            </div>
          </div>`;
      } else {
        html += `
          <div style="margin-bottom:16px">
            <button class="btn btn-primary btn-lg btn-full" data-action="start-session">${t('dashboard.startWorkout')}</button>
          </div>`;
      }

      html += `<div class="card"><div class="card-title">${t('dashboard.recentSessions')}</div>`;
      if (past.length === 0) {
        html += `<div class="empty"><div class="empty-icon">&#127947;&#65039;</div>${t('dashboard.noWorkouts')}</div>`;
      } else {
        html += past.slice(0, 10).map(s => `
          <div class="session-row" data-action="view-session" data-id="${s.id}">
            <div>
              <div class="sr-date">${fmtDate(s.startedAt)}</div>
              <div class="sr-meta">${fmtTime(s.startedAt)} &middot; ${fmtDuration(s.startedAt, s.endedAt) || t('common.inProgress')}</div>
            </div>
            <span class="sr-badge">${t('common.view')}</span>
          </div>`).join('');
      }
      html += '</div>';
      main.innerHTML = html;
      this.bindEvents(main);

      if (state.session) {
        const el = document.getElementById('dash-timer');
        state.timerHandle = setInterval(() => {
          if (el && document.contains(el)) el.textContent = elapsed(state.session.startedAt);
          else this.app.stopTimer();
        }, 1000);
      }
    } catch (err) {
      main.innerHTML = `
        <div class="empty">
          <div class="empty-icon">&#9888;&#65039;</div>
          <div>${err.message}</div>
          <button class="btn btn-secondary" style="margin-top:14px" data-action="go-settings">${t('settings.checkSettings')}</button>
        </div>`;
      main.querySelector('[data-action="go-settings"]')?.addEventListener('click', () => this.app.navigate('settings'));
    }
  }

  bindEvents(main) {
    main.querySelector('[data-action="start-session"]')?.addEventListener('click', () => this.startSession());
    main.querySelector('[data-action="continue"]')?.addEventListener('click', () => this.openSession());
    main.querySelector('[data-action="end-session"]')?.addEventListener('click', () => this.confirmEndSession());
    main.querySelectorAll('[data-action="view-session"]').forEach(el => {
      el.addEventListener('click', () => this.viewSession(parseInt(el.dataset.id)));
    });
  }

  async startSession() {
    const { api, state } = this.app;
    try {
      const s = await api.newSession();
      state.session = { id: s.id, startedAt: s.startedAt, sets: [] };
      api.saveSessionId(s.id);
      this.openSession();
    } catch (err) {
      this.app.toast(err.message, 'err');
    }
  }

  async openSession() {
    const { api, state, i18n } = this.app;
    if (!state.session) return;
    this.app.stopTimer();

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    if (!state.exercises) {
      try { state.exercises = await api.getExercises(); } catch (e) { this.app.toast(e.message, 'err'); return; }
    }
    try {
      const fresh = await api.getSession(state.session.id);
      state.session.sets = fresh.sets;
    } catch (_) { /* use cached */ }

    await this.renderSession();
  }

  async renderSession() {
    const { state, i18n, muscleOverlay } = this.app;
    const t = (k, p) => i18n.t(k, p);
    const main = document.getElementById('main');
    const ses = state.session;
    const exs = state.exercises || [];
    const exMap = Object.fromEntries(exs.map(e => [e.id, e.localizedName || e.name]));

    await muscleOverlay.load();
    const activeSlugs = MuscleOverlay.getSessionMuscles(ses.sets, exs);

    const setsBody = ses.sets.length === 0
      ? `<tr><td colspan="5" class="text-muted" style="padding:12px 0">${t('session.noSetsYet')}</td></tr>`
      : ses.sets.map(s => `
          <tr>
            <td>${exMap[s.exerciseId] || s.exerciseId}</td>
            <td>${s.setNumber}</td>
            <td>${s.reps ?? '&mdash;'}</td>
            <td>${s.weightKg != null ? s.weightKg + ' kg' : s.bodyweight ? 'BW' : '&mdash;'}</td>
            <td><button class="btn btn-danger btn-sm" data-action="remove-set" data-id="${s.id}">&times;</button></td>
          </tr>`).join('');

    const exOptions = exs
      .map(e => `<option value="${e.id}">${e.localizedName || e.name}</option>`)
      .join('');

    main.innerHTML = `
      <div class="row-spaced" style="margin-bottom:16px">
        <div>
          <div style="font-size:0.78rem;color:var(--muted)">${t('dashboard.activeSession')}</div>
          <div class="timer" id="ses-timer">${elapsed(ses.startedAt)}</div>
        </div>
        <button class="btn btn-ghost" data-action="back-dash">&#8592; ${t('common.back')}</button>
      </div>

      <div class="card">
        <div class="card-title">${t('session.musclesWorked')}</div>
        ${muscleOverlay.render()}
      </div>

      <div class="card">
        <div class="card-title">${t('session.logSet')}</div>
        <div class="form-group">
          <label class="form-label">${t('session.exercise')}</label>
          <select class="form-select" id="sel-exercise">
            <option value="">— ${t('session.selectExercise')} —</option>
            ${exOptions}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('session.reps')}</label>
            <input class="form-input" type="number" id="inp-reps" min="1" placeholder="12">
          </div>
          <div class="form-group">
            <label class="form-label">${t('session.weightKg')}</label>
            <input class="form-input" type="number" id="inp-weight" min="0" step="0.5" placeholder="60">
          </div>
        </div>
        <label class="check-row" style="margin-bottom:14px">
          <input type="checkbox" id="inp-bw"> ${t('session.bodyweight')}
        </label>
        <button class="btn btn-primary btn-full" id="btn-log" data-action="log-set">${t('session.logSet')}</button>
      </div>

      <div class="card">
        <div class="card-title">${t('session.thisSession')} &mdash; ${t('common.sets', { n: ses.sets.length })}</div>
        <table class="table">
          <tr><th>${t('session.exercise')}</th><th>Set</th><th>${t('session.reps')}</th><th>${t('session.weightKg')}</th><th></th></tr>
          ${setsBody}
        </table>
      </div>

      <button class="btn btn-danger btn-full" style="margin-top:4px" data-action="end-session">${t('session.endSession')}</button>`;

    // Bind events
    main.querySelector('[data-action="back-dash"]')?.addEventListener('click', () => this.render());
    main.querySelector('[data-action="log-set"]')?.addEventListener('click', () => this.logSet());
    main.querySelector('[data-action="end-session"]')?.addEventListener('click', () => this.confirmEndSession());
    main.querySelector('#sel-exercise')?.addEventListener('change', () => this.onExChange());
    main.querySelectorAll('[data-action="remove-set"]').forEach(el => {
      el.addEventListener('click', () => this.removeSet(parseInt(el.dataset.id)));
    });

    muscleOverlay.highlight(activeSlugs);

    state.timerHandle = setInterval(() => {
      const el = document.getElementById('ses-timer');
      if (el && document.contains(el)) el.textContent = elapsed(ses.startedAt);
      else this.app.stopTimer();
    }, 1000);
  }

  onExChange() {
    const { state } = this.app;
    const exId = parseInt(document.getElementById('sel-exercise').value);
    if (!exId || !state.session) return;
    const last = [...state.session.sets].reverse().find(s => s.exerciseId === exId);
    if (!last) return;
    if (last.reps) document.getElementById('inp-reps').value = last.reps;
    if (last.weightKg) document.getElementById('inp-weight').value = last.weightKg;
  }

  async logSet() {
    const { api, state, i18n } = this.app;
    const exId = parseInt(document.getElementById('sel-exercise').value);
    const reps = parseInt(document.getElementById('inp-reps').value) || null;
    const weight = parseFloat(document.getElementById('inp-weight').value) || null;
    const bw = document.getElementById('inp-bw').checked;

    if (!exId) { this.app.toast(i18n.t('toast.selectExercise'), 'err'); return; }

    const btn = document.getElementById('btn-log');
    btn.disabled = true; btn.textContent = i18n.t('common.loading');

    const setNum = state.session.sets.filter(s => s.exerciseId === exId).length + 1;

    try {
      const set = await api.addSet(state.session.id, {
        exercise_id: exId,
        set_number: setNum,
        reps,
        weight_kg: weight,
        bodyweight: bw,
      });
      state.session.sets.push(set);
      this.app.toast(i18n.t('toast.setLogged', { n: setNum }));
      await this.renderSession();
    } catch (err) {
      this.app.toast(err.message, 'err');
      btn.disabled = false; btn.textContent = i18n.t('session.logSet');
    }
  }

  async removeSet(setId) {
    const { api, state, i18n } = this.app;
    if (!confirm(i18n.t('common.removeSet'))) return;
    try {
      await api.delSet(state.session.id, setId);
      state.session.sets = state.session.sets.filter(s => s.id !== setId);
      this.app.toast(i18n.t('toast.setRemoved'));
      await this.renderSession();
    } catch (err) {
      this.app.toast(err.message, 'err');
    }
  }

  confirmEndSession() {
    const { i18n } = this.app;
    const notes = prompt(i18n.t('session.sessionNotes'));
    if (notes === null) return;
    this.endSession(notes.trim() || null);
  }

  async endSession(notes) {
    const { api, state, i18n } = this.app;
    try {
      await api.endSession(state.session.id, notes);
      state.session = null;
      api.saveSessionId(null);
      this.app.toast(i18n.t('toast.sessionSaved'));
      this.app.navigate('dashboard');
    } catch (err) {
      this.app.toast(err.message, 'err');
    }
  }

  async viewSession(id) {
    const { api, state, i18n, muscleOverlay } = this.app;
    const t = (k, p) => i18n.t(k, p);
    const main = document.getElementById('main');
    try {
      const s = await api.getSession(id);
      if (!state.exercises) state.exercises = await api.getExercises();
      const exMap = Object.fromEntries(state.exercises.map(e => [e.id, e.localizedName || e.name]));

      await muscleOverlay.load();
      const activeSlugs = MuscleOverlay.getSessionMuscles(s.sets, state.exercises);

      const grouped = {};
      for (const set of s.sets) {
        const name = exMap[set.exerciseId] || `Exercise #${set.exerciseId}`;
        (grouped[name] = grouped[name] || []).push(set);
      }

      let html = `
        <button class="btn btn-ghost" data-action="back-dash" style="margin-bottom:14px">&#8592; ${t('common.back')}</button>
        <div class="card">
          <div class="card-title">${t('session.session')}</div>
          <div style="display:flex;gap:24px;flex-wrap:wrap">
            <div><div class="form-label">${t('common.date')}</div><strong>${fmtDate(s.startedAt)}</strong></div>
            <div><div class="form-label">${t('common.duration')}</div><strong>${fmtDuration(s.startedAt, s.endedAt) || t('common.inProgress')}</strong></div>
            <div><div class="form-label">Sets</div><strong>${s.sets.length}</strong></div>
          </div>
          ${s.notes ? `<p class="text-muted" style="margin-top:10px">${s.notes}</p>` : ''}
        </div>

        <div class="card">
          <div class="card-title">${t('session.musclesWorked')}</div>
          ${muscleOverlay.render()}
        </div>`;

      for (const [name, sets] of Object.entries(grouped)) {
        html += `
          <div class="card">
            <div class="card-title">${name}</div>
            <table class="table">
              <tr><th>Set</th><th>${t('session.reps')}</th><th>${t('session.weightKg')}</th></tr>
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
      muscleOverlay.highlight(activeSlugs);
      main.querySelector('[data-action="back-dash"]')?.addEventListener('click', () => this.render());
    } catch (err) {
      this.app.toast(err.message, 'err');
    }
  }
}
