// ExercisesView.js — Exercise list and creation form.

import { MuscleOverlay } from '../helpers/MuscleOverlay.js';

const FRONT_SLUGS = new Set([
  'sternocleidomastoid','pectoralis-major-upper','pectoralis-major-lower',
  'serratus-anterior','anterior-deltoid','lateral-deltoid','biceps-brachii',
  'brachialis','brachioradialis','forearm-flexors','rectus-abdominis',
  'external-obliques','internal-obliques','transversus-abdominis','iliopsoas',
  'tensor-fasciae-latae','sartorius','rectus-femoris','vastus-lateralis',
  'vastus-medialis','adductor-magnus','adductor-longus','gracilis',
  'tibialis-anterior','peroneus-longus',
]);

export class ExercisesView {
  constructor(app) {
    this.app = app;
  }

  destroy() {}

  async render() {
    const { api, state, i18n, muscleOverlay } = this.app;
    const t = (k, p) => i18n.t(k, p);
    const main = document.getElementById('main');

    try {
      if (!state.muscleGroups) state.muscleGroups = await api.getMuscleGroups();
      if (!state.exercises) state.exercises = await api.getExercises();
      await muscleOverlay.load();

      const front = state.muscleGroups.filter(m => FRONT_SLUGS.has(m.slug));
      const back = state.muscleGroups.filter(m => !FRONT_SLUGS.has(m.slug));

      const gridHtml = `
        <div class="muscle-grid" id="mg-grid">
          <div class="mg-section">${t('exercises.front')}</div>
          ${front.map(m => this.mgRow(m)).join('')}
          <div class="mg-section">${t('exercises.back')}</div>
          ${back.map(m => this.mgRow(m)).join('')}
        </div>`;

      const listHtml = state.exercises.length === 0
        ? `<div class="empty">${t('exercises.noExercises')}</div>`
        : state.exercises.map(ex => `
            <div class="ex-row" data-action="show-exercise" data-id="${ex.id}" style="cursor:pointer">
              <div class="ex-name">${ex.localizedName || ex.name}</div>
              <div class="ex-chips">
                ${ex.muscleGroups.length
                  ? ex.muscleGroups.map(m => `<span class="chip chip-${m.role}">${m.localizedName || m.name}</span>`).join('')
                  : `<span class="text-muted" style="font-size:0.8rem">${t('common.noMusclesMapped')}</span>`}
              </div>
            </div>`).join('');

      main.innerHTML = `
        <div class="card">
          <div class="card-title">${t('exercises.addExercise')}</div>
          <div class="form-group">
            <label class="form-label">${t('exercises.name')}</label>
            <input class="form-input" id="inp-exname" type="text" placeholder="${t('exercises.namePlaceholder')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('exercises.muscleGroups')}</label>
            ${muscleOverlay.render()}
            ${gridHtml}
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary" data-action="reset-exercise">${t('exercises.reset')}</button>
            <button class="btn btn-primary" data-action="save-exercise">${t('exercises.save')}</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">${t('exercises.allExercises', { n: state.exercises.length })}</div>
          ${listHtml}
        </div>`;

      this.bindEvents(main);
      // Start with no muscles highlighted
      muscleOverlay.highlight(new Set());
    } catch (err) {
      main.innerHTML = `<div class="empty"><div class="empty-icon">&#9888;&#65039;</div>${err.message}</div>`;
    }
  }

  mgRow(m) {
    const label = m.localizedName || m.name;
    const { i18n } = this.app;
    return `
      <div class="mg-item">
        <input type="checkbox" id="mg-${m.id}" data-id="${m.id}" data-slug="${m.slug}" data-mg-check>
        <label for="mg-${m.id}">${label}</label>
        <select class="mg-role" id="mgr-${m.id}">
          <option value="primary">${i18n.t('common.primary')}</option>
          <option value="secondary">${i18n.t('common.secondary')}</option>
        </select>
      </div>`;
  }

  updateOverlayFromCheckboxes() {
    const slugs = new Set();
    document.querySelectorAll('[data-mg-check]:checked').forEach(cb => {
      if (cb.dataset.slug) slugs.add(cb.dataset.slug);
    });
    this.app.muscleOverlay.highlight(slugs);
  }

  bindEvents(main) {
    main.querySelector('[data-action="reset-exercise"]')?.addEventListener('click', () => this.resetForm());
    main.querySelector('[data-action="save-exercise"]')?.addEventListener('click', () => this.saveExercise());
    main.querySelectorAll('[data-mg-check]').forEach(cb => {
      cb.addEventListener('change', () => {
        const sel = document.getElementById(`mgr-${cb.dataset.id}`);
        if (sel) sel.style.display = cb.checked ? 'inline-block' : 'none';
        this.updateOverlayFromCheckboxes();
      });
    });
    main.querySelectorAll('[data-action="show-exercise"]').forEach(el => {
      el.addEventListener('click', () => this.showExerciseMuscles(parseInt(el.dataset.id)));
    });
  }

  showExerciseMuscles(exerciseId) {
    const { state, muscleOverlay } = this.app;
    const ex = state.exercises.find(e => e.id === exerciseId);
    if (!ex) return;

    // Clear checkboxes and highlight the clicked exercise's muscles
    document.querySelectorAll('[data-mg-check]').forEach(cb => {
      cb.checked = false;
      const sel = document.getElementById(`mgr-${cb.dataset.id}`);
      if (sel) sel.style.display = 'none';
    });

    const slugs = new Set();
    for (const mg of ex.muscleGroups) {
      slugs.add(mg.slug);
      // Check the corresponding checkbox and set role
      const cb = document.querySelector(`[data-mg-check][data-slug="${mg.slug}"]`);
      if (cb) {
        cb.checked = true;
        const sel = document.getElementById(`mgr-${cb.dataset.id}`);
        if (sel) {
          sel.style.display = 'inline-block';
          sel.value = mg.role;
        }
      }
    }

    muscleOverlay.highlight(slugs);

    // Fill exercise name and scroll to top
    const nameInput = document.getElementById('inp-exname');
    if (nameInput) nameInput.value = ex.localizedName || ex.name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm() {
    const nameInput = document.getElementById('inp-exname');
    if (nameInput) nameInput.value = '';
    document.querySelectorAll('[data-mg-check]').forEach(cb => {
      cb.checked = false;
      const sel = document.getElementById(`mgr-${cb.dataset.id}`);
      if (sel) sel.style.display = 'none';
    });
    this.app.muscleOverlay.highlight(new Set());
  }

  async saveExercise() {
    const { api, state, i18n } = this.app;
    const name = document.getElementById('inp-exname').value.trim();
    if (!name) { this.app.toast(i18n.t('toast.enterName'), 'err'); return; }

    const muscle_groups = [];
    document.querySelectorAll('#mg-grid input[type=checkbox]:checked').forEach(cb => {
      const id = parseInt(cb.dataset.id);
      const role = document.getElementById(`mgr-${id}`)?.value || 'primary';
      muscle_groups.push({ id, role });
    });

    try {
      await api.addExercise({ name, muscle_groups });
      state.exercises = null;
      this.app.toast(i18n.t('toast.exerciseAdded', { name }));
      this.render();
    } catch (err) {
      this.app.toast(err.message, 'err');
    }
  }
}
