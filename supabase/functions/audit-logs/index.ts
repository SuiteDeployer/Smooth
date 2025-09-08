import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

        if (action === 'get_logs') {
            const startDate = url.searchParams.get('start_date');
            const endDate = url.searchParams.get('end_date');
            const actionType = url.searchParams.get('action_type');
            const resourceType = url.searchParams.get('resource_type');
            const limit = parseInt(url.searchParams.get('limit') || '100');
            const offset = parseInt(url.searchParams.get('offset') || '0');

            const { data: logs, error: logsError } = await supabaseAdmin.rpc('get_audit_logs_filtered', {
                p_user_id: currentUser.id,
                p_start_date: startDate ? new Date(startDate).toISOString() : null,
                p_end_date: endDate ? new Date(endDate).toISOString() : null,
                p_action_type: actionType,
                p_resource_type: resourceType,
                p_limit: limit,
                p_offset: offset
            });

            if (logsError) {
                throw new Error(`Erro ao buscar logs: ${logsError.message}`);
            }

            return new Response(JSON.stringify({
                data: logs || [],
                pagination: {
                    limit,
                    offset,
                    total: logs?.length || 0
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'get_stats') {
            const days = parseInt(url.searchParams.get('days') || '30');

            const { data: stats, error: statsError } = await supabaseAdmin.rpc('get_audit_stats', {
                p_user_id: currentUser.id,
                p_days: days
            });

            if (statsError) {
                throw new Error(`Erro ao buscar estatísticas: ${statsError.message}`);
            }

            return new Response(JSON.stringify({
                data: stats?.[0] || {
                    total_actions: 0,
                    actions_today: 0,
                    most_active_users: [],
                    action_types_count: {},
                    resource_types_count: {}
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'export_logs') {
            const startDate = url.searchParams.get('start_date');
            const endDate = url.searchParams.get('end_date');
            const actionType = url.searchParams.get('action_type');
            const resourceType = url.searchParams.get('resource_type');
            const format = url.searchParams.get('format') || 'csv';

            const { data: logs, error: logsError } = await supabaseAdmin.rpc('get_audit_logs_filtered', {
                p_user_id: currentUser.id,
                p_start_date: startDate ? new Date(startDate).toISOString() : null,
                p_end_date: endDate ? new Date(endDate).toISOString() : null,
                p_action_type: actionType,
                p_resource_type: resourceType,
                p_limit: 10000, // Limite alto para export
                p_offset: 0
            });

            if (logsError) {
                throw new Error(`Erro ao buscar logs para export: ${logsError.message}`);
            }

            if (format === 'csv') {
                // Gerar CSV
                const headers = 'Data,Usuario,Role,Acao,Recurso,Nome_Recurso,Descricao\n';
                const csvContent = logs.map(log => {
                    const date = new Date(log.created_at).toLocaleString('pt-BR');
                    const user = log.user_email || 'sistema';
                    const role = log.user_role || 'SYSTEM';
                    const action = log.action_type;
                    const resource = log.resource_type;
                    const name = (log.resource_name || '').replace(/,/g, ';');
                    const description = (log.description || '').replace(/,/g, ';');
                    
                    return `"${date}","${user}","${role}","${action}","${resource}","${name}","${description}"`;
                }).join('\n');

                return new Response(headers + csvContent, {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="logs-auditoria-${new Date().toISOString().split('T')[0]}.csv"`
                    }
                });
            }

            // Formato JSON padrão
            return new Response(JSON.stringify({
                data: logs || [],
                exported_at: new Date().toISOString(),
                total_records: logs?.length || 0
            }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="logs-auditoria-${new Date().toISOString().split('T')[0]}.json"`
                }
            });
        }

        throw new Error(`Ação não reconhecida: ${action}`);

    } catch (error) {
        console.error('Erro na consulta de logs de auditoria:', {
            message: error.message,
            stack: error.stack,
            url: req.url
        });

        const errorResponse = {
            error: {
                code: 'AUDIT_LOGS_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        let statusCode = 500;
        if (error.message.includes('Token') || error.message.includes('autorização')) {
            statusCode = 401;
        } else if (error.message.includes('permissão')) {
            statusCode = 403;
        }

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});