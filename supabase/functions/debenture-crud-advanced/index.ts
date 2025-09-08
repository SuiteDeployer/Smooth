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
        const url = new URL(req.url);
        const action = url.searchParams.get('action');
        
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
        
        // Verificar token
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });
        
        if (!userResponse.ok) {
            throw new Error('Token inválido ou expirado');
        }
        
        const currentAuthUser = await userResponse.json();
        
        // Buscar dados completos do usuário
        const userDataResponse = await fetch(
            `${supabaseUrl}/rest/v1/users?auth_user_id=eq.${currentAuthUser.id}&select=*`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!userDataResponse.ok) {
            throw new Error('Erro ao buscar dados do usuário');
        }
        
        const userData = await userDataResponse.json();
        if (!userData || userData.length === 0) {
            throw new Error('Usuário não encontrado no sistema');
        }
        
        const currentUser = userData[0];

        // Buscar role do usuário para verificação de permissões
        const roleResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_roles?id=eq.${currentUser.role_id}&select=role_name`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        let userRole = null;
        if (roleResponse.ok) {
            const roleData = await roleResponse.json();
            if (roleData && roleData.length > 0) {
                userRole = roleData[0].role_name;
            }
        }

        // Verificar permissões Global para operações de modificação
        const isGlobalUser = userRole === 'Global';
        const restrictedActions = ['update_debenture', 'update_series', 'delete_debenture', 'delete_series'];
        
        if (restrictedActions.includes(action) && !isGlobalUser) {
            throw new Error('Acesso negado: Apenas usuários Global podem criar, editar ou deletar debêntures e séries');
        }

        switch (action) {
            case 'get_debentures_advanced': {
                const requestData = await req.json();
                const { filters = {}, pagination = {}, sort = {} } = requestData;
                
                let query = 'debentures?select=*';
                
                // Aplicar filtros
                const conditions = [];
                
                conditions.push('deleted_at.is.null');
                
                if (filters.status && filters.status.length > 0) {
                    conditions.push(`status.in.(${filters.status.map(s => `"${s}"`).join(',')})`);
                }
                
                if (filters.issuer_name) {
                    conditions.push(`issuer_name.ilike.%${filters.issuer_name}%`);
                }
                
                if (filters.name) {
                    conditions.push(`name.ilike.%${filters.name}%`);
                }
                
                if (filters.min_emission_value) {
                    conditions.push(`total_emission_value.gte.${filters.min_emission_value}`);
                }
                
                if (filters.max_emission_value) {
                    conditions.push(`total_emission_value.lte.${filters.max_emission_value}`);
                }
                
                if (filters.emission_date_from) {
                    conditions.push(`emission_date.gte.${filters.emission_date_from}`);
                }
                
                if (filters.emission_date_to) {
                    conditions.push(`emission_date.lte.${filters.emission_date_to}`);
                }
                
                if (conditions.length > 0) {
                    query += '&' + conditions.join('&');
                }
                
                // Ordenação
                const sortField = sort.field || 'created_at';
                const sortOrder = sort.ascending ? 'asc' : 'desc';
                query += `&order=${sortField}.${sortOrder}`;
                
                // Paginação
                if (pagination.limit) {
                    query += `&limit=${pagination.limit}`;
                }
                if (pagination.offset) {
                    query += `&offset=${pagination.offset}`;
                }
                
                const response = await fetch(`${supabaseUrl}/rest/v1/${query}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro ao buscar debêntures: ${errorText}`);
                }
                
                const debentures = await response.json();
                
                return new Response(JSON.stringify({ data: debentures }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'get_series_advanced': {
                const requestData = await req.json();
                const { filters = {}, pagination = {}, sort = {} } = requestData;
                
                let query = 'series?select=*';
                
                // Aplicar filtros
                const conditions = [];
                
                conditions.push('deleted_at.is.null');
                
                if (filters.status && filters.status.length > 0) {
                    conditions.push(`status.in.(${filters.status.map(s => `"${s}"`).join(',')})`);
                }
                
                if (filters.debenture_id) {
                    conditions.push(`debenture_id.eq.${filters.debenture_id}`);
                }
                
                if (filters.series_code) {
                    conditions.push(`series_code.ilike.%${filters.series_code}%`);
                }
                
                if (filters.name) {
                    conditions.push(`name.ilike.%${filters.name}%`);
                }
                
                if (filters.min_investment) {
                    conditions.push(`minimum_investment.gte.${filters.min_investment}`);
                }
                
                if (filters.max_investment) {
                    conditions.push(`maximum_investment.lte.${filters.max_investment}`);
                }
                
                if (conditions.length > 0) {
                    query += '&' + conditions.join('&');
                }
                
                // Ordenação
                const sortField = sort.field || 'created_at';
                const sortOrder = sort.ascending ? 'asc' : 'desc';
                query += `&order=${sortField}.${sortOrder}`;
                
                // Paginação
                if (pagination.limit) {
                    query += `&limit=${pagination.limit}`;
                }
                if (pagination.offset) {
                    query += `&offset=${pagination.offset}`;
                }
                
                const response = await fetch(`${supabaseUrl}/rest/v1/${query}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro ao buscar séries: ${errorText}`);
                }
                
                const series = await response.json();
                
                return new Response(JSON.stringify({ data: series }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'update_debenture': {
                const requestData = await req.json();
                const { debenture_id, updates, change_reason } = requestData;
                
                if (!debenture_id) {
                    throw new Error('ID da debênture é obrigatório');
                }
                
                // Adicionar campos de auditoria
                const finalUpdates = {
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                
                const updateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/debentures?id=eq.${debenture_id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(finalUpdates)
                    }
                );
                
                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    throw new Error(`Erro ao atualizar debênture: ${errorText}`);
                }
                
                const updatedDebenture = await updateResponse.json();
                
                return new Response(JSON.stringify({ data: updatedDebenture[0] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'update_series': {
                const requestData = await req.json();
                const { series_id, updates, change_reason } = requestData;
                
                if (!series_id) {
                    throw new Error('ID da série é obrigatório');
                }
                
                // Adicionar campos de auditoria
                const finalUpdates = {
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                
                const updateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/series?id=eq.${series_id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(finalUpdates)
                    }
                );
                
                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    throw new Error(`Erro ao atualizar série: ${errorText}`);
                }
                
                const updatedSeries = await updateResponse.json();
                
                return new Response(JSON.stringify({ data: updatedSeries[0] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'delete_debenture': {
                const requestData = await req.json();
                const { debenture_id, deletion_reason, force_delete } = requestData;
                
                if (!debenture_id) {
                    throw new Error('ID da debênture é obrigatório');
                }
                
                // Exclusão lógica
                const deleteData = {
                    deleted_at: new Date().toISOString(),
                    deleted_by: currentUser.id,
                    updated_at: new Date().toISOString()
                };
                
                const deleteResponse = await fetch(
                    `${supabaseUrl}/rest/v1/debentures?id=eq.${debenture_id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(deleteData)
                    }
                );
                
                if (!deleteResponse.ok) {
                    const errorText = await deleteResponse.text();
                    throw new Error(`Erro ao deletar debênture: ${errorText}`);
                }
                
                return new Response(JSON.stringify({ success: true, message: 'Debênture deletada com sucesso' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'delete_series': {
                const requestData = await req.json();
                const { series_id, deletion_reason, force_delete } = requestData;
                
                if (!series_id) {
                    throw new Error('ID da série é obrigatório');
                }
                
                // Exclusão lógica
                const deleteData = {
                    deleted_at: new Date().toISOString(),
                    deleted_by: currentUser.id,
                    updated_at: new Date().toISOString()
                };
                
                const deleteResponse = await fetch(
                    `${supabaseUrl}/rest/v1/series?id=eq.${series_id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(deleteData)
                    }
                );
                
                if (!deleteResponse.ok) {
                    const errorText = await deleteResponse.text();
                    throw new Error(`Erro ao deletar série: ${errorText}`);
                }
                
                return new Response(JSON.stringify({ success: true, message: 'Série deletada com sucesso' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            default:
                throw new Error(`Ação não reconhecida: ${action}`);
        }

    } catch (error) {
        console.error('Erro na função debenture-crud-advanced:', error);

        const errorResponse = {
            error: {
                code: 'DEBENTURE_CRUD_ERROR',
                message: error instanceof Error ? error.message : 'Erro interno do servidor'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
