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
        if (req.method !== 'PUT') {
            throw new Error('Método não permitido. Use PUT.');
        }

        // Obter dados da requisição
        const { serie_id, name, description, duration_months, interest_rate, minimum_investment, max_commission_percentage } = await req.json();

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
            throw new Error('Acesso negado. Apenas usuários Global podem editar séries.');
        }

        // Preparar dados para atualização (apenas campos fornecidos)
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (duration_months !== undefined) updateData.duration_months = duration_months;
        if (interest_rate !== undefined) updateData.interest_rate = interest_rate;
        if (minimum_investment !== undefined) updateData.minimum_investment = minimum_investment;
        if (max_commission_percentage !== undefined) updateData.max_commission_percentage = max_commission_percentage;
        updateData.updated_at = new Date().toISOString();

        // Atualizar série
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/series?id=eq.${serie_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Erro ao atualizar série: ${errorText}`);
        }

        const updatedSerie = await updateResponse.json();

        if (!updatedSerie || updatedSerie.length === 0) {
            throw new Error('Série não encontrada ou não foi possível atualizar');
        }

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
                    action_type: 'UPDATE',
                    resource_type: 'serie',
                    resource_id: serie_id,
                    resource_name: name || updatedSerie[0].name,
                    description: `Série atualizada: ${Object.keys(updateData).filter(k => k !== 'updated_at').join(', ')}`,
                    created_at: new Date().toISOString()
                })
            });
        } catch (auditError) {
            console.warn('Erro ao registrar log de auditoria:', auditError);
        }

        return new Response(JSON.stringify({
            data: updatedSerie[0],
            message: 'Série atualizada com sucesso'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao atualizar série:', error);

        const errorResponse = {
            error: {
                code: 'UPDATE_SERIE_ERROR',
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
        }

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});