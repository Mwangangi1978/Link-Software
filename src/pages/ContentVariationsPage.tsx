import { useMemo, useState } from 'react';
import type { Store } from '../App';
import {
  PageHead, ConvCell, ThSort, TableToolbar, SearchBox, ExportCsv,
  CompareControl, ComparePanel, Empty, Icons,
} from '../components/dashboard/shared';
import { aggContentVariationRows, fmt } from '../lib/data';
import type { AggContentVariationRow } from '../lib/data';

interface Props { store: Store; }

export function ContentVariationsPage({ store }: Props) {
  const { sessions, trackedLinks, trials, contentVariants, loading } = store;

  const all = useMemo(
    () => aggContentVariationRows(sessions, contentVariants, trackedLinks, trials),
    [sessions, contentVariants, trackedLinks, trials],
  );

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' | null }>({ key: 'signups', dir: 'desc' });
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const rows = useMemo(() => {
    let r = [...all];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(x => x.variantName.toLowerCase().includes(q) || x.slug.toLowerCase().includes(q));
    }
    if (sort.key) {
      r.sort((a, b) => {
        const av = a[sort.key as keyof AggContentVariationRow] as number | string;
        const bv = b[sort.key as keyof AggContentVariationRow] as number | string;
        if (typeof av === 'string') return (sort.dir === 'asc' ? 1 : -1) * av.localeCompare(bv as string);
        return (sort.dir === 'asc' ? 1 : -1) * ((av || 0) - ((bv as number) || 0));
      });
    }
    return r;
  }, [all, search, sort]);

  const totals = rows.reduce((acc, r) => ({
    visits: acc.visits + r.visits,
    signups: acc.signups + r.signups,
    links: acc.links + r.linksCreated,
  }), { visits: 0, signups: 0, links: 0 });

  const compared = compareIds
    .map(id => all.find(r => r.key === id))
    .filter(Boolean)
    .map(r => ({ ...r!, id: r!.key, label: r!.variantName }));

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <div className="dash-page">
      <PageHead
        title="Content"
        italic="variations"
        sub="Performance per variation tag stamped in each tracked URL. See which copy or angle drives the most signups, then double down."
      />

      {compared.length >= 2 && (
        <ComparePanel
          scope="variations"
          entities={compared}
          onClose={() => setCompareIds([])}
          metrics={[
            { key: 'visits',       label: 'Visits',          get: e => ({ raw: e.visits,       display: fmt(e.visits) }) },
            { key: 'signups',      label: 'Signups',         get: e => ({ raw: e.signups,      display: fmt(e.signups) }) },
            { key: 'conv',         label: 'Conv. rate',      get: e => ({ raw: e.conv,         display: fmt(e.conv, 'pct') }) },
            { key: 'linksCreated', label: 'Links generated', get: e => ({ raw: e.linksCreated, display: fmt(e.linksCreated) }) },
          ]}
        />
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <TableToolbar
          left={<>
            <SearchBox value={search} onChange={setSearch} />
            <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
              {rows.length} variation{rows.length !== 1 ? 's' : ''} · {fmt(totals.links)} link{totals.links !== 1 ? 's' : ''} · {fmt(totals.visits)} visits · {fmt(totals.signups)} signups
            </span>
          </>}
          right={<>
            <CompareControl
              scope="variations"
              items={rows.map(r => ({ ...r, id: r.key, label: r.variantName }))}
              getId={r => r.key}
              getLabel={r => r.variantName}
              onApply={setCompareIds}
            />
            <ExportCsv rows={rows} filename="content_variations.csv" columns={[
              { label: 'Variation',    csv: r => r.variantName },
              { label: 'Slug',         csv: r => r.slug },
              { label: 'Links',        csv: r => r.linksCreated },
              { label: 'Visits',       csv: r => r.visits },
              { label: 'Signups',      csv: r => r.signups },
              { label: 'Conv rate',    csv: r => (r.conv * 100).toFixed(2) + '%' },
              { label: 'Top platform', csv: r => r.topPlatform },
              { label: 'Top trial',    csv: r => r.topTrial },
            ]} />
          </>}
        />

        <div style={{ overflow: 'auto', maxHeight: '62vh' }}>
          <table className="table" style={{ minWidth: 1000 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <ThSort label="Variation"    k="variantName"  sort={sort} setSort={setSort} />
                <ThSort label="Slug"         k="slug"         sort={sort} setSort={setSort} />
                <ThSort label="Links"        k="linksCreated" sort={sort} setSort={setSort} align="right" />
                <ThSort label="Visits"       k="visits"       sort={sort} setSort={setSort} align="right" />
                <ThSort label="Signups"      k="signups"      sort={sort} setSort={setSort} align="right" />
                <ThSort label="Conv. rate"   k="conv"         sort={sort} setSort={setSort} align="right" />
                <ThSort label="Top platform" k="topPlatform"  sort={sort} setSort={setSort} />
                <ThSort label="Top trial"    k="topTrial"     sort={sort} setSort={setSort} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8}>
                  <Empty
                    title="No content variations yet"
                    hint="Add variations in Configuration → Content variations, then tag links with them in the Link Generator."
                    icon={<Icons.Sparkle size={20} />}
                  />
                </td></tr>
              ) : rows.map(r => (
                <tr key={r.key} style={{ height: 36 }}>
                  <td style={{ fontWeight: 500 }}>
                    {r.variantName}
                    {r.variantId === null && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-mute)', fontStyle: 'italic' }}>
                        orphan
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--burgundy)' }}>{r.slug}</span>
                  </td>
                  <td className="num right">{fmt(r.linksCreated)}</td>
                  <td className="num right">{fmt(r.visits)}</td>
                  <td className="num right">
                    {fmt(r.signups)}{' '}
                    <span style={{ color: 'var(--ink-mute)', fontSize: 11 }}>({fmt(r.conv, 'pct')})</span>
                  </td>
                  <td className="right"><ConvCell rate={r.conv} /></td>
                  <td style={{ color: 'var(--ink-soft)' }}>{r.topPlatform}</td>
                  <td style={{ color: 'var(--ink-soft)' }}>{r.topTrial}</td>
                </tr>
              ))}
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
