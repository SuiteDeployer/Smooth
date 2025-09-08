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
            throw new Error('Configuração do Supabase não encontrada');
        }

        // Contas de demonstração para criar
        const demoAccounts = [
            {
                email: 'admin@smooth.com.br',
                password: 'admin123'
            },
            {
                email: 'master@smooth.com.br', 
                password: 'admin123'
            },
            {
                email: 'escritorio@smooth.com.br',
                password: 'admin123'
            },
            {
                email: 'assessor@smooth.com.br',
                password: 'admin123'
            },
            {
                email: 'investidor@smooth.com.br',
                password: 'admin123'
            }
        ];

        const results = [];

        for (const account of demoAccounts) {
            try {
                // Criar conta no Supabase Auth
                const createAuthResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: account.email,
                        password: account.password,
                        email_confirm: true,
                        user_metadata: {
                            created_by: 'demo_setup'
                        }
                    })
                });

                if (createAuthResponse.ok) {
                    const authUser = await createAuthResponse.json();
                    
                    // Atualizar o usuário na tabela users com o auth_user_id
                    const updateUserResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${account.email}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            auth_user_id: authUser.id
                        })
                    });

                    if (updateUserResponse.ok) {
                        results.push({
                            email: account.email,
                            status: 'sucesso',
                            auth_user_id: authUser.id
                        });
                    } else {
                        results.push({
                            email: account.email,
                            status: 'erro ao conectar usuário',
                            error: await updateUserResponse.text()
                        });
                    }
                } else {
                    const errorData = await createAuthResponse.text();
                    
                    // Se a conta já existe, pode ser um erro esperado
                    if (errorData.includes('already') || errorData.includes('exists')) {
                        results.push({
                            email: account.email,
                            status: 'já existe',
                            message: 'Conta já foi criada anteriormente'
                        });
                    } else {
                        results.push({
                            email: account.email,
                            status: 'erro ao criar auth',
                            error: errorData
                        });
                    }
                }
            } catch (accountError) {
                results.push({
                    email: account.email,
                    status: 'erro',
                    error: accountError.message
                });
            }
        }

        return new Response(JSON.stringify({
            data: {
                message: 'Processamento das contas de demonstração concluído',
                results: results,
                total_processed: demoAccounts.length
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao criar contas de demonstração:', error);

        const errorResponse = {
            error: {
                code: 'DEMO_ACCOUNTS_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});