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

        if (action === 'get_investments' || action === 'get_investments_advanced') {
            // Suportar tanto GET quanto POST
            let filters = {};
            let pagination = {};
            let sort = {};
            
            if (req.method === 'GET') {
                // Extrair parâmetros da URL para GET requests
                const url = new URL(req.url);
                const page = parseInt(url.searchParams.get('page') || '1');
                const limit = parseInt(url.searchParams.get('limit') || '50');
                const status = url.searchParams.get('status');
                const investor_name = url.searchParams.get('investor_name');
                const series_id = url.searchParams.get('series_id');
                const min_amount = url.searchParams.get('min_amount');
                const max_amount = url.searchParams.get('max_amount');
                const date_from = url.searchParams.get('date_from');
                const date_to = url.searchParams.get('date_to');
                
                if (status) filters.status = status.split(',');
                if (investor_name) filters.investor_name = investor_name;
                if (series_id) filters.series_id = series_id;
                if (min_amount) filters.min_amount = parseFloat(min_amount);
                if (max_amount) filters.max_amount = parseFloat(max_amount);
                if (date_from) filters.date_from = date_from;
                if (date_to) filters.date_to = date_to;
                
                pagination = {
                    limit,
                    offset: (page - 1) * limit
                };
                
                sort = { field: 'created_at', ascending: false };
            } else {
                // Para POST requests, manter o comportamento original
                const requestData = await req.json();
                filters = requestData.filters || {};
                pagination = requestData.pagination || {};
                sort = requestData.sort || {};
            }
            
            // Buscar investimentos sem joins complexos primeiro
            let query = `investments?select=*`;
            
            // Aplicar filtros
            const conditions = [];
            conditions.push('deleted_at.is.null');
            
            if (filters.status && filters.status.length > 0) {
                conditions.push(`status.in.(${filters.status.map(s => `"${s}"`).join(',')})`);
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

        if (action === 'mark_as_redeemed') {
            const requestData = await req.json();
            const { investment_id, redemption_date, redemption_amount, final_yield, notes } = requestData;
            
            if (!investment_id) {
                throw new Error('ID do investimento é obrigatório');
            }
            
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

        if (action === 'delete_investment') {
            const url = new URL(req.url);
            const investment_id = url.searchParams.get('id');
            
            if (!investment_id) {
                throw new Error('ID do investimento é obrigatório');
            }
            
            const deleteData = {
                deleted_at: new Date().toISOString(),
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

        if (action === 'get_change_history') {
            const requestData = await req.json();
            const { resource_type, resource_id } = requestData;
            
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

        if (action === 'get_saved_filters') {
            const requestData = await req.json();
            const { filter_type } = requestData;
            
            // Buscar filtros salvos (implementação básica)
            const response = await fetch(
                `${supabaseUrl}/rest/v1/saved_filters?filter_type=eq.${filter_type}&select=*&order=created_at.desc`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                return new Response(JSON.stringify({ data: [] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const filters = await response.json();
            
            return new Response(JSON.stringify({ data: filters }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'update_investment') {
            const requestData = await req.json();
            const { id, invested_amount, interest_type, status } = requestData;
            
            if (!id) {
                throw new Error('ID do investimento é obrigatório');
            }
            
            const updates = {
                updated_at: new Date().toISOString()
            };
            
            if (invested_amount !== undefined) updates.invested_amount = invested_amount;
            if (interest_type !== undefined) updates.interest_type = interest_type;
            if (status !== undefined) updates.status = status;
            
            const updateResponse = await fetch(
                `${supabaseUrl}/rest/v1/investments?id=eq.${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updates)
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

        if (action === 'save_filter') {
            const requestData = await req.json();
            const { filter_name, filter_type, filter_criteria, is_default } = requestData;
            
            if (!filter_name || !filter_type) {
                throw new Error('Nome e tipo do filtro são obrigatórios');
            }
            
            const filterData = {
                filter_name,
                filter_type,
                filter_criteria: JSON.stringify(filter_criteria || {}),
                is_default: is_default || false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const response = await fetch(
                `${supabaseUrl}/rest/v1/saved_filters`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(filterData)
                }
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro ao salvar filtro: ${errorText}`);
            }
            
            const savedFilter = await response.json();
            
            return new Response(JSON.stringify({ data: savedFilter[0] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Ação não reconhecida: ${action}`);

    } catch (error) {
        console.error('Erro:', error);

        const errorResponse = {
            error: {
                code: 'INVESTMENT_MANAGEMENT_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});