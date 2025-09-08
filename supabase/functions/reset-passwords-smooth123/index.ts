Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Missing Supabase credentials');
    }

    // Usuários para resetar senha
    const users = [
      { email: 'admin@smooth.com.br', id: '43c67ef5-61d4-4155-8500-9b2b7b5e74f1' },
      { email: 'master@smooth.com.br', id: '7f9d7a1a-de4c-4daf-8624-06b1afad692a' },
      { email: 'escritorio@smooth.com.br', id: '596fc018-7727-45e7-bcca-eca42fef85b0' },
      { email: 'assessor@smooth.com.br', id: '819bae8c-4bf4-4f3f-9d78-656f07bc950a' },
      { email: 'investidor@smooth.com.br', id: '4dd6e8e2-74eb-49b8-8728-fd3850dc90f2' }
    ];

    const results = [];

    for (const user of users) {
      try {
        // Reset password usando Admin API
        const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey
          },
          body: JSON.stringify({
            password: 'smooth123',
            email_confirm: true
          })
        });

        if (response.ok) {
          results.push({ email: user.email, status: 'success' });
        } else {
          const error = await response.text();
          results.push({ email: user.email, status: 'error', error: error });
        }
      } catch (error) {
        results.push({ email: user.email, status: 'error', error: error.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Senhas resetadas para smooth123',
      results: results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao resetar senhas:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno', 
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});