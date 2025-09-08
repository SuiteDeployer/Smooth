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
        const { report_type, filters } = await req.json();
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Configurações do Supabase não encontradas');
        }

        let reportData = {};
        
        switch (report_type) {
            case 'dashboard':
                // Dashboard principal com resumo geral
                const dashboardQuery = `
                    SELECT 
                        COUNT(*) as total_payments,
                        SUM(amount) as total_amount,
                        SUM(CASE WHEN status = 'PAGO' THEN amount ELSE 0 END) as paid_amount,
                        SUM(CASE WHEN status = 'PENDENTE' THEN amount ELSE 0 END) as pending_amount,
                        SUM(CASE WHEN status = 'CANCELADO' THEN amount ELSE 0 END) as cancelled_amount,
                        COUNT(CASE WHEN status = 'PAGO' THEN 1 END) as paid_count,
                        COUNT(CASE WHEN status = 'PENDENTE' THEN 1 END) as pending_count,
                        COUNT(CASE WHEN status = 'CANCELADO' THEN 1 END) as cancelled_count
                    FROM commission_payments
                `;
                
                const dashboardResponse = await fetch(`${supabaseUrl}/rest/v1/commission_payments?select=*`, {
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey
                    }
                });
                
                if (dashboardResponse.ok) {
                    const payments = await dashboardResponse.json();
                    
                    reportData.summary = {
                        total_payments: payments.length,
                        total_amount: payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
                        paid_amount: payments.filter(p => p.status === 'PAGO').reduce((sum, p) => sum + parseFloat(p.amount), 0),
                        pending_amount: payments.filter(p => p.status === 'PENDENTE').reduce((sum, p) => sum + parseFloat(p.amount), 0),
                        cancelled_amount: payments.filter(p => p.status === 'CANCELADO').reduce((sum, p) => sum + parseFloat(p.amount), 0),
                        paid_count: payments.filter(p => p.status === 'PAGO').length,
                        pending_count: payments.filter(p => p.status === 'PENDENTE').length,
                        cancelled_count: payments.filter(p => p.status === 'CANCELADO').length
                    };
                }
                
                // Buscar resumo mensal
                const monthlyResponse = await fetch(`${supabaseUrl}/rest/v1/commission_monthly_summary?order=month_year.desc&limit=6`, {
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey
                    }
                });
                
                if (monthlyResponse.ok) {
                    reportData.monthly_summary = await monthlyResponse.json();
                }
                
                // Buscar comissões vencidas
                const overdueResponse = await fetch(`${supabaseUrl}/rest/v1/commission_overdue?limit=10`, {
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey
                    }
                });
                
                if (overdueResponse.ok) {
                    reportData.overdue_commissions = await overdueResponse.json();
                }
                
                break;
                
            case 'monthly':
                // Relatório mensal detalhado
                const { month, year } = filters || {};
                
                if (!month || !year) {
                    throw new Error('Mês e ano são obrigatórios para relatório mensal');
                }
                
                const referenceDate = `${year}-${month.toString().padStart(2, '0')}-01`;
                const nextMonth = new Date(year, month, 1);
                const nextMonthStr = `${nextMonth.getFullYear()}-${(nextMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;
                
                const monthlyDetailResponse = await fetch(`${supabaseUrl}/rest/v1/commission_details?payment_month=gte.${referenceDate}&payment_month=lt.${nextMonthStr}&order=recipient_role,recipient_name`, {
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey
                    }
                });
                
                if (monthlyDetailResponse.ok) {
                    const monthlyData = await monthlyDetailResponse.json();
                    
                    // Agrupar por role
                    const groupedByRole = {};
                    monthlyData.forEach(commission => {
                        if (!groupedByRole[commission.recipient_role]) {
                            groupedByRole[commission.recipient_role] = [];
                        }
                        groupedByRole[commission.recipient_role].push(commission);
                    });
                    
                    reportData.monthly_detail = {
                        reference_month: `${month}/${year}`,
                        total_records: monthlyData.length,
                        total_amount: monthlyData.reduce((sum, c) => sum + parseFloat(c.amount), 0),
                        by_role: groupedByRole,
                        commissions: monthlyData
                    };
                }
                
                break;
                
            case 'hierarchy':
                // Relatório por hierarquia
                const hierarchyResponse = await fetch(`${supabaseUrl}/rest/v1/commission_details?order=recipient_role,recipient_name`, {
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey
                    }
                });
                
                if (hierarchyResponse.ok) {
                    const hierarchyData = await hierarchyResponse.json();
                    
                    const summaryByRole = {};
                    hierarchyData.forEach(commission => {
                        const role = commission.recipient_role;
                        if (!summaryByRole[role]) {
                            summaryByRole[role] = {
                                total_commissions: 0,
                                total_amount: 0,
                                paid_amount: 0,
                                pending_amount: 0,
                                cancelled_amount: 0,
                                recipients: new Set()
                            };
                        }
                        
                        summaryByRole[role].total_commissions++;
                        summaryByRole[role].total_amount += parseFloat(commission.amount);
                        summaryByRole[role].recipients.add(commission.recipient_name);
                        
                        switch (commission.status) {
                            case 'PAGO':
                                summaryByRole[role].paid_amount += parseFloat(commission.amount);
                                break;
                            case 'PENDENTE':
                                summaryByRole[role].pending_amount += parseFloat(commission.amount);
                                break;
                            case 'CANCELADO':
                                summaryByRole[role].cancelled_amount += parseFloat(commission.amount);
                                break;
                        }
                    });
                    
                    // Converter Set para array
                    Object.keys(summaryByRole).forEach(role => {
                        summaryByRole[role].unique_recipients = summaryByRole[role].recipients.size;
                        delete summaryByRole[role].recipients;
                    });
                    
                    reportData.hierarchy_summary = summaryByRole;
                }
                
                break;
                
            default:
                throw new Error(`Tipo de relatório inválido: ${report_type}`);
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: {
                report_type: report_type,
                generated_at: new Date().toISOString(),
                ...reportData
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Erro no relatório:', error);
        const errorResponse = {
            error: {
                code: 'REPORT_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});