export type Theme = 'daylight' | 'hearth';
export function getTheme(): Theme {
  try { return localStorage.getItem('lantern-theme') === 'hearth' ? 'hearth' : 'daylight'; } catch { return 'daylight'; }
}
export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('lantern-theme', t); } catch { /* storage unavailable */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'hearth' ? '#1c0f0c' : '#fbf6ee');
}
