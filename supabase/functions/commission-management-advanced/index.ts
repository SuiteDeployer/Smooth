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

        switch (action) {
            case 'get_commissions_advanced': {
                const requestData = await req.json();
                const { filters = {}, pagination = {}, sort = {} } = requestData;
                
                let query = 'commissions?select=*';
                
                // Aplicar filtros
                const conditions = [];
                
                if (filters.payment_status && filters.payment_status.length > 0) {
                    conditions.push(`payment_status.in.(${filters.payment_status.map(s => `"${s}"`).join(',')})`);
                }
                
                if (filters.commission_type) {
                    conditions.push(`commission_type.eq.${filters.commission_type}`);
                }
                
                if (filters.min_amount) {
                    conditions.push(`commission_amount.gte.${filters.min_amount}`);
                }
                
                if (filters.max_amount) {
                    conditions.push(`commission_amount.lte.${filters.max_amount}`);
                }
                
                if (filters.date_from) {
                    conditions.push(`created_at.gte.${filters.date_from}`);
                }
                
                if (filters.date_to) {
                    conditions.push(`created_at.lte.${filters.date_to}`);
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
                    throw new Error(`Erro ao buscar comissões: ${errorText}`);
                }
                
                const commissions = await response.json();
                
                return new Response(JSON.stringify({ data: commissions }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'update_commission_status': {
                const requestData = await req.json();
                const { commission_id, new_status, approval_notes } = requestData;
                
                if (!commission_id || !new_status) {
                    throw new Error('ID da comissão e novo status são obrigatórios');
                }
                
                // Preparar dados de atualização
                const updates = {
                    payment_status: new_status,
                    approval_notes: approval_notes || null,
                    updated_at: new Date().toISOString()
                };
                
                // Se status for 'paid', adicionar data de pagamento
                if (new_status === 'paid') {
                    updates.paid_at = new Date().toISOString();
                }
                
                // Atualizar comissão
                const updateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/commissions?id=eq.${commission_id}`,
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
                    throw new Error(`Erro ao atualizar status da comissão: ${errorText}`);
                }
                
                const updatedCommission = await updateResponse.json();
                
                return new Response(JSON.stringify({ data: updatedCommission[0] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'bulk_update_status': {
                const requestData = await req.json();
                const { commission_ids, new_status, approval_notes } = requestData;
                
                if (!commission_ids || !commission_ids.length || !new_status) {
                    throw new Error('IDs das comissões e novo status são obrigatórios');
                }
                
                // Preparar dados de atualização
                const updates = {
                    payment_status: new_status,
                    approval_notes: approval_notes || null,
                    updated_at: new Date().toISOString()
                };
                
                // Se status for 'paid', adicionar data de pagamento
                if (new_status === 'paid') {
                    updates.paid_at = new Date().toISOString();
                }
                
                // Atualizar comissões em lote
                const updateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/commissions?id=in.(${commission_ids.map(id => `"${id}"`).join(',')})`,
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
                    throw new Error(`Erro ao atualizar status das comissões: ${errorText}`);
                }
                
                const updatedCommissions = await updateResponse.json();
                
                return new Response(JSON.stringify({ data: updatedCommissions, updated_count: updatedCommissions.length }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'get_commission_reports': {
                const requestData = await req.json();
                const { report_type, filters = {} } = requestData;
                
                let results = {};
                
                switch (report_type) {
                    case 'by_period': {
                        const { date_from, date_to } = filters;
                        
                        let periodQuery = 'commissions?select=payment_status,commission_amount,commission_type,created_at';
                        
                        if (date_from && date_to) {
                            periodQuery += `&created_at=gte.${date_from}&created_at=lte.${date_to}`;
                        }
                        
                        const periodResponse = await fetch(`${supabaseUrl}/rest/v1/${periodQuery}`, {
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (periodResponse.ok) {
                            const commissions = await periodResponse.json();
                            
                            // Agrupar por status
                            const byStatus = commissions.reduce((acc, comm) => {
                                if (!acc[comm.payment_status]) {
                                    acc[comm.payment_status] = { count: 0, total_amount: 0 };
                                }
                                acc[comm.payment_status].count++;
                                acc[comm.payment_status].total_amount += Number(comm.commission_amount);
                                return acc;
                            }, {});
                            
                            results = {
                                period: { date_from, date_to },
                                total_commissions: commissions.length,
                                total_amount: commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0),
                                by_status: byStatus
                            };
                        }
                        break;
                    }
                    
                    case 'by_user': {
                        const userQuery = 'commissions?select=*';
                        
                        const userResponse = await fetch(`${supabaseUrl}/rest/v1/${userQuery}`, {
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (userResponse.ok) {
                            const commissions = await userResponse.json();
                            
                            // Agrupar por usuário
                            const byUser = commissions.reduce((acc, comm) => {
                                const userId = comm.recipient_user_id;
                                
                                if (!acc[userId]) {
                                    acc[userId] = {
                                        total_commissions: 0,
                                        total_amount: 0,
                                        paid_amount: 0,
                                        pending_amount: 0,
                                        by_status: {}
                                    };
                                }
                                
                                acc[userId].total_commissions++;
                                acc[userId].total_amount += Number(comm.commission_amount);
                                
                                if (comm.payment_status === 'paid') {
                                    acc[userId].paid_amount += Number(comm.commission_amount);
                                } else if (['pending', 'processing', 'approved'].includes(comm.payment_status)) {
                                    acc[userId].pending_amount += Number(comm.commission_amount);
                                }
                                
                                if (!acc[userId].by_status[comm.payment_status]) {
                                    acc[userId].by_status[comm.payment_status] = { count: 0, amount: 0 };
                                }
                                acc[userId].by_status[comm.payment_status].count++;
                                acc[userId].by_status[comm.payment_status].amount += Number(comm.commission_amount);
                                
                                return acc;
                            }, {});
                            
                            results = {
                                users: Object.values(byUser)
                            };
                        }
                        break;
                    }
                    
                    default:
                        results = { message: 'Tipo de relatório não implementado' };
                }
                
                return new Response(JSON.stringify({ data: results }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            default:
                throw new Error(`Ação não reconhecida: ${action}`);
        }

    } catch (error) {
        console.error('Erro na função commission-management-advanced:', error);

        const errorResponse = {
            error: {
                code: 'COMMISSION_CRUD_ERROR',
                message: error instanceof Error ? error.message : 'Erro interno do servidor'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
