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
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing Supabase configuration');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify token and get user
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid token');
        }

        const userData = await userResponse.json();
        const authUserId = userData.id;

        // Get user details and role
        const userDetailsResponse = await fetch(`${supabaseUrl}/rest/v1/users?auth_user_id=eq.${authUserId}&select=*,role:role_id(role_name)`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!userDetailsResponse.ok) {
            throw new Error('Failed to fetch user details');
        }

        const userDetails = await userDetailsResponse.json();
        if (!userDetails.length) {
            throw new Error('User not found');
        }

        const currentUser = userDetails[0];
        const userId = currentUser.id;
        const userRole = currentUser.role?.role_name;

        // Only Global users can access this dashboard
        if (userRole !== 'Global') {
            throw new Error('Access denied. Only Global users can access this dashboard.');
        }

        // Get current month for filtering new records
        const currentDate = new Date();
        const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];

        // Build hierarchy query - get all users in the network
        const hierarchyQuery = `
            WITH RECURSIVE user_hierarchy AS (
                -- Start with current user
                SELECT id, auth_user_id, full_name, role_id, superior_user_id, email, status, created_at, 0 as level
                FROM users 
                WHERE id = '${userId}'
                
                UNION ALL
                
                -- Get all subordinates recursively
                SELECT u.id, u.auth_user_id, u.full_name, u.role_id, u.superior_user_id, u.email, u.status, u.created_at, uh.level + 1
                FROM users u
                INNER JOIN user_hierarchy uh ON u.superior_user_id = uh.id
                WHERE uh.level < 10
            )
            SELECT 
                uh.*,
                ur.role_name
            FROM user_hierarchy uh
            INNER JOIN user_roles ur ON uh.role_id = ur.id
            WHERE uh.level > 0  -- Exclude the Global user himself
            ORDER BY uh.level, ur.role_name, uh.full_name
        `;

        const hierarchyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: hierarchyQuery })
        });

        let hierarchyUsers = [];
        if (hierarchyResponse.ok) {
            const hierarchyResult = await hierarchyResponse.json();
            hierarchyUsers = hierarchyResult || [];
        }

        // If RPC doesn't work, use direct query approach
        if (hierarchyUsers.length === 0) {
            const allUsersResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=*,role:role_id(role_name)`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (allUsersResponse.ok) {
                const allUsers = await allUsersResponse.json();
                // For now, get all non-Global users (simplified approach)
                hierarchyUsers = allUsers.filter(user => user.role?.role_name !== 'Global');
            }
        }

        // Separate users by role
        const masters = hierarchyUsers.filter(user => user.role_name === 'Master' || user.role?.role_name === 'Master');
        const escritorios = hierarchyUsers.filter(user => user.role_name === 'Escritório' || user.role?.role_name === 'Escritório');
        const assessores = hierarchyUsers.filter(user => user.role_name === 'Assessor' || user.role?.role_name === 'Assessor');
        const investidores = hierarchyUsers.filter(user => user.role_name === 'Investidor' || user.role?.role_name === 'Investidor');

        // Get new users this month
        const newMasters = masters.filter(user => user.created_at >= currentMonthStartStr);
        const newEscritorios = escritorios.filter(user => user.created_at >= currentMonthStartStr);
        const newAssessores = assessores.filter(user => user.created_at >= currentMonthStartStr);
        const newInvestidores = investidores.filter(user => user.created_at >= currentMonthStartStr);

        // Get all user IDs for investment queries
        const allUserIds = hierarchyUsers.map(user => user.id);
        const investorIds = investidores.map(user => user.id);
        const assessorIds = assessores.map(user => user.id);

        // Get investments from the network
        let investments = [];
        if (investorIds.length > 0) {
            const investmentsResponse = await fetch(`${supabaseUrl}/rest/v1/investments?investor_user_id=in.(${investorIds.join(',')})&select=*,series:series_id(name,series_code),investor:investor_user_id(full_name),assessor:assessor_user_id(full_name)`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (investmentsResponse.ok) {
                investments = await investmentsResponse.json();
            }
        }

        // Get remuneracoes from the network
        let remuneracoes = [];
        if (allUserIds.length > 0) {
            const remuneracoesResponse = await fetch(`${supabaseUrl}/rest/v1/remuneracoes?user_id=in.(${allUserIds.join(',')})&data_vencimento=gte.${currentMonthStartStr}&data_vencimento=lt.${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString().split('T')[0]}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (remuneracoesResponse.ok) {
                remuneracoes = await remuneracoesResponse.json();
            }
        }

        // Get commissions from the network
        let commissions = [];
        if (allUserIds.length > 0) {
            const commissionsResponse = await fetch(`${supabaseUrl}/rest/v1/commission_schedules?payment_month=gte.${currentMonthStartStr}&payment_month=lt.${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString().split('T')[0]}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (commissionsResponse.ok) {
                commissions = await commissionsResponse.json();
            }
        }

        // Calculate metrics
        const newInvestments = investments.filter(inv => inv.created_at >= currentMonthStartStr);
        const totalInvestedAmount = investments.reduce((sum, inv) => sum + parseFloat(inv.invested_amount || 0), 0);
        const newInvestedAmount = newInvestments.reduce((sum, inv) => sum + parseFloat(inv.invested_amount || 0), 0);

        // Calculate investment performance by assessor
        const assessorPerformance = assessorIds.map(assessorId => {
            const assessor = assessores.find(a => a.id === assessorId);
            const assessorInvestments = investments.filter(inv => inv.assessor_user_id === assessorId);
            const totalAmount = assessorInvestments.reduce((sum, inv) => sum + parseFloat(inv.invested_amount || 0), 0);
            
            return {
                assessor_id: assessorId,
                assessor_name: assessor?.full_name || 'Unknown',
                total_investments: assessorInvestments.length,
                total_amount: totalAmount,
                clients_count: new Set(assessorInvestments.map(inv => inv.investor_user_id)).size
            };
        }).sort((a, b) => b.total_amount - a.total_amount);

        // Remuneracao metrics
        const totalRemuneracao = remuneracoes.reduce((sum, rem) => sum + parseFloat(rem.valor_remuneracao || 0), 0);
        const remuneracoesPendentes = remuneracoes.filter(rem => rem.status === 'PENDENTE');
        const remuneracoesPagas = remuneracoes.filter(rem => rem.status === 'PAGO');
        const remuneracoesErro = remuneracoes.filter(rem => rem.status === 'ERRO');

        // Commission metrics
        const totalCommissions = commissions.reduce((sum, com) => sum + parseFloat(com.monthly_amount || 0), 0);
        const commissionsByRole = {
            Master: commissions.filter(c => c.recipient_role === 'Master').reduce((sum, c) => sum + parseFloat(c.monthly_amount || 0), 0),
            Escritório: commissions.filter(c => c.recipient_role === 'Escritório').reduce((sum, c) => sum + parseFloat(c.monthly_amount || 0), 0),
            Assessor: commissions.filter(c => c.recipient_role === 'Assessor').reduce((sum, c) => sum + parseFloat(c.monthly_amount || 0), 0)
        };

        // Build response
        const dashboardMetrics = {
            masters: {
                total: masters.length,
                new_this_month: newMasters.length,
                users: masters.slice(0, 10).map(user => ({
                    id: user.id,
                    name: user.full_name,
                    email: user.email,
                    created_at: user.created_at,
                    status: user.status
                }))
            },
            escritorios: {
                total: escritorios.length,
                new_this_month: newEscritorios.length,
                users: escritorios.slice(0, 10).map(user => ({
                    id: user.id,
                    name: user.full_name,
                    email: user.email,
                    created_at: user.created_at,
                    status: user.status
                }))
            },
            assessores: {
                total: assessores.length,
                new_this_month: newAssessores.length,
                top_performers: assessorPerformance.slice(0, 5),
                bottom_performers: assessorPerformance.slice(-5).reverse(),
                users: assessores.slice(0, 10).map(user => ({
                    id: user.id,
                    name: user.full_name,
                    email: user.email,
                    created_at: user.created_at,
                    status: user.status
                }))
            },
            investidores: {
                total: investidores.length,
                new_this_month: newInvestidores.length,
                recent: newInvestidores.slice(0, 10).map(user => ({
                    id: user.id,
                    name: user.full_name,
                    email: user.email,
                    created_at: user.created_at,
                    status: user.status
                })),
                all: investidores.slice(0, 20).map(user => ({
                    id: user.id,
                    name: user.full_name,
                    email: user.email,
                    created_at: user.created_at,
                    status: user.status
                }))
            },
            investments: {
                total: investments.length,
                new_this_month: newInvestments.length,
                total_amount: totalInvestedAmount,
                new_amount_this_month: newInvestedAmount,
                recent: newInvestments.slice(0, 10).map(inv => ({
                    id: inv.id,
                    investor_name: inv.investor?.full_name || 'Unknown',
                    assessor_name: inv.assessor?.full_name || 'Unknown',
                    series_name: inv.series?.name || 'Unknown',
                    amount: parseFloat(inv.invested_amount || 0),
                    created_at: inv.created_at
                })),
                breakdown_by_series: [...new Set(investments.map(inv => inv.series?.series_code))].map(seriesCode => {
                    const seriesInvestments = investments.filter(inv => inv.series?.series_code === seriesCode);
                    return {
                        series_code: seriesCode || 'Unknown',
                        count: seriesInvestments.length,
                        total_amount: seriesInvestments.reduce((sum, inv) => sum + parseFloat(inv.invested_amount || 0), 0)
                    };
                })
            },
            remuneracao: {
                total_this_month: totalRemuneracao,
                count_this_month: remuneracoes.length,
                pendentes: {
                    count: remuneracoesPendentes.length,
                    amount: remuneracoesPendentes.reduce((sum, rem) => sum + parseFloat(rem.valor_remuneracao || 0), 0)
                },
                pagas: {
                    count: remuneracoesPagas.length,
                    amount: remuneracoesPagas.reduce((sum, rem) => sum + parseFloat(rem.valor_remuneracao || 0), 0)
                },
                erro: {
                    count: remuneracoesErro.length,
                    amount: remuneracoesErro.reduce((sum, rem) => sum + parseFloat(rem.valor_remuneracao || 0), 0)
                },
                breakdown: [...new Set(remuneracoes.map(rem => rem.nome_investidor))].map(investorName => {
                    const investorRemuneracoes = remuneracoes.filter(rem => rem.nome_investidor === investorName);
                    return {
                        investor_name: investorName,
                        count: investorRemuneracoes.length,
                        total_amount: investorRemuneracoes.reduce((sum, rem) => sum + parseFloat(rem.valor_remuneracao || 0), 0)
                    };
                })
            },
            commissions: {
                total_this_month: totalCommissions,
                count_this_month: commissions.length,
                by_role: commissionsByRole,
                recent: commissions.slice(0, 10).map(com => ({
                    id: com.id,
                    recipient_role: com.recipient_role,
                    recipient_name: com.recipient_name,
                    amount: parseFloat(com.monthly_amount || 0),
                    status: com.status,
                    payment_month: com.payment_month
                }))
            },
            summary: {
                current_month: currentMonthStartStr,
                total_network_users: hierarchyUsers.length,
                total_investments: investments.length,
                total_invested_amount: totalInvestedAmount,
                total_monthly_remuneracao: totalRemuneracao,
                total_monthly_commissions: totalCommissions
            }
        };

        return new Response(JSON.stringify({ data: dashboardMetrics }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Dashboard metrics error:', error);

        const errorResponse = {
            error: {
                code: 'DASHBOARD_METRICS_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
