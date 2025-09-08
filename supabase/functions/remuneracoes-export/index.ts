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

        // Buscar dados das remunerações respeitando RLS
        const remuneracoesResponse = await fetch(`${supabaseUrl}/rest/v1/remuneracoes?select=*&order=created_at.desc`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!remuneracoesResponse.ok) {
            const errorText = await remuneracoesResponse.text();
            throw new Error(`Erro ao buscar remunerações: ${errorText}`);
        }

        const remuneracoesData = await remuneracoesResponse.json();

        if (remuneracoesData.length === 0) {
            throw new Error('Nenhuma remuneração encontrada para exportar');
        }

        // Headers CSV conforme especificado
        const csvHeaders = [
            'ID Pagamento',
            'Nome do Investidor', 
            'Debênture',
            'Série',
            'Valor da Remuneração',
            'Status',
            'Data de Vencimento',
            'Data do Pagamento',
            'PIX'
        ];

        // Converter dados para CSV
        const csvRows = remuneracoesData.map(remuneracao => {
            return [
                remuneracao.id_pagamento || '',
                remuneracao.nome_investidor || '',
                remuneracao.debenture || '',
                remuneracao.serie || '',
                `R$ ${(remuneracao.valor_remuneracao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                remuneracao.status || 'PENDENTE',
                remuneracao.data_vencimento ? new Date(remuneracao.data_vencimento).toLocaleDateString('pt-BR') : '',
                remuneracao.data_pagamento ? new Date(remuneracao.data_pagamento).toLocaleDateString('pt-BR') : '',
                remuneracao.pix || ''
            ].map(field => `"${field.toString().replace(/"/g, '""')}"`); // Escapar aspas duplas
        });

        // Montar CSV
        const csvContent = [
            csvHeaders.join(','), // Headers sem aspas duplas
            ...csvRows.map(row => row.join(','))
        ].join('\n');

        // Gerar nome do arquivo com data atual
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `remuneracoes_${dateStr}.csv`;

        // Calcular estatísticas
        const totalRecords = remuneracoesData.length;
        const totalAmount = remuneracoesData.reduce((sum, remuneracao) => {
            return sum + (remuneracao.valor_remuneracao || 0);
        }, 0);

        const successResponse = {
            data: {
                csv_content: csvContent,
                file_name: filename,
                total_records: totalRecords,
                total_amount: totalAmount
            }
        };

        return new Response(JSON.stringify(successResponse), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('Erro ao exportar remunerações:', error);

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