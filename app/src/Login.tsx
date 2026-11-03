import { useState, type FormEvent } from 'react';
import { Lockup } from './Lockup';
import { sb } from './supabase';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'still up' : h < 12 ? 'good morning' : h < 18 ? 'good afternoon' : 'good evening';
}
function today() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase();
}

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg('that email and password do not match.');
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <aside className="auth-art" aria-hidden="true">
        <div className="glow" />
        <svg className="art-mark" viewBox="14 12 72 76">
          <g transform="translate(0 4)">
            <rect fill="var(--lantern-caps)" x="47" y="12" width="6" height="12" rx="3" />
            <rect fill="var(--lantern-caps)" x="34" y="20" width="32" height="12" rx="6" />
            <rect fill="var(--lantern-body)" x="18" y="36" width="64" height="28" rx="14" />
            <rect fill="var(--lantern-caps)" x="34" y="68" width="32" height="12" rx="6" />
          </g>
        </svg>
        <p className="art-line">{greeting()}.</p>
        <p className="art-date">{today()}</p>
      </aside>
      <section className="auth-form">
        <form onSubmit={submit}>
          <Lockup size={34} />
          <h1>welcome back</h1>
          <p className="sub">sign in to pick up where you left off.</p>
          <label>
            <span>email</span>
            <input type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>
            <span>password</span>
            <div className="pw">
              <input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" className="eye" onClick={() => setShow(v => !v)} aria-label={show ? 'hide password' : 'show password'}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                  {show && <path d="M3 3l18 18" />}
                </svg>
              </button>
            </div>
          </label>
          {msg && (
            <p className="err" role="alert">
              {msg}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? 'signing in...' : 'sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
