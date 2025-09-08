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

    const results = [];

    // Contas para sincronizar
    const accounts = [
      { email: 'admin@smooth.com.br', full_name: 'Administrador Global' },
      { email: 'master@smooth.com.br', full_name: 'Master Demonstração' },
      { email: 'escritorio@smooth.com.br', full_name: 'Escritório Demonstração' },
      { email: 'assessor@smooth.com.br', full_name: 'Assessor Demonstração' },
      { email: 'investidor@smooth.com.br', full_name: 'Investidor Demonstração' }
    ];

    // Para cada conta, tentar criar no auth.users
    for (const account of accounts) {
      try {
        const authResult = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({
            email: account.email,
            password: 'smooth123',
            email_confirm: true,
            user_metadata: {
              full_name: account.full_name
            }
          })
        });
        
        if (authResult.ok) {
          const authData = await authResult.json();
          
          // Atualizar o ID no public.users
          const updateResult = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${account.email}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify({
              id: authData.user.id
            })
          });
          
          results.push(`✅ ${account.email} - Auth criado e sincronizado`);
        } else {
          const errorData = await authResult.text();
          // Se já existe, apenas registrar
          if (errorData.includes('already been registered')) {
            results.push(`⚠️ ${account.email} - Já existe no auth`);
          } else {
            results.push(`❌ ${account.email} - ${errorData}`);
          }
        }
      } catch (accountError) {
        results.push(`❌ ${account.email} - ${accountError.message}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Auth sync completed',
      results
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