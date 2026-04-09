// SettingsView.js — Backend URL config and connection test.

export class SettingsView {
  constructor(app) {
    this.app = app;
  }

  destroy() {}

  async render() {
    const { api, i18n } = this.app;
    const t = (k, p) => i18n.t(k, p);
    const main = document.getElementById('main');

    main.innerHTML = `
      <div class="card">
        <div class="card-title">${t('settings.backendConnection')}</div>
        <div class="form-group">
          <label class="form-label">${t('settings.backendUrl')}</label>
          <input class="form-input" id="inp-url" type="url" value="${api.getUrl()}"
                 placeholder="http://raspberrypi.local:3000">
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" data-action="save-settings">${t('settings.save')}</button>
          <button class="btn btn-secondary" data-action="test-conn">${t('settings.testConnection')}</button>
          <span id="conn-status"></span>
        </div>
      </div>
      <div class="card text-muted" style="font-size:0.82rem;line-height:1.8">
        <p>${t('settings.instructions')}</p>
        <p style="margin-top:8px">${t('settings.examples')}</p>
        <ul style="margin-left:18px">
          <li><code>http://localhost:3000</code> &mdash; ${t('settings.localDev')}</li>
          <li><code>http://raspberrypi.local:3000</code> &mdash; ${t('settings.piLan')}</li>
          <li><code>http://192.168.1.42:3000</code> &mdash; ${t('settings.piIp')}</li>
        </ul>
      </div>`;

    main.querySelector('[data-action="save-settings"]')?.addEventListener('click', () => this.saveSettings());
    main.querySelector('[data-action="test-conn"]')?.addEventListener('click', () => this.testConn());
  }

  saveSettings() {
    const { api, i18n } = this.app;
    api.saveUrl(document.getElementById('inp-url').value.trim());
    this.app.toast(i18n.t('toast.saved'));
    this.testConn();
  }

  async testConn() {
    const { i18n } = this.app;
    const el = document.getElementById('conn-status');
    const input = document.getElementById('inp-url');
    const testUrl = (input ? input.value.trim() : this.app.api.getUrl()).replace(/\/$/, '');
    if (el) { el.className = 'conn-status'; el.textContent = i18n.t('settings.testing'); }
    try {
      const res = await fetch(testUrl + '/health', { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (el) { el.className = 'conn-status conn-ok'; el.textContent = '✓ ' + i18n.t('settings.connected'); }
      this.app.toast(i18n.t('settings.connected'));
    } catch (err) {
      if (el) { el.className = 'conn-status conn-err'; el.textContent = '✗ ' + err.message; }
      this.app.toast(i18n.t('settings.connectionFailed'), 'err');
    }
  }
}
