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

        console.log('=== INICIANDO LIMPEZA DE USUÁRIOS ===');

        const testUsers = [
            'Master@otmow.com', 'Esc@otmow.com', 'Asse@otmow.com', 'Invs@otmow.com',
            'mast@otmow.com', 'Esc2@otmow.com', 'ass2@otmow.com', 'inv2@otmow.com'
        ];

        const demoAccounts = [
            { email: 'admin@smooth.com.br', password: 'smooth123', user_type: 'network_user', full_name: 'Administrador Global' },
            { email: 'master@smooth.com.br', password: 'smooth123', user_type: 'network_user', full_name: 'Master Demonstração' },
            { email: 'escritorio@smooth.com.br', password: 'smooth123', user_type: 'network_user', full_name: 'Escritório Demonstração' },
            { email: 'assessor@smooth.com.br', password: 'smooth123', user_type: 'network_user', full_name: 'Assessor Demonstração' },
            { email: 'investidor@smooth.com.br', password: 'smooth123', user_type: 'network_user', full_name: 'Investidor Demonstração' }
        ];

        const results = {
            deletedUsers: [],
            createdUsers: [],
            existingUsers: [],
            errors: []
        };

        console.log('=== FASE 1: DELETANDO USUÁRIOS DE TESTE ===');
        
        for (const email of testUsers) {
            try {
                const userQuery = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${email}`, {
                    headers: {
                        'apikey': supabaseServiceRoleKey,
                        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                const userData = await userQuery.json();
                
                if (userData.length > 0) {
                    const userId = userData[0].id;
                    const authUserId = userData[0].auth_user_id;

                    if (authUserId) {
                        const authDeleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
                            method: 'DELETE',
                            headers: {
                                'apikey': supabaseServiceRoleKey,
                                'Authorization': `Bearer ${supabaseServiceRoleKey}`
                            }
                        });

                        if (!authDeleteResponse.ok) {
                            console.log(`Erro ao deletar do auth ${email}:`, await authDeleteResponse.text());
                        }
                    }

                    const tableDeleteResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
                        method: 'DELETE',
                        headers: {
                            'apikey': supabaseServiceRoleKey,
                            'Authorization': `Bearer ${supabaseServiceRoleKey}`
                        }
                    });

                    if (tableDeleteResponse.ok) {
                        results.deletedUsers.push(email);
                        console.log(`✓ Usuário deletado: ${email}`);
                    } else {
                        const error = `Erro ao deletar da tabela: ${email}`;
                        results.errors.push(error);
                        console.log(`✗ ${error}`);
                    }
                } else {
                    console.log(`- Usuário não encontrado: ${email}`);
                }
            } catch (error) {
                const errorMsg = `Erro ao deletar ${email}: ${error.message}`;
                results.errors.push(errorMsg);
                console.log(`✗ ${errorMsg}`);
            }
        }

        console.log('=== FASE 2: VERIFICANDO/CRIANDO CONTAS DEMO ===');

        for (const account of demoAccounts) {
            try {
                const existingUserQuery = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${account.email}`, {
                    headers: {
                        'apikey': supabaseServiceRoleKey,
                        'Authorization': `Bearer ${supabaseServiceRoleKey}`
                    }
                });

                const existingUserData = await existingUserQuery.json();
                
                if (existingUserData.length > 0) {
                    results.existingUsers.push(account.email);
                    console.log(`✓ Conta demo já existe: ${account.email}`);
                    
                    const authUserId = existingUserData[0].auth_user_id;
                    if (authUserId) {
                        await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
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
                        console.log(`✓ Senha resetada para: ${account.email}`);
                    }
                } else {
                    console.log(`Criando conta demo: ${account.email}`);
                    
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
                const errorMsg = `Erro ao processar conta demo ${account.email}: ${error.message}`;
                results.errors.push(errorMsg);
                console.log(`✗ ${errorMsg}`);
            }
        }

        console.log('=== FASE 3: VERIFICAÇÃO FINAL ===');
        
        const finalUsersQuery = await fetch(`${supabaseUrl}/rest/v1/users?select=email,user_type,full_name,status`, {
            headers: {
                'apikey': supabaseServiceRoleKey,
                'Authorization': `Bearer ${supabaseServiceRoleKey}`
            }
        });

        const finalUsers = await finalUsersQuery.json();
        results.finalUsers = finalUsers;

        console.log('=== LIMPEZA CONCLUÍDA ===');
        console.log(`Usuários deletados: ${results.deletedUsers.length}`);
        console.log(`Usuários criados: ${results.createdUsers.length}`);
        console.log(`Usuários existentes: ${results.existingUsers.length}`);
        console.log(`Erros: ${results.errors.length}`);
        console.log(`Total final de usuários: ${finalUsers.length}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Limpeza de usuários concluída com sucesso',
            data: results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Erro na limpeza de usuários:', error);
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