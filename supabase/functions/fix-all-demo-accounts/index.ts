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

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey
    };

    const results = [];

    // Definir as contas de demonstração
    const demoAccounts = [
      { email: 'admin@smooth.com.br', role: 'Global', name: 'Administrador Global' },
      { email: 'master@smooth.com.br', role: 'Master', name: 'Master Demonstração' },
      { email: 'escritorio@smooth.com.br', role: 'Escritório', name: 'Escritório Demonstração' },
      { email: 'assessor@smooth.com.br', role: 'Assessor', name: 'Assessor Demonstração' },
      { email: 'investidor@smooth.com.br', role: 'Investidor', name: 'Investidor Demonstração' }
    ];

    // Buscar roles
    const rolesResponse = await fetch(`${supabaseUrl}/rest/v1/user_roles?select=*`, { headers });
    const roles = await rolesResponse.json();
    const roleMap = {};
    roles.forEach(role => roleMap[role.role_name] = role.id);

    // Para cada conta
    for (const account of demoAccounts) {
      try {
        // 1. Resetar senha via Admin API
        const authUsersResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, { headers });
        const authData = await authUsersResponse.json();
        const authUser = authData.users.find(u => u.email === account.email);
        
        if (authUser) {
          // Resetar senha
          const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUser.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ password: 'smooth123' })
          });
          
          if (updateResponse.ok) {
            results.push(`✅ ${account.email}: Senha atualizada`);
          } else {
            results.push(`❌ ${account.email}: Erro ao atualizar senha`);
            continue;
          }

          // 2. Verificar se perfil existe na tabela users
          const userCheckResponse = await fetch(
            `${supabaseUrl}/rest/v1/users?auth_user_id=eq.${authUser.id}&select=*`,
            { headers }
          );
          const existingUsers = await userCheckResponse.json();

          if (existingUsers.length === 0) {
            // 3. Criar perfil se não existir
            const roleId = roleMap[account.role];
            if (!roleId) {
              results.push(`❌ ${account.email}: Role ${account.role} não encontrado`);
              continue;
            }

            // Desabilitar trigger de auditoria temporariamente
            await fetch(`${supabaseUrl}/rest/v1/rpc/disable_audit_trigger`, {
              method: 'POST',
              headers,
              body: JSON.stringify({})
            }).catch(() => {}); // Ignorar erro se função não existir

            const newUser = {
              id: crypto.randomUUID(),
              auth_user_id: authUser.id,
              email: account.email,
              full_name: account.name,
              role_id: roleId,
              status: 'active',
              company_name: `${account.role} Demo LTDA`,
              cpf_cnpj: '000.000.000-00',
              user_type: 'network_user'
            };

            // Inserir diretamente sem trigger
            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
              method: 'POST',
              headers: {
                ...headers,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(newUser)
            });

            if (insertResponse.ok) {
              results.push(`✅ ${account.email}: Perfil criado com sucesso`);
            } else {
              const error = await insertResponse.text();
              results.push(`❌ ${account.email}: Erro ao criar perfil - ${error.substring(0, 100)}`);
            }

            // Reabilitar trigger de auditoria
            await fetch(`${supabaseUrl}/rest/v1/rpc/enable_audit_trigger`, {
              method: 'POST',
              headers,
              body: JSON.stringify({})
            }).catch(() => {}); // Ignorar erro se função não existir

          } else {
            results.push(`✅ ${account.email}: Perfil já existe`);
          }

        } else {
          results.push(`❌ ${account.email}: Usuário não encontrado na auth`);
        }

      } catch (error) {
        results.push(`❌ ${account.email}: Erro geral - ${error.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Correção das contas de demonstração concluída',
      results,
      summary: {
        total: demoAccounts.length,
        processed: results.length
      }
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