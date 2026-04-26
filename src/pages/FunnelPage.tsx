import { useMemo, useState } from 'react';
import type { Store } from '../App';
import { PageHead, ChipGroup } from '../components/dashboard/shared';
import { fmt } from '../lib/data';

interface Props { store: Store; }

export function FunnelPage({ store }: Props) {
  const { sessions, trials, loading } = store;
  const [linkType, setLinkType] = useState('all');
  const [trialFilter, setTrialFilter] = useState('all');

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (linkType !== 'all' && s.link_type !== linkType) return false;
      if (trialFilter !== 'all' && s.trial_id !== trialFilter) return false;
      return true;
    });
  }, [sessions, linkType, trialFilter]);

  const visits = filtered.length;
  const submits = filtered.filter(s => s.status === 'form_submitted').length;
  const formStarts = Math.round(visits * 0.32); // estimated intermediate stage

  const stages = [
    { id: 'visits', label: 'Page visit',     count: visits,      sub: 'Landed on a trial page via a tracked link' },
    { id: 'starts', label: 'Form started',   count: formStarts,  sub: 'Opened the Tally form (estimated)' },
    { id: 'submit', label: 'Form submitted', count: submits,     sub: 'Completed signup' },
  ];

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <div className="dash-page">
      <PageHead
        title="Conversion"
        italic="funnel"
        sub="Two-step funnel from page visit to form submission, joined by Session ID."
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>Filters</div>
          <ChipGroup value={linkType} onChange={setLinkType} options={[
            { id: 'all',      label: 'All sources' },
            { id: 'platform', label: 'Platform' },
            { id: 'event',    label: 'Event' },
            { id: 'direct',   label: 'Direct' },
          ]} />
          <select className="select" style={{ height: 30, fontSize: 12, width: 220 }}
            value={trialFilter} onChange={e => setTrialFilter(e.target.value)}>
            <option value="all">All trials</option>
            {trials.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-mute)' }}>
            {filtered.length} session{filtered.length !== 1 ? 's' : ''} matched
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="head-text">
            <h3>Funnel</h3>
            <div className="sub">Each stage is a step toward signup; drop-off is the lost % between stages.</div>
          </div>
        </div>
        <div className="card-body">
          {stages.map((s, i) => {
            const prev = i > 0 ? stages[i - 1].count : null;
            const drop = prev != null && prev > 0 ? 1 - s.count / prev : null;
            const ratio = i === 0 ? 1 : s.count / (stages[0].count || 1);
            return (
              <div key={s.id}>
                {i > 0 && (
                  <div className="funnel-drop">
                    <span style={{ position: 'relative', background: '#fff', padding: '0 14px' }}>
                      <span style={{ fontWeight: 500, color: 'var(--bad)' }}>{drop !== null ? fmt(drop, 'pct') : '—'}</span>
                      <span> drop-off · {fmt(prev! - s.count)} lost</span>
                    </span>
                  </div>
                )}
                <div className="funnel-stage" style={{
                  width: `${30 + 70 * ratio}%`,
                  borderRadius: 12,
                }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', opacity: 0.7, marginBottom: 6 }}>
                    Stage {i + 1} · {s.label}
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {fmt(s.count)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{s.sub}</div>
                </div>
              </div>
            );
          })}

          <div style={{
            marginTop: 24, padding: '14px 16px',
            background: 'var(--cream-2)', borderRadius: 10,
            display: 'flex', gap: 24, flexWrap: 'wrap',
          }}>
            {[
              { label: 'Overall conversion',  value: fmt(visits ? submits / visits : 0, 'pct') },
              { label: 'Visit → form start',  value: fmt(visits ? formStarts / visits : 0, 'pct') },
              { label: 'Form start → submit', value: fmt(formStarts ? submits / formStarts : 0, 'pct') },
              { label: 'Total visits',        value: fmt(visits) },
              { label: 'Total signups',       value: fmt(submits) },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>{stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--burgundy)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
