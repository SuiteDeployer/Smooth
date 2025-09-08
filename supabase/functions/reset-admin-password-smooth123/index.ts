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
      throw new Error('Variáveis de ambiente não configuradas');
    }

    console.log('🔐 Iniciando reset da senha do admin...');

    // Resetar senha do usuário admin@smooth.com.br para "smooth123"
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    });

    if (!authResponse.ok) {
      throw new Error(`Erro ao listar usuários: ${authResponse.status}`);
    }

    const users = await authResponse.json();
    console.log('📋 Usuários encontrados:', users.users?.length || 0);

    // Encontrar o usuário admin
    const adminUser = users.users?.find(user => user.email === 'admin@smooth.com.br');
    
    if (!adminUser) {
      console.log('❌ Usuário admin@smooth.com.br não encontrado');
      return new Response(JSON.stringify({
        error: 'Usuário admin não encontrado'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('👤 Admin encontrado:', adminUser.id);

    // Resetar senha para "smooth123"
    const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${adminUser.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password: 'smooth123'
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Erro ao resetar senha: ${updateResponse.status} - ${errorText}`);
    }

    const updatedUser = await updateResponse.json();
    console.log('✅ Senha resetada com sucesso para smooth123');

    return new Response(JSON.stringify({
      success: true,
      message: 'Senha do admin resetada para smooth123',
      userId: adminUser.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Falha ao resetar senha do admin'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});