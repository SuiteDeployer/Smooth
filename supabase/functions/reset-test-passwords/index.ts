Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    
    if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) {
      throw new Error('Missing Supabase credentials');
    }

    // Reset admin password
    const adminResult = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        email: 'admin@smooth.com.br',
        password: 'smooth123',
        email_confirm: true,
        user_metadata: {
          full_name: 'Administrador Smooth'
        }
      })
    });

    // Create master test user
    const masterResult = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST', 
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        email: 'master@smooth.com.br',
        password: 'smooth123',
        email_confirm: true,
        user_metadata: {
          full_name: 'Master Teste'
        }
      })
    });

    const masterData = await masterResult.json();
    
    if (masterData.user) {
      // Insert master user in public.users table
      const publicUserResult = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id: masterData.user.id,
          email: 'master@smooth.com.br',
          full_name: 'Master Teste',
          role: 'Master',
          status: 'active'
        })
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Passwords reset and master user created',
      admin_email: 'admin@smooth.com.br',
      master_email: 'master@smooth.com.br',
      password: 'smooth123'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});