import { chromium } from 'playwright-core';
import fs from 'fs'; import os from 'os';
const REF = 'flgzmmcnpyxwpgfbptet', URL_ = `https://${REF}.supabase.co`, OUT = process.argv[2];
const tok = fs.readFileSync(os.homedir() + '/.lantern/supabase-token.txt', 'utf8').trim();
const keys = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: 'Bearer ' + tok } })).json();
const svc = keys.find(k => k.name === 'service_role').api_key;
const H = { apikey: svc, Authorization: 'Bearer ' + svc, 'Content-Type': 'application/json' };
const email = `e2e-${Date.now()}@lantern.test`, password = 'T' + Math.random().toString(36).slice(2) + '!9';
const u = await (await fetch(`${URL_}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email, password, email_confirm: true }) })).json();
const uid = u.id; console.log('test user created', !!uid);
const errors = [];
try {
  // an overdue task and a done-earlier task, inserted directly
  const y = new Date(); y.setDate(y.getDate() - 2); y.setHours(0,0,0,0);
  for (const row of [
    { user_id: uid, title: 'renew car insurance', due_at: y.toISOString(), done_at: null, position: 1 },
    { user_id: uid, title: 'take vitamins', due_at: null, done_at: new Date().toISOString(), position: 2 },
  ]) { const r = await fetch(`${URL_}/rest/v1/cards`, { method: 'POST', headers: H, body: JSON.stringify(row) }); if (!r.ok) console.log('seed failed', r.status, await r.text()); }
  const b = await chromium.launch({ channel: 'msedge' });
  const page = await b.newPage({ viewport: { width: 1280, height: 860 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4173/lantern/');
  await page.fill('input[type=email]', email); await page.fill('input[autocomplete=current-password]', password);
  await page.click('button.primary');
  await page.waitForSelector('.capture-box input');
  // new board from the sidebar
  await page.click('.side .add-btn'); await page.fill('.side .inline-add input', 'health'); await page.press('.side .inline-add input', 'Enter');
  await page.waitForSelector('.page-head h1:text("health")');
  await page.click('.side-nav a[href="#/today"]');
  const cap = '.capture-box input';
  await page.waitForSelector(cap);
  for (const t of ['gym today 7pm #health !', 'pay rent today', 'call mum 6:30pm', 'book dentist', 'dentist fri 3pm']) {
    await page.fill(cap, t);
    if (t.startsWith('gym')) await page.screenshot({ path: OUT + '/t-typing.png' });
    await page.press(cap, 'Enter'); await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT + '/t-desktop.png', fullPage: true });
  // tick "pay rent"
  await page.click('li.task:has-text("pay rent") .check'); await page.waitForTimeout(1000);
  const doneTxt = await page.textContent('.done-toggle');
  await page.click('.done-toggle'); await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/t-ticked.png', fullPage: true });
  // persisted? reload
  await page.reload(); await page.waitForSelector('.done-toggle');
  const afterReload = await page.textContent('.done-toggle');
  const groups = await page.$$eval('.group-title', els => els.map(e => e.textContent));
  const shown = await page.$$eval('li.task .task-title', e => e.map(x => x.textContent)); console.log('shown before reload:', shown.join(', '));
  console.log('done toggle:', doneTxt, '| after reload:', afterReload, '| groups:', groups.join(' / '));
  // board page shows the gym task
  await page.click('.side-nav a:has-text("health")'); await page.waitForSelector('li.task');
  console.log('board tasks:', (await page.$$eval('li.task .task-title', e => e.map(x => x.textContent))).join(', '));
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  m.on('pageerror', e => errors.push(e.message));
  await m.goto('http://localhost:4173/lantern/');
  await m.fill('input[type=email]', email); await m.fill('input[autocomplete=current-password]', password); await m.click('button.primary');
  await m.waitForSelector('.capture-box input'); await m.waitForTimeout(600);
  await m.screenshot({ path: OUT + '/t-mobile.png' });
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  console.log('mobile scrollWidth', sw);
  await b.close();
} finally {
  const d = await fetch(`${URL_}/auth/v1/admin/users/${uid}`, { method: 'DELETE', headers: H });
  console.log('test user deleted', d.status);
  console.log('errors:', errors.length ? errors : 'none');
}
