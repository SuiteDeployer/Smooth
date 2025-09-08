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
        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing Supabase configuration');
        }

        // Buscar todos os investimentos ativos com dados relacionados
        const investmentsResponse = await fetch(`${supabaseUrl}/rest/v1/investments?status=eq.active&select=*,series:series_id(id,name,series_code,interest_rate,duration_months,debenture:debenture_id(name)),investor:investor_user_id(id,full_name,pix,pix_key_type)`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!investmentsResponse.ok) {
            throw new Error(`Falha ao buscar investimentos: ${investmentsResponse.statusText}`);
        }

        const investments = await investmentsResponse.json();
        console.log('Investimentos encontrados:', investments.length);

        const remuneracaoRecords = [];

        // Processar cada investimento
        for (const investment of investments) {
            const { id: investmentId, invested_amount, investment_date, series, investor } = investment;
            
            if (!series || !investor) {
                console.log(`Pulando investimento ${investmentId}: dados de série ou investidor ausentes`);
                continue;
            }

            const startDate = new Date(investment_date);
            const monthlyRate = series.interest_rate / 12; // Converter taxa anual para mensal
            const monthlyRemuneracao = (invested_amount * monthlyRate) / 100; // Calcular remuneração mensal

            // Gerar remunerações para cada mês baseado na duração da série
            let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            
            // Gerar exatamente duration_months parcelas (não +1)
            for (let monthCount = 0; monthCount < series.duration_months; monthCount++) {
                const year = currentMonth.getFullYear();
                const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
                const remuneracaoId = `INV-${investmentId}-${year}-${month}`;
                
                // Verificar se esta remuneração já existe
                const existingResponse = await fetch(`${supabaseUrl}/rest/v1/remuneracoes?id_pagamento=eq.${remuneracaoId}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                });

                const existing = await existingResponse.json();
                if (existing.length > 0) {
                    console.log(`Remuneração ${remuneracaoId} já existe, pulando`);
                    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
                    continue;
                }

                // Calcular último dia do mês para data de vencimento
                const lastDayOfMonth = new Date(year, currentMonth.getMonth() + 1, 0);
                
                const remuneracaoRecord = {
                    id_pagamento: remuneracaoId,
                    nome_investidor: investor.full_name,
                    debenture: series.series_code, // Usar series_code ao invés de debenture name
                    serie: series.series_code,
                    valor_remuneracao: monthlyRemuneracao,
                    status: 'PENDENTE',
                    data_vencimento: lastDayOfMonth.toISOString().split('T')[0],
                    data_pagamento: null,
                    pix: investor.pix || '',
                    user_id: investment.investor_user_id
                };

                remuneracaoRecords.push(remuneracaoRecord);
                
                // Avançar para o próximo mês
                currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
            }
        }

        console.log('Registros de remuneração gerados:', remuneracaoRecords.length);

        // Inserir novos registros de remuneração
        if (remuneracaoRecords.length > 0) {
            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/remuneracoes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(remuneracaoRecords)
            });

            if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                throw new Error(`Falha ao inserir registros de remuneração: ${errorText}`);
            }

            const insertedRecords = await insertResponse.json();
            console.log('Registros inseridos com sucesso:', insertedRecords.length);
        }

        return new Response(JSON.stringify({ 
            data: {
                message: 'Remunerações sincronizadas com sucesso',
                investmentsProcessed: investments.length,
                recordsCreated: remuneracaoRecords.length
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Sync remuneration error:', error);

        const errorResponse = {
            error: {
                code: 'SYNC_REMUNERACAO_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
