// Data aggregation helpers that turn raw Supabase rows into dashboard-ready shapes
// Mirrors the window.agg object from the design prototype.

import type { Session, TrackedLink, Trial, Event, Platform } from './types';
import { PLATFORM_MAP } from './types';

export function fmt(n: number | null | undefined, type: 'num' | 'gbp' | 'pct' = 'num', digits = 1): string {
  const v = Number(n ?? 0);
  if (type === 'gbp') return '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (type === 'pct') return (v * 100).toFixed(digits) + '%';
  return v.toLocaleString('en-GB');
}

export function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ────────────────────────────────────────────────────────────
// Date range / windowing
// ────────────────────────────────────────────────────────────
export type DateRange = '7d' | '30d' | '90d' | 'YTD' | 'All';
export type Grain = 'daily' | 'weekly' | 'monthly';

export interface DateWindow {
  start: Date | null; // null means unbounded (All time)
  end: Date;
}

export function dateRangeToWindow(range: DateRange, refDate?: Date): DateWindow {
  const end = refDate ?? new Date();
  if (range === 'All') return { start: null, end };
  if (range === 'YTD') return { start: new Date(end.getFullYear(), 0, 1), end };
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = new Date(end.getTime() - days * 86400000);
  return { start, end };
}

// Equal-length window immediately preceding `w`. Returns null when w is unbounded.
export function previousWindow(w: DateWindow): DateWindow | null {
  if (!w.start) return null;
  const length = w.end.getTime() - w.start.getTime();
  return {
    start: new Date(w.start.getTime() - length),
    end: new Date(w.start.getTime()),
  };
}

function inWindow(ts: string | null | undefined, w: DateWindow): boolean {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return false;
  if (w.start && t < w.start.getTime()) return false;
  return t <= w.end.getTime();
}

export function filterSessionsByWindow(sessions: Session[], w: DateWindow): Session[] {
  return sessions.filter(s => inWindow(s.visit_timestamp, w));
}

export function filterLinksByWindow(links: TrackedLink[], w: DateWindow): TrackedLink[] {
  return links.filter(l => inWindow(l.created_at, w));
}

export function filterEventsByWindow(events: Event[], w: DateWindow): Event[] {
  return events.filter(e => inWindow(e.created_at, w));
}

// ────────────────────────────────────────────────────────────
// Trend bucketing — turn real sessions into daily/weekly/monthly buckets
// ────────────────────────────────────────────────────────────
export interface TrendPoint {
  date: Date;
  v: number; // visits
  s: number; // signups
}

function bucketStart(d: Date, grain: Grain): Date {
  if (grain === 'daily') return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (grain === 'monthly') return new Date(d.getFullYear(), d.getMonth(), 1);
  // weekly: Monday-anchored
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = dt.getDay(); // Sun=0..Sat=6
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return dt;
}

function nextBucket(d: Date, grain: Grain): Date {
  const n = new Date(d);
  if (grain === 'daily') n.setDate(n.getDate() + 1);
  else if (grain === 'weekly') n.setDate(n.getDate() + 7);
  else n.setMonth(n.getMonth() + 1);
  return n;
}

export function bucketSessions(sessions: Session[], grain: Grain, w: DateWindow): TrendPoint[] {
  // Determine effective start: window.start, or earliest session, or end-30d
  let start: Date;
  if (w.start) start = w.start;
  else if (sessions.length) {
    start = new Date(Math.min(...sessions.map(s => new Date(s.visit_timestamp).getTime())));
  } else {
    start = new Date(w.end.getTime() - 30 * 86400000);
  }
  const end = w.end;

  const buckets = new Map<number, { v: number; s: number }>();
  let cur = bucketStart(start, grain);
  const cap = bucketStart(end, grain);
  let safety = 0;
  while (cur.getTime() <= cap.getTime() && safety++ < 400) {
    buckets.set(cur.getTime(), { v: 0, s: 0 });
    cur = nextBucket(cur, grain);
  }

  for (const sess of sessions) {
    const k = bucketStart(new Date(sess.visit_timestamp), grain).getTime();
    const b = buckets.get(k);
    if (!b) continue;
    b.v++;
    if (sess.status === 'form_submitted') b.s++;
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k, b]) => ({ date: new Date(k), v: b.v, s: b.s }));
}

// ────────────────────────────────────────────────────────────
// Delta helpers (current vs previous-period)
// ────────────────────────────────────────────────────────────
export interface DeltaResult {
  delta: string;
  down: boolean;
}

export function pctDelta(curr: number, prev: number): DeltaResult {
  if (prev === 0 && curr === 0) return { delta: '0.0%', down: false };
  if (prev === 0) return { delta: '+new', down: false };
  const pct = ((curr - prev) / prev) * 100;
  const sign = pct >= 0 ? '+' : '−';
  return { delta: `${sign}${Math.abs(pct).toFixed(1)}%`, down: pct < 0 };
}

export function ppDelta(currRate: number, prevRate: number): DeltaResult {
  const diff = (currRate - prevRate) * 100;
  const sign = diff >= 0 ? '+' : '−';
  return { delta: `${sign}${Math.abs(diff).toFixed(1)}pp`, down: diff < 0 };
}

export function gbpDelta(curr: number, prev: number): DeltaResult {
  const diff = curr - prev;
  const sign = diff >= 0 ? '+' : '−';
  const abs = Math.abs(diff);
  return {
    delta: `${sign}£${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
    down: diff < 0,
  };
}


export interface AggPlatformRow {
  key: string;
  platformId: string;
  platformName: string;
  isPaid: boolean;
  amountSpent: number;
  trialId: string | null;
  trialName: string;
  visits: number;
  signups: number;
  conv: number;
  cps: number;
  contentName: string;
}

export interface AggEventRow {
  key: string;
  eventId: string;
  name: string;
  partner: string;
  trialId: string | null;
  trialName: string;
  cost: number;
  visits: number;
  signups: number;
  conv: number;
  cps: number;
}

export interface AggTrialRow extends Trial {
  visits: number;
  signups: number;
  spend: number;
  conv: number;
  cps: number;
  topPlatform: string;
  topEvent: string;
}

export interface Totals {
  visits: number;
  signups: number;
  spend: number;
  conv: number;
  cps: number;
}

// Aggregate sessions by platform_id + trial_id + is_paid combination
export function aggPlatformRows(sessions: Session[], trackedLinks: TrackedLink[], trials: Trial[]): AggPlatformRow[] {
  const trialMap = Object.fromEntries(trials.map(t => [t.id, t]));

  // Group sessions by (platform_id, trial_id, is_paid)
  const grouped: Record<string, { visits: number; signups: number; spend: number; isPaid: boolean; trialId: string | null; platformId: string }> = {};

  sessions
    .filter(s => s.link_type === 'platform' && s.platform_id)
    .forEach(s => {
      const key = `${s.platform_id}|${s.trial_id ?? 'none'}|${s.is_paid ? '1' : '0'}`;
      if (!grouped[key]) {
        grouped[key] = { visits: 0, signups: 0, spend: 0, isPaid: s.is_paid ?? false, trialId: s.trial_id, platformId: s.platform_id! };
      }
      grouped[key].visits++;
      if (s.status === 'form_submitted') grouped[key].signups++;
    });

  // Also pull spend from tracked_links (paid platform links)
  trackedLinks
    .filter(l => l.link_type === 'platform' && l.is_paid && l.amount_spent)
    .forEach(l => {
      const key = `${l.platform_id}|${l.trial_id ?? 'none'}|1`;
      if (grouped[key]) grouped[key].spend = l.amount_spent ?? 0;
    });

  return Object.entries(grouped).map(([key, g]) => {
    const plat = PLATFORM_MAP[g.platformId] as Platform | undefined;
    const trial = g.trialId ? trialMap[g.trialId] : null;
    const cps = g.isPaid && g.spend && g.signups ? g.spend / g.signups : 0;
    return {
      key,
      platformId: g.platformId,
      platformName: plat?.name ?? g.platformId,
      isPaid: g.isPaid,
      amountSpent: g.spend,
      trialId: g.trialId,
      trialName: trial?.name ?? '—',
      visits: g.visits,
      signups: g.signups,
      conv: g.visits ? g.signups / g.visits : 0,
      cps,
      contentName: '',
    };
  }).sort((a, b) => b.signups - a.signups);
}

export function aggEventRows(sessions: Session[], events: Event[], trials: Trial[]): AggEventRow[] {
  const trialMap = Object.fromEntries(trials.map(t => [t.id, t]));

  // Group by event_name + trial_id
  const grouped: Record<string, { visits: number; signups: number; eventName: string; partner: string; trialId: string | null; cost: number; eventId: string }> = {};

  // Match sessions to events by event_name field
  sessions
    .filter(s => s.link_type === 'event' && s.event_name)
    .forEach(s => {
      const matchedEvent = events.find(e => slug(e.name) === s.event_name);
      const key = matchedEvent ? matchedEvent.id : `event|${s.event_name}|${s.trial_id ?? 'none'}`;
      if (!grouped[key]) {
        grouped[key] = {
          visits: 0, signups: 0,
          eventName: matchedEvent?.name ?? (s.event_name ?? ''),
          partner: matchedEvent?.partner ?? (s.partner ?? ''),
          trialId: matchedEvent?.trial_id ?? s.trial_id,
          cost: matchedEvent?.cost ?? 0,
          eventId: matchedEvent?.id ?? key,
        };
      }
      grouped[key].visits++;
      if (s.status === 'form_submitted') grouped[key].signups++;
    });

  // For events with no matching sessions yet, still include them
  events.forEach(e => {
    if (!grouped[e.id]) {
      grouped[e.id] = { visits: 0, signups: 0, eventName: e.name, partner: e.partner, trialId: e.trial_id, cost: e.cost ?? 0, eventId: e.id };
    }
  });

  return Object.entries(grouped).map(([key, g]) => {
    const trial = g.trialId ? trialMap[g.trialId] : null;
    const cps = g.cost && g.signups ? g.cost / g.signups : 0;
    return {
      key,
      eventId: g.eventId,
      name: g.eventName,
      partner: g.partner,
      trialId: g.trialId,
      trialName: trial?.name ?? '—',
      cost: g.cost,
      visits: g.visits,
      signups: g.signups,
      conv: g.visits ? g.signups / g.visits : 0,
      cps,
    };
  }).sort((a, b) => b.signups - a.signups);
}

export function aggTrialRows(sessions: Session[], events: Event[], trials: Trial[], trackedLinks: TrackedLink[]): AggTrialRow[] {
  return trials.filter(t => t.is_active).map(t => {
    const tSessions = sessions.filter(s => s.trial_id === t.id);
    const visits = tSessions.length;
    const signups = tSessions.filter(s => s.status === 'form_submitted').length;

    // Paid platform spend from tracked_links
    const platSpend = trackedLinks
      .filter(l => l.trial_id === t.id && l.link_type === 'platform' && l.is_paid)
      .reduce((a, l) => a + (l.amount_spent ?? 0), 0);

    // Event spend from events tied to this trial
    const evtSpend = events
      .filter(e => e.trial_id === t.id)
      .reduce((a, e) => a + (e.cost ?? 0), 0);

    const spend = platSpend + evtSpend;

    // Top platform by signups
    const byPlat: Record<string, number> = {};
    tSessions.filter(s => s.link_type === 'platform' && s.status === 'form_submitted' && s.platform_id)
      .forEach(s => { byPlat[s.platform_id!] = (byPlat[s.platform_id!] ?? 0) + 1; });
    const topPlatId = Object.entries(byPlat).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topPlatform = topPlatId ? (PLATFORM_MAP[topPlatId]?.name ?? topPlatId) : '—';

    // Top event by signups
    const byEvent: Record<string, number> = {};
    tSessions.filter(s => s.link_type === 'event' && s.status === 'form_submitted' && s.event_name)
      .forEach(s => { byEvent[s.event_name!] = (byEvent[s.event_name!] ?? 0) + 1; });
    const topEventSlug = Object.entries(byEvent).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topEventEntity = events.find(e => slug(e.name) === topEventSlug);
    const topEvent = topEventEntity?.name ?? (topEventSlug ?? '—');

    const conv = visits ? signups / visits : 0;
    const cps = signups ? spend / signups : 0;

    return { ...t, visits, signups, spend, conv, cps, topPlatform, topEvent };
  });
}

export function aggTotals(sessions: Session[], events: Event[], trackedLinks: TrackedLink[]): Totals {
  const visits = sessions.length;
  const signups = sessions.filter(s => s.status === 'form_submitted').length;
  const platSpend = trackedLinks
    .filter(l => l.link_type === 'platform' && l.is_paid)
    .reduce((a, l) => a + (l.amount_spent ?? 0), 0);
  const evtSpend = events.reduce((a, e) => a + (e.cost ?? 0), 0);
  const spend = platSpend + evtSpend;
  const conv = visits ? signups / visits : 0;
  const cps = signups ? spend / signups : 0;
  return { visits, signups, spend, conv, cps };
}
