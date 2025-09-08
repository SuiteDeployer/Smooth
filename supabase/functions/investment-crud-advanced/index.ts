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
            `${supabaseUrl}/rest/v1/user_hierarchy_view?auth_user_id=eq.${currentAuthUser.id}&select=*`,
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

        switch (action) {
            case 'get_investments_advanced': {
                const requestData = await req.json();
                const { filters = {}, pagination = {}, sort = {} } = requestData;
                
                // Buscar investimentos com joins para séries e usuários
                let query = `investments?select=*,series(*,debentures(*)),users!investor_user_id(*)`;
                
                // Aplicar filtros
                const conditions = [];
                
                // Não mostrar investimentos deletados
                conditions.push('deleted_at.is.null');
                
                if (filters.status && filters.status.length > 0) {
                    conditions.push(`status.in.(${filters.status.map(s => `"${s}"`).join(',')})`);
                }
                
                if (filters.investor_name) {
                    // Fazer busca em join - mais complexo, vamos fazer em duas etapas
                }
                
                if (filters.series_id) {
                    conditions.push(`series_id.eq.${filters.series_id}`);
                }
                
                if (filters.min_amount) {
                    conditions.push(`invested_amount.gte.${filters.min_amount}`);
                }
                
                if (filters.max_amount) {
                    conditions.push(`invested_amount.lte.${filters.max_amount}`);
                }
                
                if (filters.date_from) {
                    conditions.push(`investment_date.gte.${filters.date_from}`);
                }
                
                if (filters.date_to) {
                    conditions.push(`investment_date.lte.${filters.date_to}`);
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
                    throw new Error(`Erro ao buscar investimentos: ${errorText}`);
                }
                
                const investments = await response.json();
                
                return new Response(JSON.stringify({ data: investments }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'update_investment': {
                const requestData = await req.json();
                const { investment_id, updates, change_reason } = requestData;
                
                if (!investment_id) {
                    throw new Error('ID do investimento é obrigatório');
                }
                
                // Adicionar campos de auditoria
                const finalUpdates = {
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                
                const updateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/investments?id=eq.${investment_id}`,
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
                    throw new Error(`Erro ao atualizar investimento: ${errorText}`);
                }
                
                const updatedInvestment = await updateResponse.json();
                
                return new Response(JSON.stringify({ data: updatedInvestment[0] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'mark_as_redeemed': {
                const requestData = await req.json();
                const { investment_id, redemption_date, redemption_amount, final_yield, notes } = requestData;
                
                if (!investment_id) {
                    throw new Error('ID do investimento é obrigatório');
                }
                
                // Atualizar investimento como resgatado
                const redemptionUpdates = {
                    status: 'redeemed',
                    redemption_date,
                    redemption_amount,
                    final_yield,
                    notes,
                    updated_at: new Date().toISOString()
                };
                
                const updateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/investments?id=eq.${investment_id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(redemptionUpdates)
                    }
                );
                
                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    throw new Error(`Erro ao marcar como resgatado: ${errorText}`);
                }
                
                const updatedInvestment = await updateResponse.json();
                
                return new Response(JSON.stringify({ data: updatedInvestment[0] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'delete_investment': {
                const requestData = await req.json();
                const { investment_id, deletion_reason, force_delete } = requestData;
                
                if (!investment_id) {
                    throw new Error('ID do investimento é obrigatório');
                }
                
                // Exclusão lógica
                const deleteData = {
                    deleted_at: new Date().toISOString(),
                    deleted_by: currentUser.id,
                    updated_at: new Date().toISOString()
                };
                
                const deleteResponse = await fetch(
                    `${supabaseUrl}/rest/v1/investments?id=eq.${investment_id}`,
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
                    throw new Error(`Erro ao deletar investimento: ${errorText}`);
                }
                
                return new Response(JSON.stringify({ success: true, message: 'Investimento deletado com sucesso' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'get_change_history': {
                const requestData = await req.json();
                const { resource_type, resource_id } = requestData;
                
                // Buscar histórico de auditoria
                let query = `audit_logs?resource_type=eq.${resource_type}&select=*&order=created_at.desc&limit=50`;
                
                if (resource_id) {
                    query = `audit_logs?resource_type=eq.${resource_type}&resource_id=eq.${resource_id}&select=*&order=created_at.desc&limit=50`;
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
                    throw new Error(`Erro ao buscar histórico: ${errorText}`);
                }
                
                const history = await response.json();
                
                return new Response(JSON.stringify({ data: history }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            default:
                throw new Error(`Ação não reconhecida: ${action}`);
        }

    } catch (error) {
        console.error('Erro na função investment-crud-advanced:', error);

        const errorResponse = {
            error: {
                code: 'INVESTMENT_CRUD_ERROR',
                message: error instanceof Error ? error.message : 'Erro interno do servidor'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});