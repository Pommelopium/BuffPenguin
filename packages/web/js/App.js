// App.js — Main application controller.

import { ApiClient } from './ApiClient.js';
import { I18n } from './I18n.js';
import { DashboardView } from './views/DashboardView.js';
import { ExercisesView } from './views/ExercisesView.js';
import { SettingsView } from './views/SettingsView.js';
import { WeightView } from './views/WeightView.js';
import { CaloriesView } from './views/CaloriesView.js';

export class App {
  constructor() {
    this.i18n = new I18n();
    this.api = new ApiClient(this.i18n);
    this.state = {
      exercises: null,
      muscleGroups: null,
      session: null,
      timerHandle: null,
    };
    this.views = {
      dashboard: new DashboardView(this),
      exercises: new ExercisesView(this),
      settings: new SettingsView(this),
      weight: new WeightView(this),
      calories: new CaloriesView(this),
    };
    this.currentView = null;
    this.toastTimer = null;
  }

  async init() {
    await this.i18n.load();
    this.updateNavLabels();
    this.bindNavigation();
    this.bindLanguageSelector();
    this.navigate(this.api.getUrl() ? 'dashboard' : 'settings');
  }

  updateNavLabels() {
    const t = (k) => this.i18n.t(k);
    document.querySelectorAll('[data-nav]').forEach(btn => {
      const key = `nav.${btn.dataset.nav}`;
      btn.textContent = t(key);
    });
  }

  bindNavigation() {
    document.querySelectorAll('[data-nav]').forEach(btn =>
      btn.addEventListener('click', () => this.navigate(btn.dataset.nav))
    );
  }

  bindLanguageSelector() {
    const sel = document.getElementById('lang-select');
    if (!sel) return;
    sel.value = this.i18n.getLocale();
    sel.addEventListener('change', async () => {
      await this.i18n.setLocale(sel.value);
      // Clear cached data that includes localized names
      this.state.exercises = null;
      this.state.muscleGroups = null;
      this.updateNavLabels();
      // Re-render current view
      if (this.currentView && this.views[this.currentView]) {
        this.views[this.currentView].render();
      }
    });
  }

  navigate(viewName) {
    this.stopTimer();
    if (this.currentView && this.views[this.currentView]?.destroy) {
      this.views[this.currentView].destroy();
    }
    this.currentView = viewName;
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.nav === viewName)
    );
    const main = document.getElementById('main');
    main.innerHTML = `<div class="loading">${this.i18n.t('common.loading')}</div>`;
    const view = this.views[viewName];
    if (view) {
      view.render();
    } else {
      this.views.dashboard.render();
    }
  }

  stopTimer() {
    if (this.state.timerHandle) {
      clearInterval(this.state.timerHandle);
      this.state.timerHandle = null;
    }
  }

  toast(msg, type = 'ok') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.className = 'toast hidden'; }, 2800);
  }
}
