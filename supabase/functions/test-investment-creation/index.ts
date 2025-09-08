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

        // Função auxiliar para fazer requisições ao Supabase
        async function supabaseRequest(endpoint: string, options: RequestInit = {}) {
            const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
                headers: {
                    'apikey': serviceRoleKey,
                    'authorization': `Bearer ${serviceRoleKey}`,
                    'content-type': 'application/json',
                    'prefer': 'return=representation',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Supabase request failed: ${response.status} - ${errorText}`);
            }
            
            return response.json();
        }

        if (req.method === 'POST') {
            const requestData = await req.json();
            console.log('🚀 Dados recebidos para criação:', requestData);

            // Criar investimento diretamente
            const investmentResult = await supabaseRequest('investments', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });

            console.log('✅ Investimento criado:', investmentResult);

            // Buscar o investimento com todos os relacionamentos
            const fullInvestmentQuery = `investments?id=eq.${investmentResult[0].id}&select=*,series(*,debentures(*)),investor_user:users!investor_user_id(*),assessor_user:users!assessor_user_id(*)`;
            const fullInvestmentData = await supabaseRequest(fullInvestmentQuery);

            return new Response(JSON.stringify({
                success: true,
                data: {
                    message: 'Investimento criado com sucesso via edge function',
                    investment: investmentResult[0],
                    full_data: fullInvestmentData[0]
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (req.method === 'GET') {
            // Listar todos os investimentos para verificação
            const investmentsQuery = `investments?select=*,series(*,debentures(*)),investor_user:users!investor_user_id(*),assessor_user:users!assessor_user_id(*)&order=created_at.desc`;
            const investments = await supabaseRequest(investmentsQuery);

            return new Response(JSON.stringify({
                success: true,
                data: {
                    message: 'Lista de investimentos carregada',
                    investments: investments,
                    total: investments.length
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error('Método não suportado');

    } catch (error) {
        console.error('Erro no teste de investimentos:', error);

        return new Response(JSON.stringify({
            error: {
                code: 'TEST_INVESTMENT_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});