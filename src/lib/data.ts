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
