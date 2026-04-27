import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  email: string | null;
  onDone: () => void;
}

export function SetPasswordPage({ email, onDone }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: upErr } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (upErr) {
      setError(upErr.message);
      return;
    }
    onDone();
  };

  return (
    <div className="signin-shell">
      <div className="signin-background-text" aria-hidden>
        <span>Trial</span>
        <span>Me.</span>
      </div>

      <div className="signin-card">
        <div className="signin-brand">
          <img src="/trialme_logo.jpg" alt="TrialMe" className="sb-mark" style={{ width: 46, height: 46 }} />
          <div>
            <div className="signin-wordmark">Trial<em>Me</em></div>
            <div className="signin-sub">Welcome to the workspace</div>
          </div>
        </div>

        <div className="signin-divider" />

        <h2 className="signin-title">Set your password</h2>
        <p className="signin-copy">
          {email
            ? <>You're signed in as <strong>{email}</strong>. Choose a password so you can sign back in next time.</>
            : <>You're signed in. Choose a password so you can sign back in next time.</>}
        </p>

        <form onSubmit={handleSubmit} className="signin-form">
          <div className="field">
            <label>New password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoFocus
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          <div className="field">
            <label>Confirm password</label>
            <input
              type="password"
              className="input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat the password"
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          {error && <div className="signin-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !password || !confirm}
            style={{ height: 42, fontSize: 14, fontWeight: 600, marginTop: 4, width: '100%' }}
          >
            {loading ? 'Saving…' : 'Save password & continue'}
          </button>
        </form>

        <p className="signin-help">
          Your invite link is single-use. Set a password now so you can sign in any time.
        </p>
      </div>
    </div>
  );
}
