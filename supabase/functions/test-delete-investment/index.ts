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
            const { action, investment_id } = requestData;

            if (action === 'create_test_investment') {
                // Criar um investimento de teste para delete
                const testInvestment = {
                    series_id: "c23c2ca1-4327-4a0d-9cd0-488e5c33398a",
                    investor_user_id: "f4d1e5d1-da29-4dc3-90b8-7937acd1d3af",
                    assessor_user_id: "4b053a25-35d7-418d-902c-15776abd02be",
                    invested_amount: 99999,
                    investment_date: "2025-07-30",
                    maturity_date: "2026-07-30",
                    interest_type: "prefixado",
                    interest_rate: 99.99,
                    status: "active"
                };

                const investment = await supabaseRequest('investments', {
                    method: 'POST',
                    body: JSON.stringify(testInvestment)
                });

                return new Response(JSON.stringify({
                    success: true,
                    data: {
                        message: 'Investimento de teste criado para delete',
                        investment: investment[0]
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (action === 'delete_investment' && investment_id) {
                // Deletar o investimento especificado
                const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/investments?id=eq.${investment_id}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': serviceRoleKey,
                        'authorization': `Bearer ${serviceRoleKey}`,
                        'content-type': 'application/json'
                    }
                });

                if (!deleteResponse.ok) {
                    const errorText = await deleteResponse.text();
                    throw new Error(`Delete failed: ${deleteResponse.status} - ${errorText}`);
                }

                return new Response(JSON.stringify({
                    success: true,
                    data: {
                        message: 'Investimento deletado com sucesso',
                        investment_id: investment_id
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        if (req.method === 'GET') {
            // Listar investimentos de teste (valor 99999)
            const testInvestments = await supabaseRequest('investments?invested_amount=eq.99999&select=*');

            return new Response(JSON.stringify({
                success: true,
                data: {
                    message: 'Lista de investimentos de teste',
                    investments: testInvestments,
                    total: testInvestments.length
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error('Método não suportado');

    } catch (error) {
        console.error('Erro no teste de delete:', error);

        return new Response(JSON.stringify({
            error: {
                code: 'TEST_DELETE_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});