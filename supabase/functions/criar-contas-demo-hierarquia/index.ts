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

        console.log('=== CRIANDO CONTAS DEMO COM HIERARQUIA CORRETA ===');

        // Buscar role IDs
        const rolesQuery = await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
            headers: {
                'apikey': supabaseServiceRoleKey,
                'Authorization': `Bearer ${supabaseServiceRoleKey}`
            }
        });
        
        const roles = await rolesQuery.json();
        const roleMap = roles.reduce((map, role) => {
            map[role.role_name] = role.id;
            return map;
        }, {});

        console.log('Roles disponíveis:', Object.keys(roleMap));

        // Buscar usuário Global (admin@smooth.com.br) para usar como superior
        const globalUserQuery = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.admin@smooth.com.br`, {
            headers: {
                'apikey': supabaseServiceRoleKey,
                'Authorization': `Bearer ${supabaseServiceRoleKey}`
            }
        });
        
        const globalUserData = await globalUserQuery.json();
        if (globalUserData.length === 0) {
            throw new Error('Usuário Global (admin@smooth.com.br) não encontrado');
        }
        
        const globalUserId = globalUserData[0].id;
        console.log('Global User ID:', globalUserId);

        const results = {
            createdUsers: [],
            errors: [],
            userIds: {}
        };

        // Sequência de criação respeitando a hierarquia
        const accountsSequence = [
            { email: 'master@smooth.com.br', password: 'smooth123', role: 'Master', full_name: 'Master Demonstração', superiorId: globalUserId },
            { email: 'escritorio@smooth.com.br', password: 'smooth123', role: 'Escritório', full_name: 'Escritório Demonstração', superiorId: null }, // Será definido após criar master
            { email: 'assessor@smooth.com.br', password: 'smooth123', role: 'Assessor', full_name: 'Assessor Demonstração', superiorId: null }, // Será definido após criar escritorio
            { email: 'investidor@smooth.com.br', password: 'smooth123', role: 'Investidor', full_name: 'Investidor Demonstração', superiorId: null } // Será definido após criar assessor
        ];

        for (let i = 0; i < accountsSequence.length; i++) {
            const account = accountsSequence[i];
            
            try {
                console.log(`\n--- Processando: ${account.email} ---`);
                
                // Verificar se já existe
                const existingQuery = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${account.email}`, {
                    headers: {
                        'apikey': supabaseServiceRoleKey,
                        'Authorization': `Bearer ${supabaseServiceRoleKey}`
                    }
                });
                
                const existingData = await existingQuery.json();
                if (existingData.length > 0) {
                    console.log(`Conta já existe: ${account.email}`);
                    results.userIds[account.role] = existingData[0].id;
                    continue;
                }

                // Definir superiorId baseado na hierarquia
                let superiorId = account.superiorId;
                if (account.role === 'Escritório') {
                    superiorId = results.userIds['Master'];
                } else if (account.role === 'Assessor') {
                    superiorId = results.userIds['Escritório'];
                } else if (account.role === 'Investidor') {
                    superiorId = results.userIds['Assessor'];
                }

                console.log(`Role: ${account.role}, Superior ID: ${superiorId}`);
                console.log(`Role ID: ${roleMap[account.role]}`);

                // Buscar no auth
                const authListResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                    headers: {
                        'apikey': supabaseServiceRoleKey,
                        'Authorization': `Bearer ${supabaseServiceRoleKey}`
                    }
                });
                
                const authUsers = await authListResponse.json();
                let authUser = authUsers.users.find(u => u.email === account.email);
                
                let authUserId;
                if (authUser) {
                    console.log('Encontrado no auth, atualizando senha');
                    authUserId = authUser.id;
                    
                    // Reset password
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
                } else {
                    console.log('Criando no auth');
                    
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
                    authUserId = authData.id;
                }

                // Criar na tabela users
                console.log('Criando na tabela users...');
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
                        role_id: roleMap[account.role],
                        superior_user_id: superiorId,
                        full_name: account.full_name,
                        company_name: 'Smooth Demonstração',
                        status: 'active'
                    })
                });
                
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    const userId = userData[0].id;
                    results.userIds[account.role] = userId;
                    results.createdUsers.push(account.email);
                    console.log(`✓ Conta criada com sucesso: ${account.email} (ID: ${userId})`);
                } else {
                    const errorText = await userResponse.text();
                    throw new Error(`Erro ao criar na tabela users: ${errorText}`);
                }
                
            } catch (error) {
                const errorMsg = `Erro ao processar ${account.email}: ${error.message}`;
                results.errors.push(errorMsg);
                console.log(`✗ ${errorMsg}`);
                break; // Parar a sequência se houver erro
            }
        }

        // Verificação final
        console.log('\n=== VERIFICAÇÃO FINAL ===');
        
        const finalUsersQuery = await fetch(`${supabaseUrl}/rest/v1/users?select=email,full_name,status,user_roles(role_name)&order=email`, {
            headers: {
                'apikey': supabaseServiceRoleKey,
                'Authorization': `Bearer ${supabaseServiceRoleKey}`
            }
        });
        
        const finalUsers = await finalUsersQuery.json();
        results.finalUsers = finalUsers;

        console.log(`Total de usuários: ${finalUsers.length}`);
        console.log(`Contas criadas: ${results.createdUsers.length}`);
        console.log(`Erros: ${results.errors.length}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Contas demo configuradas com hierarquia correta',
            data: results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Erro na criação das contas demo:', error);
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