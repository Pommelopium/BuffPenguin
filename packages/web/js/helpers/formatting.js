// formatting.js — Date, time, and duration formatting helpers.

export function fmtDate(ts) {
  return new Date(ts * 1000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function fmtTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function fmtDuration(start, end) {
  if (!end) return null; // caller should use i18n for "In progress"
  const m = Math.floor((end - start) / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function elapsed(startTs) {
  const s = Math.floor(Date.now() / 1000) - startTs;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0
    ? `${h}:${pad(m)}:${pad(sec)}`
    : `${m}:${pad(sec)}`;
}

export function pad(n) {
  return String(n).padStart(2, '0');
}
