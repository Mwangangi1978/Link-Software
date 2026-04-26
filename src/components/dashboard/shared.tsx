// Shared UI primitives for the Attribution Dashboard
import React, { useEffect, useState } from 'react';
import {
  Megaphone, Building2, Microscope, Filter,
  SlidersHorizontal, Link2, Settings, Check, X, Plus, Edit2,
  Download, ChevronDown, Copy, Search, LogOut, Lock, Eye,
  ArrowUp, ArrowDown, Users, Plug, Code2, Sparkles, Layers,
  Mail, QrCode
} from 'lucide-react';

// Re-export icons for use across pages
export const Icons = {
  Layers, Megaphone, Building: Building2, Microscope,
  Funnel: Filter, Sliders: SlidersHorizontal, Link: Link2,
  Settings, Check, X, Plus, Edit: Edit2, Download,
  ChevronDown, Copy, Search, LogOut, Lock, Eye,
  ArrowUp, ArrowDown, Users, Plug, Code: Code2,
  Sparkle: Sparkles, QR: QrCode, Mail,
};

// ── Toast ──────────────────────────────────────────────────
interface ToastProps { msg: string | null; onDone: () => void; }
export function Toast({ msg, onDone }: ToastProps) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div className="dash-toast">
      <Check size={14} />
      {msg}
    </div>
  );
}

// ── Switch ─────────────────────────────────────────────────
interface SwitchProps { on: boolean; onChange: (v: boolean) => void; }
export function Switch({ on, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      className={'switch' + (on ? ' on' : '')}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    />
  );
}

// ── Tag / Badge ────────────────────────────────────────────
interface TagProps { children: React.ReactNode; color?: 'pink' | 'green' | 'blue' | 'amber' | 'gray'; }
export function Tag({ children, color = 'pink' }: TagProps) {
  return <span className={'tag' + (color !== 'pink' ? ' ' + color : '')}>{children}</span>;
}

// ── Breadcrumbs ────────────────────────────────────────────
export function Crumbs({ items }: { items: readonly string[] }) {
  return (
    <div className="crumbs">
      {items.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: 'var(--ink-mute)' }}>/</span>}
          <span className={i === items.length - 1 ? 'here' : ''}>{c}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Page Head ──────────────────────────────────────────────
interface PageHeadProps {
  title: string;
  italic?: string;
  sub?: string;
  actions?: React.ReactNode;
}
export function PageHead({ title, italic, sub, actions }: PageHeadProps) {
  return (
    <div className="page-head row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1>
          {title}
          {italic && <> <em>{italic}</em></>}
        </h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="row gap-8">{actions}</div>}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────
interface EmptyProps { icon?: React.ReactNode; title: string; hint?: string; }
export function Empty({ icon, title, hint }: EmptyProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon ?? <Sparkles size={20} />}</div>
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
    </div>
  );
}

// ── Conversion Rate Cell ───────────────────────────────────
export function ConvCell({ rate }: { rate: number }) {
  const pct = rate * 100;
  const cls = pct < 2 ? 'red' : pct < 5 ? 'amber' : 'green';
  return <span className={`conv-cell ${cls}`}>{pct.toFixed(1)}%</span>;
}

// ── Cost-per-Signup Cell ───────────────────────────────────
export function CpsCell({ cps, median }: { cps: number; median: number }) {
  if (!cps) return <span style={{ color: 'var(--ink-mute)' }}>—</span>;
  const good = cps <= median;
  return <span className={`cps-cell ${good ? 'good' : 'bad'}`}>£{Math.round(cps).toLocaleString('en-GB')}</span>;
}

// ── Micro Sparkline ────────────────────────────────────────
export function MicroSpark({ data, color = '#6e4d59', w = 96, h = 22 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (!data?.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 3) - 1.5;
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={path} stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ── Sortable Table Header Cell ─────────────────────────────
interface ThSortProps {
  label: string;
  k: string;
  sort: { key: string | null; dir: 'asc' | 'desc' | null };
  setSort: React.Dispatch<React.SetStateAction<{ key: string | null; dir: 'asc' | 'desc' | null }>>;
  align?: 'left' | 'right';
}
export function ThSort({ label, k, sort, setSort, align = 'left' }: ThSortProps) {
  const active = sort.key === k;
  const dir = active ? sort.dir : null;
  const next = () => {
    setSort(s => {
      if (s.key !== k) return { key: k, dir: 'desc' };
      if (s.dir === 'desc') return { key: k, dir: 'asc' };
      return { key: null, dir: null };
    });
  };
  return (
    <th onClick={next} className={'th-sort' + (active ? ' active' : '')} style={{ textAlign: align, cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {label}
        <span style={{ fontSize: 9, opacity: active ? 1 : 0.3, marginTop: 1 }}>
          {dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '↕'}
        </span>
      </span>
    </th>
  );
}

// ── Table Toolbar ──────────────────────────────────────────
export function TableToolbar({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="table-toolbar">
      <div className="table-toolbar-left">{left}</div>
      {right && <div className="table-toolbar-right">{right}</div>}
    </div>
  );
}

// ── Segmented Filter ───────────────────────────────────────
interface ChipOption { id: string; label: string; }
export function ChipGroup({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: ChipOption[] }) {
  return (
    <div className="seg" style={{ height: 30 }}>
      {options.map(o => (
        <button key={o.id} className={value === o.id ? 'active' : ''} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

// ── Search Box ─────────────────────────────────────────────
export function SearchBox({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="search-box" style={{ position: 'relative', width: 220 }}>
      <span className="search-box-icon" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-mute)', pointerEvents: 'none' }}>
        <Search size={12} />
      </span>
      <input
        className="input"
        style={{ height: 30, paddingLeft: 30, fontSize: 12 }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── Date Range Picker ──────────────────────────────────────
export function DateRangePicker() {
  const ranges = ['7d', '30d', '90d', 'YTD', 'All'];
  const [r, setR] = useState('30d');
  return (
    <div className="seg" style={{ height: 30 }}>
      {ranges.map(x => (
        <button key={x} className={r === x ? 'active' : ''} onClick={() => setR(x)}>{x}</button>
      ))}
    </div>
  );
}

// ── CSV Export ─────────────────────────────────────────────
interface CsvCol<T> { label: string; csv: (r: T) => string | number; }
export function ExportCsv<T>({ rows, columns, filename }: { rows: T[]; columns: CsvCol<T>[]; filename: string }) {
  const onClick = () => {
    const header = columns.map(c => '"' + c.label + '"').join(',');
    const body = rows.map(r => columns.map(c => {
      const v = c.csv(r);
      return '"' + String(v ?? '').replace(/"/g, '""') + '"';
    }).join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };
  return (
    <button className="btn btn-ghost btn-sm" onClick={onClick}>
      <Download size={13} /> Export CSV
    </button>
  );
}

// ── Compare Control + Panel ────────────────────────────────
interface CompareItem { id: string; label: string; [key: string]: unknown; }
interface CompareMetric<T> {
  key: string;
  label: string;
  invert?: boolean;
  get: (e: T) => { raw: number; display: string } | string;
}

export function CompareControl<T extends CompareItem>({
  scope, items, getId, getLabel, onApply,
}: {
  scope: string;
  items: T[];
  getId: (r: T) => string;
  getLabel: (r: T) => string;
  onApply: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected(s =>
    s.includes(id) ? s.filter(x => x !== id) : s.length < 4 ? [...s, id] : s);
  return (
    <>
      <button className="btn btn-soft btn-sm" onClick={() => { setSelected([]); setOpen(true); }}>
        <Layers size={13} /> Compare
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="title">Compare {scope}</div>
              <div className="sub">Pick up to 4 — cross-type comparisons are not allowed.</div>
            </div>
            <div className="modal-list">
              {items.map(it => {
                const id = getId(it);
                const on = selected.includes(id);
                return (
                  <button key={id} type="button" onClick={() => toggle(id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: on ? 'var(--pink-bg-2)' : 'transparent',
                    color: 'var(--ink)', textAlign: 'left',
                  }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: '1.5px solid ' + (on ? 'var(--burgundy)' : 'var(--line)'),
                      background: on ? 'var(--burgundy)' : '#fff',
                      display: 'grid', placeItems: 'center', flex: '0 0 16px',
                    }}>
                      {on && <Check size={11} color="#fff" strokeWidth={3} />}
                    </span>
                    <span style={{ flex: 1, fontSize: 13 }}>{getLabel(it)}</span>
                  </button>
                );
              })}
            </div>
            <div className="modal-foot">
              <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-mute)', alignSelf: 'center' }}>
                {selected.length} of 4 selected
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm"
                disabled={selected.length < 2}
                onClick={() => { onApply(selected); setOpen(false); }}>
                Compare {selected.length || ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ComparePanel<T extends CompareItem>({
  scope, entities, metrics, onClose,
}: {
  scope: string;
  entities: T[];
  metrics: CompareMetric<T>[];
  onClose: () => void;
}) {
  if (!entities.length) return null;
  return (
    <div className="card compare-panel" style={{ marginBottom: 20 }}>
      <div className="card-head" style={{ background: 'var(--burgundy)', color: '#fff', borderColor: 'var(--burgundy)' }}>
        <div className="head-text">
          <h3 style={{ color: '#fff' }}>Comparing {entities.length} {scope}</h3>
          <div className="sub" style={{ color: 'rgba(255,255,255,0.65)' }}>Same-type only — no cross-axis charts.</div>
        </div>
        <button className="btn-icon" style={{ color: '#fff' }} onClick={onClose}><X size={16} /></button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th></th>
              {entities.map(e => <th key={e.id} style={{ color: 'var(--burgundy)' }}>{e.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.key}>
                <td style={{ color: 'var(--ink-mute)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.label}</td>
                {entities.map(e => {
                  const v = m.get(e);
                  const rawVal = typeof v === 'object' ? v.raw : 0;
                  const display = typeof v === 'object' ? v.display : String(v);
                  const max = Math.max(...entities.map(x => {
                    const vx = m.get(x);
                    return typeof vx === 'object' ? vx.raw : 0;
                  }));
                  const pct = max ? (rawVal / max) * 100 : 0;
                  return (
                    <td key={e.id} className="num right" style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 600 }}>{display}</div>
                      <div style={{ height: 5, background: 'var(--line-soft)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pct + '%', background: m.invert ? '#a8324b' : 'var(--burgundy)', opacity: m.invert ? 0.6 : 0.85 }} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────
interface KpiProps { label: string; value: string; delta?: string; sub?: string; down?: boolean; feature?: boolean; }
export function Kpi({ label, value, delta, sub, down, feature }: KpiProps) {
  return (
    <div className={'kpi' + (feature ? ' feature' : '')}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">{value}</div>
      {delta && (
        <div className={'kpi-delta ' + (down ? 'down' : 'up')}>
          {down ? <ArrowDown size={11} /> : <ArrowUp size={11} />}
          {delta}<span className="vs">vs prev. period</span>
        </div>
      )}
      {sub && !delta && <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Fake QR (design placeholder) ──────────────────────────
export function FakeQR({ size = 168 }: { size?: number }) {
  const cells: boolean[] = [];
  for (let i = 0; i < 21 * 21; i++) {
    const x = i % 21, y = Math.floor(i / 21);
    const inFinder = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
    const finderPx = (cx: number, cy: number) => {
      const rx = x - cx, ry = y - cy;
      return rx === 0 || rx === 6 || ry === 0 || ry === 6 || (rx >= 2 && rx <= 4 && ry >= 2 && ry <= 4);
    };
    let on: boolean;
    if (inFinder(0,0)) on = finderPx(0,0);
    else if (inFinder(14,0)) on = finderPx(14,0);
    else if (inFinder(0,14)) on = finderPx(0,14);
    else on = ((x * 31 + y * 17 + 49) % 5) < 2;
    cells.push(on);
  }
  const cell = size / 21;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(21, ${cell}px)`, background: '#fff' }}>
        {cells.map((on, i) => <div key={i} style={{ width: cell, height: cell, background: on ? '#2a0612' : '#fff' }} />)}
      </div>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 38, height: 38, borderRadius: 8,
        background: '#fff', display: 'grid', placeItems: 'center',
        boxShadow: '0 0 0 4px #fff',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 6,
          background: 'linear-gradient(135deg, #4c081f, #8b0542)',
          color: '#f3d9df', display: 'grid', placeItems: 'center',
          fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 18,
        }}>t</div>
      </div>
    </div>
  );
}
