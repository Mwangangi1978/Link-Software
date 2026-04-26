import { useMemo, useState } from 'react';
import type { Store } from '../App';
import {
  PageHead, Tag, ConvCell, CpsCell, ThSort,
  TableToolbar, SearchBox, ExportCsv,
  CompareControl, ComparePanel, Empty, Icons,
} from '../components/dashboard/shared';
import { aggEventRows, fmt } from '../lib/data';
import type { AggEventRow } from '../lib/data';

interface Props { store: Store; }

export function EventsPage({ store }: Props) {
  const { sessions, events, trials, loading } = store;
  const all = useMemo(() => aggEventRows(sessions, events, trials), [sessions, events, trials]);

  const [trialFilter, setTrialFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' | null }>({ key: 'visits', dir: 'desc' });
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const rows = useMemo(() => {
    let r = [...all];
    if (trialFilter !== 'all') r = r.filter(x => x.trialId === trialFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(x => x.name.toLowerCase().includes(q) || x.partner.toLowerCase().includes(q) || x.trialName.toLowerCase().includes(q));
    }
    if (sort.key) {
      r.sort((a, b) => {
        const av = a[sort.key as keyof AggEventRow] as number | string;
        const bv = b[sort.key as keyof AggEventRow] as number | string;
        if (typeof av === 'string') return (sort.dir === 'asc' ? 1 : -1) * av.localeCompare(bv as string);
        return (sort.dir === 'asc' ? 1 : -1) * ((av || 0) - ((bv as number) || 0));
      });
    }
    return r;
  }, [all, trialFilter, search, sort]);

  const cpsMedian = useMemo(() => {
    const vals = rows.filter(r => r.cps).map(r => r.cps).sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)] || 0;
  }, [rows]);

  const totals = rows.reduce((acc, r) => ({
    visits: acc.visits + r.visits,
    signups: acc.signups + r.signups,
    cost: acc.cost + (r.cost || 0),
  }), { visits: 0, signups: 0, cost: 0 });

  const compared = compareIds
    .map(id => all.find(r => r.key === id))
    .filter(Boolean)
    .map(r => ({ ...r!, id: r!.key, label: r!.name }));

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <div className="dash-page">
      <PageHead
        title="Event"
        italic="performance"
        sub="Universities, partnerships and conferences. Every event drives a single trial — the URL path is the trial."
      />

      {compared.length >= 2 && (
        <ComparePanel
          scope="events"
          entities={compared}
          onClose={() => setCompareIds([])}
          metrics={[
            { key: 'visits',  label: 'Visits',      get: e => ({ raw: e.visits,  display: fmt(e.visits) }) },
            { key: 'signups', label: 'Signups',     get: e => ({ raw: e.signups, display: fmt(e.signups) }) },
            { key: 'conv',    label: 'Conv. rate',  get: e => ({ raw: e.conv,    display: fmt(e.conv, 'pct') }) },
            { key: 'cost',    label: 'Event cost',  get: e => ({ raw: e.cost,    display: e.cost ? fmt(e.cost, 'gbp') : '—' }) },
            { key: 'cps',     label: 'Cost/signup', invert: true, get: e => ({ raw: e.cps, display: e.cps ? fmt(e.cps, 'gbp') : '—' }) },
          ]}
        />
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <TableToolbar
          left={<>
            <select className="select" style={{ height: 30, fontSize: 12, width: 200 }}
              value={trialFilter} onChange={e => setTrialFilter(e.target.value)}>
              <option value="all">All trials</option>
              {trials.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <SearchBox value={search} onChange={setSearch} />
            <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
              {rows.length} events · {fmt(totals.visits)} visits · {fmt(totals.signups)} signups · {fmt(totals.cost, 'gbp')} cost
            </span>
          </>}
          right={<>
            <CompareControl
              scope="events"
              items={rows.map(r => ({ ...r, id: r.key, label: r.name }))}
              getId={r => r.key}
              getLabel={r => r.name + ' · ' + r.trialName}
              onApply={setCompareIds}
            />
            <ExportCsv rows={rows} filename="events.csv" columns={[
              { label: 'Event',    csv: r => r.name },
              { label: 'Partner',  csv: r => r.partner },
              { label: 'Trial',    csv: r => r.trialName },
              { label: 'Visits',   csv: r => r.visits },
              { label: 'Signups',  csv: r => r.signups },
              { label: 'Conv rate',csv: r => (r.conv * 100).toFixed(2) + '%' },
              { label: 'Cost GBP', csv: r => r.cost || '' },
              { label: 'CPS GBP',  csv: r => r.cps ? r.cps.toFixed(2) : '' },
            ]} />
          </>}
        />

        <div style={{ overflow: 'auto', maxHeight: '62vh' }}>
          <table className="table" style={{ minWidth: 1100 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <ThSort label="Event"       k="name"      sort={sort} setSort={setSort} />
                <ThSort label="Partner"     k="partner"   sort={sort} setSort={setSort} />
                <th>Trial</th>
                <ThSort label="Visits"      k="visits"    sort={sort} setSort={setSort} align="right" />
                <ThSort label="Signups"     k="signups"   sort={sort} setSort={setSort} align="right" />
                <ThSort label="Conv. rate"  k="conv"      sort={sort} setSort={setSort} align="right" />
                <ThSort label="Cost"        k="cost"      sort={sort} setSort={setSort} align="right" />
                <ThSort label="Cost/signup" k="cps"       sort={sort} setSort={setSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8}>
                  <Empty title="No event data yet" hint="Generate your first event link to start measuring." icon={<Icons.Building size={20} />} />
                </td></tr>
              ) : rows.map(r => (
                <tr key={r.key} style={{ height: 36 }}>
                  <td><span style={{ fontWeight: 500 }}>{r.name}</span></td>
                  <td style={{ color: 'var(--ink-soft)' }}>{r.partner}</td>
                  <td><Tag color="amber">{r.trialName}</Tag></td>
                  <td className="num right">{fmt(r.visits)}</td>
                  <td className="num right">
                    {fmt(r.signups)}{' '}
                    <span style={{ color: 'var(--ink-mute)', fontSize: 11 }}>({fmt(r.conv, 'pct')})</span>
                  </td>
                  <td className="right"><ConvCell rate={r.conv} /></td>
                  <td className="num right">{r.cost ? fmt(r.cost, 'gbp') : <span style={{ color: 'var(--ink-mute)' }}>—</span>}</td>
                  <td className="right"><CpsCell cps={r.cps} median={cpsMedian} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <div>{rows.length} of {all.length}</div>
        </div>
      </div>
    </div>
  );
}
