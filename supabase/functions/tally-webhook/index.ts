// Tally → Supabase webhook
// Receives form-submission events from Tally, finds the matching session via
// the `trialme_sid` hidden field (injected into the iframe by the tracker),
// and flips it to status = 'form_submitted'.
//
// Configure on the Tally side:
//   Form → Integrations → Webhooks → Endpoint:
//   https://<project>.supabase.co/functions/v1/tally-webhook
//   Method: POST, Content-Type: application/json
//
// Tally's hidden fields are populated from the iframe URL params, so the
// tracker's `?trialme_sid=<sid>` is preserved in `data.fields[].key === 'trialme_sid'`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, tally-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface TallyField {
  key: string
  label: string
  type: string
  value: unknown
}

interface TallyPayload {
  eventId?: string
  eventType?: string
  createdAt?: string
  data?: {
    responseId?: string
    submissionId?: string
    formId?: string
    formName?: string
    fields?: TallyField[]
    hiddenFields?: Record<string, unknown>
  }
}

// Lift a value out of the Tally fields array, looking at:
//   - exact key match
//   - case-insensitive label match
//   - field type (e.g. INPUT_EMAIL)
function pickField(fields: TallyField[] | undefined, opts: {
  key?: string
  labelMatch?: RegExp
  type?: string | string[]
}): unknown {
  if (!fields) return null
  for (const f of fields) {
    if (opts.key && f.key === opts.key) return f.value
    if (opts.type) {
      const types = Array.isArray(opts.type) ? opts.type : [opts.type]
      if (types.includes(f.type)) return f.value
    }
    if (opts.labelMatch && opts.labelMatch.test(f.label || '')) return f.value
  }
  return null
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase())
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let payload: TallyPayload
  try {
    payload = await req.json() as TallyPayload
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const fields = payload.data?.fields ?? []
  const hidden = payload.data?.hiddenFields ?? {}

  // 1. Find the session id passed by the tracker
  const sid = (
    hidden['trialme_sid'] ??
    pickField(fields, { key: 'trialme_sid' }) ??
    pickField(fields, { labelMatch: /^trialme_sid$/i })
  ) as string | null

  if (!sid || typeof sid !== 'string') {
    return json({
      error: 'Missing trialme_sid',
      hint: 'Verify the tracker injected ?trialme_sid into the Tally iframe URL.',
    }, 400)
  }

  // 2. Optional: hash the email so we can de-duplicate downstream without storing PII
  const email = pickField(fields, {
    type: ['INPUT_EMAIL', 'EMAIL'],
    labelMatch: /e[- ]?mail/i,
  }) as string | null
  const emailHash = email ? await sha256Hex(email) : null

  // 3. Update the matching session row
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const submitTs = payload.createdAt ?? new Date().toISOString()

  const { data, error } = await supabase
    .from('sessions')
    .update({
      status: 'form_submitted',
      submit_timestamp: submitTs,
      form_email_hash: emailHash,
    })
    .eq('id', sid)
    .select('id, trial_id, link_type, platform_id, event_name')

  if (error) {
    return json({ error: error.message }, 500)
  }
  if (!data || data.length === 0) {
    // No matching visit — most likely the visitor opened the Tally form on a page
    // where the tracker hadn't run yet. Insert a stub so the conversion still counts.
    const { error: insertError } = await supabase
      .from('sessions')
      .insert({
        id: sid,
        status: 'form_submitted',
        link_type: 'direct',
        page_url: payload.data?.formName
          ? `tally://${payload.data.formId}/${payload.data.formName}`
          : 'tally://unknown',
        visit_timestamp: submitTs,
        submit_timestamp: submitTs,
        form_email_hash: emailHash,
      })
    if (insertError) {
      return json({ error: insertError.message, note: 'Stub insert failed' }, 500)
    }
    return json({ ok: true, matched: false, inserted: true, sid })
  }

  return json({ ok: true, matched: true, sid, session: data[0] })
})
