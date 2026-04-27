import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return json('ok', 200)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    // Verify the calling user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    // Service-role client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Only head_admin may delete users
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'head_admin') {
      return json({ error: 'Only the head admin can remove members' }, 403)
    }

    const { userId } = await req.json()
    if (!userId) return json({ error: 'userId is required' }, 400)

    // Prevent self-deletion
    if (userId === user.id) {
      return json({ error: 'You cannot delete your own account' }, 400)
    }

    // Null out invited_by references before deletion so the FK doesn't block.
    // (The migration adds ON DELETE SET NULL, but this guards older deployments.)
    await supabaseAdmin
      .from('profiles')
      .update({ invited_by: null })
      .eq('invited_by', userId)

    // Delete the auth user — cascades to public.profiles via ON DELETE CASCADE
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error

    return json({ success: true })
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
