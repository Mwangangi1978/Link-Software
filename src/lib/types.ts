// Database types matching the Supabase schema

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      trials: {
        Row: Trial;
        Insert: Omit<Trial, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Trial>;
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Event>;
        Relationships: [];
      };
      content_variants: {
        Row: ContentVariant;
        Insert: Omit<ContentVariant, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<ContentVariant>;
        Relationships: [];
      };
      campaigns: {
        Row: Campaign;
        Insert: Omit<Campaign, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Campaign>;
        Relationships: [];
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Session>;
        Relationships: [];
      };
      tracked_links: {
        Row: TrackedLink;
        Insert: Omit<TrackedLink, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<TrackedLink>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TrackedLinkInsert = Database['public']['Tables']['tracked_links']['Insert'];

export interface Trial {
  id: string;
  name: string;
  slug: string;
  tally_form_id: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  name: string;
  partner: string;
  trial_id: string | null;
  cost: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentVariant {
  id: string;
  name: string;
  archived_at: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  archived_at: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  status: 'visit_logged' | 'form_submitted';
  link_type: 'platform' | 'event' | 'direct' | null;
  platform_id: string | null;
  is_paid: boolean | null;
  event_name: string | null;
  partner: string | null;
  trial_id: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  page_url: string;
  referrer_url: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  form_email_hash: string | null;
  visit_timestamp: string;
  submit_timestamp: string | null;
  time_on_page_sec: number | null;
  created_at: string;
  updated_at: string;
}

export interface TrackedLink {
  id: string;
  link_type: 'platform' | 'event' | 'direct';
  destination_url: string;
  full_tracked_url: string;
  platform_id: string | null;
  is_paid: boolean | null;
  amount_spent: number | null;
  event_id: string | null;
  trial_id: string | null;
  content_variant_id: string | null;
  campaign_id: string | null;
  qr_code_data: string | null;
  created_at: string;
}

// Aggregated view types used by the dashboard
export interface PlatformRow {
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

export interface EventRow {
  id: string;
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

export interface TrialRow extends Trial {
  visits: number;
  signups: number;
  spend: number;
  conv: number;
  cps: number;
  topPlatform: string;
  topEvent: string;
}

// The fixed platform enum (not stored in DB, system-level)
export interface Platform {
  id: string;
  name: string;
  color: string;
  type: string;
}

export const PLATFORMS: Platform[] = [
  { id: 'instagram', name: 'Instagram',       color: '#c13584', type: 'Social' },
  { id: 'substack',  name: 'Substack',        color: '#ff6719', type: 'Newsletter' },
  { id: 'meta',      name: 'Meta (Facebook)', color: '#1877f2', type: 'Social' },
  { id: 'tiktok',    name: 'TikTok',          color: '#010101', type: 'Social' },
  { id: 'linkedin',  name: 'LinkedIn',        color: '#0a66c2', type: 'Professional' },
  { id: 'x',         name: 'X (Twitter)',     color: '#0e0e0e', type: 'Social' },
  { id: 'youtube',   name: 'YouTube',         color: '#ff0000', type: 'Video' },
  { id: 'reddit',    name: 'Reddit',          color: '#ff4500', type: 'Community' },
];

export const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]));

export const TRACKING_SNIPPET = `<!-- TrialMe Attribution Tracker — paste in Squarespace Header Code Injection -->
<script>
(function () {
  var ENDPOINT = "https://icttlieskvejrddphtfi.supabase.co/rest/v1/sessions";
  var KEY = "${import.meta?.env?.VITE_SUPABASE_ANON_KEY ?? ''}";
  var params = new URLSearchParams(window.location.search);
  var sid = (crypto.randomUUID && crypto.randomUUID()) ||
            (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  try { sessionStorage.setItem("trialme_sid", sid); } catch (e) {}

  // ── Detect link type from URL params ──────────────────────
  var hasEvent = !!params.get("event");
  var hasPlatform = !!params.get("platform");
  var linkType = hasEvent ? "event" : hasPlatform ? "platform" : "direct";

  // ── Parse user-agent ──────────────────────────────────────
  var ua = navigator.userAgent || "";
  var device = /iPad|Tablet/i.test(ua) ? "tablet"
             : /Mobi|Android|iPhone|iPod/i.test(ua) ? "mobile"
             : "desktop";
  var browser = /Edg\\//.test(ua) ? "Edge"
              : /OPR\\/|Opera/.test(ua) ? "Opera"
              : /Chrome\\//.test(ua) ? "Chrome"
              : /Firefox\\//.test(ua) ? "Firefox"
              : /Safari\\//.test(ua) ? "Safari"
              : "Other";
  var os = /iPhone|iPad|iPod/.test(ua) ? "iOS"
         : /Android/.test(ua) ? "Android"
         : /Windows/.test(ua) ? "Windows"
         : /Mac OS X|Macintosh/.test(ua) ? "macOS"
         : /Linux/.test(ua) ? "Linux"
         : "Other";

  // ── Build payload from EVERY link-generator attribute ─────
  var payload = {
    id: sid,
    status: "visit_logged",
    link_type: linkType,
    platform_id: params.get("platform") || null,
    is_paid: params.get("paid") === "true",
    event_name: params.get("event") || null,
    partner: params.get("partner") || null,
    campaign: params.get("campaign") || null,
    content: params.get("content") || null,
    term: params.get("term") || null,
    page_url: window.location.href,
    referrer_url: document.referrer || null,
    user_agent: ua || null,
    device_type: device,
    browser: browser,
    os: os,
    visit_timestamp: new Date().toISOString(),
  };

  // Track time-on-page so submit_timestamp - visit_timestamp aligns with dwell time.
  var pageEnter = Date.now();
  try { sessionStorage.setItem("trialme_sid_ts", String(pageEnter)); } catch (e) {}

  fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": KEY,
      "Authorization": "Bearer " + KEY,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  // Inject the session id into Tally iframes so the Tally webhook can mark the matching session as form_submitted.
  function tagTallyIframes() {
    document.querySelectorAll('iframe[src*="tally.so"]').forEach(function (f) {
      try {
        var u = new URL(f.src);
        if (u.searchParams.get("trialme_sid") === sid) return;
        u.searchParams.set("trialme_sid", sid);
        f.src = u.toString();
      } catch (e) {}
    });
  }
  tagTallyIframes();
  // Re-tag for late-rendered iframes (Squarespace can hydrate after DOMContentLoaded).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tagTallyIframes);
  }
  setTimeout(tagTallyIframes, 1200);
})();
<\/script>`;
