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

    // 1. PRIMEIRO: Deletar TODOS os usuários da tabela public.users
    const deleteAllPublicUsersResult = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    results.push(`All public users deleted: ${deleteAllPublicUsersResult.status}`);

    // 2. Obter todos os usuários do auth.users para deletar
    const authUsersResult = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    
    if (authUsersResult.ok) {
      const authUsersData = await authUsersResult.json();
      
      // Deletar cada usuário do auth.users
      for (const user of authUsersData.users || []) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY
          }
        });
      }
      results.push(`Auth users deleted: ${authUsersData.users?.length || 0}`);
    }

    // 3. Criar APENAS as 5 contas de demonstração
    const demoAccounts = [
      {
        email: 'admin@smooth.com.br',
        password: 'smooth123',
        full_name: 'Administrador Global',
        role: 'Global'
      },
      {
        email: 'master@smooth.com.br',
        password: 'smooth123',
        full_name: 'Master Demonstração',
        role: 'Master'
      },
      {
        email: 'escritorio@smooth.com.br',
        password: 'smooth123',
        full_name: 'Escritório Demonstração',
        role: 'Escritório'
      },
      {
        email: 'assessor@smooth.com.br',
        password: 'smooth123',
        full_name: 'Assessor Demonstração',
        role: 'Assessor'
      },
      {
        email: 'investidor@smooth.com.br',
        password: 'smooth123',
        full_name: 'Investidor Demonstração',
        role: 'Investidor'
      }
    ];

    // Criar cada conta de demonstração
    for (const account of demoAccounts) {
      // Criar no auth.users
      const authResult = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            full_name: account.full_name
          }
        })
      });
      
      if (authResult.ok) {
        const authData = await authResult.json();
        
        // Buscar role_id correspondente
        const roleResult = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?role_name=eq.${account.role}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY
          }
        });
        
        let roleId = null;
        if (roleResult.ok) {
          const roleData = await roleResult.json();
          roleId = roleData[0]?.id;
        }
        
        // Criar no public.users
        const publicUserResult = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            id: authData.user.id,
            email: account.email,
            full_name: account.full_name,
            status: 'active',
            role_id: roleId
          })
        });
        
        results.push(`Demo account created: ${account.email} (${account.role})`);
      } else {
        results.push(`Failed to create: ${account.email}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Demo accounts created successfully',
      results,
      demo_accounts: demoAccounts.map(acc => ({ email: acc.email, role: acc.role }))
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