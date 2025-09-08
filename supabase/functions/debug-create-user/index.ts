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
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        console.log('🔍 supabaseUrl:', supabaseUrl);
        console.log('🔍 serviceRoleKey existe:', !!serviceRoleKey);
        console.log('🔍 serviceRoleKey começa com:', serviceRoleKey?.substring(0, 20));

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Configuração do Supabase não encontrada');
        }

        const requestData = await req.json();
        console.log('✅ Dados recebidos:', JSON.stringify(requestData, null, 2));
        
        const { email, full_name, role_name } = requestData;

        // Validação básica
        if (!email || !full_name || !role_name) {
            return new Response(JSON.stringify({ 
                error: {
                    message: 'Campos obrigatórios: email, full_name, role_name'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        console.log('✅ Validação passou');

        // Gerar senha simples para debug
        const userPassword = 'TempPass123!';
        console.log('✅ Senha gerada:', userPassword);
        
        console.log('🔍 Tentando criar usuário no auth...');
        console.log('🔍 URL da chamada:', `${supabaseUrl}/auth/v1/admin/users`);
        
        // Step 1: Criar usuário na auth
        const authPayload = {
            email,
            password: userPassword,
            email_confirm: true
        };
        
        console.log('🔍 Auth payload:', JSON.stringify(authPayload, null, 2));
        
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(authPayload)
        });

        console.log('🔍 Auth response status:', authResponse.status);
        console.log('🔍 Auth response ok:', authResponse.ok);
        
        const authText = await authResponse.text();
        console.log('🔍 Auth response text:', authText);
        
        if (!authResponse.ok) {
            console.error('❌ Erro auth status:', authResponse.status);
            console.error('❌ Erro auth text:', authText);
            throw new Error(`Erro ao criar usuário: ${authText}`);
        }

        let authData;
        try {
            authData = JSON.parse(authText);
            console.log('🔍 Auth data parsed:', JSON.stringify(authData, null, 2));
        } catch (e) {
            console.error('❌ Erro ao fazer parse do JSON:', e.message);
            throw new Error(`Resposta inválida da API: ${authText}`);
        }
        
        const newUserId = authData?.user?.id;
        console.log('🔍 newUserId extraído:', newUserId);
        
        if (!newUserId) {
            console.error('❌ User ID não encontrado na resposta');
            console.error('❌ authData.user:', authData?.user);
            console.error('❌ authData completo:', JSON.stringify(authData, null, 2));
            throw new Error('Falha ao obter ID do usuário criado');
        }
        
        console.log('✅ Usuário criado no auth com ID:', newUserId);

        return new Response(JSON.stringify({ 
            data: {
                message: 'Debug concluído - usuário criado no auth',
                userId: newUserId,
                email: email,
                password: userPassword,
                authResponse: authData
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201,
        });

    } catch (error) {
        console.error('❌ Erro final:', error.message);
        console.error('❌ Stack trace:', error.stack);
        
        return new Response(JSON.stringify({
            error: {
                message: error.message,
                stack: error.stack
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});