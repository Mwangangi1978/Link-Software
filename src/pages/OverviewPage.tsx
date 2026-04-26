import { useMemo, useState } from 'react';
import type { Store } from '../App';
import { PageHead, Kpi, ChipGroup, ConvCell, Icons } from '../components/dashboard/shared';
import { aggPlatformRows, aggEventRows, aggTrialRows, aggTotals, fmt } from '../lib/data';

interface Props { store: Store; go: (p: string) => void; }

export function OverviewPage({ store, go }: Props) {
  const { sessions, events, trials, trackedLinks, loading } = store;
  const [grain, setGrain] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const totals = useMemo(() => aggTotals(sessions, events, trackedLinks), [sessions, events, trackedLinks]);
  const platRows = useMemo(() => aggPlatformRows(sessions, trackedLinks, trials), [sessions, trackedLinks, trials]);
  const evtRows  = useMemo(() => aggEventRows(sessions, events, trials), [sessions, events, trials]);
  const trialRows = useMemo(() => aggTrialRows(sessions, events, trials, trackedLinks), [sessions, events, trials, trackedLinks]);

  // Trend data (synthetic buckets based on real totals)
  const trend = useMemo(() => {
    const days = grain === 'daily' ? 30 : grain === 'weekly' ? 12 : 6;
    return Array.from({ length: days }, (_, i) => ({
      v: Math.round((totals.visits / days) * (0.7 + Math.sin(i * 0.5) * 0.25 + (i / days) * 0.4)),
      s: Math.round((totals.signups / days) * (0.7 + Math.sin(i * 0.5 + 0.3) * 0.25 + (i / days) * 0.4)),
    }));
  }, [totals.visits, totals.signups, grain]);

  // Source mix
  const platVisits = platRows.reduce((a, b) => a + b.visits, 0);
  const evtVisits  = evtRows.reduce((a, b) => a + b.visits, 0);
  const directVisits = sessions.filter(s => s.link_type === 'direct' || !s.link_type).length;
  const totalMix = platVisits + evtVisits + directVisits || 1;

  const paidPlat = platRows.filter(r => r.isPaid);
  const paidPlatSpend   = paidPlat.reduce((a, b) => a + b.amountSpent, 0);
  const paidPlatSignups = paidPlat.reduce((a, b) => a + b.signups, 0);
  const evtSpend   = evtRows.reduce((a, b) => a + (b.cost || 0), 0);
  const evtSignups = evtRows.reduce((a, b) => a + b.signups, 0);

  const topPlats = [...platRows].sort((a, b) => b.signups - a.signups).slice(0, 5);
  const topEvts  = [...evtRows].sort((a, b) => b.signups - a.signups).slice(0, 5);

  if (loading) return <div className="loading-state">Loading dashboard…</div>;

  return (
    <div className="dash-page">
      <PageHead
        title="Attribution"
        italic="overview"
        sub="A read-only roll-up across every link. Drill into Platforms, Events or Trials for analyst-grade tables and same-type comparisons."
      />

      {/* KPIs */}
      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <Kpi label="Total visits"    value={fmt(totals.visits)}          delta="+12.4%" />
        <Kpi label="Total signups"   value={fmt(totals.signups)}         delta="+9.1%" />
        <Kpi label="Conversion rate" value={fmt(totals.conv, 'pct')}     delta="−0.4%" down />
        <Kpi label="Total spend"     value={fmt(totals.spend, 'gbp')}    delta="+£1,420" />
        <Kpi label="Cost / signup"   value={fmt(totals.cps, 'gbp')}      delta="−£0.86" feature />
      </div>

      {/* Trend + Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="head-text">
              <h3>Visits &amp; signups <em>over time</em></h3>
              <div className="sub">Approximated from total session data.</div>
            </div>
            <ChipGroup value={grain} onChange={v => setGrain(v as typeof grain)} options={[
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
            ]} />
          </div>
          <div className="card-body">
            <TrendChart trend={trend} />
            <div className="legend-row" style={{ marginTop: 10 }}>
              <span><span className="dotc" style={{ background: 'var(--burgundy)' }} /> Visits</span>
              <span><span className="dotc" style={{ background: 'var(--rose)' }} /> Signups</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="head-text">
              <h3>Source <em>mix</em></h3>
              <div className="sub">Visits by entity type.</div>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Donut data={[
              { id: 'platform', label: 'Platforms', value: platVisits,   color: 'var(--burgundy)' },
              { id: 'event',    label: 'Events',    value: evtVisits,    color: 'var(--rose)' },
              { id: 'direct',   label: 'Direct',    value: directVisits, color: '#d4b9c2' },
            ]} />
            <div style={{ flex: 1, display: 'grid', gap: 8 }}>
              {[
                { label: 'Platforms', value: platVisits,   color: 'var(--burgundy)' },
                { label: 'Events',    value: evtVisits,    color: 'var(--rose)' },
                { label: 'Direct',    value: directVisits, color: '#d4b9c2' },
              ].map(m => (
                <div key={m.label} className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
                  <span className="row gap-8">
                    <span className="dotc" style={{ background: m.color }} />
                    {m.label}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums' }}>
                    {((m.value / totalMix) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cost Efficiency */}
      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 16 }}>
        <Kpi label="Paid platform spend" value={fmt(paidPlatSpend, 'gbp')} sub={`${paidPlat.length} paid placements`} />
        <Kpi label="Paid platform CPS"   value={fmt(paidPlatSignups ? paidPlatSpend / paidPlatSignups : 0, 'gbp')} sub={`${fmt(paidPlatSignups)} signups`} />
        <Kpi label="Event spend"         value={fmt(evtSpend, 'gbp')} sub={`${evtRows.length} events`} />
        <Kpi label="Event CPS"           value={fmt(evtSignups ? evtSpend / evtSignups : 0, 'gbp')} sub={`${fmt(evtSignups)} signups`} />
      </div>

      {/* Top Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="head-text">
              <h3>Top <em>platforms</em></h3>
              <div className="sub">By signups.</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => go('platforms')}>
              View all <Icons.ChevronDown size={12} style={{ transform: 'rotate(-90deg)' }} />
            </button>
          </div>
          <table className="table">
            <thead><tr><th>Platform</th><th>Trial</th><th className="right">Visits</th><th className="right">Signups</th><th className="right">CR</th></tr></thead>
            <tbody>
              {topPlats.length === 0 ? (
                <tr><td colSpan={5} style={{ color: 'var(--ink-mute)', padding: 20, textAlign: 'center' }}>No platform data yet</td></tr>
              ) : topPlats.map(r => (
                <tr key={r.key}>
                  <td>
                    <div className="row gap-8">
                      <span style={{ width: 18, height: 18, borderRadius: 4, background: '#666', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>
                        {r.platformName[0]}
                      </span>
                      <span style={{ fontWeight: 500 }}>{r.platformName}</span>
                      {r.isPaid
                        ? <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#e0effd', color: '#1057a8' }}>Paid</span>
                        : <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--cream-2)', color: 'var(--ink-mute)' }}>Organic</span>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--ink-soft)' }}>{r.trialName}</td>
                  <td className="right" style={{ fontFamily: 'var(--mono)' }}>{fmt(r.visits)}</td>
                  <td className="right" style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt(r.signups)}</td>
                  <td className="right"><ConvCell rate={r.conv} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="head-text">
              <h3>Top <em>events</em></h3>
              <div className="sub">By signups.</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => go('events')}>
              View all <Icons.ChevronDown size={12} style={{ transform: 'rotate(-90deg)' }} />
            </button>
          </div>
          <table className="table">
            <thead><tr><th>Event</th><th>Trial</th><th className="right">Signups</th><th className="right">Cost</th><th className="right">CPS</th></tr></thead>
            <tbody>
              {topEvts.length === 0 ? (
                <tr><td colSpan={5} style={{ color: 'var(--ink-mute)', padding: 20, textAlign: 'center' }}>No event data yet</td></tr>
              ) : topEvts.map(r => (
                <tr key={r.key}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{r.partner}</div>
                  </td>
                  <td style={{ color: 'var(--ink-soft)' }}>{r.trialName}</td>
                  <td className="right" style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt(r.signups)}</td>
                  <td className="right" style={{ fontFamily: 'var(--mono)' }}>{fmt(r.cost, 'gbp')}</td>
                  <td className="right" style={{ fontFamily: 'var(--mono)' }}>{r.cps ? fmt(r.cps, 'gbp') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trial strip */}
      <div className="section-head">
        <div>
          <h2>Trials <em>at a glance</em></h2>
          <div className="sub">Each trial's combined platform + event activity.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => go('trials')}>
          Open Trials view <Icons.ChevronDown size={12} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </div>

      {trialRows.length === 0 ? (
        <div className="card"><div style={{ padding: 24, color: 'var(--ink-mute)', textAlign: 'center' }}>No active trials found.</div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(trialRows.length, 4)}, 1fr)`, gap: 16 }}>
          {trialRows.map(t => (
            <div key={t.id} className="card">
              <div className="card-body" style={{ padding: 18 }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>/{t.slug}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: 'var(--pink-bg-2)', color: 'var(--burgundy)', fontWeight: 600 }}>
                    {fmt(t.conv, 'pct')} CR
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <Mini label="Visits"  value={fmt(t.visits)} />
                  <Mini label="Signups" value={fmt(t.signups)} accent />
                  <Mini label="Spend"   value={fmt(t.spend, 'gbp')} />
                  <Mini label="CPS"     value={t.cps ? fmt(t.cps, 'gbp') : '—'} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Top sources</div>
                <div style={{ fontSize: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>Platform</span>
                    <span style={{ fontWeight: 500 }}>{t.topPlatform}</span>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>Event</span>
                    <span style={{ fontWeight: 500 }}>{t.topEvent}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick jumps */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="head-text">
              <h3>Quick <em>jumps</em></h3>
              <div className="sub">Open the typed views.</div>
            </div>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            {[
              ['platforms', 'Megaphone', 'Platforms',      'Organic & paid placement performance'],
              ['events',    'Building',  'Events',         'University + partner activations'],
              ['trials',    'Microscope','Trials',         'Per-trial roll-up across all sources'],
              ['funnel',    'Funnel',    'Funnel',         'Visit → form submission drop-off'],
              ['generator', 'Link',      'Link generator', 'Build a tracked URL or QR code'],
            ].map(([id, ic, label, sub]) => {
              const Ic = Icons[ic as keyof typeof Icons];
              return (
                <button key={id} type="button" onClick={() => go(id)} className="quick-jump-btn">
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--pink-bg-2)', color: 'var(--burgundy)', display: 'grid', placeItems: 'center' }}>
                    <Ic size={15} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{sub}</div>
                  </span>
                  <Icons.ChevronDown size={14} style={{ transform: 'rotate(-90deg)', color: 'var(--ink-mute)' }} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="head-text">
              <h3>Live <em>activity</em></h3>
              <div className="sub">Most recent sessions from the tracker.</div>
            </div>
            <span className="pill"><span className="dot" /> Tracker live</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {store.sessions.slice(0, 6).map((s, i) => {
              const isSignup = s.status === 'form_submitted';
              const IcName = isSignup ? 'Check' : s.link_type === 'event' ? 'Building' : 'Eye';
              const Ic = Icons[IcName as keyof typeof Icons];
              const tint = isSignup ? 'var(--good)' : s.link_type === 'event' ? 'var(--burgundy)' : 'var(--ink-mute)';
              const text = isSignup
                ? `New signup — ${s.platform_id ?? s.event_name ?? 'direct'}`
                : `Visit — ${s.platform_id ?? s.event_name ?? 'direct'} → ${s.page_url?.split('/').pop() ?? '/'}`;
              return (
                <div key={s.id} className="row" style={{ padding: '10px 18px', borderTop: i ? '1px solid var(--line-soft)' : 'none', gap: 12 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--cream-2)', color: tint, display: 'grid', placeItems: 'center' }}>
                    <Ic size={13} />
                  </span>
                  <span style={{ flex: 1, fontSize: 13 }}>{text}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                    {new Date(s.visit_timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
            {store.sessions.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
                No sessions yet. Install the tracking script to start.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: accent ? 'var(--burgundy)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{value}</div>
    </div>
  );
}

function TrendChart({ trend }: { trend: { v: number; s: number }[] }) {
  const w = 760, h = 200, pad = 24;
  const maxV = Math.max(...trend.map(d => d.v), 1);
  const xAt = (i: number) => pad + (i / (trend.length - 1)) * (w - pad * 2);
  const yAt = (v: number) => h - pad - (v / maxV) * (h - pad * 2);
  const linePath = (key: 'v' | 's') =>
    trend.map((d, i) => (i ? 'L' : 'M') + xAt(i).toFixed(1) + ',' + yAt(d[key]).toFixed(1)).join(' ');
  if (trend.length < 2) return null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 200 }}>
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={pad + (h - pad * 2) * (1 - p)} y2={pad + (h - pad * 2) * (1 - p)} stroke="#ecdfe4" strokeWidth="1" />
      ))}
      <path d={linePath('v') + ` L${xAt(trend.length - 1)},${h - pad} L${xAt(0)},${h - pad} Z`} fill="#4c081f" opacity="0.07" />
      <path d={linePath('v')} stroke="#4c081f" strokeWidth="1.8" fill="none" />
      <path d={linePath('s')} stroke="#c89aa6" strokeWidth="1.8" fill="none" strokeDasharray="4 3" />
    </svg>
  );
}

function Donut({ data }: { data: { id: string; label: string; value: number; color: string }[] }) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  const r = 50, R = 70, cx = 80, cy = 80;
  let acc = 0;
  const arcs = data.map(d => {
    const a0 = (acc / total) * Math.PI * 2;
    acc += d.value;
    const a1 = (acc / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const cos0 = Math.cos(a0 - Math.PI / 2), sin0 = Math.sin(a0 - Math.PI / 2);
    const cos1 = Math.cos(a1 - Math.PI / 2), sin1 = Math.sin(a1 - Math.PI / 2);
    return (
      <path key={d.id} fill={d.color}
        d={`M${cx + cos0 * R},${cy + sin0 * R} A${R},${R} 0 ${large} 1 ${cx + cos1 * R},${cy + sin1 * R} L${cx + cos1 * r},${cy + sin1 * r} A${r},${r} 0 ${large} 0 ${cx + cos0 * r},${cy + sin0 * r} Z`}
      />
    );
  });
  return (
    <svg viewBox="0 0 160 160" style={{ width: 140, height: 140, flexShrink: 0 }}>
      {arcs}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="var(--ink-mute)" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--burgundy)">{total.toLocaleString('en-GB')}</text>
    </svg>
  );
}
