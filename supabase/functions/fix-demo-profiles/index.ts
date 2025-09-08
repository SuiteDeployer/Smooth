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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    // Configurar conexão com Supabase
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey
    };

    // Buscar os roles
    const rolesResponse = await fetch(`${supabaseUrl}/rest/v1/user_roles?select=*`, {
      headers
    });
    const roles = await rolesResponse.json();
    const roleMap = roles.reduce((map, role) => {
      map[role.role_name] = role.id;
      return map;
    }, {});

    // Buscar usuários da auth
    const authUsersResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers
    });
    const authUsers = await authUsersResponse.json();

    const demoUsers = [
      { email: 'master@smooth.com.br', role: 'Master', name: 'Master Demonstração' },
      { email: 'escritorio@smooth.com.br', role: 'Escritório', name: 'Escritório Demonstração' },
      { email: 'assessor@smooth.com.br', role: 'Assessor', name: 'Assessor Demonstração' },
      { email: 'investidor@smooth.com.br', role: 'Investidor', name: 'Investidor Demonstração' }
    ];

    const results = [];

    for (const demoUser of demoUsers) {
      try {
        // Encontrar o usuário na auth
        const authUser = authUsers.users.find(u => u.email === demoUser.email);
        if (!authUser) {
          results.push(`❌ ${demoUser.email}: Usuário não encontrado na auth`);
          continue;
        }

        // Verificar se já existe na tabela users
        const existingUserResponse = await fetch(
          `${supabaseUrl}/rest/v1/users?auth_user_id=eq.${authUser.id}&select=*`,
          { headers }
        );
        const existingUsers = await existingUserResponse.json();

        if (existingUsers.length > 0) {
          results.push(`✅ ${demoUser.email}: Perfil já existe`);
          continue;
        }

        // Criar perfil na tabela users
        const roleId = roleMap[demoUser.role];
        if (!roleId) {
          results.push(`❌ ${demoUser.email}: Role ${demoUser.role} não encontrado`);
          continue;
        }

        const newUser = {
          id: crypto.randomUUID(),
          auth_user_id: authUser.id,
          email: demoUser.email,
          full_name: demoUser.name,
          role_id: roleId,
          status: 'active',
          company_name: `${demoUser.role} Demo`,
          cpf_cnpj: '000.000.000-00'
        };

        const createResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify(newUser)
        });

        if (createResponse.ok) {
          results.push(`✅ ${demoUser.email}: Perfil criado com sucesso`);
        } else {
          const error = await createResponse.text();
          results.push(`❌ ${demoUser.email}: Erro ao criar perfil - ${error}`);
        }

      } catch (error) {
        results.push(`❌ ${demoUser.email}: Erro - ${error.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Processamento dos perfis de demonstração concluído',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});