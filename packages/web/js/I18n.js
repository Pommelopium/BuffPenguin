// I18n.js — Client-side translation loader.

const LOCALE_KEY = 'bp_locale';

export class I18n {
  constructor() {
    this.locale = localStorage.getItem(LOCALE_KEY) || 'en';
    this.translations = {};
  }

  async load() {
    try {
      const res = await fetch(`i18n/${this.locale}.json`);
      this.translations = await res.json();
    } catch {
      // Fall back to English
      if (this.locale !== 'en') {
        this.locale = 'en';
        const res = await fetch('i18n/en.json');
        this.translations = await res.json();
      }
    }
  }

  t(key, params = {}) {
    let str = this.translations[key] ?? key;
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, v);
    }
    return str;
  }

  getLocale() {
    return this.locale;
  }

  async setLocale(locale) {
    this.locale = locale;
    localStorage.setItem(LOCALE_KEY, locale);
    await this.load();
  }
}
