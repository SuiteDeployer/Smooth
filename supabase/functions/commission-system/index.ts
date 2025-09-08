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
        
        // Tentar ler action do body JSON primeiro, depois da query string
        let action = null;
        let requestData = null;
        
        try {
            requestData = await req.json();
            action = requestData.action;
        } catch {
            // Se não conseguir ler JSON, tentar da query string
            action = url.searchParams.get('action');
        }


        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Configuração do Supabase não encontrada');
        }

        const supabaseHeaders = {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY
        };

        let result;

        switch (action) {
            case 'calculate_commissions':
                result = await calculateCommissions(requestData, SUPABASE_URL, supabaseHeaders);
                break;
            case 'get_commissions_list':
                result = await getCommissionsList(requestData, SUPABASE_URL, supabaseHeaders);
                break;
            case 'process_monthly_commissions':
                result = await processMonthlyCommissions(requestData, SUPABASE_URL, supabaseHeaders);
                break;
            default:
                throw new Error(`Ação não reconhecida: ${action}`);
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro na função de comissões:', error);
        const errorResponse = {
            error: {
                code: 'COMMISSION_SYSTEM_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Função para calcular comissões de um investimento
async function calculateCommissions(data: any, supabaseUrl: string, headers: any) {
    const { investment_id, invested_amount, commission_master, commission_escritorio, commission_assessor } = data;

    // Buscar dados do investimento
    const investmentResponse = await fetch(`${supabaseUrl}/rest/v1/investments?id=eq.${investment_id}&select=*,investor_user:users!investor_user_id(*),assessor_user:users!assessor_user_id(*),series:series(*)`, {
        headers
    });

    if (!investmentResponse.ok) {
        throw new Error('Erro ao buscar dados do investimento');
    }

    const investments = await investmentResponse.json();
    if (!investments.length) {
        throw new Error('Investimento não encontrado');
    }

    const investment = investments[0];

    // Calcular valores das comissões
    const commissions = [];
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    // Comissão Master
    if (commission_master > 0) {
        const masterAmount = (invested_amount * commission_master) / 100;
        commissions.push({
            investment_id,
            recipient_user_id: await findUserByRole('Master', investment.assessor_user_id),
            commission_percentage: commission_master,
            commission_amount: masterAmount,
            commission_type: 'master',
            payment_status: 'pending',
            payment_month: currentMonth
        });
    }

    // Comissão Escritório
    if (commission_escritorio > 0) {
        const escritorioAmount = (invested_amount * commission_escritorio) / 100;
        commissions.push({
            investment_id,
            recipient_user_id: await findUserByRole('Escritório', investment.assessor_user_id),
            commission_percentage: commission_escritorio,
            commission_amount: escritorioAmount,
            commission_type: 'escritorio',
            payment_status: 'pending',
            payment_month: currentMonth
        });
    }

    // Comissão Assessor
    if (commission_assessor > 0) {
        const assessorAmount = (invested_amount * commission_assessor) / 100;
        commissions.push({
            investment_id,
            recipient_user_id: investment.assessor_user_id,
            commission_percentage: commission_assessor,
            commission_amount: assessorAmount,
            commission_type: 'assessor',
            payment_status: 'pending',
            payment_month: currentMonth
        });
    }

    // Inserir comissões no banco
    if (commissions.length > 0) {
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/commissions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(commissions)
        });

        if (!insertResponse.ok) {
            throw new Error('Erro ao inserir comissões');
        }
    }

    return {
        message: 'Comissões calculadas com sucesso',
        commissions_created: commissions.length,
        total_amount: commissions.reduce((sum, c) => sum + c.commission_amount, 0)
    };
}

// Função para buscar usuário por role na hierarquia
async function findUserByRole(roleName: string, startUserId: string) {
    // Por simplicidade, retornamos IDs fixos baseados no role
    // Em produção, seria necessário navegar pela hierarquia
    const roleIds = {
        'Master': '4b053a25-35d7-418d-902c-15776abd02be',
        'Escritório': '70c9579b-eb50-45ff-92a7-dc1618ba50e1',
        'Assessor': '8c4a9771-3b8f-4132-a54f-3102c514212f'
    };
    
    return roleIds[roleName] || startUserId;
}

// Função para listar comissões com filtros
async function getCommissionsList(data: any, supabaseUrl: string, headers: any) {
    const { search_term, status_filter, commission_type_filter, limit = 50, offset = 0 } = data;

    let query = `${supabaseUrl}/rest/v1/commissions?select=*,investment:investments(*,investor_user:users!investor_user_id(*),assessor_user:users!assessor_user_id(*),series:series(*,debentures:debentures(*))),recipient_user:users!recipient_user_id(*)&order=created_at.desc`;

    // Aplicar filtros
    if (status_filter && status_filter !== 'todos') {
        query += `&payment_status=eq.${status_filter}`;
    }

    if (commission_type_filter && commission_type_filter !== 'todos') {
        query += `&commission_type=eq.${commission_type_filter}`;
    }

    query += `&limit=${limit}&offset=${offset}`;

    const response = await fetch(query, { headers });

    if (!response.ok) {
        throw new Error('Erro ao buscar lista de comissões');
    }

    const commissions = await response.json();

    // Aplicar filtro de busca por texto (CNPJ, nome, série) no lado do servidor
    let filteredCommissions = commissions;
    
    if (search_term && search_term.trim()) {
        const searchLower = search_term.toLowerCase();
        filteredCommissions = commissions.filter((commission: any) => {
            const investor = commission.investment?.investor_user;
            const assessor = commission.investment?.assessor_user;
            const series = commission.investment?.series;
            
            return (
                investor?.full_name?.toLowerCase().includes(searchLower) ||
                investor?.cpf_cnpj?.toLowerCase().includes(searchLower) ||
                assessor?.full_name?.toLowerCase().includes(searchLower) ||
                assessor?.cpf_cnpj?.toLowerCase().includes(searchLower) ||
                series?.name?.toLowerCase().includes(searchLower) ||
                commission.recipient_user?.full_name?.toLowerCase().includes(searchLower)
            );
        });
    }

    // Calcular estatísticas
    const stats = {
        total_commissions: filteredCommissions.length,
        total_amount: filteredCommissions.reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount || 0), 0),
        pending_count: filteredCommissions.filter((c: any) => c.payment_status === 'pending').length,
        paid_count: filteredCommissions.filter((c: any) => c.payment_status === 'paid').length,
        processing_count: filteredCommissions.filter((c: any) => c.payment_status === 'processing').length
    };

    return {
        commissions: filteredCommissions,
        stats,
        pagination: {
            limit,
            offset,
            total: filteredCommissions.length
        }
    };
}

// Função para processar comissões mensais
async function processMonthlyCommissions(data: any, supabaseUrl: string, headers: any) {
    const { month } = data; // Format: YYYY-MM

    // Buscar todas as comissões pendentes do mês
    const query = `${supabaseUrl}/rest/v1/commissions?payment_month=eq.${month}&payment_status=eq.pending&select=*`;
    
    const response = await fetch(query, { headers });

    if (!response.ok) {
        throw new Error('Erro ao buscar comissões pendentes');
    }

    const pendingCommissions = await response.json();

    // Atualizar status para processamento
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/commissions?payment_month=eq.${month}&payment_status=eq.pending`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
            payment_status: 'processing',
            status_changed_at: new Date().toISOString()
        })
    });

    if (!updateResponse.ok) {
        throw new Error('Erro ao atualizar status das comissões');
    }

    return {
        message: 'Processamento mensal iniciado',
        commissions_processed: pendingCommissions.length,
        month
    };
}