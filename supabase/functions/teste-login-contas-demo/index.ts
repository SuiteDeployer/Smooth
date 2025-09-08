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
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!supabaseServiceRoleKey || !supabaseUrl || !supabaseAnonKey) {
            throw new Error('Credenciais do Supabase não configuradas');
        }

        console.log('=== TESTANDO LOGIN DAS CONTAS DEMO ===');

        const testAccounts = [
            { email: 'admin@smooth.com.br', password: 'smooth123' },
            { email: 'master@smooth.com.br', password: 'smooth123' },
            { email: 'escritorio@smooth.com.br', password: 'smooth123' },
            { email: 'assessor@smooth.com.br', password: 'smooth123' },
            { email: 'investidor@smooth.com.br', password: 'smooth123' }
        ];

        const results = {
            loginTests: [],
            successCount: 0,
            errorCount: 0
        };

        for (const account of testAccounts) {
            try {
                console.log(`Testando login: ${account.email}`);
                
                // Tentar fazer login usando auth
                const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseAnonKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: account.email,
                        password: account.password
                    })
                });

                const loginData = await loginResponse.json();
                
                if (loginResponse.ok && loginData.access_token) {
                    results.loginTests.push({
                        email: account.email,
                        status: 'SUCCESS',
                        message: 'Login realizado com sucesso'
                    });
                    results.successCount++;
                    console.log(`✓ Login bem-sucedido: ${account.email}`);
                } else {
                    results.loginTests.push({
                        email: account.email,
                        status: 'FAILED',
                        message: loginData.error_description || loginData.msg || 'Erro no login'
                    });
                    results.errorCount++;
                    console.log(`✗ Login falhou: ${account.email} - ${loginData.error_description || loginData.msg}`);
                }
                
            } catch (error) {
                results.loginTests.push({
                    email: account.email,
                    status: 'ERROR',
                    message: error.message
                });
                results.errorCount++;
                console.log(`✗ Erro no teste: ${account.email} - ${error.message}`);
            }
        }

        // Verificação final dos usuários no sistema
        console.log('=== VERIFICAÇÃO FINAL DO SISTEMA ===');
        
        const finalUsersQuery = await fetch(`${supabaseUrl}/rest/v1/users?select=email,full_name,status,user_roles(role_name)&order=email`, {
            headers: {
                'apikey': supabaseServiceRoleKey,
                'Authorization': `Bearer ${supabaseServiceRoleKey}`
            }
        });
        
        const finalUsers = await finalUsersQuery.json();

        console.log('=== RESULTADO DOS TESTES ===');
        console.log(`Total de contas testadas: ${testAccounts.length}`);
        console.log(`Logins bem-sucedidos: ${results.successCount}`);
        console.log(`Logins falharam: ${results.errorCount}`);
        console.log(`Total de usuários no sistema: ${finalUsers.length}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Teste de login das contas demo concluído',
            data: {
                loginResults: results,
                systemUsers: finalUsers,
                summary: {
                    totalAccounts: testAccounts.length,
                    successfulLogins: results.successCount,
                    failedLogins: results.errorCount,
                    totalUsersInSystem: finalUsers.length
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Erro no teste de login:', error);
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