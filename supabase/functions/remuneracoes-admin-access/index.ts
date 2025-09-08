import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

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
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // Get all remuneracoes with admin access (bypassing RLS)
        const remuneracoesResponse = await fetch(`${SUPABASE_URL}/rest/v1/remuneracoes?order=data_vencimento.desc`, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json'
            }
        });

        const remuneracoes = await remuneracoesResponse.json();
        
        // Calculate totals
        const totalRemuneracoes = remuneracoes.reduce((sum: number, r: any) => sum + parseFloat(r.valor_remuneracao || 0), 0);
        const pendentes = remuneracoes.filter((r: any) => r.status === 'PENDENTE');
        const pagos = remuneracoes.filter((r: any) => r.status === 'PAGO');
        const erros = remuneracoes.filter((r: any) => r.status === 'ERRO');
        
        const totalPendentes = pendentes.reduce((sum: number, r: any) => sum + parseFloat(r.valor_remuneracao || 0), 0);
        const totalPagos = pagos.reduce((sum: number, r: any) => sum + parseFloat(r.valor_remuneracao || 0), 0);
        const totalErros = erros.reduce((sum: number, r: any) => sum + parseFloat(r.valor_remuneracao || 0), 0);

        // Filter for Investidor Teste Manual
        const investidorTesteManual = remuneracoes.filter((r: any) => 
            r.nome_investidor && r.nome_investidor.toLowerCase().includes('investidor teste manual')
        );

        return new Response(JSON.stringify({ 
            success: true,
            data: {
                all_remuneracoes: remuneracoes,
                investidor_teste_manual: investidorTesteManual,
                totals: {
                    total_remuneracoes: totalRemuneracoes,
                    total_pendentes: totalPendentes,
                    total_pagos: totalPagos,
                    total_erros: totalErros,
                    count_total: remuneracoes.length,
                    count_pendentes: pendentes.length,
                    count_pagos: pagos.length,
                    count_erros: erros.length,
                    count_investidor_teste_manual: investidorTesteManual.length
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: {
                code: 'FUNCTION_ERROR',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});