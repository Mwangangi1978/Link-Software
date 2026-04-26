import { useMemo, useState } from 'react';
import type { Store } from '../App';
import { PageHead, Tag, FakeQR, Switch, Icons } from '../components/dashboard/shared';
import { supabase } from '../lib/supabase';
import { slug, fmt } from '../lib/data';
import { PLATFORMS } from '../lib/types';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store>>;
  toast: (m: string) => void;
  reload: () => Promise<void>;
}

export function GeneratorPage({ store, toast, reload }: Props) {
  const activeTrials = store.trials.filter(t => t.is_active);

  const [linkType, setLinkType] = useState<'platform' | 'event'>('platform');
  const [pf, setPf] = useState({
    platformId: 'instagram',
    isPaid: false,
    amountSpent: '',
    trialId: activeTrials[0]?.id ?? '',
    campaignId: '',
    contentId: '',
  });
  const [ef, setEf] = useState({ eventId: store.events[0]?.id ?? '' });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const generatedUrl = useMemo(() => {
    if (linkType === 'platform') {
      const t = store.trials.find(x => x.id === pf.trialId);
      if (!t) return '';
      const u = new URL('https://trialme.eu/' + t.slug);
      u.searchParams.set('platform', pf.platformId);
      u.searchParams.set('paid', pf.isPaid ? 'true' : 'false');
      const camp = store.campaigns.find(c => c.id === pf.campaignId);
      const cont = store.contentVariants.find(c => c.id === pf.contentId);
      if (camp) u.searchParams.set('campaign', slug(camp.name));
      if (cont) u.searchParams.set('content', slug(cont.name));
      return u.toString();
    }
    const ev = store.events.find(x => x.id === ef.eventId);
    if (!ev) return '';
    const t = store.trials.find(x => x.id === ev.trial_id);
    if (!t) return '';
    const u = new URL('https://trialme.eu/' + t.slug);
    u.searchParams.set('event', slug(ev.name));
    u.searchParams.set('partner', slug(ev.partner));
    return u.toString();
  }, [linkType, pf, ef, store]);

  const onCopy = async () => {
    try { await navigator.clipboard.writeText(generatedUrl); } catch {}
    setCopied(true);
    toast('URL copied');
    setTimeout(() => setCopied(false), 1600);
  };

  const onSave = async () => {
    if (!generatedUrl) { toast('Complete the form first'); return; }
    setSaving(true);

    const ev = linkType === 'event' ? store.events.find(x => x.id === ef.eventId) : null;

    const row = {
      link_type: linkType,
      destination_url: generatedUrl.split('?')[0],
      full_tracked_url: generatedUrl,
      platform_id:        linkType === 'platform' ? pf.platformId : null,
      is_paid:            linkType === 'platform' ? pf.isPaid : false,
      amount_spent:       linkType === 'platform' && pf.isPaid ? (+pf.amountSpent || null) : null,
      event_id:           linkType === 'event' ? ef.eventId : null,
      trial_id:           linkType === 'platform' ? pf.trialId : (ev?.trial_id ?? null),
      content_variant_id: linkType === 'platform' ? (pf.contentId || null) : null,
      campaign_id:        linkType === 'platform' ? (pf.campaignId || null) : null,
      qr_code_data:       null,
    };

    await (supabase.from('tracked_links') as any).insert(row);
    await reload();
    setSaving(false);
    toast('Tracked link saved');
  };

  const empty = (msg: string) => (
    <div style={{ padding: '10px 12px', fontSize: 12, background: 'var(--cream-2)', border: '1px dashed var(--line)', borderRadius: 8, color: 'var(--ink-mute)' }}>
      <Icons.Lock size={11} /> {msg}
    </div>
  );

  return (
    <div className="dash-page">
      <PageHead
        title="Link &amp; QR"
        italic="generator"
        sub="All values are managed in Configuration — pick from dropdowns so attribution data stays clean."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Form */}
        <div className="card">
          <div className="card-head">
            <div className="head-text">
              <h3>1. Choose link type</h3>
              <div className="sub">Platforms can be paid or organic. Events are managed in Configuration.</div>
            </div>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 16 }}>
            <div className="row gap-10">
              {(['platform', 'event'] as const).map(id => (
                <button key={id} type="button" onClick={() => setLinkType(id)} className={'type-btn' + (linkType === id ? ' active' : '')}>
                  <div className="tb-label">{id === 'platform' ? 'Platform link' : 'Event link'}</div>
                  <div className="tb-sub">{id === 'platform' ? 'Instagram, Substack, Meta… organic or paid.' : 'University, partnership, conference — managed.'}</div>
                </button>
              ))}
            </div>

            <div style={{ height: 1, background: 'var(--line-soft)' }} />

            <div style={{ fontSize: 15, fontWeight: 600 }}>2. {linkType === 'platform' ? 'Platform' : 'Event'} details</div>

            {linkType === 'platform' ? (
              <>
                <div className="grid-2">
                  <div className="field">
                    <label>Platform *</label>
                    <select className="select" value={pf.platformId} onChange={e => setPf(f => ({ ...f, platformId: e.target.value }))}>
                      {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Trial *</label>
                    <select className="select" value={pf.trialId} onChange={e => setPf(f => ({ ...f, trialId: e.target.value }))}>
                      {activeTrials.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="field" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', background: '#fff' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Paid placement</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>Toggle on if you're paying the platform for this link's reach.</div>
                    </div>
                    <Switch on={pf.isPaid} onChange={on => setPf(f => ({ ...f, isPaid: on }))} />
                  </div>
                  {pf.isPaid && (
                    <div className="field" style={{ marginTop: 12, maxWidth: 240 }}>
                      <label>Amount spent *</label>
                      <div className="input-prefixed">
                        <span className="pref">£</span>
                        <input type="number" min="0" placeholder="0.00" value={pf.amountSpent}
                          onChange={e => setPf(f => ({ ...f, amountSpent: e.target.value }))} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label>Campaign</label>
                    {store.campaigns.length === 0 ? empty('Add campaigns in Configuration → Campaigns') : (
                      <select className="select" value={pf.campaignId} onChange={e => setPf(f => ({ ...f, campaignId: e.target.value }))}>
                        <option value="">— None —</option>
                        {store.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="field">
                    <label>Content variation</label>
                    {store.contentVariants.length === 0 ? empty('Add variations in Configuration → Content variations') : (
                      <select className="select" value={pf.contentId} onChange={e => setPf(f => ({ ...f, contentId: e.target.value }))}>
                        <option value="">— None —</option>
                        {store.contentVariants.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {store.events.length === 0 ? (
                  <div style={{ padding: '20px 18px', textAlign: 'center', background: 'var(--cream-2)', border: '1px dashed var(--line)', borderRadius: 12 }}>
                    <Icons.Building size={20} style={{ color: 'var(--ink-mute)' }} />
                    <div style={{ marginTop: 8, fontWeight: 600, fontSize: 14 }}>No events yet</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 4 }}>Head to <strong>Configuration → Events</strong> to add one.</div>
                  </div>
                ) : (
                  <>
                    <div className="field">
                      <label>Event *</label>
                      <select className="select" value={ef.eventId} onChange={e => setEf({ eventId: e.target.value })}>
                        {store.events.map(ev => {
                          const t = store.trials.find(x => x.id === ev.trial_id);
                          return <option key={ev.id} value={ev.id}>{ev.name} — {ev.partner} ({t?.name})</option>;
                        })}
                      </select>
                      <span className="hint">All event metadata (partner, trial, cost) is read from Configuration.</span>
                    </div>
                    {(() => {
                      const ev = store.events.find(x => x.id === ef.eventId);
                      if (!ev) return null;
                      const trial = store.trials.find(x => x.id === ev.trial_id);
                      return (
                        <div style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Partner</div>
                            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{ev.partner}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trial</div>
                            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{trial?.name}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cost</div>
                            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2, fontFamily: 'var(--mono)' }}>{fmt(ev.cost ?? 0, 'gbp')}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </>
            )}

            <div className="row gap-10" style={{ paddingTop: 4 }}>
              <button className="btn btn-primary" onClick={onSave} disabled={saving || !generatedUrl}>
                <Icons.Sparkle size={14} /> Generate &amp; save
              </button>
              <button className="btn btn-ghost" onClick={() => {
                if (linkType === 'platform') setPf({ platformId: 'instagram', isPaid: false, amountSpent: '', trialId: activeTrials[0]?.id ?? '', campaignId: '', contentId: '' });
                else setEf({ eventId: store.events[0]?.id ?? '' });
              }}>Reset</button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="stack gap-16">
          <div className="card">
            <div className="card-head">
              <div className="head-text">
                <h3>Generated tracked URL</h3>
                <div className="sub">Every parameter is a normalised slug — no typos possible.</div>
              </div>
            </div>
            <div className="card-body">
              <div style={{
                background: 'var(--cream-2)', border: '1px solid var(--line)',
                borderRadius: 10, padding: '14px', fontFamily: 'var(--mono)',
                fontSize: 12, color: 'var(--burgundy)', wordBreak: 'break-all', lineHeight: 1.6,
              }}>
                {generatedUrl || <span style={{ color: 'var(--ink-mute)' }}>Pick the dropdowns to generate a link</span>}
              </div>
              <div className="row gap-8" style={{ marginTop: 12 }}>
                <button className="btn btn-soft btn-sm" onClick={onCopy} disabled={!generatedUrl}>
                  {copied ? <Icons.Check size={13} /> : <Icons.Copy size={13} />}
                  {copied ? 'Copied' : 'Copy URL'}
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="head-text">
                <h3>QR code</h3>
                <div className="sub">Branded with the TrialMe mark — ready to print on flyers.</div>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ background: 'var(--cream-2)', padding: 18, borderRadius: 12 }}>
                {generatedUrl ? (
                  <QRCodeSVG value={generatedUrl} size={168} bgColor="#fff" fgColor="#2a0612" />
                ) : (
                  <FakeQR size={168} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 4 }}>Embedded link</div>
                <div style={{ fontSize: 12, color: 'var(--burgundy)', fontFamily: 'var(--mono)', wordBreak: 'break-all', marginBottom: 12 }}>
                  {(generatedUrl || '—').slice(0, 80)}{generatedUrl.length > 80 ? '…' : ''}
                </div>
                <div className="row gap-8">
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    if (!generatedUrl) return;
                    const svg = document.querySelector('.qr-svg') as SVGElement;
                    if (!svg) return;
                    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'qr-code.svg';
                    a.click();
                    toast('QR exported as SVG');
                  }}>
                    <Icons.Download size={13} /> Download SVG
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="section-head">
        <div>
          <h2>Recent <em>tracked links</em></h2>
          <div className="sub">A log of every link generated.</div>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Destination</th>
              <th>Type</th>
              <th>Source</th>
              <th>Trial</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {store.trackedLinks.slice(0, 20).map(h => {
              const ev = h.event_id ? store.events.find(x => x.id === h.event_id) : null;
              const trial = store.trials.find(x => x.id === h.trial_id);
              const sourceLabel = h.link_type === 'platform'
                ? (PLATFORMS.find(p => p.id === h.platform_id)?.name ?? h.platform_id ?? '—') + (h.is_paid ? ' · Paid' : ' · Organic')
                : (ev ? ev.name + ' — ' + ev.partner : '—');
              return (
                <tr key={h.id}>
                  <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--burgundy)' }}>{h.full_tracked_url.replace(/^https?:\/\//, '').slice(0, 60)}…</span></td>
                  <td>
                    {h.link_type === 'platform'
                      ? (h.is_paid ? <Tag color="blue">Platform · Paid</Tag> : <Tag color="gray">Platform · Organic</Tag>)
                      : <Tag color="amber">Event</Tag>}
                  </td>
                  <td style={{ fontSize: 12 }}>{sourceLabel}</td>
                  <td style={{ color: 'var(--ink-soft)' }}>{trial?.name ?? '—'}</td>
                  <td style={{ color: 'var(--ink-mute)' }}>{new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="right">
                    <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn-icon" title="Copy URL" onClick={() => { navigator.clipboard.writeText(h.full_tracked_url); toast('Copied'); }}>
                        <Icons.Copy size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {store.trackedLinks.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--ink-mute)' }}>No tracked links yet. Generate one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
