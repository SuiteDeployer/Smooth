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
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

        if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) {
            throw new Error('Variáveis de ambiente do Supabase não configuradas');
        }

        // 1. Criar/atualizar usuário no auth.users
        const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify({
                email: 'admin@smooth.com.br',
                password: 'smooth123',
                email_confirm: true,
                user_metadata: {
                    full_name: 'Administrador Global'
                }
            })
        });

        let authUserId;
        if (authResponse.ok) {
            const authData = await authResponse.json();
            authUserId = authData.id;
            console.log('Usuário criado no auth:', authData);
        } else {
            // Se o usuário já existe, tentar atualizá-lo
            const existingUserResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=admin@smooth.com.br`, {
                headers: {
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    'apikey': SUPABASE_SERVICE_ROLE_KEY
                }
            });

            if (existingUserResponse.ok) {
                const existingUsers = await existingUserResponse.json();
                if (existingUsers.users && existingUsers.users.length > 0) {
                    authUserId = existingUsers.users[0].id;
                    
                    // Atualizar senha do usuário existente
                    const updateResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                            'Content-Type': 'application/json',
                            'apikey': SUPABASE_SERVICE_ROLE_KEY
                        },
                        body: JSON.stringify({
                            password: 'smooth123',
                            email_confirm: true
                        })
                    });
                    
                    console.log('Senha atualizada para usuário existente');
                }
            }
        }

        // 2. Criar/atualizar usuário na tabela users
        const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                auth_user_id: authUserId,
                email: 'admin@smooth.com.br',
                full_name: 'Administrador Global',
                role_id: 'global',
                status: 'active',
                commission_percentage: 0
            })
        });

        const dbData = await dbResponse.text();
        console.log('Resposta da tabela users:', dbData);

        // 3. Verificar se o role 'global' existe
        const roleResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?id=eq.global`, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY
            }
        });

        const roles = await roleResponse.json();
        if (!roles || roles.length === 0) {
            // Criar role global se não existir
            await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_ROLE_KEY
                },
                body: JSON.stringify({
                    id: 'global',
                    role_name: 'Global',
                    hierarchy_level: 1,
                    can_create_roles: ['master', 'escritorio', 'assessor', 'investidor'],
                    max_subordinate_level: 5
                })
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Autenticação do admin corrigida com sucesso',
            auth_user_id: authUserId
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro:', error);
        return new Response(JSON.stringify({
            error: error.message,
            details: 'Falha ao corrigir autenticação do admin'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});