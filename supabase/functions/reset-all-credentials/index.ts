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
    const results = [];

    // Contas obrigatórias
    const accounts = [
      { email: 'admin@smooth.com.br', password: 'smooth123', name: 'Administrador Global', role: 'global' },
      { email: 'master@smooth.com.br', password: 'smooth123', name: 'Master da Rede', role: 'master' },
      { email: 'escritorio@smooth.com.br', password: 'smooth123', name: 'Gestor de Escritório', role: 'escritorio' },
      { email: 'assessor@smooth.com.br', password: 'smooth123', name: 'Assessor de Investimentos', role: 'assessor' },
      { email: 'investidor@smooth.com.br', password: 'smooth123', name: 'Investidor Demo', role: 'investidor' }
    ];

    // Primeiro, vamos verificar os roles existentes
    const rolesResponse = await fetch(`${supabaseUrl}/rest/v1/user_roles?select=*`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    });

    const roles = await rolesResponse.json();
    console.log('Roles disponíveis:', roles);

    for (const account of accounts) {
      try {
        // 1. Verificar se usuário existe no auth
        const usersListResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        });

        const usersList = await usersListResponse.json();
        const existingUser = usersList.users?.find(u => u.email === account.email);

        let authUserId;

        if (existingUser) {
          // 2. Atualizar senha do usuário existente
          const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existingUser.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey
            },
            body: JSON.stringify({
              password: account.password,
              email_confirm: true
            })
          });

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Erro ao atualizar ${account.email}: ${errorText}`);
          }

          authUserId = existingUser.id;
          results.push(`✅ Senha atualizada para ${account.email}`);
        } else {
          // 3. Criar novo usuário no auth
          const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey
            },
            body: JSON.stringify({
              email: account.email,
              password: account.password,
              email_confirm: true,
              user_metadata: {
                full_name: account.name
              }
            })
          });

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Erro ao criar ${account.email}: ${errorText}`);
          }

          const newUser = await createResponse.json();
          authUserId = newUser.id;
          results.push(`✅ Usuário criado: ${account.email}`);
        }

        // 4. Verificar/criar registro na tabela users
        const userCheckResponse = await fetch(`${supabaseUrl}/rest/v1/users?auth_user_id=eq.${authUserId}&select=*`, {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        });

        const userRecords = await userCheckResponse.json();

        if (!userRecords || userRecords.length === 0) {
          // Buscar role_id apropriado
          const targetRole = roles.find(r => r.name.toLowerCase() === account.role.toLowerCase());
          
          if (targetRole) {
            // Criar registro na tabela users
            const insertUserResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                auth_user_id: authUserId,
                email: account.email,
                full_name: account.name,
                role_id: targetRole.id,
                cpf_cnpj: account.role === 'investidor' ? '000.000.000-00' : '00.000.000/0001-00',
                phone: '+55 11 99999-0000',
                status: 'active',
                commission_percentage: account.role === 'assessor' ? 2.5 : 0
              })
            });

            if (insertUserResponse.ok) {
              results.push(`✅ Perfil criado para ${account.email} como ${account.role}`);
            } else {
              const errorText = await insertUserResponse.text();
              results.push(`⚠️ Erro ao criar perfil para ${account.email}: ${errorText}`);
            }
          }
        } else {
          results.push(`✅ Perfil já existe para ${account.email}`);
        }

      } catch (accountError) {
        results.push(`❌ Erro com ${account.email}: ${accountError.message}`);
      }
    }

    return new Response(JSON.stringify({ 
      data: { 
        message: 'Processo de reset das credenciais concluído',
        results: results,
        accounts: accounts.map(a => ({ email: a.email, password: a.password, role: a.role }))
      } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'CREDENTIAL_RESET_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});