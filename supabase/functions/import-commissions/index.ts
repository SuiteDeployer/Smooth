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

        if (req.method !== 'POST') {
            throw new Error('Método não permitido. Use POST para enviar o arquivo.');
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            throw new Error('Nenhum arquivo foi enviado.');
        }

        if (!file.name.endsWith('.csv')) {
            throw new Error('Apenas arquivos CSV são aceitos.');
        }

        const csvContent = await file.text();
        const lines = csvContent.trim().split('\n');
        
        if (lines.length < 2) {
            throw new Error('Arquivo CSV deve conter pelo menos um cabeçalho e uma linha de dados.');
        }

        // Verificar se o cabeçalho está correto
        const header = lines[0];
        const expectedHeader = 'ID Pagamento,Nome do Investidor,Valor do Investimento,Destinário,Parcela,Valor da Comissão Mensal,Tipo de Chave PIX,PIX,Data de Vencimento,Status,Data do Pagamento';
        
        if (!header.includes('ID Pagamento') || !header.includes('Status') || !header.includes('Data do Pagamento')) {
            throw new Error('Formato de arquivo inválido. Certifique-se de usar o arquivo exportado pelo sistema.');
        }

        const dataLines = lines.slice(1);
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i].trim();
            if (!line) continue;

            try {
                // Parse simples da linha CSV
                const values = line.split(',');
                
                if (values.length < 11) {
                    throw new Error(`Linha ${i + 2}: Formato inválido. Esperado 11 colunas, encontrado ${values.length}.`);
                }

                // Extrair valores conforme formato especificado
                const paymentId = values[0].trim();                    // ID Pagamento
                const nomeInvestidor = values[1].trim();               // Nome do Investidor  
                const valorInvestimento = values[2].trim();            // Valor do Investimento
                const destinatario = values[3].trim();                 // Destinário
                const parcela = values[4].trim();                      // Parcela
                const valorComissao = values[5].trim();                // Valor da Comissão Mensal
                const tipoChavePix = values[6].trim();                 // Tipo de Chave PIX
                const pix = values[7].trim();                          // PIX
                const dataVencimento = values[8].trim();               // Data de Vencimento
                const status = values[9].trim();                       // Status
                const dataPagamento = values[10].trim();               // Data do Pagamento

                if (!paymentId) {
                    throw new Error(`Linha ${i + 2}: ID de pagamento não pode estar vazio.`);
                }

                if (!status || !['PAGO', 'PENDENTE', 'ERRO'].includes(status.toUpperCase())) {
                    throw new Error(`Linha ${i + 2}: Status deve ser PAGO, PENDENTE ou ERRO.`);
                }

                // Buscar o pagamento pelo payment_id
                const paymentResponse = await fetch(`${supabaseUrl}/rest/v1/commission_payments?select=id,status,commission_schedule_id&payment_id=eq.${paymentId}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                });

                const paymentData = await paymentResponse.json();
                
                if (!paymentData || paymentData.length === 0) {
                    throw new Error(`Linha ${i + 2}: Pagamento com ID ${paymentId} não encontrado.`);
                }

                const payment = paymentData[0];

                // Preparar dados para atualização
                const updateData = {
                    status: status.toUpperCase(),
                    updated_at: new Date().toISOString()
                };

                // Processar data de pagamento se status for PAGO
                if (status.toUpperCase() === 'PAGO' && dataPagamento && dataPagamento !== '') {
                    try {
                        // Parse da data brasileira dd/mm/yyyy
                        const dateParts = dataPagamento.split('/');
                        if (dateParts.length === 3) {
                            const day = parseInt(dateParts[0]);
                            const month = parseInt(dateParts[1]) - 1; // JS months são 0-based
                            const year = parseInt(dateParts[2]);
                            
                            // Criar data em timezone local, meio-dia para evitar problemas
                            const parsedDate = new Date(year, month, day, 12, 0, 0);
                            
                            if (!isNaN(parsedDate.getTime())) {
                                updateData.paid_at = parsedDate.toISOString();
                            }
                        }
                    } catch (dateError) {
                        console.warn(`Data inválida na linha ${i + 2}: ${dataPagamento}`);
                    }
                } else if (status.toUpperCase() === 'PAGO' && (!dataPagamento || dataPagamento === '')) {
                    // Se status é PAGO mas não há data específica, usar data atual
                    updateData.paid_at = new Date().toISOString();
                }

                // Atualizar o pagamento na tabela commission_payments
                const updateResponse = await fetch(`${supabaseUrl}/rest/v1/commission_payments?id=eq.${payment.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!updateResponse.ok) {
                    throw new Error(`Linha ${i + 2}: Erro ao atualizar pagamento ${paymentId}.`);
                }

                // Atualizar também o commission_schedule se necessário
                if (payment.commission_schedule_id) {
                    await fetch(`${supabaseUrl}/rest/v1/commission_schedules?id=eq.${payment.commission_schedule_id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: status.toUpperCase() })
                    });
                }

                successCount++;

            } catch (lineError) {
                errorCount++;
                errors.push(lineError.message);
                console.error(`Erro na linha ${i + 2}:`, lineError);
            }
        }

        return new Response(JSON.stringify({
            data: {
                totalProcessed: dataLines.length,
                successCount,
                errorCount,
                errors: errors.slice(0, 10)
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao importar arquivo:', error);

        const errorResponse = {
            error: {
                code: 'IMPORT_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});