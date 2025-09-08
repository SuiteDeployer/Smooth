import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Helper function para registrar ações de auditoria
async function logAuditAction(
    supabaseAdmin: any,
    userId: string,
    actionType: string,
    resourceType: string,
    resourceId?: string,
    resourceName?: string,
    oldValues?: any,
    newValues?: any,
    description?: string
) {
    try {
        const { error } = await supabaseAdmin.rpc('log_audit_action', {
            p_user_id: userId,
            p_action_type: actionType,
            p_resource_type: resourceType,
            p_resource_id: resourceId || null,
            p_resource_name: resourceName || null,
            p_old_values: oldValues || null,
            p_new_values: newValues || null,
            p_description: description || null
        });
        
        if (error) {
            console.error('Erro ao registrar log de auditoria:', error);
        }
    } catch (auditError) {
        console.error('Erro na função de auditoria:', auditError);
        // Não falhamos a operação principal por erro de auditoria
    }
}

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

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        
        // Validar autenticação
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Token de autorização necessário');
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: currentAuthUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !currentAuthUser) {
            throw new Error('Token inválido ou expirado');
        }

        // Buscar dados do usuário atual
        const { data: currentUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('auth_user_id', currentAuthUser.id)
            .single();

        if (userError || !currentUser) {
            throw new Error('Usuário não encontrado no sistema');
        }

        // Buscar role do usuário
        const { data: userRole, error: roleError } = await supabaseAdmin
            .from('user_roles')
            .select('*')
            .eq('id', currentUser.role_id)
            .single();

        if (roleError || !userRole) {
            throw new Error('Erro ao buscar informações do perfil');
        }

        if (action === 'get_commissions') {
            const payment_status = url.searchParams.get('payment_status');
            const recipient_name = url.searchParams.get('recipient_name');
            const commission_type = url.searchParams.get('commission_type');
            const min_amount = url.searchParams.get('min_amount');
            const max_amount = url.searchParams.get('max_amount');
            const date_from = url.searchParams.get('date_from');
            const date_to = url.searchParams.get('date_to');
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const offset = (page - 1) * limit;

            let query = supabaseAdmin
                .from('commissions')
                .select(`
                    *,
                    recipient:recipient_user_id(full_name, email),
                    investment:investment_id(invested_amount, investment_date, series:series_id(name, series_code)),
                    hierarchy_tracking:hierarchy_tracking_id(*)
                `);

            // Aplicar filtros
            if (payment_status) query = query.eq('payment_status', payment_status);
            if (commission_type) query = query.eq('commission_type', commission_type);
            if (min_amount) query = query.gte('commission_amount', parseFloat(min_amount));
            if (max_amount) query = query.lte('commission_amount', parseFloat(max_amount));
            if (date_from) query = query.gte('created_at', date_from);
            if (date_to) query = query.lte('created_at', date_to);

            const { data: commissions, error: commissionsError } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (commissionsError) {
                throw new Error(`Erro ao buscar comissões: ${commissionsError.message}`);
            }

            // Contar total para paginação
            let countQuery = supabaseAdmin
                .from('commissions')
                .select('id', { count: 'exact', head: true });

            if (payment_status) countQuery = countQuery.eq('payment_status', payment_status);
            if (commission_type) countQuery = countQuery.eq('commission_type', commission_type);
            if (min_amount) countQuery = countQuery.gte('commission_amount', parseFloat(min_amount));
            if (max_amount) countQuery = countQuery.lte('commission_amount', parseFloat(max_amount));
            if (date_from) countQuery = countQuery.gte('created_at', date_from);
            if (date_to) countQuery = countQuery.lte('created_at', date_to);

            const { count: totalCount, error: countError } = await countQuery;

            if (countError) {
                console.warn('Erro ao contar comissões:', countError);
            }

            // Registrar log de auditoria
            await logAuditAction(
                supabaseAdmin,
                currentUser.id,
                'VIEW',
                'COMMISSION',
                null,
                null,
                null,
                {
                    filters: { payment_status, commission_type, min_amount, max_amount, date_from, date_to },
                    total_commissions: commissions?.length || 0
                },
                `Consulta de comissões realizada - Total: ${commissions?.length || 0}`
            );

            return new Response(JSON.stringify({
                data: {
                    commissions: commissions || [],
                    pagination: {
                        page,
                        limit,
                        total: totalCount || 0,
                        totalPages: Math.ceil((totalCount || 0) / limit)
                    }
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'update_commission_status') {
            const requestData = await req.json();
            const { id, payment_status, payment_date, notes } = requestData;

            if (!id || !payment_status) {
                throw new Error('ID da comissão e status de pagamento são obrigatórios');
            }

            // Buscar comissão atual
            const { data: currentCommission, error: currentError } = await supabaseAdmin
                .from('commissions')
                .select('*')
                .eq('id', id)
                .single();

            if (currentError || !currentCommission) {
                throw new Error('Comissão não encontrada');
            }

            // Preparar dados de atualização
            const updateData: any = {
                payment_status,
                updated_at: new Date().toISOString()
            };

            if (payment_date) updateData.payment_date = payment_date;
            if (notes !== undefined) updateData.notes = notes;

            // Se o status for 'paid', definir data de pagamento se não fornecida
            if (payment_status === 'paid' && !payment_date) {
                updateData.payment_date = new Date().toISOString().split('T')[0];
            }

            const { data: commission, error: commissionError } = await supabaseAdmin
                .from('commissions')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (commissionError) {
                throw new Error(`Erro ao atualizar comissão: ${commissionError.message}`);
            }

            // Registrar log de auditoria
            await logAuditAction(
                supabaseAdmin,
                currentUser.id,
                'UPDATE',
                'COMMISSION',
                commission.id,
                `Comissão ${commission.id}`,
                currentCommission,
                updateData,
                `Status da comissão atualizado para: ${payment_status}`
            );

            return new Response(JSON.stringify({
                data: {
                    message: 'Status da comissão atualizado com sucesso',
                    commission
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'bulk_update_status') {
            const requestData = await req.json();
            const { commission_ids, payment_status, payment_date, notes } = requestData;

            if (!commission_ids || !Array.isArray(commission_ids) || commission_ids.length === 0) {
                throw new Error('IDs das comissões são obrigatórios');
            }

            if (!payment_status) {
                throw new Error('Status de pagamento é obrigatório');
            }

            // Preparar dados de atualização
            const updateData: any = {
                payment_status,
                updated_at: new Date().toISOString()
            };

            if (payment_date) updateData.payment_date = payment_date;
            if (notes !== undefined) updateData.notes = notes;

            // Se o status for 'paid', definir data de pagamento se não fornecida
            if (payment_status === 'paid' && !payment_date) {
                updateData.payment_date = new Date().toISOString().split('T')[0];
            }

            const { data: commissions, error: commissionsError } = await supabaseAdmin
                .from('commissions')
                .update(updateData)
                .in('id', commission_ids)
                .select();

            if (commissionsError) {
                throw new Error(`Erro ao atualizar comissões: ${commissionsError.message}`);
            }

            // Registrar log de auditoria
            await logAuditAction(
                supabaseAdmin,
                currentUser.id,
                'BULK_UPDATE',
                'COMMISSION',
                null,
                `${commission_ids.length} comissões`,
                null,
                {
                    commission_ids,
                    payment_status,
                    payment_date,
                    notes
                },
                `Atualização em lote de ${commission_ids.length} comissões para status: ${payment_status}`
            );

            return new Response(JSON.stringify({
                data: {
                    message: `${commissions?.length || 0} comissões atualizadas com sucesso`,
                    commissions: commissions || []
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'get_commission_reports') {
            const period = url.searchParams.get('period') || 'month';
            const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());
            const month = parseInt(url.searchParams.get('month') || (new Date().getMonth() + 1).toString());

            let dateFilter = '';
            if (period === 'month') {
                const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
                const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // último dia do mês
                dateFilter = `and(created_at.gte.${startDate},created_at.lte.${endDate})`;
            } else if (period === 'year') {
                const startDate = `${year}-01-01`;
                const endDate = `${year}-12-31`;
                dateFilter = `and(created_at.gte.${startDate},created_at.lte.${endDate})`;
            }

            // Relatório geral de comissões
            let reportQuery = supabaseAdmin
                .from('commissions')
                .select(`
                    commission_amount,
                    payment_status,
                    commission_type,
                    created_at,
                    recipient:recipient_user_id(full_name)
                `);

            if (dateFilter) {
                reportQuery = reportQuery.or(dateFilter);
            }

            const { data: commissions, error: commissionsError } = await reportQuery;

            if (commissionsError) {
                throw new Error(`Erro ao gerar relatório: ${commissionsError.message}`);
            }

            // Calcular estatísticas
            const stats = {
                total_commissions: commissions?.length || 0,
                total_amount: commissions?.reduce((sum, c) => sum + parseFloat(c.commission_amount || '0'), 0) || 0,
                paid_amount: commissions?.filter(c => c.payment_status === 'paid').reduce((sum, c) => sum + parseFloat(c.commission_amount || '0'), 0) || 0,
                pending_amount: commissions?.filter(c => c.payment_status === 'pending').reduce((sum, c) => sum + parseFloat(c.commission_amount || '0'), 0) || 0,
                by_status: {
                    paid: commissions?.filter(c => c.payment_status === 'paid').length || 0,
                    pending: commissions?.filter(c => c.payment_status === 'pending').length || 0,
                    cancelled: commissions?.filter(c => c.payment_status === 'cancelled').length || 0
                },
                by_type: {
                    assessor: commissions?.filter(c => c.commission_type === 'assessor').length || 0,
                    escritorio: commissions?.filter(c => c.commission_type === 'escritorio').length || 0,
                    master: commissions?.filter(c => c.commission_type === 'master').length || 0,
                    global: commissions?.filter(c => c.commission_type === 'global').length || 0
                }
            };

            // Registrar log de auditoria
            await logAuditAction(
                supabaseAdmin,
                currentUser.id,
                'VIEW',
                'COMMISSION_REPORT',
                null,
                null,
                null,
                {
                    period,
                    year,
                    month,
                    total_commissions: stats.total_commissions
                },
                `Relatório de comissões gerado - Período: ${period} - Total: ${stats.total_commissions}`
            );

            return new Response(JSON.stringify({
                data: {
                    period: { period, year, month },
                    stats,
                    commissions: commissions || []
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Ação não reconhecida: ${action}`);

    } catch (error) {
        console.error('Erro no gerenciamento de comissões:', {
            message: error.message,
            stack: error.stack,
            url: req.url
        });

        const errorResponse = {
            error: {
                code: 'COMMISSION_MANAGEMENT_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        let statusCode = 500;
        if (error.message.includes('Token') || error.message.includes('autorização')) {
            statusCode = 401;
        } else if (error.message.includes('permissão')) {
            statusCode = 403;
        } else if (error.message.includes('não encontrada') || error.message.includes('não encontrado')) {
            statusCode = 404;
        } else if (error.message.includes('obrigatório') || error.message.includes('são obrigatórios')) {
            statusCode = 400;
        }

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
