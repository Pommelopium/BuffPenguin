// CaloriesView.js — Calorie input and history table.
// Fully implemented in Phase 5.

export class CaloriesView {
  constructor(app) {
    this.app = app;
  }

  destroy() {}

  async render() {
    const { api, i18n } = this.app;
    const t = (k, p) => i18n.t(k, p);
    const main = document.getElementById('main');

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      const entries = await api.getCalorieEntries();

      // Group entries by date
      const grouped = {};
      for (const e of entries) {
        (grouped[e.date] = grouped[e.date] || []).push(e);
      }
      const dates = Object.keys(grouped).sort().reverse();

      let tableHtml = '';
      if (dates.length === 0) {
        tableHtml = `<div class="empty">${t('calories.noEntries')}</div>`;
      } else {
        tableHtml = '<table class="table"><tr><th>' + t('common.date') + '</th><th>' + t('calories.calories') +
          '</th><th>' + t('calories.notes') + '</th><th>' + t('calories.total') + '</th><th></th></tr>';
        for (const date of dates) {
          const dayEntries = grouped[date];
          const dayTotal = dayEntries.reduce((sum, e) => sum + e.calories, 0);
          dayEntries.forEach((e, idx) => {
            tableHtml += `
              <tr>
                ${idx === 0 ? `<td rowspan="${dayEntries.length}" style="vertical-align:top;font-weight:500">${date}</td>` : ''}
                <td>${e.calories} kcal</td>
                <td>${e.notes || '&mdash;'}</td>
                ${idx === 0 ? `<td rowspan="${dayEntries.length}" style="vertical-align:top;font-weight:700;color:var(--accent)">${dayTotal} kcal</td>` : ''}
                <td><button class="btn btn-danger btn-sm" data-action="delete-calorie" data-id="${e.id}">&times;</button></td>
              </tr>`;
          });
        }
        tableHtml += '</table>';
      }

      main.innerHTML = `
        <div class="card">
          <div class="card-title">${t('calories.logCalories')}</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('calories.calories')}</label>
              <input class="form-input" type="number" id="inp-calories" min="1" placeholder="500">
            </div>
            <div class="form-group">
              <label class="form-label">${t('common.date')}</label>
              <input class="form-input" type="date" id="inp-cal-date" value="${today}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('calories.notes')}</label>
            <input class="form-input" type="text" id="inp-cal-notes" placeholder="${t('calories.notesPlaceholder')}">
          </div>
          <button class="btn btn-primary btn-full" data-action="log-calories">${t('calories.logCalories')}</button>
        </div>

        <div class="card">
          <div class="card-title">${t('calories.history')}</div>
          ${tableHtml}
        </div>`;

      this.bindEvents(main);
    } catch (err) {
      main.innerHTML = `<div class="empty"><div class="empty-icon">&#9888;&#65039;</div>${err.message}</div>`;
    }
  }

  bindEvents(main) {
    main.querySelector('[data-action="log-calories"]')?.addEventListener('click', () => this.logCalories());
    main.querySelectorAll('[data-action="delete-calorie"]').forEach(el => {
      el.addEventListener('click', () => this.deleteCalorie(parseInt(el.dataset.id)));
    });
  }

  async logCalories() {
    const { api, i18n } = this.app;
    const calories = parseInt(document.getElementById('inp-calories').value);
    const date = document.getElementById('inp-cal-date').value;
    const notes = document.getElementById('inp-cal-notes').value.trim() || undefined;

    if (!calories || calories < 1) {
      this.app.toast(i18n.t('calories.invalidCalories'), 'err');
      return;
    }
    if (!date) {
      this.app.toast(i18n.t('calories.invalidDate'), 'err');
      return;
    }

    try {
      await api.addCalories({ calories, date, notes });
      this.app.toast(i18n.t('toast.saved'));
      this.render();
    } catch (err) {
      this.app.toast(err.message, 'err');
    }
  }

  async deleteCalorie(id) {
    const { api, i18n } = this.app;
    if (!confirm(i18n.t('calories.confirmDelete'))) return;
    try {
      await api.deleteCalories(id);
      this.app.toast(i18n.t('toast.deleted'));
      this.render();
    } catch (err) {
      this.app.toast(err.message, 'err');
    }
  }
}
