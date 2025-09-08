Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        // Obter dados do request
        const requestData = await req.json();
        const { 
            email, 
            name, 
            cpf, 
            role, 
            phone, 
            pix_key, 
            pix_key_type, 
            hierarchy_id,
            company_name
        } = requestData;

        console.log('🔵 Dados recebidos:', { email, name, role, hierarchy_id });

        // Validações básicas
        if (!email || !name || !cpf || !role) {
            throw new Error('Email, nome, CPF e tipo são obrigatórios');
        }

        // Validar formato do email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Formato de email inválido');
        }

        // Determinar user_type baseado no role
        let userType = 'network_user'; // padrão
        let finalCompanyName = company_name;
        
        if (role === 'Investidor') {
            userType = 'investor';
            finalCompanyName = null; // investidores não precisam de company_name
        } else {
            // Para roles que não são investidor, exigir company_name
            if (!company_name || company_name.trim() === '') {
                finalCompanyName = 'Empresa não informada'; // valor padrão
            }
        }

        console.log('✅ user_type determinado:', userType, 'company_name:', finalCompanyName);

        // Obter chaves do ambiente
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            console.error('❌ Configuração do Supabase ausente');
            throw new Error('Configuração do servidor não encontrada');
        }

        console.log('✅ Configuração do Supabase validada');

        // 1. Buscar role_id baseado no nome do role
        console.log('🔵 Buscando role_id para:', role);
        
        const roleResponse = await fetch(`${supabaseUrl}/rest/v1/user_roles?role_name=eq.${role}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!roleResponse.ok) {
            const errorData = await roleResponse.text();
            console.error('❌ Erro ao buscar role:', errorData);
            throw new Error(`Erro ao buscar role: ${errorData}`);
        }

        const roles = await roleResponse.json();
        if (!roles || roles.length === 0) {
            throw new Error(`Role '${role}' não encontrado`);
        }

        const roleId = roles[0].id;
        console.log('✅ Role ID encontrado:', roleId);

        // 2. Criar usuário no Supabase Auth usando admin API
        console.log('🔵 Criando usuário no Supabase Auth...');
        
        const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: 'TempPassword123!', // Senha temporária
                email_confirm: true, // Confirmar email automaticamente
                user_metadata: {
                    name: name,
                    role: role
                }
            })
        });

        if (!createUserResponse.ok) {
            const errorData = await createUserResponse.text();
            console.error('❌ Erro ao criar usuário no Auth:', errorData);
            throw new Error(`Erro ao criar usuário: ${errorData}`);
        }

        const authUser = await createUserResponse.json();
        const userId = authUser.id;
        
        console.log('✅ Usuário criado no Auth com ID:', userId);

        // 3. Criar perfil na tabela users
        console.log('🔵 Criando perfil na tabela users...');
        
        const profileData = {
            id: userId,
            email: email,
            full_name: name,
            cpf_cnpj: cpf,
            role_id: roleId,
            phone: phone || null,
            pix: pix_key || null,
            pix_key_type: pix_key_type || null,
            superior_user_id: hierarchy_id || null,
            status: 'ativo',
            user_type: userType,
            company_name: finalCompanyName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('🔵 Dados do perfil:', JSON.stringify(profileData, null, 2));

        const createProfileResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(profileData)
        });

        if (!createProfileResponse.ok) {
            const errorData = await createProfileResponse.text();
            console.error('❌ Erro ao criar perfil:', errorData);
            
            // Se falhar ao criar perfil, deletar usuário do Auth
            try {
                await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });
                console.log('🔄 Usuário deletado do Auth devido ao erro no perfil');
            } catch (cleanupError) {
                console.error('❌ Erro ao limpar usuário do Auth:', cleanupError);
            }
            
            throw new Error(`Erro ao criar perfil do usuário: ${errorData}`);
        }

        const profile = await createProfileResponse.json();
        console.log('✅ Perfil criado com sucesso');

        // 4. Forçar reset de senha para primeira utilização
        console.log('🔵 Enviando email de reset de senha...');
        
        const resetPasswordResponse = await fetch(`${supabaseUrl}/auth/v1/recover`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email
            })
        });

        if (resetPasswordResponse.ok) {
            console.log('✅ Email de reset de senha enviado');
        } else {
            console.log('⚠️  Aviso: Não foi possível enviar email de reset de senha');
        }

        // Retornar sucesso
        const result = {
            data: {
                user: {
                    id: userId,
                    email: email,
                    full_name: name,
                    role: role,
                    status: 'ativo'
                },
                profile: profile[0],
                message: 'Usuário criado com sucesso! Um email de definição de senha foi enviado.'
            }
        };

        console.log('🎉 Usuário criado com sucesso completo!');

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Erro na criação do usuário:', error);

        const errorResponse = {
            error: {
                code: 'USER_CREATION_FAILED',
                message: error.message || 'Erro interno do servidor'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});