import { useState } from 'react';
import type { Store } from '../App';
import { PageHead, Switch, Tag, Icons } from '../components/dashboard/shared';
import { supabase } from '../lib/supabase';
import type { Trial, Event, ContentVariant, Campaign } from '../lib/types';
import { PLATFORMS } from '../lib/types';
import { fmt } from '../lib/data';

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
          const count = t.id === 'trials' ? store.trials.length
            : t.id === 'events' ? store.events.length
            : t.id === 'variants' ? store.contentVariants.length
            : t.id === 'campaigns' ? store.campaigns.length
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
          {store.trials.map(t => (
            <tr key={t.id}>
              <td style={{ fontWeight: 500 }}>{t.name}</td>
              <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--burgundy)' }}>/{t.slug}</span></td>
              <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{t.tally_form_id ?? '—'}</span></td>
              <td>{t.is_active ? <Tag color="green"><span className="swatch" />Active</Tag> : <Tag color="gray">Inactive</Tag>}</td>
              <td className="right">
                <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                  <Switch on={t.is_active} onChange={() => toggle(t.id, t.is_active)} />
                  <button className="btn-icon" onClick={() => setDraft(t)}><Icons.Edit size={15} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Events ──────────────────────────────────────────────────
function EventsConfig({ store, toast, reload }: { store: Store; toast: (m: string) => void; reload: () => Promise<void> }) {
  type Draft = Partial<Event> & { name: string; partner: string };
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

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

  const remove = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    await reload();
    toast('Event removed');
  };

  const activeTrials = store.trials.filter(t => t.is_active);

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
          {store.events.map(e => {
            const trial = store.trials.find(t => t.id === e.trial_id);
            return (
              <tr key={e.id}>
                <td style={{ fontWeight: 500 }}>{e.name}</td>
                <td style={{ color: 'var(--ink-soft)' }}>{e.partner}</td>
                <td>{trial?.name ?? '—'}</td>
                <td className="right" style={{ fontFamily: 'var(--mono)' }}>{fmt(e.cost ?? 0, 'gbp')}</td>
                <td className="right">
                  <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn-icon" onClick={() => setDraft(e)}><Icons.Edit size={15} /></button>
                    <button className="btn-icon" onClick={() => remove(e.id)}><Icons.X size={15} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Content Variants ─────────────────────────────────────────
function VariantsConfig({ store, toast, reload }: { store: Store; toast: (m: string) => void; reload: () => Promise<void> }) {
  type Draft = Partial<ContentVariant> & { name: string };
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

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

  const remove = async (id: string) => {
    await supabase.from('content_variants').delete().eq('id', id);
    await reload();
  };

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
          {store.contentVariants.map(c => (
            <tr key={c.id}>
              <td style={{ fontWeight: 500 }}>{c.name}</td>
              <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--burgundy)' }}>{c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}</span></td>
              <td className="right">
                <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn-icon" onClick={() => setDraft(c)}><Icons.Edit size={15} /></button>
                  <button className="btn-icon" onClick={() => remove(c.id)}><Icons.X size={15} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Campaigns ────────────────────────────────────────────────
function CampaignsConfig({ store, toast, reload }: { store: Store; toast: (m: string) => void; reload: () => Promise<void> }) {
  type Draft = Partial<Campaign> & { name: string };
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

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

  const remove = async (id: string) => {
    await supabase.from('campaigns').delete().eq('id', id);
    await reload();
  };

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
          {store.campaigns.map(c => (
            <tr key={c.id}>
              <td style={{ fontWeight: 500 }}>{c.name}</td>
              <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--burgundy)' }}>{c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}</span></td>
              <td className="right">
                <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn-icon" onClick={() => setDraft(c)}><Icons.Edit size={15} /></button>
                  <button className="btn-icon" onClick={() => remove(c.id)}><Icons.X size={15} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
