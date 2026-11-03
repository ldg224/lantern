// End-to-end check against the real Supabase project with a throwaway user (deleted at the end).
// Usage: node run.mjs <screenshot-folder>   (needs `vite preview --port 4173` running in app/)
import { chromium } from 'playwright-core';
import fs from 'fs';
import os from 'os';

const REF = 'flgzmmcnpyxwpgfbptet';
const API = `https://${REF}.supabase.co`;
const APP = 'http://localhost:4173/lantern/';
const OUT = process.argv[2] ?? '.';

const tok = fs.readFileSync(os.homedir() + '/.lantern/supabase-token.txt', 'utf8').trim();
const keys = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: 'Bearer ' + tok } })).json();
const svc = keys.find(k => k.name === 'service_role').api_key;
const H = { apikey: svc, Authorization: 'Bearer ' + svc, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const rest = async (path, body) => {
  const r = await fetch(`${API}/rest/v1/${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`seed ${path} failed: ${r.status} ${await r.text()}`);
  return (await r.json())[0];
};

const email = `e2e-${Date.now()}@lantern.test`;
const password = 'T' + Math.random().toString(36).slice(2) + '!9';
const user = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email, password, email_confirm: true }) })).json();
const uid = user.id;
const errors = [];
const checks = [];
const check = (name, ok, detail = '') => { checks.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(0, 0, 0, 0); return d.toISOString(); };

async function signIn(page) {
  await page.goto(APP);
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=current-password]', password);
  await page.click('button.primary');
  await page.waitForSelector('.capture-box input, .page-head');
}

try {
  const methods = await rest('subjects', { user_id: uid, name: 'methods', colour: '#2563eb', position: 1 });
  await rest('cards', { user_id: uid, title: 'SAC 1', kind: 'sac', subject_id: methods.id, due_at: day(-5), position: 1 });
  await rest('cards', { user_id: uid, title: 'ex 4B', kind: 'homework', subject_id: methods.id, due_at: day(-1), position: 2 });
  await rest('cards', { user_id: uid, title: 'take vitamins', done_at: new Date().toISOString(), position: 3 });

  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await signIn(page);

  const cap = '.capture-box input';
  await page.fill(cap, 'sac 2 methods fri');
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/a-typing.png` });
  for (const t of ['sac 2 methods fri', 'methods ex 4C thu', 'english essay tomorrow', 'pay rent today']) {
    await page.fill(cap, t);
    await page.press(cap, 'Enter');
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/a-today.png`, fullPage: true });
  const titles = await page.$$eval('li.task .task-title', e => e.map(x => x.textContent));
  check('today shows captured + seeded items', ['ex 4B', 'pay rent', 'ex 4C', 'essay', 'sac 2'].every(t => titles.some(x => x.includes(t))), titles.join(', '));
  check('past SAC is not on today', !titles.includes('SAC 1'));

  // detail panel: add a step, reschedule, close
  await page.click('li.task:has-text("ex 4C") .task-main');
  await page.waitForSelector('.sheet');
  await page.click('.sheet .add-btn:has-text("add a step")');
  await page.fill('.sheet .inline-add input', 'questions 1-10');
  await page.press('.sheet .inline-add input', 'Enter');
  await page.waitForSelector('.sheet .steps li');
  await page.click('.sheet .qchip:has-text("tomorrow")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/a-detail.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const ex4c = await page.textContent('li.task:has-text("ex 4C") .task-meta');
  check('detail edits show on the row', ex4c.includes('tomorrow') && ex4c.includes('0/1'), ex4c);

  // subject page: mark the past SAC
  await page.click('.side-nav a:has-text("methods")');
  await page.waitForSelector('.subject-page li.task');
  await page.screenshot({ path: `${OUT}/a-subject.png`, fullPage: true });
  const groups = await page.$$eval('.group-title', e => e.map(x => x.textContent));
  check('subject groups', groups.some(g => g.startsWith('waiting for results')) && groups.some(g => g.startsWith('overdue')) && groups.some(g => g.startsWith('this week')), groups.join(' / '));
  await page.click('li.task:has-text("SAC 1") .mini');
  await page.waitForSelector('.sheet .result');
  await page.fill('.sheet input[aria-label="mark"]', '38');
  await page.fill('.sheet input[aria-label="out of"]', '45');
  await page.press('.sheet input[aria-label="out of"]', 'Tab');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/a-mark.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const avg = await page.textContent('.stat-num').catch(() => null);
  check('average shows after marking', avg === '84%', String(avg));
  await page.reload();
  await page.waitForSelector('.subject-page .page-head');
  await page.waitForTimeout(800);
  const doneCount = await page.textContent('.done-toggle').catch(() => '');
  const avg2 = await page.textContent('.stat-num').catch(() => null);
  check('mark persists after reload', avg2 === '84%' && doneCount.includes('1'), `${avg2} | ${doneCount}`);

  // phone
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  m.on('pageerror', e => errors.push(e.message));
  await signIn(m);
  await m.waitForTimeout(1200);
  await m.screenshot({ path: `${OUT}/a-mobile.png` });
  check('phone has no sideways scroll', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await m.click('li.task:has-text("sac 2") .task-main');
  await m.waitForSelector('.sheet');
  await m.waitForTimeout(400);
  await m.screenshot({ path: `${OUT}/a-mobile-sheet.png` });
  await m.keyboard.press('Escape');
  await m.click('.tabbar a:has-text("school")');
  await m.waitForSelector('.boards-list a');
  check('phone school tab lists subjects', (await m.textContent('.boards-list')).includes('methods'));

  await browser.close();
} catch (e) {
  checks.push('FAIL  script stopped: ' + e.message.split('\n')[0]);
} finally {
  const sacs = await (await fetch(`${API}/rest/v1/cards?user_id=eq.${uid}&kind=eq.sac&select=title,subject_id,due_at,result_score,result_total,done_at`, { headers: H })).json();
  console.log('sac rows:', JSON.stringify(sacs));
  const d = await fetch(`${API}/auth/v1/admin/users/${uid}`, { method: 'DELETE', headers: H });
  checks.push(`${d.ok ? 'PASS' : 'FAIL'}  test user deleted (${d.status})`);
  console.log(checks.join('\n'));
  console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
}
