import { useEffect, useState, useCallback } from 'react';
import './dashboard.css';
import { supabase } from './lib/supabase';
import { useAuth } from './lib/auth';
import type { Trial, Event, ContentVariant, Campaign, Session, TrackedLink } from './lib/types';
import { Crumbs, DateRangePicker, Icons, Toast, type DateRangeId } from './components/dashboard/shared';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SignInPage } from './pages/SignInPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { OverviewPage } from './pages/OverviewPage';
import { PlatformsPage } from './pages/PlatformsPage';
import { EventsPage } from './pages/EventsPage';
import { TrialsPage } from './pages/TrialsPage';
import { FunnelPage } from './pages/FunnelPage';
import { ConfigPage } from './pages/ConfigPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { SettingsPage } from './pages/SettingsPage';

export interface Store {
  trials: Trial[];
  events: Event[];
  contentVariants: ContentVariant[];
  campaigns: Campaign[];
  sessions: Session[];
  trackedLinks: TrackedLink[];
  loading: boolean;
}

const PAGES = [
  { id: 'overview',  label: 'Overview',       icon: 'Layers' as const,     crumb: ['Dashboard', 'Overview'],       adminOnly: false },
  { id: 'platforms', label: 'Platforms',       icon: 'Megaphone' as const,  crumb: ['Dashboard', 'Platforms'],      adminOnly: false },
  { id: 'events',    label: 'Events',          icon: 'Building' as const,   crumb: ['Dashboard', 'Events'],         adminOnly: false },
  { id: 'trials',    label: 'Trials',          icon: 'Microscope' as const, crumb: ['Dashboard', 'Trials'],         adminOnly: false },
  { id: 'funnel',    label: 'Funnel',          icon: 'Funnel' as const,     crumb: ['Dashboard', 'Funnel'],         adminOnly: false },
  { id: 'config',    label: 'Configuration',   icon: 'Sliders' as const,    crumb: ['Workspace', 'Configuration'],  adminOnly: true, divide: true },
  { id: 'generator', label: 'Link Generator',  icon: 'Link' as const,       crumb: ['Workspace', 'Link Generator'], adminOnly: true },
  { id: 'settings',  label: 'Settings',        icon: 'Settings' as const,   crumb: ['Workspace', 'Settings'],       adminOnly: true },
] as const;

type PageId = typeof PAGES[number]['id'];

export default function App() {
  const { user, profile, loading: authLoading, isAdmin, signOut } = useAuth();
  const [page, setPage] = useState<PageId>('overview');
  const [dateRange, setDateRange] = useState<DateRangeId>('30d');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toast = useCallback((m: string) => setToastMsg(m), []);

  const [store, setStore] = useState<Store>({
    trials: [], events: [], contentVariants: [],
    campaigns: [], sessions: [], trackedLinks: [], loading: true,
  });

  const loadData = useCallback(async () => {
    setStore(s => ({ ...s, loading: true }));
    const [trialsRes, eventsRes, variantsRes, campaignsRes, sessionsRes, linksRes] = await Promise.all([
      supabase.from('trials').select('*').order('created_at'),
      supabase.from('events').select('*').order('created_at'),
      supabase.from('content_variants').select('*').order('created_at'),
      supabase.from('campaigns').select('*').order('created_at'),
      supabase.from('sessions').select('*').order('visit_timestamp', { ascending: false }).limit(5000),
      supabase.from('tracked_links').select('*').order('created_at', { ascending: false }),
    ]);
    setStore({
      trials: trialsRes.data ?? [],
      events: eventsRes.data ?? [],
      contentVariants: variantsRes.data ?? [],
      campaigns: campaignsRes.data ?? [],
      sessions: sessionsRes.data ?? [],
      trackedLinks: linksRes.data ?? [],
      loading: false,
    });
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  useEffect(() => {
    document.title = 'TrialMe — ' + (PAGES.find(p => p.id === page)?.label ?? '');
  }, [page]);

  // ── Auth loading screen ────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{
        height: '100vh', display: 'grid', placeItems: 'center',
        background: 'var(--cream)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="sb-mark" style={{ width: 48, height: 48, fontSize: 30, margin: '0 auto 12px' }}>t</div>
          <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>Loading…</div>
        </div>
      </div>
    );
  }

  // ── Sign-in gate ───────────────────────────────────────────
  if (!user) return <SignInPage />;

  // Authenticated but not provisioned in profiles.
  // Keep users out of the app until an admin invites/provisions them correctly.
  if (!profile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #4c081f 0%, #380515 100%)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 460,
          background: 'rgba(255,255,255,0.98)',
          border: '1px solid rgba(243,217,223,0.35)',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 16px 34px rgba(24,2,10,0.35)',
        }}>
          <h2 style={{ margin: 0, fontSize: 20, color: 'var(--burgundy)' }}>Access not provisioned</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--ink-soft)', fontSize: 13, lineHeight: 1.6 }}>
            Your account is authenticated but not active for this workspace yet. Ask an admin to invite your email address, then sign in again.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={async () => {
              await signOut();
            }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  const current = PAGES.find(p => p.id === page)!;
  const visiblePages = PAGES.filter(p => isAdmin || !p.adminOnly);

  const displayName = profile?.full_name || profile?.email || 'User';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
  };

  const renderCurrentPage = () => {
    if (page === 'overview') return <OverviewPage store={store} go={setPage as (p: string) => void} dateRange={dateRange} />;
    if (page === 'platforms') return <PlatformsPage store={store} />;
    if (page === 'events') return <EventsPage store={store} />;
    if (page === 'trials') return <TrialsPage store={store} />;
    if (page === 'funnel') return <FunnelPage store={store} />;
    if (page === 'config') return <ConfigPage store={store} setStore={setStore} toast={toast} reload={loadData} />;
    if (page === 'generator') return <GeneratorPage store={store} setStore={setStore} toast={toast} reload={loadData} />;
    if (page === 'settings') return <SettingsPage store={store} toast={toast} />;
    return null;
  };

  const canAccessCurrentPage = !current.adminOnly || isAdmin;

  return (
    <div className="dash-app">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="sb-brand">
          <div className="sb-mark">t</div>
          <div className="sb-wordmark">
            <span className="name">Trial<em>Me</em></span>
            <span className="sub">Attribution</span>
          </div>
        </div>

        <div className="sb-section-label">Analyse</div>
        <nav className="sb-nav">
          {visiblePages.map(p => {
            const Ic = Icons[p.icon];
            return (
              <div key={p.id}>
                {'divide' in p && p.divide && <div className="sb-section-label">Workspace</div>}
                <button
                  className={'sb-nav-item' + (page === p.id ? ' active' : '')}
                  onClick={() => setPage(p.id as PageId)}>
                  <span className="ico"><Ic size={18} /></span>
                  <span>{p.label}</span>
                </button>
              </div>
            );
          })}
        </nav>

        <div className="sb-foot">
          <div className="sb-avatar">{initials}</div>
          <div className="who">
            <span className="nm" title={profile?.email ?? ''}>{displayName}</span>
            <span style={{ fontSize: 10, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>
              {profile?.role ?? 'viewer'}
            </span>
          </div>
          <button
            className="btn-icon"
            onClick={handleSignOut}
            title="Sign out"
            style={{ marginLeft: 'auto', flexShrink: 0 }}
          >
            <Icons.LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="dash-main">
        <div className="dash-topbar">
          <Crumbs items={current.crumb} />
          <div className="topbar-actions">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <div className="pill"><span className="dot" /> Tracker live</div>
          </div>
        </div>

        <ProtectedRoute
          canAccess={canAccessCurrentPage}
          fallback={<ForbiddenPage onGoHome={() => setPage('overview')} />}
        >
          <div>{renderCurrentPage()}</div>
        </ProtectedRoute>
      </main>

      <Toast msg={toastMsg} onDone={() => setToastMsg(null)} />
    </div>
  );
}
