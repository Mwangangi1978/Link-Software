import { useMemo, useState } from 'react';
import type { Store } from '../App';
import {
  PageHead, Tag, ConvCell, CpsCell, ThSort,
  TableToolbar, ChipGroup, SearchBox, ExportCsv,
  CompareControl, ComparePanel, Empty, Icons,
} from '../components/dashboard/shared';
import { aggPlatformRows, fmt } from '../lib/data';
import type { AggPlatformRow } from '../lib/data';
import { PLATFORM_MAP } from '../lib/types';

interface Props { store: Store; }

export function PlatformsPage({ store }: Props) {
  const { sessions, trackedLinks, trials, loading } = store;
  const all = useMemo(() => aggPlatformRows(sessions, trackedLinks, trials), [sessions, trackedLinks, trials]);

  const [paidFilter, setPaidFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' | null }>({ key: 'visits', dir: 'desc' });
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const rows = useMemo(() => {
    let r = [...all];
    if (paidFilter === 'paid')    r = r.filter(x => x.isPaid);
    if (paidFilter === 'organic') r = r.filter(x => !x.isPaid);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(x => x.platformName.toLowerCase().includes(q) || x.trialName.toLowerCase().includes(q));
    }
    if (sort.key) {
      r.sort((a, b) => {
        const av = a[sort.key as keyof AggPlatformRow] as number | string;
        const bv = b[sort.key as keyof AggPlatformRow] as number | string;
        if (typeof av === 'string') return (sort.dir === 'asc' ? 1 : -1) * av.localeCompare(bv as string);
        return (sort.dir === 'asc' ? 1 : -1) * ((av || 0) - ((bv as number) || 0));
      });
    }
    return r;
  }, [all, paidFilter, search, sort]);

  const cpsMedian = useMemo(() => {
    const vals = rows.filter(r => r.cps).map(r => r.cps).sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)] || 0;
  }, [rows]);

  const totals = rows.reduce((acc, r) => ({
    visits: acc.visits + r.visits,
    signups: acc.signups + r.signups,
    spend: acc.spend + (r.isPaid ? r.amountSpent : 0),
  }), { visits: 0, signups: 0, spend: 0 });

  const compared = compareIds
    .map(id => all.find(r => r.key === id))
    .filter(Boolean)
    .map(r => ({ ...r!, id: r!.key, label: r!.platformName + ' · ' + (r!.isPaid ? 'Paid' : 'Organic') + ' · ' + r!.trialName }));

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <div className="dash-page">
      <PageHead
        title="Platform"
        italic="performance"
        sub="Every link with link_type = platform. Each placement is either organic or paid; spend is captured against paid links only."
      />

      {compared.length >= 2 && (
        <ComparePanel
          scope="platforms"
          entities={compared}
          onClose={() => setCompareIds([])}
          metrics={[
            { key: 'visits',  label: 'Visits',      get: e => ({ raw: e.visits,  display: fmt(e.visits) }) },
            { key: 'signups', label: 'Signups',     get: e => ({ raw: e.signups, display: fmt(e.signups) }) },
            { key: 'conv',    label: 'Conv. rate',  get: e => ({ raw: e.conv,    display: fmt(e.conv, 'pct') }) },
            { key: 'spend',   label: 'Spend',       get: e => ({ raw: e.amountSpent, display: e.amountSpent ? fmt(e.amountSpent, 'gbp') : '—' }) },
            { key: 'cps',     label: 'Cost/signup', invert: true, get: e => ({ raw: e.cps, display: e.cps ? fmt(e.cps, 'gbp') : '—' }) },
          ]}
        />
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <TableToolbar
          left={<>
            <ChipGroup value={paidFilter} onChange={setPaidFilter} options={[
              { id: 'all', label: 'All' },
              { id: 'organic', label: 'Organic' },
              { id: 'paid', label: 'Paid' },
            ]} />
            <SearchBox value={search} onChange={setSearch} />
            <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
              {rows.length} rows · {fmt(totals.visits)} visits · {fmt(totals.signups)} signups · {fmt(totals.spend, 'gbp')} spend
            </span>
          </>}
          right={<>
            <CompareControl
              scope="platforms"
              items={rows.map(r => ({ ...r, id: r.key, label: r.platformName + ' · ' + (r.isPaid ? 'Paid' : 'Organic') }))}
              getId={r => r.key}
              getLabel={r => r.platformName + ' · ' + (r.isPaid ? 'Paid' : 'Organic') + ' · ' + r.trialName}
              onApply={setCompareIds}
            />
            <ExportCsv rows={rows} filename="platforms.csv" columns={[
              { label: 'Platform', csv: r => r.platformName },
              { label: 'Type',     csv: r => r.isPaid ? 'Paid' : 'Organic' },
              { label: 'Trial',    csv: r => r.trialName },
              { label: 'Visits',   csv: r => r.visits },
              { label: 'Signups',  csv: r => r.signups },
              { label: 'Conv rate',csv: r => (r.conv * 100).toFixed(2) + '%' },
              { label: 'Spend GBP',csv: r => r.isPaid ? r.amountSpent : '' },
              { label: 'CPS GBP',  csv: r => r.cps ? r.cps.toFixed(2) : '' },
            ]} />
          </>}
        />

        <div style={{ overflow: 'auto', maxHeight: '62vh' }}>
          <table className="table" style={{ minWidth: 1100 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <ThSort label="Platform"    k="platformName" sort={sort} setSort={setSort} />
                <th>Type</th>
                <ThSort label="Trial"       k="trialName"    sort={sort} setSort={setSort} />
                <ThSort label="Visits"      k="visits"       sort={sort} setSort={setSort} align="right" />
                <ThSort label="Signups"     k="signups"      sort={sort} setSort={setSort} align="right" />
                <ThSort label="Conv. rate"  k="conv"         sort={sort} setSort={setSort} align="right" />
                <ThSort label="Spend"       k="amountSpent"  sort={sort} setSort={setSort} align="right" />
                <ThSort label="Cost/signup" k="cps"          sort={sort} setSort={setSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8}>
                  <Empty title="No platform data yet" hint="Generate your first platform link to start measuring." icon={<Icons.Megaphone size={20} />} />
                </td></tr>
              ) : rows.map(r => {
                const platColor = PLATFORM_MAP[r.platformId]?.color ?? 'var(--rose)';
                return (
                  <tr key={r.key} style={{ height: 36 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: platColor, flex: '0 0 8px' }} />
                        <span style={{ fontWeight: 500 }}>{r.platformName}</span>
                      </div>
                    </td>
                    <td>{r.isPaid ? <Tag color="blue">Paid</Tag> : <Tag color="gray">Organic</Tag>}</td>
                    <td style={{ color: 'var(--ink-soft)' }}>{r.trialName}</td>
                    <td className="num right">{fmt(r.visits)}</td>
                    <td className="num right">
                      {fmt(r.signups)}{' '}
                      <span style={{ color: 'var(--ink-mute)', fontSize: 11 }}>({fmt(r.conv, 'pct')})</span>
                    </td>
                    <td className="right"><ConvCell rate={r.conv} /></td>
                    <td className="num right">{r.isPaid ? fmt(r.amountSpent, 'gbp') : <span style={{ color: 'var(--ink-mute)' }}>—</span>}</td>
                    <td className="right"><CpsCell cps={r.cps} median={cpsMedian} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <div>{rows.length} of {all.length} rows</div>
        </div>
      </div>
    </div>
  );
}
