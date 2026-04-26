import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../lib/auth';

export function SignInPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    const err = await signIn(email, password);
    if (err) {
      setError(err.includes('Invalid login') ? 'Incorrect email or password.' : err);
      setLoading(false);
    }
    // On success the auth state change re-renders the app automatically
  };

  return (
    <div className="signin-shell">
      <div className="signin-background-text" aria-hidden>
        <span>Trial</span>
        <span>Me.</span>
      </div>

      <div className="signin-card">
        <div className="signin-brand">
          <div className="sb-mark" style={{ width: 46, height: 46, fontSize: 28, flexShrink: 0 }}>t</div>
          <div>
            <div className="signin-wordmark">
              Trial<em>Me</em>
            </div>
            <div className="signin-sub">Attribution Dashboard</div>
          </div>
        </div>

        <div className="signin-divider" />

        <h2 className="signin-title">
          Sign in to your account
        </h2>
        <p className="signin-copy">
          Invite-only access. Ask your team admin to send an email invite before signing in.
        </p>

        <form onSubmit={handleSubmit} className="signin-form">
          <div className="field">
            <label>Email address</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              required
              disabled={loading}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="signin-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !email || !password}
            style={{ height: 42, fontSize: 14, fontWeight: 600, marginTop: 4, width: '100%' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="signin-help">No invite yet? Contact an existing admin in Settings to request access.</p>
      </div>
    </div>
  );
}
