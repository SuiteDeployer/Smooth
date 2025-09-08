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
            throw new Error('Configuração do Supabase não encontrada');
        }

        // Buscar dados das comissões com join manual
        const commissionsResponse = await fetch(`${supabaseUrl}/rest/v1/commission_schedules?select=*&order=payment_month.asc`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!commissionsResponse.ok) {
            throw new Error('Erro ao buscar comissões');
        }

        const commissionsData = await commissionsResponse.json();

        // Buscar dados dos investimentos relacionados
        if (commissionsData.length > 0) {
            const investmentIds = [...new Set(commissionsData.map(c => c.investment_id))];
            
            const investmentsResponse = await fetch(`${supabaseUrl}/rest/v1/investments?select=*&id=in.(${investmentIds.join(',')})`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            const investmentsData = await investmentsResponse.json();

            // Buscar dados dos usuários (investidores e recipientes)
            const userIds = [...new Set([
                ...commissionsData.map(c => c.recipient_user_id),
                ...investmentsData.map(i => i.investor_user_id)
            ])];

            const usersResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=id,full_name,pix,pix_key_type&id=in.(${userIds.join(',')})`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            const usersData = await usersResponse.json();

            // Buscar dados dos pagamentos
            const scheduleIds = commissionsData.map(c => c.id);
            const paymentsResponse = await fetch(`${supabaseUrl}/rest/v1/commission_payments?select=*&commission_schedule_id=in.(${scheduleIds.join(',')})`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            const paymentsData = await paymentsResponse.json();

            // Combinar dados
            const enrichedCommissions = commissionsData.map(commission => {
                const investment = investmentsData.find(i => i.id === commission.investment_id);
                const investor = usersData.find(u => u.id === investment?.investor_user_id);
                const recipient = usersData.find(u => u.id === commission.recipient_user_id);
                const payment = paymentsData.find(p => p.commission_schedule_id === commission.id);

                return {
                    id: commission.id,
                    investorName: investor?.full_name || 'N/A',
                    investmentAmount: investment?.invested_amount || 0,
                    recipientName: recipient?.full_name || 'N/A',
                    recipientRole: commission.recipient_role,
                    installment: `${commission.installment_number}/${commission.total_installments}`,
                    monthlyCommission: commission.monthly_amount,
                    pixKeyType: recipient?.pix_key_type || payment?.pix_key_type || 'N/A',
                    pixKey: recipient?.pix || payment?.pix_key || 'N/A',
                    dueDate: commission.payment_month,
                    status: commission.status || 'PENDENTE',
                    paymentDate: payment?.paid_at || null,
                    paymentId: payment?.payment_id || null
                };
            });

            return new Response(JSON.stringify({
                data: enrichedCommissions,
                total: enrichedCommissions.length
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            data: [],
            total: 0
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao buscar dados das comissões:', error);

        const errorResponse = {
            error: {
                code: 'COMMISSIONS_FETCH_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});