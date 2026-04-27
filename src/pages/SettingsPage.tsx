import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { Store } from '../App';
import { PageHead, Icons, Tag } from '../components/dashboard/shared';
import { TRACKING_SNIPPET } from '../lib/types';
import { useAuth } from '../lib/auth';
import type { AppRole, Profile } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface Props { store: Store; toast: (msg: string) => void; }

export function SettingsPage({ toast }: Props) {
  const [copied, setCopied] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tally-webhook`;

  function copySnippet() {
    navigator.clipboard.writeText(TRACKING_SNIPPET).then(() => {
      setCopied(true);
      toast('Tracking snippet copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setWebhookCopied(true);
      toast('Webhook URL copied');
      setTimeout(() => setWebhookCopied(false), 2000);
    });
  }

  return (
    <div className="dash-page">
      <PageHead
        title="Settings"
        italic="& integrations"
        sub="Configure tracking, manage team access, and connect external services."
      />

      <TeamSection toast={toast} />

      {/* Tracking Script */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div className="head-text">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.Code size={16} style={{ color: 'var(--burgundy)' }} />
              Squarespace tracking script
            </h3>
            <div className="sub">Paste into Settings → Advanced → Code Injection → Header on every trial page.</div>
          </div>
          <button className="btn btn-primary" onClick={copySnippet} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {copied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
            {copied ? 'Copied!' : 'Copy snippet'}
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <pre style={{
            margin: 0, padding: '16px 20px',
            background: '#1a1a2e', color: '#e2e8f0',
            fontSize: 11, lineHeight: 1.65,
            fontFamily: 'var(--mono)', overflowX: 'auto',
            borderRadius: '0 0 12px 12px',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{TRACKING_SNIPPET}</pre>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Tally Integration */}
        <div className="card">
          <div className="card-head">
            <div className="head-text">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.Plug size={16} style={{ color: 'var(--burgundy)' }} />
                Tally Forms
              </h3>
              <div className="sub">Webhook endpoint for form submission events.</div>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                flex: 1, fontFamily: 'var(--mono)', fontSize: 11,
                padding: '8px 10px', background: 'var(--cream-2)',
                border: '1px solid var(--line)', borderRadius: 7,
                color: 'var(--burgundy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {webhookUrl}
              </div>
              <button className="btn-icon" onClick={copyWebhook} title="Copy webhook URL">
                {webhookCopied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-mute)', lineHeight: 1.55 }}>
              In Tally → Integrations → Webhooks → Add webhook. Add a Hidden Field named{' '}
              <code style={{ fontFamily: 'var(--mono)', background: 'var(--pink-bg-2)', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>trialme_sid</code>{' '}
              to your form — the tracking script populates it automatically.
            </div>
          </div>
        </div>

        {/* Install guide */}
        <div className="card">
          <div className="card-head">
            <div className="head-text">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.Sparkle size={16} style={{ color: 'var(--burgundy)' }} />
                Squarespace install
              </h3>
              <div className="sub">Steps to activate the tracker.</div>
            </div>
          </div>
          <div className="card-body">
            <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Copy the tracking snippet above.',
                'In Squarespace: Settings → Advanced → Code Injection → Header.',
                'Paste and save — tracker is live on all pages immediately.',
                'Always use links from the Link Generator; the tracker reads its URL params.',
              ].map((s, i) => (
                <li key={i} style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="card">
        <div className="card-head">
          <div className="head-text">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.Lock size={16} style={{ color: 'var(--burgundy)' }} />
              Data & privacy
            </h3>
            <div className="sub">What is collected and how it is stored.</div>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Collected per visit</div>
              {[
                ['Session ID', 'Random UUID, client-side only'],
                ['Page URL', 'Full URL including attribution params'],
                ['Referrer', 'Previous page URL if available'],
                ['Attribution params', 'platform, paid, event, partner, campaign, content'],
                ['Timestamp', 'ISO 8601 UTC visit time'],
              ].map(([label, desc]) => (
                <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--burgundy)', background: 'var(--pink-bg-2)', padding: '1px 5px', borderRadius: 4, flexShrink: 0, lineHeight: 1.8 }}>{label}</code>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.7 }}>{desc}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Not collected</div>
              {['IP addresses', 'Cookies or persistent identifiers', 'Personal information', 'Device fingerprinting'].map(item => (
                <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <Icons.X size={12} style={{ color: 'var(--bad)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Team Section ────────────────────────────────────────────
function TeamSection({ toast }: { toast: (m: string) => void }) {
  const { user, profile, isAdmin, isHeadAdmin, refreshProfile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Profile | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadMembers = async () => {
    setLoadingMembers(true);
    const { data } = await (supabase.from('profiles') as any).select('*').order('created_at');
    setMembers((data as Profile[]) ?? []);
    setLoadingMembers(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const handleRemove = async (id: string) => {
    if (id === user?.id) { toast('You cannot remove yourself'); return; }
    setRemoving(true);
    const { error } = await (supabase.from('profiles') as any).delete().eq('id', id);
    setRemoving(false);
    if (error) {
      toast(/row-level security/i.test(error.message)
        ? 'Only the head admin can remove members.'
        : 'Remove failed: ' + error.message);
      return;
    }
    setRemoveTarget(null);
    toast('Member removed');
    loadMembers();
  };

  const handleRoleChange = async (id: string, newRole: AppRole) => {
    await (supabase.from('profiles') as any).update({ role: newRole }).eq('id', id);
    toast('Role updated');
    if (id === user?.id) await refreshProfile();
    loadMembers();
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-head">
        <div className="head-text">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.Users size={16} style={{ color: 'var(--burgundy)' }} />
            Team
          </h3>
          <div className="sub">Invite-only access. Only the head admin can add or remove members.</div>
        </div>
        {isHeadAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => setShowInvite(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icons.Plus size={14} />
            Invite member
          </button>
        )}
      </div>

      <div style={{ overflow: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Joined</th>
              {isHeadAdmin && <th style={{ width: 80 }}></th>}
            </tr>
          </thead>
          <tbody>
            {loadingMembers ? (
              <tr><td colSpan={isHeadAdmin ? 4 : 3} style={{ color: 'var(--ink-mute)', textAlign: 'center', padding: '24px 0' }}>Loading…</td></tr>
            ) : members.map(m => (
              <tr key={m.id} style={{ height: 44 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--pink-bg-2)', color: 'var(--burgundy)',
                      display: 'grid', placeItems: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {(m.full_name || m.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {m.full_name || m.email}
                        {m.id === user?.id && <span style={{ fontSize: 11, color: 'var(--ink-mute)', marginLeft: 6 }}>(you)</span>}
                        {profile?.id !== m.id && m.full_name && (
                          <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>{m.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  {isAdmin && m.id !== user?.id && (isHeadAdmin || m.role !== 'head_admin') ? (
                    <select
                      className="select"
                      style={{ width: 110, height: 28, fontSize: 12 }}
                      value={m.role}
                      onChange={e => handleRoleChange(m.id, e.target.value as AppRole)}
                    >
                      {isHeadAdmin && <option value="head_admin">Head Admin</option>}
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <Tag color={m.role === 'head_admin' ? 'amber' : m.role === 'admin' ? 'blue' : 'gray'}>
                      {m.role === 'head_admin' ? 'Head Admin' : m.role === 'admin' ? 'Admin' : 'Viewer'}
                    </Tag>
                  )}
                </td>
                <td style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                  {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                {isHeadAdmin && (
                  <td>
                    {m.id !== user?.id && (
                      <button
                        className="btn-icon"
                        onClick={() => setRemoveTarget(m)}
                        title="Remove member"
                        style={{ color: 'var(--bad)' }}
                      >
                        <Icons.X size={14} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onDone={() => { loadMembers(); setShowInvite(false); toast("Invite sent — they'll receive an email to set their password."); }}
          allowHeadAdmin={isHeadAdmin}
        />
      )}

      {removeTarget && (
        <ConfirmRemoveModal
          member={removeTarget}
          loading={removing}
          onClose={() => { if (!removing) setRemoveTarget(null); }}
          onConfirm={() => handleRemove(removeTarget.id)}
        />
      )}
    </div>
  );
}

// ── Confirm Remove Modal ────────────────────────────────────
function ConfirmRemoveModal({
  member,
  loading,
  onClose,
  onConfirm,
}: {
  member: Profile;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const displayName = member.full_name || member.email;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <div className="title">Remove member</div>
          <div className="sub">This action cannot be undone.</div>
        </div>
        <div style={{ padding: '18px 20px', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
          Are you sure you want to remove <strong style={{ color: 'var(--ink)' }}>{displayName}</strong>?
          {member.full_name && (
            <div style={{ fontSize: 12, color: 'var(--ink-mute)', fontFamily: 'var(--mono)', marginTop: 4 }}>{member.email}</div>
          )}
          <div style={{ marginTop: 10 }}>They will lose access to the workspace immediately.</div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={loading}
            style={{ background: 'var(--bad)', borderColor: 'var(--bad)' }}
          >
            {loading ? 'Removing…' : 'Remove member'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invite Modal ────────────────────────────────────────────
function InviteModal({
  onClose,
  onDone,
  allowHeadAdmin,
}: {
  onClose: () => void;
  onDone: () => void;
  allowHeadAdmin: boolean;
}) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    // Land the invitee back on this exact origin (prod, preview, or local dev)
    // with ?invite=1 so the app knows to prompt them to set a password.
    const redirectTo = `${window.location.origin}/?invite=1`;

    const { data, error: fnError } = await supabase.functions.invoke('invite-user', {
      body: { email, role, full_name: fullName || null, redirectTo },
    });

    if (fnError || data?.error) {
      setError(data?.error ?? fnError?.message ?? 'Failed to send invite');
      setLoading(false);
    } else {
      onDone();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="title">Invite team member</div>
          <div className="sub">They'll receive an email to set their password and can then log in.</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Email address <span style={{ color: 'var(--bad)' }}>*</span></label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="field">
              <label>Full name <span style={{ color: 'var(--ink-mute)' }}>(optional)</span></label>
              <input
                type="text"
                className="input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Smith"
                disabled={loading}
              />
            </div>

            <div className="field">
              <label>Role</label>
              <select
                className="select"
                value={role}
                onChange={e => setRole(e.target.value as AppRole)}
                disabled={loading}
              >
                {allowHeadAdmin && <option value="head_admin">Head Admin — full ownership of security and workspace roles</option>}
                <option value="viewer">Viewer — read-only analytics access</option>
                <option value="admin">Admin — full access including configuration</option>
              </select>
              <span className="hint">
                {role === 'head_admin'
                  ? 'Head admins can manage all security, role assignment, configuration, and workspace administration.'
                  : role === 'admin'
                  ? 'Admins can configure trials, generate links, invite others, and view all data.'
                  : 'Viewers can see all analytics dashboards but cannot change data or configuration.'}
              </span>
            </div>

            {error && (
              <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                {error}
              </div>
            )}
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !email}>
              {loading ? 'Sending invite…' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
