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

    console.log('🔐 Diagnóstico e correção do usuário admin...');

    // 1. Listar todos os usuários do auth
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
    console.log('📋 Total de usuários no auth:', users.users?.length || 0);

    // 2. Buscar usuário admin específico
    let adminUser = users.users?.find(user => user.email === 'admin@smooth.com.br');
    
    if (!adminUser) {
      console.log('❌ Usuário admin não encontrado no Auth. Criando...');
      
      // Criar usuário no Auth do Supabase
      const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'admin@smooth.com.br',
          password: 'smooth123',
          email_confirm: true,
          user_metadata: {
            full_name: 'Administrador Global'
          }
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Erro ao criar usuário: ${createResponse.status} - ${errorText}`);
      }

      adminUser = await createResponse.json();
      console.log('✅ Usuário admin criado:', adminUser.id);
    } else {
      console.log('👤 Usuário admin encontrado:', adminUser.id);
      console.log('📧 Email confirmado:', adminUser.email_confirmed_at ? 'Sim' : 'Não');
      console.log('🔒 Último login:', adminUser.last_sign_in_at || 'Nunca');
      
      // Garantir que o email está confirmado e resetar senha
      const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${adminUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: 'smooth123',
          email_confirm: true
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Erro ao atualizar usuário: ${updateResponse.status} - ${errorText}`);
      }

      console.log('✅ Usuário atualizado com senha smooth123 e email confirmado');
    }

    // 3. Verificar se existe registro na tabela users
    const dbCheckResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.admin@smooth.com.br&select=*`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    });

    if (dbCheckResponse.ok) {
      const dbUsers = await dbCheckResponse.json();
      console.log('📊 Usuários na tabela users:', dbUsers.length);
      
      if (dbUsers.length === 0) {
        console.log('⚠️ Usuário não existe na tabela users. Isso pode causar problemas de perfil.');
      } else {
        console.log('✅ Usuário existe na tabela users:', dbUsers[0].id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Usuário admin corrigido',
      userId: adminUser.id,
      email: adminUser.email,
      emailConfirmed: adminUser.email_confirmed_at ? true : false,
      details: 'Login deve funcionar com admin@smooth.com.br / smooth123'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Falha ao corrigir autenticação do admin'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});