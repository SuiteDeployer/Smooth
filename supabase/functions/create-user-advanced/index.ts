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
        const requestData = await req.json();
        const { email, full_name, role_name, cpf_cnpj, phone, commission_percentage, superior_user_id, company_name } = requestData;

        console.log('📥 Dados recebidos:', requestData);

        // Access environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Configuração do Supabase não encontrada');
        }

        // First, get the role_id based on role_name
        const roleResponse = await fetch(`${supabaseUrl}/rest/v1/user_roles?role_name=eq.${role_name}&select=id`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!roleResponse.ok) {
            const roleError = await roleResponse.text();
            console.error('❌ Erro ao buscar role:', roleError);
            throw new Error(`Erro ao buscar papel: ${roleError}`);
        }

        const roleData = await roleResponse.json();
        console.log('🎯 Role encontrado:', roleData);

        if (!roleData || roleData.length === 0) {
            throw new Error(`Papel '${role_name}' não encontrado`);
        }

        const role_id = roleData[0].id;

        // Prepare user data for insertion
        const userData = {
            email: email,
            full_name: full_name,
            role_id: role_id,
            cpf_cnpj: cpf_cnpj || null,
            phone: phone || null,
            commission_percentage: commission_percentage || 0,
            superior_user_id: superior_user_id || null,
            company_name: company_name || full_name, // Usar nome completo como empresa se não fornecido
            user_type: 'network_user', // Explicitamente definir como network_user
            status: 'active'
        };

        console.log('📦 Dados preparados para inserção:', userData);

        // Insert user using service role key
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(userData)
        });

        if (!insertResponse.ok) {
            const insertError = await insertResponse.text();
            console.error('❌ Erro na inserção:', insertError);
            throw new Error(`Erro ao inserir usuário: ${insertError}`);
        }

        const insertedUser = await insertResponse.json();
        console.log('✅ Usuário criado:', insertedUser);

        // Create notification for the new user
        try {
            const notificationData = {
                recipient_user_id: insertedUser[0].id,
                notification_type: 'user_created',
                title: 'Conta Criada',
                message: `Usuário ${full_name} criado com sucesso no sistema`,
                severity: 'info',
                is_read: false,
                status: 'unread'
            };

            await fetch(`${supabaseUrl}/rest/v1/alerts_notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            });

            console.log('✅ Notificação criada');
        } catch (notificationError) {
            console.error('⚠️ Erro ao criar notificação:', notificationError);
            // Não falhar a criação do usuário por causa da notificação
        }

        return new Response(JSON.stringify({ 
            data: insertedUser[0],
            message: 'Usuário criado com sucesso' 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Erro geral:', error);
        const errorResponse = {
            error: {
                code: 'USER_CREATION_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});