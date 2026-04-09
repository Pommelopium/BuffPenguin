// app.js — Entry point. Creates and initialises the App.

import { App } from './js/App.js';

const app = new App();

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// Expose for debugging
window.app = app;
