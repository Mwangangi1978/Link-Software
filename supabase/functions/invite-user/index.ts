import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // Verify the calling user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    // Admin client (service role) for privilege operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify caller is an admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!['head_admin', 'admin'].includes(callerProfile?.role ?? '')) {
      return json({ error: 'Only admin users can invite users' }, 403)
    }

    const { email, role = 'viewer', full_name } = await req.json()
    if (!email) return json({ error: 'Email is required' }, 400)
    if (!['head_admin', 'admin', 'viewer'].includes(role)) return json({ error: 'Invalid role' }, 400)

    // Send the Supabase invite email
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { role, full_name: full_name || null },
    })
    if (error) throw error
    const invitedEmail = data.user.email ?? email

    // Ensure invited_by and role/full_name metadata are persisted on profile.
    // The auth trigger typically creates this row, but we upsert defensively.
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: invitedEmail,
        role,
        full_name: full_name || null,
        invited_by: user.id,
      })

    return json({ success: true, user: { id: data.user.id, email: invitedEmail } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return json({ error: msg }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
