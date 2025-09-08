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
        // Validar método
        if (req.method !== 'DELETE') {
            throw new Error('Método não permitido. Use DELETE.');
        }

        // Obter dados da requisição
        const { serie_id } = await req.json();

        if (!serie_id) {
            throw new Error('ID da série é obrigatório');
        }

        // Obter credenciais do Supabase
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuração do Supabase não encontrada');
        }

        // Validar autenticação
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Token de autorização necessário');
        }

        const token = authHeader.replace('Bearer ', '');
        
        // Verificar usuário autenticado
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Token inválido ou expirado');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Buscar role do usuário
        const userRoleResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=*,user_roles(role_name)&auth_user_id=eq.${userId}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!userRoleResponse.ok) {
            throw new Error('Erro ao verificar permissões do usuário');
        }

        const userRoleData = await userRoleResponse.json();
        const user = userRoleData[0];
        
        if (!user || !user.user_roles || user.user_roles.role_name !== 'Global') {
            throw new Error('Acesso negado. Apenas usuários Global podem excluir séries.');
        }

        // Buscar dados da série antes da exclusão (para auditoria)
        const serieResponse = await fetch(`${supabaseUrl}/rest/v1/series?select=*&id=eq.${serie_id}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!serieResponse.ok) {
            throw new Error('Erro ao buscar série');
        }

        const serieData = await serieResponse.json();
        if (!serieData || serieData.length === 0) {
            throw new Error('Série não encontrada');
        }

        const serie = serieData[0];

        // Verificar se há investimentos vinculados
        const investmentsResponse = await fetch(`${supabaseUrl}/rest/v1/investments?select=id&series_id=eq.${serie_id}&status=neq.canceled`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (investmentsResponse.ok) {
            const investmentsData = await investmentsResponse.json();
            if (investmentsData && investmentsData.length > 0) {
                throw new Error('Não é possível excluir esta série pois ela possui investimentos vinculados. Cancele os investimentos primeiro.');
            }
        }

        // Excluir série (soft delete - alterando status)
        const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/series?id=eq.${serie_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                status: 'deleted',
                updated_at: new Date().toISOString()
            })
        });

        if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            throw new Error(`Erro ao excluir série: ${errorText}`);
        }

        const deletedSerie = await deleteResponse.json();

        // Log de auditoria
        try {
            await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user.id,
                    action_type: 'DELETE',
                    resource_type: 'series',
                    resource_id: serie_id,
                    resource_name: serie.name,
                    description: `Série excluída: ${serie.name}`,
                    created_at: new Date().toISOString()
                })
            });
        } catch (auditError) {
            console.warn('Erro ao registrar log de auditoria:', auditError);
        }

        return new Response(JSON.stringify({
            data: { id: serie_id },
            message: 'Série excluída com sucesso'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao excluir série:', error);

        const errorResponse = {
            error: {
                code: 'DELETE_SERIE_ERROR',
                message: error.message
            }
        };

        let statusCode = 500;
        if (error.message.includes('Token') || error.message.includes('autorização')) {
            statusCode = 401;
        } else if (error.message.includes('Acesso negado')) {
            statusCode = 403;
        } else if (error.message.includes('Método não permitido')) {
            statusCode = 405;
        } else if (error.message.includes('não encontrada')) {
            statusCode = 404;
        }

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});