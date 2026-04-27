import { useMemo, useState } from 'react';
import type { Store } from '../App';
import {
  PageHead, Tag, ConvCell, CpsCell, ThSort,
  TableToolbar, SearchBox, ExportCsv,
  CompareControl, ComparePanel, Icons,
  type DateRangeId,
} from '../components/dashboard/shared';
import { aggTrialRows, fmt, dateRangeToWindow, filterSessionsByWindow, filterEventsByWindow, filterLinksByWindow } from '../lib/data';
import type { AggTrialRow } from '../lib/data';
import { PLATFORM_MAP } from '../lib/types';
import type { Session } from '../lib/types';

interface Props { store: Store; dateRange: DateRangeId; }

export function TrialsPage({ store, dateRange }: Props) {
  const { sessions: allSessions, events: allEvents, trials, trackedLinks: allLinks, loading } = store;

  const window       = useMemo(() => dateRangeToWindow(dateRange),                [dateRange]);
  const sessions     = useMemo(() => filterSessionsByWindow(allSessions, window), [allSessions, window]);
  const events       = useMemo(() => filterEventsByWindow(allEvents, window),     [allEvents, window]);
  const trackedLinks = useMemo(() => filterLinksByWindow(allLinks, window),       [allLinks, window]);

  const all = useMemo(() => aggTrialRows(sessions, events, trials, trackedLinks), [sessions, events, trials, trackedLinks]);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' | null }>({ key: 'visits', dir: 'desc' });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    let r = [...all];
    if (search) r = r.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));
    if (sort.key) {
      r.sort((a, b) => {
        const av = a[sort.key as keyof AggTrialRow] as number | string;
        const bv = b[sort.key as keyof AggTrialRow] as number | string;
        if (typeof av === 'string') return (sort.dir === 'asc' ? 1 : -1) * av.localeCompare(bv as string);
        return (sort.dir === 'asc' ? 1 : -1) * ((av || 0) - ((bv as number) || 0));
      });
    }
    return r;
  }, [all, search, sort]);

  const cpsMedian = useMemo(() => {
    const vals = rows.filter(r => r.cps).map(r => r.cps).sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)] || 0;
  }, [rows]);

  const compared = compareIds
    .map(id => rows.find(r => r.id === id))
    .filter((r): r is AggTrialRow => r !== undefined)
    .map(r => ({ ...r, label: r.name }));

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <div className="dash-page">
      <PageHead
        title="Trial"
        italic="performance"
        sub="Aggregated across every platform and event link for each trial. Expand a row to see the source breakdown."
      />

      {compared.length >= 2 && (
        <ComparePanel
          scope="trials"
          entities={compared}
          onClose={() => setCompareIds([])}
          metrics={[
            { key: 'visits',  label: 'Visits',      get: e => ({ raw: e.visits,  display: fmt(e.visits) }) },
            { key: 'signups', label: 'Signups',     get: e => ({ raw: e.signups, display: fmt(e.signups) }) },
            { key: 'conv',    label: 'Conv. rate',  get: e => ({ raw: e.conv,    display: fmt(e.conv, 'pct') }) },
            { key: 'spend',   label: 'Total spend', get: e => ({ raw: e.spend,   display: fmt(e.spend, 'gbp') }) },
            { key: 'cps',     label: 'Cost/signup', invert: true, get: e => ({ raw: e.cps, display: fmt(e.cps, 'gbp') }) },
          ]}
        />
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <TableToolbar
          left={<>
            <SearchBox value={search} onChange={setSearch} />
            <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{rows.length} active trials</span>
          </>}
          right={<>
            <CompareControl
              scope="trials"
              items={rows.map(r => ({ ...r, label: r.name }))}
              getId={r => r.id}
              getLabel={r => r.label}
              onApply={setCompareIds}
            />
            <ExportCsv rows={rows} filename="trials.csv" columns={[
              { label: 'Trial',       csv: r => r.name },
              { label: 'Visits',      csv: r => r.visits },
              { label: 'Signups',     csv: r => r.signups },
              { label: 'Conv rate',   csv: r => (r.conv * 100).toFixed(2) + '%' },
              { label: 'Total spend', csv: r => r.spend },
              { label: 'CPS GBP',     csv: r => r.cps.toFixed(2) },
              { label: 'Top platform',csv: r => r.topPlatform },
              { label: 'Top event',   csv: r => r.topEvent },
            ]} />
          </>}
        />

        <div style={{ overflow: 'auto' }}>
          <table className="table" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <ThSort label="Trial"        k="name"    sort={sort} setSort={setSort} />
                <ThSort label="Visits"       k="visits"  sort={sort} setSort={setSort} align="right" />
                <ThSort label="Signups"      k="signups" sort={sort} setSort={setSort} align="right" />
                <ThSort label="Conv. rate"   k="conv"    sort={sort} setSort={setSort} align="right" />
                <ThSort label="Total spend"  k="spend"   sort={sort} setSort={setSort} align="right" />
                <ThSort label="Cost/signup"  k="cps"     sort={sort} setSort={setSort} align="right" />
                <th>Top platform</th>
                <th>Top event</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <>
                  <tr key={r.id} style={{ height: 38 }}>
                    <td>
                      <button className="btn-icon" style={{ width: 22, height: 22 }}
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                        <Icons.ChevronDown size={13} style={{
                          transform: expanded === r.id ? 'rotate(0deg)' : 'rotate(-90deg)',
                          transition: 'transform .15s',
                        }} />
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 26, height: 26, borderRadius: 6,
                          background: 'var(--pink-bg-2)', color: 'var(--burgundy)',
                          display: 'grid', placeItems: 'center',
                          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16,
                        }}>{r.name[0]}</span>
                        <div>
                          <div style={{ fontWeight: 500 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>/{r.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num right">{fmt(r.visits)}</td>
                    <td className="num right">
                      {fmt(r.signups)}{' '}
                      <span style={{ color: 'var(--ink-mute)', fontSize: 11 }}>({fmt(r.conv, 'pct')})</span>
                    </td>
                    <td className="right"><ConvCell rate={r.conv} /></td>
                    <td className="num right">{fmt(r.spend, 'gbp')}</td>
                    <td className="right"><CpsCell cps={r.cps} median={cpsMedian} /></td>
                    <td style={{ color: 'var(--ink-soft)' }}>{r.topPlatform}</td>
                    <td style={{ color: 'var(--ink-soft)' }}>{r.topEvent}</td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={r.id + '_exp'}>
                      <td colSpan={9} style={{ background: 'var(--cream-2)', padding: 0 }}>
                        <TrialBreakdown trial={r} sessions={sessions} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TrialBreakdown({ trial, sessions }: { trial: AggTrialRow; sessions: Session[] }) {
  const trialSessions = sessions.filter(s => s.trial_id === trial.id);

  // Platform breakdown
  const byPlat: Record<string, { visits: number; signups: number; isPaid: boolean }> = {};
  trialSessions.filter(s => s.link_type === 'platform' && s.platform_id).forEach(s => {
    const key = `${s.platform_id}|${s.is_paid ? '1' : '0'}`;
    if (!byPlat[key]) byPlat[key] = { visits: 0, signups: 0, isPaid: s.is_paid ?? false };
    byPlat[key].visits++;
    if (s.status === 'form_submitted') byPlat[key].signups++;
  });

  // Event breakdown
  const byEvent: Record<string, { visits: number; signups: number; partner: string }> = {};
  trialSessions.filter(s => s.link_type === 'event' && s.event_name).forEach(s => {
    const key = s.event_name!;
    if (!byEvent[key]) byEvent[key] = { visits: 0, signups: 0, partner: s.partner ?? '' };
    byEvent[key].visits++;
    if (s.status === 'form_submitted') byEvent[key].signups++;
  });

  return (
    <div style={{ padding: '14px 20px 18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-mute)', fontWeight: 600, marginBottom: 8 }}>Platform sources</div>
          <table className="table" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
            <thead><tr><th>Platform</th><th>Type</th><th className="right">Visits</th><th className="right">Signups</th><th className="right">Conv.</th></tr></thead>
            <tbody>
              {Object.entries(byPlat).length === 0 ? (
                <tr><td colSpan={5} style={{ color: 'var(--ink-mute)' }}>No platform sessions yet.</td></tr>
              ) : Object.entries(byPlat).map(([key, g]) => {
                const platId = key.split('|')[0];
                const plat = PLATFORM_MAP[platId];
                return (
                  <tr key={key}>
                    <td>{plat?.name ?? platId}</td>
                    <td>{g.isPaid ? <Tag color="blue">Paid</Tag> : <Tag color="gray">Organic</Tag>}</td>
                    <td className="num right">{fmt(g.visits)}</td>
                    <td className="num right">{fmt(g.signups)}</td>
                    <td className="num right">{fmt(g.visits ? g.signups / g.visits : 0, 'pct')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-mute)', fontWeight: 600, marginBottom: 8 }}>Event sources</div>
          <table className="table" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
            <thead><tr><th>Event</th><th>Partner</th><th className="right">Visits</th><th className="right">Signups</th><th className="right">Conv.</th></tr></thead>
            <tbody>
              {Object.entries(byEvent).length === 0 ? (
                <tr><td colSpan={5} style={{ color: 'var(--ink-mute)' }}>No event sessions yet.</td></tr>
              ) : Object.entries(byEvent).map(([name, g]) => (
                <tr key={name}>
                  <td style={{ fontWeight: 500 }}>{name.replace(/_/g, ' ')}</td>
                  <td style={{ color: 'var(--ink-soft)' }}>{g.partner}</td>
                  <td className="num right">{fmt(g.visits)}</td>
                  <td className="num right">{fmt(g.signups)}</td>
                  <td className="num right">{fmt(g.visits ? g.signups / g.visits : 0, 'pct')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
