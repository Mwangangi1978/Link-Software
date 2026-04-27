import { useEffect, useMemo, useRef, useState } from 'react';
import type { Store } from '../App';
import { PageHead, Switch, Icons } from '../components/dashboard/shared';
import { supabase } from '../lib/supabase';
import { slug, fmt } from '../lib/data';
import { PLATFORMS, type TrackedLink } from '../lib/types';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';

const isValidHex = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);
const hexToRgb = (hex: string) => {
  const n = hex.replace('#', '');
  const i = parseInt(n, 16);
  return { r: (i >> 16) & 255, g: (i >> 8) & 255, b: i & 255 };
};

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

  // Right-side preview only appears after a successful "Generate & save"
  const [showPreview, setShowPreview] = useState(false);

  // QR styling state
  const [bgColor, setBgColor] = useState('#ffffff');
  const [fgColor, setFgColor] = useState('#2a0612');
  const [bgInput, setBgInput] = useState('#ffffff');
  const [fgInput, setFgInput] = useState('#2a0612');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const qrCanvasWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal for "Get QR code" action in the history table
  const [qrTarget, setQrTarget] = useState<TrackedLink | null>(null);

  // When the form changes, the preview must be re-generated. Wipe it so the
  // user can't mistake a stale preview for "this is what's saved".
  useEffect(() => { setShowPreview(false); }, [linkType, pf, ef]);

  const generatedUrl = useMemo(() => {
    if (linkType === 'platform') {
      const t = store.trials.find(x => x.id === pf.trialId);
      if (!t) return '';
      const u = new URL('https://trialme.eu/' + t.slug);
      u.searchParams.set('platform', pf.platformId);
      u.searchParams.set('paid', pf.isPaid ? 'true' : 'false');
      u.searchParams.set('trial', t.slug);
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
    u.searchParams.set('trial', t.slug);
    return u.toString();
  }, [linkType, pf, ef, store]);

  const onCopy = async () => {
    try { await navigator.clipboard.writeText(generatedUrl); } catch {}
    setCopied(true);
    toast('URL copied');
    setTimeout(() => setCopied(false), 1600);
  };

  // Build a flat PNG canvas of the QR + optional centred logo (used by PNG/PDF/save)
  const buildCompositeCanvas = (): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const qrCanvas = qrCanvasWrapRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
      if (!qrCanvas) return reject(new Error('QR canvas not found'));
      const qrSize = qrCanvas.width;
      const pagePadding = Math.round(qrSize * 0.18);
      const size = qrSize + pagePadding * 2;
      const out = document.createElement('canvas');
      out.width = size; out.height = size;
      const ctx = out.getContext('2d')!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(qrCanvas, pagePadding, pagePadding);

      if (!logoUrl) return resolve(out);

      const img = new Image();
      img.onload = () => {
        const logoSize = Math.round(qrSize * 0.22);
        const pad = 5;
        const x = pagePadding + (qrSize - logoSize) / 2;
        const y = pagePadding + (qrSize - logoSize) / 2;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, 4);
        } else {
          ctx.rect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2);
        }
        ctx.fill();
        ctx.drawImage(img, x, y, logoSize, logoSize);
        resolve(out);
      };
      img.onerror = reject;
      img.src = logoUrl;
    });
  };

  const downloadPNG = async () => {
    if (!generatedUrl) return;
    try {
      const canvas = await buildCompositeCanvas();
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'trialme-qr.png';
      a.click();
      toast('PNG exported');
    } catch (err) {
      console.error('PNG export failed:', err);
      toast('PNG export failed');
    }
  };

  const downloadPDF = async () => {
    if (!generatedUrl) return;
    try {
      const canvas = await buildCompositeCanvas();
      const data = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const { r, g, b } = hexToRgb(bgColor);
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, W, H, 'F');
      const imgSize = 130;
      pdf.addImage(data, 'PNG', (W - imgSize) / 2, (H - imgSize) / 2, imgSize, imgSize);
      pdf.save('trialme-qr.pdf');
      toast('PDF exported');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast('PDF export failed');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    if (!generatedUrl) { toast('Complete the form first'); return; }

    // Per-type validation so RLS / NOT-NULL never silently chews the row
    if (linkType === 'platform') {
      if (!pf.trialId) { toast('Pick a trial'); return; }
      if (pf.isPaid && !pf.amountSpent) { toast('Enter the amount spent'); return; }
    } else {
      if (!ef.eventId) { toast('Pick an event'); return; }
    }

    setSaving(true);

    const ev = linkType === 'event' ? store.events.find(x => x.id === ef.eventId) : null;

    // QR PNGs are generated on demand at view time — never persisted.
    const row = {
      link_type: linkType,
      destination_url: generatedUrl.split('?')[0],
      full_tracked_url: generatedUrl,
      platform_id:        linkType === 'platform' ? pf.platformId : null,
      is_paid:            linkType === 'platform' ? pf.isPaid : false,
      amount_spent:       linkType === 'platform' && pf.isPaid ? (+pf.amountSpent || null) : null,
      event_id:           linkType === 'event' ? (ef.eventId || null) : null,
      // Empty-string UUIDs would fail the FK silently — coerce to null.
      trial_id:           linkType === 'platform' ? (pf.trialId || null) : (ev?.trial_id ?? null),
      content_variant_id: linkType === 'platform' ? (pf.contentId || null) : null,
      campaign_id:        linkType === 'platform' ? (pf.campaignId || null) : null,
      qr_code_data:       null,
    };

    const { error } = await (supabase.from('tracked_links') as any).insert(row);

    if (error) {
      setSaving(false);
      console.error('tracked_links insert failed:', error);
      const msg = /row-level security/i.test(error.message)
        ? 'Save blocked: only admins can create tracked links.'
        : 'Save failed: ' + error.message;
      toast(msg);
      return;
    }

    await reload();
    setShowPreview(true);
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
                {showPreview && generatedUrl
                  ? generatedUrl
                  : <span style={{ color: 'var(--ink-mute)' }}>Click <strong>Generate &amp; save</strong> to preview your tracked URL.</span>}
              </div>
              <div className="row gap-8" style={{ marginTop: 12 }}>
                <button className="btn btn-soft btn-sm" onClick={onCopy} disabled={!showPreview || !generatedUrl}>
                  {copied ? <Icons.Check size={13} /> : <Icons.Copy size={13} />}
                  {copied ? 'Copied' : 'Copy URL'}
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="head-text">
                <h3>QR <em>code</em></h3>
                <div className="sub">Customise colours, drop in a logo, then export as PNG or PDF.</div>
              </div>
            </div>
            <div className="card-body" style={{ display: 'grid', gap: 16 }}>
              {/* Live preview — only mounts after a successful Generate & save */}
              <div
                ref={qrCanvasWrapRef}
                style={{
                  display: 'grid', placeItems: 'center', padding: 22,
                  background: showPreview ? bgColor : 'var(--cream-2)', borderRadius: 12,
                  border: '1px solid var(--line)',
                  minHeight: 212,
                }}
              >
                {showPreview && generatedUrl ? (
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <QRCodeCanvas
                      value={generatedUrl}
                      size={168}
                      level="H"
                      marginSize={2}
                      bgColor={bgColor}
                      fgColor={fgColor}
                    />
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt=""
                        style={{
                          position: 'absolute', top: '50%', left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: 38, height: 38, padding: 4,
                          background: '#fff', borderRadius: 4,
                          objectFit: 'contain',
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--ink-mute)', padding: '20px 12px' }}>
                    <Icons.QR size={36} />
                    <div style={{ marginTop: 10, fontSize: 13, fontWeight: 500 }}>No QR code yet</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Click <strong>Generate &amp; save</strong> to create one.</div>
                  </div>
                )}
              </div>

              {/* Color pickers */}
              <div className="color-control-row">
                <div className="color-control">
                  <div className="color-label">
                    <Icons.Palette size={13} />
                    <span>Background</span>
                  </div>
                  <div className="color-input-shell" title="Pick background colour">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={e => { setBgColor(e.target.value); setBgInput(e.target.value); }}
                      style={{ width: 26, height: 26, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      value={bgInput}
                      onChange={e => {
                        const v = e.target.value;
                        setBgInput(v);
                        if (isValidHex(v)) setBgColor(v);
                      }}
                      onBlur={() => { if (!isValidHex(bgInput)) setBgInput(bgColor); }}
                      maxLength={7}
                      spellCheck={false}
                      className="color-hex-input"
                    />
                  </div>
                </div>
                <div className="color-control">
                  <div className="color-label">
                    <Icons.Palette size={13} />
                    <span>Foreground</span>
                  </div>
                  <div className="color-input-shell" title="Pick foreground colour">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={e => { setFgColor(e.target.value); setFgInput(e.target.value); }}
                      style={{ width: 26, height: 26, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      value={fgInput}
                      onChange={e => {
                        const v = e.target.value;
                        setFgInput(v);
                        if (isValidHex(v)) setFgColor(v);
                      }}
                      onBlur={() => { if (!isValidHex(fgInput)) setFgInput(fgColor); }}
                      maxLength={7}
                      spellCheck={false}
                      className="color-hex-input"
                    />
                  </div>
                </div>
              </div>

              {/* Logo upload */}
              <div className="logo-upload-card">
                <div className="logo-upload-header">
                  <Icons.Upload size={14} />
                  <div className="qr-customization-title">Logo customization (optional)</div>
                </div>
                {!logoUrl ? (
                  <label className="upload-dropzone">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      style={{ display: 'none' }}
                    />
                    <div className="upload-title">Click to upload logo</div>
                    <div className="upload-subtext">PNG, JPG or SVG, centred over the QR</div>
                  </label>
                ) : (
                  <div className="logo-uploaded-row">
                    <span className="upload-title">Logo uploaded</span>
                    <button
                      className="logo-remove-btn"
                      onClick={() => {
                        setLogoUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <Icons.X size={11} />
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Export actions */}
              <div className="action-row">
                <button className="action-btn" onClick={downloadPNG} disabled={!generatedUrl}>
                  <Icons.Download size={16} />
                  <span>Download PNG</span>
                </button>
                <button className="action-btn" onClick={downloadPDF} disabled={!generatedUrl}>
                  <Icons.FileText size={16} />
                  <span>Export PDF</span>
                </button>
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
              <th>QR</th>
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
                    <button className="btn btn-soft btn-sm" onClick={() => setQrTarget(h)}>
                      <Icons.QR size={13} /> Get QR code
                    </button>
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

      {qrTarget && (
        <QrCodeModal
          link={qrTarget}
          onClose={() => setQrTarget(null)}
          toast={toast}
        />
      )}
    </div>
  );
}

// ── On-demand QR code modal for the history table ──────────
interface QrCodeModalProps {
  link: TrackedLink;
  onClose: () => void;
  toast: (m: string) => void;
}
function QrCodeModal({ link, onClose, toast }: QrCodeModalProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const downloadPNG = () => {
    const canvas = wrapRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'trialme-qr.png';
    a.click();
    toast('PNG exported');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div className="modal-head">
          <div className="title">QR code</div>
          <div className="sub" style={{ wordBreak: 'break-all', fontFamily: 'var(--mono)', fontSize: 11 }}>
            {link.full_tracked_url}
          </div>
        </div>
        <div style={{ padding: 20, display: 'grid', placeItems: 'center', background: '#fff' }}>
          <div ref={wrapRef} style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1px solid var(--line)' }}>
            <QRCodeCanvas
              value={link.full_tracked_url}
              size={200}
              level="H"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#2a0612"
            />
          </div>
        </div>
        <div className="modal-foot">
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          <button className="btn btn-primary btn-sm" onClick={downloadPNG}>
            <Icons.Download size={13} /> Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
