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

        // Buscar dados das comissões
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

        if (commissionsData.length === 0) {
            throw new Error('Nenhuma comissão encontrada para exportar');
        }

        // Buscar dados relacionados
        const investmentIds = [...new Set(commissionsData.map(c => c.investment_id))];
        const investmentsResponse = await fetch(`${supabaseUrl}/rest/v1/investments?select=*&id=in.(${investmentIds.join(',')})`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });
        const investmentsData = await investmentsResponse.json();

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

        const scheduleIds = commissionsData.map(c => c.id);
        const paymentsResponse = await fetch(`${supabaseUrl}/rest/v1/commission_payments?select=*&commission_schedule_id=in.(${scheduleIds.join(',')})`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });
        const paymentsData = await paymentsResponse.json();

        // Gerar CSV
        const csvHeaders = [
            'ID Pagamento',
            'Nome do Investidor',
            'Valor do Investimento',
            'Destinatário',
            'Parcela',
            'Valor da Comissão Mensal',
            'Tipo de Chave PIX',
            'PIX',
            'Data de Vencimento',
            'Status',
            'Data do Pagamento'
        ];

        const csvRows = commissionsData.map(commission => {
            const investment = investmentsData.find(i => i.id === commission.investment_id);
            const investor = usersData.find(u => u.id === investment?.investor_user_id);
            const recipient = usersData.find(u => u.id === commission.recipient_user_id);
            const payment = paymentsData.find(p => p.commission_schedule_id === commission.id);

            return [
                payment?.payment_id || '',
                investor?.full_name || 'N/A',
                `R$ ${(investment?.invested_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                recipient?.full_name || 'N/A',
                `${commission.installment_number}/${commission.total_installments}`,
                `R$ ${commission.monthly_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                recipient?.pix_key_type || payment?.pix_key_type || 'N/A',
                recipient?.pix || payment?.pix_key || 'N/A',
                new Date(commission.payment_month).toLocaleDateString('pt-BR'),
                commission.status || 'PENDENTE',
                payment?.paid_at ? new Date(payment.paid_at).toLocaleDateString('pt-BR') : ''
            ].map(field => `"${field.toString().replace(/"/g, '""')}"`); // Escapar aspas duplas
        });

        // Montar CSV
        const csvContent = [
            csvHeaders.map(header => `"${header}"`).join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n');

        // Gerar nome do arquivo com data atual
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `comissoes_${dateStr}.csv`;

        return new Response(csvContent, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('Erro ao exportar comissões:', error);

        const errorResponse = {
            error: {
                code: 'EXPORT_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});