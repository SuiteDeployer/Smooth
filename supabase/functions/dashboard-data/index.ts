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

        // Buscar dados completos do usuário atual
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

        const dashboardData = {
            user: {
                ...currentUser,
                user_roles: userRole
            },
            stats: {},
            recent_activity: []
        };

        // Dados específicos por tipo de usuário
        if (userRole.role_name === 'Global') {
            // Dashboard Global - Visão geral do sistema
            const { data: debentures } = await supabaseAdmin
                .from('debentures')
                .select('*')
                .eq('status', 'active');

            const { data: series } = await supabaseAdmin
                .from('series')
                .select('*')
                .eq('status', 'active');

            const { data: allInvestments } = await supabaseAdmin
                .from('investments')
                .select('*')
                .eq('status', 'active');

            const { data: allUsers } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('status', 'active');

            dashboardData.stats = {
                total_debentures: debentures?.length || 0,
                total_series: series?.length || 0,
                total_investments: allInvestments?.length || 0,
                total_invested: allInvestments?.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0) || 0,
                total_users: allUsers?.length || 0,
                active_series: series?.filter(s => s.status === 'active').length || 0
            };

        } else if (userRole.role_name === 'Master' || userRole.role_name === 'Escritório') {
            // Dashboard Master/Escritório - Gestão da rede
            const { data: subordinates } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('superior_user_id', currentUser.id)
                .eq('status', 'active');

            // Buscar investimentos da rede
            const subordinateIds = subordinates?.map(s => s.id) || [];
            const { data: networkInvestments } = await supabaseAdmin
                .from('investments')
                .select('*')
                .in('assessor_user_id', subordinateIds)
                .eq('status', 'active');

            // Buscar comissões
            const { data: commissions } = await supabaseAdmin
                .from('commissions')
                .select('*')
                .eq('recipient_user_id', currentUser.id);

            dashboardData.stats = {
                total_subordinates: subordinates?.length || 0,
                network_investments: networkInvestments?.length || 0,
                network_volume: networkInvestments?.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0) || 0,
                total_commissions: commissions?.reduce((sum, com) => sum + (com.commission_amount || 0), 0) || 0,
                pending_commissions: commissions?.filter(c => c.payment_status === 'pending').length || 0
            };

            dashboardData.subordinates = subordinates;

        } else if (userRole.role_name === 'Assessor') {
            // Dashboard Assessor - Gestão de clientes
            const { data: investors } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('superior_user_id', currentUser.id)
                .eq('status', 'active');

            const { data: myInvestments } = await supabaseAdmin
                .from('investments')
                .select('*')
                .eq('assessor_user_id', currentUser.id)
                .eq('status', 'active');

            const { data: myCommissions } = await supabaseAdmin
                .from('commissions')
                .select('*')
                .eq('recipient_user_id', currentUser.id);

            dashboardData.stats = {
                total_investors: investors?.length || 0,
                total_investments: myInvestments?.length || 0,
                total_volume: myInvestments?.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0) || 0,
                total_commissions: myCommissions?.reduce((sum, com) => sum + (com.commission_amount || 0), 0) || 0,
                avg_investment: myInvestments?.length > 0 ? 
                    (myInvestments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0) / myInvestments.length) : 0
            };

            dashboardData.investors = investors;
            dashboardData.recent_investments = myInvestments?.slice(-5);

        } else if (userRole.role_name === 'Investidor') {
            // Dashboard Investidor - Carteira pessoal
            const { data: myInvestments } = await supabaseAdmin
                .from('investments')
                .select('*')
                .eq('investor_user_id', currentUser.id)
                .eq('status', 'active');

            // Buscar dados das séries dos investimentos
            const seriesIds = [...new Set(myInvestments?.map(inv => inv.series_id) || [])];
            const { data: seriesData } = await supabaseAdmin
                .from('series')
                .select('*')
                .in('id', seriesIds);

            // Enriquecer investimentos com dados das séries
            const enrichedInvestments = myInvestments?.map(investment => {
                const series = seriesData?.find(s => s.id === investment.series_id);
                return {
                    ...investment,
                    series
                };
            }) || [];

            dashboardData.stats = {
                total_investments: myInvestments?.length || 0,
                total_invested: myInvestments?.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0) || 0,
                avg_interest_rate: myInvestments?.length > 0 ? 
                    (myInvestments.reduce((sum, inv) => sum + (inv.interest_rate || 0), 0) / myInvestments.length) : 0,
                active_investments: myInvestments?.filter(inv => inv.status === 'active').length || 0
            };

            dashboardData.investments = enrichedInvestments;
        }

        return new Response(JSON.stringify({
            data: dashboardData
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro no dashboard:', {
            message: error.message,
            stack: error.stack,
            url: req.url
        });

        const errorResponse = {
            error: {
                code: 'DASHBOARD_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        let statusCode = 500;
        if (error.message.includes('Token') || error.message.includes('autorização')) {
            statusCode = 401;
        }

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});