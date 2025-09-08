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
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!supabaseServiceRoleKey || !supabaseUrl) {
            throw new Error('Credenciais do Supabase não configuradas');
        }

        console.log('=== FINALIZANDO CONFIGURAÇÃO DAS CONTAS DEMO ===');

        const missingAccounts = [
            { email: 'master@smooth.com.br', password: 'smooth123', user_type: 'master', detailed_user_type: 'Master', full_name: 'Master Demonstração' },
            { email: 'escritorio@smooth.com.br', password: 'smooth123', user_type: 'escritorio', detailed_user_type: 'Escritorio', full_name: 'Escritório Demonstração' },
            { email: 'assessor@smooth.com.br', password: 'smooth123', user_type: 'assessor', detailed_user_type: 'Assessor', full_name: 'Assessor Demonstração' },
            { email: 'investidor@smooth.com.br', password: 'smooth123', user_type: 'investidor', detailed_user_type: 'Investidor', full_name: 'Investidor Demonstração' }
        ];

        const results = {
            createdUsers: [],
            fixedUsers: [],
            errors: []
        };

        for (const account of missingAccounts) {
            try {
                console.log(`Processando conta: ${account.email}`);
                
                // Buscar se já existe na tabela users
                const existingUserQuery = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${account.email}`, {
                    headers: {
                        'apikey': supabaseServiceRoleKey,
                        'Authorization': `Bearer ${supabaseServiceRoleKey}`
                    }
                });

                const existingUserData = await existingUserQuery.json();
                
                if (existingUserData.length > 0) {
                    console.log(`Conta já existe na tabela users: ${account.email}`);
                    continue;
                }

                // Buscar no auth para obter o auth_user_id
                const authListResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                    headers: {
                        'apikey': supabaseServiceRoleKey,
                        'Authorization': `Bearer ${supabaseServiceRoleKey}`
                    }
                });

                if (!authListResponse.ok) {
                    throw new Error('Erro ao listar usuários do auth');
                }

                const authUsers = await authListResponse.json();
                const authUser = authUsers.users.find(u => u.email === account.email);
                
                if (authUser) {
                    console.log(`Encontrado no auth, criando na tabela users: ${account.email}`);
                    
                    // Reset da senha
                    await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUser.id}`, {
                        method: 'PUT',
                        headers: {
                            'apikey': supabaseServiceRoleKey,
                            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            password: account.password
                        })
                    });

                    // Criar entrada na tabela users
                    const userResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseServiceRoleKey,
                            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            auth_user_id: authUser.id,
                            email: account.email,
                            user_type: account.user_type,
                            detailed_user_type: account.detailed_user_type,
                            full_name: account.full_name,
                            status: 'active'
                        })
                    });

                    if (userResponse.ok) {
                        results.fixedUsers.push(account.email);
                        console.log(`✓ Conta demo configurada: ${account.email}`);
                    } else {
                        const errorText = await userResponse.text();
                        console.log(`Erro ao criar na tabela users: ${errorText}`);
                        results.errors.push(`${account.email}: ${errorText}`);
                    }
                } else {
                    console.log(`Não encontrado no auth, criando nova conta: ${account.email}`);
                    
                    // Criar no auth
                    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseServiceRoleKey,
                            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: account.email,
                            password: account.password,
                            email_confirm: true
                        })
                    });

                    if (!authResponse.ok) {
                        const errorText = await authResponse.text();
                        throw new Error(`Erro ao criar no auth: ${errorText}`);
                    }

                    const authData = await authResponse.json();
                    const authUserId = authData.id;

                    // Criar na tabela users
                    const userResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseServiceRoleKey,
                            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            auth_user_id: authUserId,
                            email: account.email,
                            user_type: account.user_type,
                            detailed_user_type: account.detailed_user_type,
                            full_name: account.full_name,
                            status: 'active'
                        })
                    });

                    if (userResponse.ok) {
                        results.createdUsers.push(account.email);
                        console.log(`✓ Conta demo criada: ${account.email}`);
                    } else {
                        const errorText = await userResponse.text();
                        throw new Error(`Erro ao criar na tabela users: ${errorText}`);
                    }
                }
            } catch (error) {
                const errorMsg = `Erro ao processar ${account.email}: ${error.message}`;
                results.errors.push(errorMsg);
                console.log(`✗ ${errorMsg}`);
            }
        }

        // Verificação final
        console.log('=== VERIFICAÇÃO FINAL DAS CONTAS DEMO ===');
        
        const finalUsersQuery = await fetch(`${supabaseUrl}/rest/v1/users?select=email,user_type,detailed_user_type,full_name,status&order=email`, {
            headers: {
                'apikey': supabaseServiceRoleKey,
                'Authorization': `Bearer ${supabaseServiceRoleKey}`
            }
        });

        const finalUsers = await finalUsersQuery.json();
        results.finalUsers = finalUsers;

        console.log('=== CONFIGURAÇÃO FINALIZADA ===');
        console.log(`Usuários criados: ${results.createdUsers.length}`);
        console.log(`Usuários corrigidos: ${results.fixedUsers.length}`);
        console.log(`Erros: ${results.errors.length}`);
        console.log(`Total final de usuários: ${finalUsers.length}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Configuração das contas demo finalizada com sucesso',
            data: results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Erro na configuração das contas demo:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});