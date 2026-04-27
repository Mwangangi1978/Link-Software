import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Store } from '../App';
import { PageHead, Switch, Tag, Icons } from '../components/dashboard/shared';
import { supabase } from '../lib/supabase';
import type { Trial, Event, ContentVariant, Campaign } from '../lib/types';
import { PLATFORMS } from '../lib/types';
import { fmt } from '../lib/data';

// ── Shared confirm modal (archive or hard-delete) ────────────
function ConfirmActionModal({
  title,
  message,
  loading,
  onClose,
  onConfirm,
  mode,
}: {
  title: string;
  message: ReactNode;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode: 'archive' | 'delete';
}) {
  return (
    <div className="modal-overlay" onClick={() => { if (!loading) onClose(); }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <div className="title">{title}</div>
          <div className="sub">
            {mode === 'archive'
              ? 'The item will be archived and can be restored at any time.'
              : 'This action cannot be undone.'}
          </div>
        </div>
        <div style={{ padding: '18px 20px', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
          {message}
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
            {loading
              ? (mode === 'archive' ? 'Archiving…' : 'Deleting…')
              : (mode === 'archive' ? 'Archive' : 'Delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Maps a Postgres/Supabase delete error into a user-friendly toast string.
function deleteErrorMessage(err: { message: string }, fallback: string): string {
  if (/row-level security/i.test(err.message)) return 'Delete blocked: only admins can delete here.';
  if (/foreign key|violates/i.test(err.message)) return fallback + ' is still referenced elsewhere.';
  return 'Delete failed: ' + err.message;
}

// Inline badge for archived rows
function ArchivedBadge() {
  return (
    <span className="tag gray" style={{ marginLeft: 6, fontSize: 11, verticalAlign: 'middle' }}>
      Archived
    </span>
  );
}

interface Props {
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store>>;
  toast: (m: string) => void;
  reload: () => Promise<void>;
}

const TABS = [
  { id: 'trials',    label: 'Trials',              icon: 'Microscope' as const, locked: false },
  { id: 'events',    label: 'Events',              icon: 'Building' as const,   locked: false },
  { id: 'variants',  label: 'Content variations',  icon: 'Sparkle' as const,    locked: false },
  { id: 'campaigns', label: 'Campaigns',           icon: 'Megaphone' as const,  locked: false },
  { id: 'platforms', label: 'Platforms',           icon: 'Layers' as const,     locked: true },
];

export function ConfigPage({ store, toast, reload }: Props) {
  const [tab, setTab] = useState('trials');

  return (
    <div className="dash-page">
      <PageHead
        title="Configuration"
        italic="& taxonomy"
        sub="Every dropdown in the link generator is fed from here. Add managed values once, then never type a name again — spelling errors can't contaminate attribution data."
      />

      <div className="cfg-tabs">
        {TABS.map(t => {
          const Ic = Icons[t.icon];
          const count = t.id === 'trials'    ? store.trials.filter(x => !x.archived_at).length
            : t.id === 'events'    ? store.events.filter(x => !x.archived_at).length
            : t.id === 'variants'  ? store.contentVariants.filter(x => !x.archived_at).length
            : t.id === 'campaigns' ? store.campaigns.filter(x => !x.archived_at).length
            : PLATFORMS.length;
          return (
            <button key={t.id} className={'cfg-tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
              <Ic size={14} />
              <span>{t.label}</span>
              <span className="cfg-count">{count}</span>
              {t.locked && <Icons.Lock size={11} style={{ opacity: 0.5 }} />}
            </button>
          );
        })}
      </div>

      {tab === 'trials'    && <TrialsConfig    store={store} toast={toast} reload={reload} />}
      {tab === 'events'    && <EventsConfig    store={store} toast={toast} reload={reload} />}
      {tab === 'variants'  && <VariantsConfig  store={store} toast={toast} reload={reload} />}
      {tab === 'campaigns' && <CampaignsConfig store={store} toast={toast} reload={reload} />}
      {tab === 'platforms' && <PlatformsConfig />}
    </div>
  );
}

// ── Trials ──────────────────────────────────────────────────
function TrialsConfig({ store, toast, reload }: { store: Store; toast: (m: string) => void; reload: () => Promise<void> }) {
  type Draft = Partial<Trial> & { name: string; slug: string };
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ item: Trial; mode: 'archive' | 'delete' } | null>(null);
  const [acting, setActing] = useState(false);

  const save = async () => {
    if (!draft?.name) return;
    setSaving(true);
    if (draft.id) {
      await (supabase.from('trials') as any).update({ name: draft.name, slug: draft.slug, tally_form_id: draft.tally_form_id ?? null, is_active: draft.is_active ?? true, updated_at: new Date().toISOString() }).eq('id', draft.id);
    } else {
      await (supabase.from('trials') as any).insert({ name: draft.name, slug: draft.slug, tally_form_id: draft.tally_form_id ?? null, is_active: draft.is_active ?? true });
    }
    await reload();
    setDraft(null);
    setSaving(false);
    toast('Trial saved');
  };

  const toggle = async (id: string, current: boolean) => {
    await (supabase.from('trials') as any).update({ is_active: !current, updated_at: new Date().toISOString() }).eq('id', id);
    await reload();
  };

  const initAction = async (item: Trial) => {
    setChecking(item.id);
    const [{ count: sc }, { count: lc }] = await Promise.all([
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('trial_id', item.id),
      supabase.from('tracked_links').select('*', { count: 'exact', head: true }).eq('trial_id', item.id),
    ]);
    setChecking(null);
    setPendingAction({ item, mode: (sc ?? 0) + (lc ?? 0) > 0 ? 'archive' : 'delete' });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActing(true);
    const { mode, item } = pendingAction;
    const { error } = mode === 'archive'
      ? await (supabase.from('trials') as any).update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', item.id)
      : await (supabase.from('trials') as any).delete().eq('id', item.id);
    setActing(false);
    if (error) {
      toast(mode === 'archive' ? 'Archive failed: ' + error.message : deleteErrorMessage(error, 'Trial'));
      return;
    }
    setPendingAction(null);
    await reload();
    toast(mode === 'archive' ? 'Trial archived' : 'Trial deleted');
  };

  const restore = async (id: string) => {
    await (supabase.from('trials') as any).update({ archived_at: null, updated_at: new Date().toISOString() }).eq('id', id);
    await reload();
    toast('Trial restored');
  };

  const sorted = [...store.trials].sort((a, b) => (a.archived_at ? 1 : 0) - (b.archived_at ? 1 : 0));

  return (
    <div className="card">
      <div className="card-head">
        <div className="head-text">
          <h3>Trials</h3>
          <div className="sub">Each trial gets a URL slug + Tally form ID. Inactive trials are hidden from the link generator.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setDraft({ name: '', slug: '', tally_form_id: '', is_active: true })}>
          <Icons.Plus size={14} /> Add trial
        </button>
      </div>

      {draft && (
        <div className="inline-add" style={{ gridTemplateColumns: '1.4fr 1fr 1fr auto auto' }}>
          <div className="field">
            <label>Trial name</label>
            <input className="input" autoFocus value={draft.name}
              onChange={e => setDraft(d => ({ ...d!, name: e.target.value }))}
              placeholder="ADHD Trial" />
          </div>
          <div className="field">
            <label>URL slug</label>
            <input className="input" value={draft.slug ?? ''}
              onChange={e => setDraft(d => ({ ...d!, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
              placeholder="adhd-trial" />
          </div>
          <div className="field">
            <label>Tally form ID</label>
            <input className="input" value={draft.tally_form_id ?? ''}
              onChange={e => setDraft(d => ({ ...d!, tally_form_id: e.target.value }))}
              placeholder="wQz4Pm" />
          </div>
          <div className="row gap-10" style={{ height: 38, alignItems: 'center' }}>
            <Switch on={draft.is_active ?? true} onChange={on => setDraft(d => ({ ...d!, is_active: on }))} />
            <span style={{ fontSize: 12 }}>Active</span>
          </div>
          <div className="row gap-8">
            <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>Save</button>
          </div>
        </div>
      )}

      <table className="table">
        <thead><tr><th>Name</th><th>Slug</th><th>Tally form</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {sorted.map(t => (
            <tr key={t.id} style={t.archived_at ? { opacity: 0.6 } : undefined}>
              <td style={{ fontWeight: 500 }}>
                {t.name}
                {t.archived_at && <ArchivedBadge />}
              </td>
              <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--burgundy)' }}>/{t.slug}</span></td>
              <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{t.tally_form_id ?? '—'}</span></td>
              <td>
                {t.archived_at
                  ? <Tag color="gray">Archived</Tag>
                  : t.is_active
                    ? <Tag color="green"><span className="swatch" />Active</Tag>
                    : <Tag color="gray">Inactive</Tag>}
              </td>
              <td className="right">
                {t.archived_at ? (
                  <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => restore(t.id)}>Restore</button>
                  </div>
                ) : (
                  <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                    <Switch on={t.is_active} onChange={() => toggle(t.id, t.is_active)} />
                    <button className="btn-icon" title="Edit" onClick={() => setDraft(t)}><Icons.Edit size={15} /></button>
                    <button
                      className="btn-icon"
                      title="Delete"
                      disabled={checking === t.id}
                      onClick={() => initAction(t)}
                      style={{ color: 'var(--bad)' }}
                    >
                      {checking === t.id ? '…' : <Icons.X size={15} />}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pendingAction && (
        <ConfirmActionModal
          mode={pendingAction.mode}
          title={pendingAction.mode === 'archive' ? 'Archive trial' : 'Delete trial'}
          message={pendingAction.mode === 'archive'
            ? <>Archive <strong style={{ color: 'var(--ink)' }}>{pendingAction.item.name}</strong>? Sessions and tracked links using this trial will remain visible and tagged as <strong style={{ color: 'var(--ink)' }}>Archived from {pendingAction.item.name}</strong>. You can restore it at any time.</>
            : <>Delete <strong style={{ color: 'var(--ink)' }}>{pendingAction.item.name}</strong>? This trial has no associated data.</>}
          loading={acting}
          onClose={() => setPendingAction(null)}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}

// ── Events ──────────────────────────────────────────────────
function EventsConfig({ store, toast, reload }: { store: Store; toast: (m: string) => void; reload: () => Promise<void> }) {
  type Draft = Partial<Event> & { name: string; partner: string };
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ item: Event; mode: 'archive' | 'delete' } | null>(null);
  const [acting, setActing] = useState(false);

  const save = async () => {
    if (!draft?.name || !draft.partner || !draft.trial_id) return;
    setSaving(true);
    if (draft.id) {
      await (supabase.from('events') as any).update({ name: draft.name, partner: draft.partner, trial_id: draft.trial_id, cost: draft.cost ?? 0, updated_at: new Date().toISOString() }).eq('id', draft.id);
    } else {
      await (supabase.from('events') as any).insert({ name: draft.name, partner: draft.partner, trial_id: draft.trial_id, cost: draft.cost ?? 0 });
    }
    await reload();
    setDraft(null);
    setSaving(false);
    toast('Event saved');
  };

  const initAction = async (item: Event) => {
    setChecking(item.id);
    const [{ count: sc }, { count: lc }] = await Promise.all([
      supabase.from('sessions').select('*', { count: 'exact', head: true })
        .eq('event_name', item.name).eq('partner', item.partner),
      supabase.from('tracked_links').select('*', { count: 'exact', head: true }).eq('event_id', item.id),
    ]);
    setChecking(null);
    setPendingAction({ item, mode: (sc ?? 0) + (lc ?? 0) > 0 ? 'archive' : 'delete' });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActing(true);
    const { mode, item } = pendingAction;
    const { error } = mode === 'archive'
      ? await (supabase.from('events') as any).update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', item.id)
      : await supabase.from('events').delete().eq('id', item.id);
    setActing(false);
    if (error) {
      toast(mode === 'archive' ? 'Archive failed: ' + error.message : deleteErrorMessage(error, 'Event'));
      return;
    }
    setPendingAction(null);
    await reload();
    toast(mode === 'archive' ? 'Event archived' : 'Event deleted');
  };

  const restore = async (id: string) => {
    await (supabase.from('events') as any).update({ archived_at: null, updated_at: new Date().toISOString() }).eq('id', id);
    await reload();
    toast('Event restored');
  };

  const activeTrials = store.trials.filter(t => t.is_active && !t.archived_at);
  const sorted = [...store.events].sort((a, b) => (a.archived_at ? 1 : 0) - (b.archived_at ? 1 : 0));

  return (
    <div className="card">
      <div className="card-head">
        <div className="head-text">
          <h3>Events</h3>
          <div className="sub">Conferences, summits, partner activations. Each event is tied to one trial; cost is what you paid the partner.</div>
        </div>
        <button className="btn btn-primary btn-sm"
          onClick={() => setDraft({ name: '', partner: '', trial_id: activeTrials[0]?.id ?? '', cost: 0 })}>
          <Icons.Plus size={14} /> Add event
        </button>
      </div>

      {draft && (
        <div className="inline-add" style={{ gridTemplateColumns: '2fr 1.4fr 1.2fr 1fr auto' }}>
          <div className="field">
            <label>Event name</label>
            <input className="input" autoFocus value={draft.name}
              onChange={e => setDraft(d => ({ ...d!, name: e.target.value }))}
              placeholder="Lund University Depression Outreach" />
          </div>
          <div className="field">
            <label>Partner / institution</label>
            <input className="input" value={draft.partner ?? ''}
              onChange={e => setDraft(d => ({ ...d!, partner: e.target.value }))}
              placeholder="Lund University" />
          </div>
          <div className="field">
            <label>Trial</label>
            <select className="select" value={draft.trial_id ?? ''}
              onChange={e => setDraft(d => ({ ...d!, trial_id: e.target.value }))}>
              {activeTrials.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Cost (£)</label>
            <input className="input" type="number" value={draft.cost ?? 0}
              onChange={e => setDraft(d => ({ ...d!, cost: +e.target.value || 0 }))} />
          </div>
          <div className="row gap-8">
            <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>Save</button>
          </div>
        </div>
      )}

      <table className="table">
        <thead><tr><th>Name</th><th>Partner</th><th>Trial</th><th className="right">Cost</th><th></th></tr></thead>
        <tbody>
          {sorted.map(e => {
            const trial = store.trials.find(t => t.id === e.trial_id);
            return (
              <tr key={e.id} style={e.archived_at ? { opacity: 0.6 } : undefined}>
                <td style={{ fontWeight: 500 }}>
                  {e.name}
                  {e.archived_at && <ArchivedBadge />}
                </td>
                <td style={{ color: 'var(--ink-soft)' }}>{e.partner}</td>
                <td>{trial?.name ?? '—'}</td>
                <td className="right" style={{ fontFamily: 'var(--mono)' }}>{fmt(e.cost ?? 0, 'gbp')}</td>
                <td className="right">
                  {e.archived_at ? (
                    <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => restore(e.id)}>Restore</button>
                    </div>
                  ) : (
                    <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn-icon" title="Edit" onClick={() => setDraft(e)}><Icons.Edit size={15} /></button>
                      <button
                        className="btn-icon"
                        title="Delete"
                        disabled={checking === e.id}
                        onClick={() => initAction(e)}
                        style={{ color: 'var(--bad)' }}
                      >
                        {checking === e.id ? '…' : <Icons.X size={15} />}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pendingAction && (
        <ConfirmActionModal
          mode={pendingAction.mode}
          title={pendingAction.mode === 'archive' ? 'Archive event' : 'Delete event'}
          message={pendingAction.mode === 'archive'
            ? <>Archive <strong style={{ color: 'var(--ink)' }}>{pendingAction.item.name}</strong> ({pendingAction.item.partner})? Sessions and tracked links using this event will remain visible and tagged as <strong style={{ color: 'var(--ink)' }}>Archived from {pendingAction.item.name}</strong>. You can restore it at any time.</>
            : <>Delete <strong style={{ color: 'var(--ink)' }}>{pendingAction.item.name}</strong> ({pendingAction.item.partner})? This event has no associated data.</>}
          loading={acting}
          onClose={() => setPendingAction(null)}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}

// ── Content Variants ─────────────────────────────────────────
function VariantsConfig({ store, toast, reload }: { store: Store; toast: (m: string) => void; reload: () => Promise<void> }) {
  type Draft = Partial<ContentVariant> & { name: string };
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ item: ContentVariant; mode: 'archive' | 'delete' } | null>(null);
  const [acting, setActing] = useState(false);

  const save = async () => {
    if (!draft?.name) return;
    setSaving(true);
    if (draft.id) {
      await (supabase.from('content_variants') as any).update({ name: draft.name }).eq('id', draft.id);
    } else {
      await (supabase.from('content_variants') as any).insert({ name: draft.name });
    }
    await reload();
    setDraft(null);
    setSaving(false);
    toast('Variation saved');
  };

  const initAction = async (item: ContentVariant) => {
    setChecking(item.id);
    const [{ count: sc }, { count: lc }] = await Promise.all([
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('content', item.name),
      supabase.from('tracked_links').select('*', { count: 'exact', head: true }).eq('content_variant_id', item.id),
    ]);
    setChecking(null);
    setPendingAction({ item, mode: (sc ?? 0) + (lc ?? 0) > 0 ? 'archive' : 'delete' });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActing(true);
    const { mode, item } = pendingAction;
    const { error } = mode === 'archive'
      ? await (supabase.from('content_variants') as any).update({ archived_at: new Date().toISOString() }).eq('id', item.id)
      : await supabase.from('content_variants').delete().eq('id', item.id);
    setActing(false);
    if (error) {
      toast(mode === 'archive' ? 'Archive failed: ' + error.message : deleteErrorMessage(error, 'Variation'));
      return;
    }
    setPendingAction(null);
    await reload();
    toast(mode === 'archive' ? 'Variation archived' : 'Variation deleted');
  };

  const restore = async (id: string) => {
    await (supabase.from('content_variants') as any).update({ archived_at: null }).eq('id', id);
    await reload();
    toast('Variation restored');
  };

  const sorted = [...store.contentVariants].sort((a, b) => (a.archived_at ? 1 : 0) - (b.archived_at ? 1 : 0));

  return (
    <div className="card">
      <div className="card-head">
        <div className="head-text">
          <h3>Content variations</h3>
          <div className="sub">A/B labels for the type of post. Selecting one stamps the URL with a normalised slug.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setDraft({ name: '' })}>
          <Icons.Plus size={14} /> Add variation
        </button>
      </div>

      {draft && (
        <div className="inline-add" style={{ gridTemplateColumns: '1fr auto' }}>
          <div className="field">
            <label>Variation name</label>
            <input className="input" autoFocus value={draft.name}
              onChange={e => setDraft(d => ({ ...d!, name: e.target.value }))}
              placeholder="Educational post" />
          </div>
          <div className="row gap-8">
            <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>Save</button>
          </div>
        </div>
      )}

      <table className="table">
        <thead><tr><th>Variation</th><th>URL slug</th><th></th></tr></thead>
        <tbody>
          {sorted.map(c => (
            <tr key={c.id} style={c.archived_at ? { opacity: 0.6 } : undefined}>
              <td style={{ fontWeight: 500 }}>
                {c.name}
                {c.archived_at && <ArchivedBadge />}
              </td>
              <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--burgundy)' }}>{c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}</span></td>
              <td className="right">
                {c.archived_at ? (
                  <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => restore(c.id)}>Restore</button>
                  </div>
                ) : (
                  <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn-icon" title="Edit" onClick={() => setDraft(c)}><Icons.Edit size={15} /></button>
                    <button
                      className="btn-icon"
                      title="Delete"
                      disabled={checking === c.id}
                      onClick={() => initAction(c)}
                      style={{ color: 'var(--bad)' }}
                    >
                      {checking === c.id ? '…' : <Icons.X size={15} />}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pendingAction && (
        <ConfirmActionModal
          mode={pendingAction.mode}
          title={pendingAction.mode === 'archive' ? 'Archive content variation' : 'Delete content variation'}
          message={pendingAction.mode === 'archive'
            ? <>Archive <strong style={{ color: 'var(--ink)' }}>{pendingAction.item.name}</strong>? Sessions and tracked links using this variation will remain visible and tagged as <strong style={{ color: 'var(--ink)' }}>Archived from {pendingAction.item.name}</strong>. You can restore it at any time.</>
            : <>Delete <strong style={{ color: 'var(--ink)' }}>{pendingAction.item.name}</strong>? This variation has no associated data.</>}
          loading={acting}
          onClose={() => setPendingAction(null)}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}

// ── Campaigns ────────────────────────────────────────────────
function CampaignsConfig({ store, toast, reload }: { store: Store; toast: (m: string) => void; reload: () => Promise<void> }) {
  type Draft = Partial<Campaign> & { name: string };
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ item: Campaign; mode: 'archive' | 'delete' } | null>(null);
  const [acting, setActing] = useState(false);

  const save = async () => {
    if (!draft?.name) return;
    setSaving(true);
    if (draft.id) {
      await (supabase.from('campaigns') as any).update({ name: draft.name }).eq('id', draft.id);
    } else {
      await (supabase.from('campaigns') as any).insert({ name: draft.name });
    }
    await reload();
    setDraft(null);
    setSaving(false);
    toast('Campaign saved');
  };

  const initAction = async (item: Campaign) => {
    setChecking(item.id);
    const [{ count: sc }, { count: lc }] = await Promise.all([
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('campaign', item.name),
      supabase.from('tracked_links').select('*', { count: 'exact', head: true }).eq('campaign_id', item.id),
    ]);
    setChecking(null);
    setPendingAction({ item, mode: (sc ?? 0) + (lc ?? 0) > 0 ? 'archive' : 'delete' });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActing(true);
    const { mode, item } = pendingAction;
    const { error } = mode === 'archive'
      ? await (supabase.from('campaigns') as any).update({ archived_at: new Date().toISOString() }).eq('id', item.id)
      : await supabase.from('campaigns').delete().eq('id', item.id);
    setActing(false);
    if (error) {
      toast(mode === 'archive' ? 'Archive failed: ' + error.message : deleteErrorMessage(error, 'Campaign'));
      return;
    }
    setPendingAction(null);
    await reload();
    toast(mode === 'archive' ? 'Campaign archived' : 'Campaign deleted');
  };

  const restore = async (id: string) => {
    await (supabase.from('campaigns') as any).update({ archived_at: null }).eq('id', id);
    await reload();
    toast('Campaign restored');
  };

  const sorted = [...store.campaigns].sort((a, b) => (a.archived_at ? 1 : 0) - (b.archived_at ? 1 : 0));

  return (
    <div className="card">
      <div className="card-head">
        <div className="head-text">
          <h3>Campaigns</h3>
          <div className="sub">Cross-link grouping label. Use to roll up multiple posts &amp; channels into one initiative.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setDraft({ name: '' })}>
          <Icons.Plus size={14} /> Add campaign
        </button>
      </div>

      {draft && (
        <div className="inline-add" style={{ gridTemplateColumns: '1fr auto' }}>
          <div className="field">
            <label>Campaign name</label>
            <input className="input" autoFocus value={draft.name}
              onChange={e => setDraft(d => ({ ...d!, name: e.target.value }))}
              placeholder="Q2 ADHD push" />
          </div>
          <div className="row gap-8">
            <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>Save</button>
          </div>
        </div>
      )}

      <table className="table">
        <thead><tr><th>Campaign</th><th>URL slug</th><th></th></tr></thead>
        <tbody>
          {sorted.map(c => (
            <tr key={c.id} style={c.archived_at ? { opacity: 0.6 } : undefined}>
              <td style={{ fontWeight: 500 }}>
                {c.name}
                {c.archived_at && <ArchivedBadge />}
              </td>
              <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--burgundy)' }}>{c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}</span></td>
              <td className="right">
                {c.archived_at ? (
                  <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => restore(c.id)}>Restore</button>
                  </div>
                ) : (
                  <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn-icon" title="Edit" onClick={() => setDraft(c)}><Icons.Edit size={15} /></button>
                    <button
                      className="btn-icon"
                      title="Delete"
                      disabled={checking === c.id}
                      onClick={() => initAction(c)}
                      style={{ color: 'var(--bad)' }}
                    >
                      {checking === c.id ? '…' : <Icons.X size={15} />}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pendingAction && (
        <ConfirmActionModal
          mode={pendingAction.mode}
          title={pendingAction.mode === 'archive' ? 'Archive campaign' : 'Delete campaign'}
          message={pendingAction.mode === 'archive'
            ? <>Archive <strong style={{ color: 'var(--ink)' }}>{pendingAction.item.name}</strong>? Sessions and tracked links using this campaign will remain visible and tagged as <strong style={{ color: 'var(--ink)' }}>Archived from {pendingAction.item.name}</strong>. You can restore it at any time.</>
            : <>Delete <strong style={{ color: 'var(--ink)' }}>{pendingAction.item.name}</strong>? This campaign has no associated data.</>}
          loading={acting}
          onClose={() => setPendingAction(null)}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}

// ── Platforms (read-only enum) ───────────────────────────────
function PlatformsConfig() {
  return (
    <div className="card">
      <div className="card-head">
        <div className="head-text">
          <h3>Platforms <span style={{ fontWeight: 400, color: 'var(--ink-mute)', fontSize: 12, marginLeft: 8 }}><Icons.Lock size={11} /> System enum</span></h3>
          <div className="sub">Locked taxonomy — paid status is set per-link in the generator, not per-platform.</div>
        </div>
      </div>
      <table className="table">
        <thead><tr><th>Platform</th><th>URL key</th><th>Type</th></tr></thead>
        <tbody>
          {PLATFORMS.map(p => (
            <tr key={p.id}>
              <td>
                <div className="row gap-10">
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: p.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600 }}>
                    {p.name[0]}
                  </span>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                </div>
              </td>
              <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--burgundy)' }}>{p.id}</span></td>
              <td><Tag color="gray">{p.type}</Tag></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
