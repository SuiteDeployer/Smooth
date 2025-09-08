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
    
    if (!serviceRoleKey) {
      throw new Error('Service role key não configurada');
    }

    const supabaseUrl = 'https://cisoewbdzdxombthxqfi.supabase.co';
    
    // Teste direto da consulta que pode estar causando timeout
    const { email } = await req.json().catch(() => ({ email: 'admin@smooth.com.br' }));
    
    console.log('Testando consulta para:', email);
    
    // Consulta simples primeiro
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=*`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Erro na consulta users: ${errorText}`);
    }

    const users = await userResponse.json();
    
    if (!users || users.length === 0) {
      throw new Error(`Usuário não encontrado: ${email}`);
    }

    const user = users[0];
    console.log('Usuário encontrado:', user);

    // Buscar role info
    const roleResponse = await fetch(`${supabaseUrl}/rest/v1/user_roles?id=eq.${user.role_id}&select=*`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    const roles = await roleResponse.json();
    const role = roles && roles.length > 0 ? roles[0] : null;

    return new Response(JSON.stringify({ 
      data: { 
        message: 'Teste de perfil bem-sucedido',
        user: {
          ...user,
          role_name: role ? role.name : 'Sem role',
          role_description: role ? role.description : 'Role não encontrada'
        }
      } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro no teste:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'TEST_PROFILE_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});