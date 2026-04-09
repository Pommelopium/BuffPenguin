// WeightView.js — Body weight input and history table.
// Fully implemented in Phase 4.

export class WeightView {
  constructor(app) {
    this.app = app;
  }

  destroy() {}

  async render() {
    const { api, i18n } = this.app;
    const t = (k, p) => i18n.t(k, p);
    const main = document.getElementById('main');

    try {
      const entries = await api.getWeightEntries();
      const latest = entries.length > 0 ? entries[0] : null;

      let tableRows = '';
      if (entries.length === 0) {
        tableRows = `<tr><td colspan="4" class="text-muted" style="padding:12px 0">${t('weight.noEntries')}</td></tr>`;
      } else {
        tableRows = entries.map(e => {
          const date = new Date(e.recordedAt * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
          return `
            <tr>
              <td>${date}</td>
              <td>${e.weightKg} kg</td>
              <td>${e.notes || '&mdash;'}</td>
              <td>
                <button class="btn btn-danger btn-sm" data-action="delete-weight" data-id="${e.id}">&times;</button>
              </td>
            </tr>`;
        }).join('');
      }

      main.innerHTML = `
        <div class="card">
          <div class="card-title">${t('weight.logWeight')}</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('weight.weightKg')}</label>
              <input class="form-input" type="number" id="inp-body-weight" min="20" max="300" step="0.1"
                     placeholder="75.0" ${latest ? `value="${latest.weightKg}"` : ''}>
            </div>
            <div class="form-group">
              <label class="form-label">${t('weight.notes')}</label>
              <input class="form-input" type="text" id="inp-weight-notes" placeholder="${t('weight.notesPlaceholder')}">
            </div>
          </div>
          <button class="btn btn-primary btn-full" data-action="log-weight">${t('weight.logWeight')}</button>
        </div>

        <div class="card">
          <div class="card-title">${t('weight.history')}</div>
          <table class="table">
            <tr><th>${t('common.date')}</th><th>${t('weight.weightKg')}</th><th>${t('weight.notes')}</th><th></th></tr>
            ${tableRows}
          </table>
        </div>`;

      this.bindEvents(main);
    } catch (err) {
      main.innerHTML = `<div class="empty"><div class="empty-icon">&#9888;&#65039;</div>${err.message}</div>`;
    }
  }

  bindEvents(main) {
    main.querySelector('[data-action="log-weight"]')?.addEventListener('click', () => this.logWeight());
    main.querySelectorAll('[data-action="delete-weight"]').forEach(el => {
      el.addEventListener('click', () => this.deleteWeight(parseInt(el.dataset.id)));
    });
  }

  async logWeight() {
    const { api, i18n } = this.app;
    const weight = parseFloat(document.getElementById('inp-body-weight').value);
    const notes = document.getElementById('inp-weight-notes').value.trim() || undefined;
    if (!weight || weight < 20 || weight > 300) {
      this.app.toast(i18n.t('weight.invalidWeight'), 'err');
      return;
    }
    try {
      await api.addWeight({ weight_kg: weight, notes });
      this.app.toast(i18n.t('toast.saved'));
      this.render();
    } catch (err) {
      this.app.toast(err.message, 'err');
    }
  }

  async deleteWeight(id) {
    const { api, i18n } = this.app;
    if (!confirm(i18n.t('weight.confirmDelete'))) return;
    try {
      await api.deleteWeight(id);
      this.app.toast(i18n.t('toast.deleted'));
      this.render();
    } catch (err) {
      this.app.toast(err.message, 'err');
    }
  }
}
