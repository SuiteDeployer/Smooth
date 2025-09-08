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

        // Verificar se o cabeçalho está correto - versão mais flexível
        const header = lines[0].replace(/"/g, ''); // Remove aspas para comparação
        const expectedHeaders = ['ID Pagamento', 'Nome do Investidor', 'Valor do Investimento', 'Destinário', 'Parcela', 'Valor da Comissão Mensal', 'Tipo de Chave PIX', 'PIX', 'Data de Vencimento', 'Status', 'Data do Pagamento'];
        
        // Verificar se contém os campos essenciais para importação
        const hasEssentialFields = expectedHeaders.every(expectedHeader => 
            header.includes(expectedHeader)
        );
        
        if (!hasEssentialFields) {
            throw new Error('Formato de arquivo inválido. O arquivo deve conter todos os campos obrigatórios: ' + expectedHeaders.join(', '));
        }

        const dataLines = lines.slice(1);
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i].trim();
            if (!line) continue;

            try {
                // Parse CSV mais robusto para lidar com formato incorreto de exportação
                const parseCSVLine = (line) => {
                    // Remover aspas duplas que podem envolver toda a linha
                    let cleanedLine = line.trim();
                    
                    // Se a linha inteira está envolvida por aspas duplas, removê-las
                    if (cleanedLine.startsWith('"') && cleanedLine.endsWith('"') && cleanedLine.length > 1) {
                        cleanedLine = cleanedLine.slice(1, -1);
                    }
                    
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    let i = 0;
                    
                    while (i < cleanedLine.length) {
                        const char = cleanedLine[i];
                        const nextChar = i + 1 < cleanedLine.length ? cleanedLine[i + 1] : null;
                        
                        if (char === '"' && nextChar === '"') {
                            // Aspas duplas duplicadas - iniciar/terminar campo com aspas
                            if (!inQuotes) {
                                // Iniciar campo com aspas duplas
                                inQuotes = true;
                                i += 2; // Pular ambas as aspas
                                continue;
                            } else {
                                // Terminar campo com aspas duplas
                                inQuotes = false;
                                i += 2; // Pular ambas as aspas
                                continue;
                            }
                        } else if (char === ',' && !inQuotes) {
                            // Separador de campo fora de aspas
                            result.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                        
                        i++;
                    }
                    
                    result.push(current.trim());
                    
                    return result;
                };
                
                const values = parseCSVLine(line);
                
                if (values.length < 11) {
                    throw new Error(`Linha ${i + 2}: Formato inválido. Esperado 11 colunas, encontrado ${values.length}.`);
                }

                // Extrair valores conforme formato especificado (já limpos pelo parseCSVLine)
                const paymentId = values[0];                    // ID Pagamento
                const nomeInvestidor = values[1];               // Nome do Investidor  
                const valorInvestimento = values[2];            // Valor do Investimento
                const destinatario = values[3];                 // Destinatário
                const parcela = values[4];                      // Parcela
                const valorComissao = values[5];                // Valor da Comissão Mensal
                const tipoChavePix = values[6];                 // Tipo de Chave PIX
                const pix = values[7];                          // PIX
                const dataVencimento = values[8];               // Data de Vencimento
                const status = values[9];                       // Status
                const dataPagamento = values[10];               // Data do Pagamento

                if (!paymentId) {
                    throw new Error(`Linha ${i + 2}: ID de pagamento não pode estar vazio.`);
                }

                const normalizedStatus = status.toUpperCase().trim();
                const validStatuses = ['PAGO', 'PENDENTE', 'ERRO', 'CANCELADO', 'ATIVO', 'INATIVO'];
                
                if (!status || !validStatuses.includes(normalizedStatus)) {
                    throw new Error(`Linha ${i + 2}: Status deve ser PAGO, PENDENTE, ERRO, CANCELADO, ATIVO ou INATIVO.`);
                }

                // Buscar o pagamento pelo payment_id - com fallback para IDs gerados
                let paymentResponse = await fetch(`${supabaseUrl}/rest/v1/commission_payments?select=id,status,commission_schedule_id&payment_id=eq.${paymentId}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                });

                let paymentData = await paymentResponse.json();
                
                // Se não encontrou por payment_id, tentar buscar por commission_schedule_id usando padrão do payment_id gerado
                if (!paymentData || paymentData.length === 0) {
                    // Extrair ID da comissão do payment_id gerado (formato: COM-XXXXXXXX-N)
                    const commissionIdMatch = paymentId.match(/^COM-([A-F0-9]{8})-\d+$/);
                    if (commissionIdMatch) {
                        const shortCommissionId = commissionIdMatch[1].toLowerCase();
                        
                        // Buscar commission_schedule que comece com este ID
                        const scheduleResponse = await fetch(`${supabaseUrl}/rest/v1/commission_schedules?select=id&id=like.${shortCommissionId}*`, {
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Content-Type': 'application/json'
                            }
                        });
                        const scheduleData = await scheduleResponse.json();
                        
                        if (scheduleData && scheduleData.length > 0) {
                            const scheduleId = scheduleData[0].id;
                            
                            // Buscar ou criar payment para este schedule
                            paymentResponse = await fetch(`${supabaseUrl}/rest/v1/commission_payments?select=id,status,commission_schedule_id&commission_schedule_id=eq.${scheduleId}`, {
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'apikey': serviceRoleKey,
                                    'Content-Type': 'application/json'
                                }
                            });
                            paymentData = await paymentResponse.json();
                            
                            // Se não existe payment, criar um novo
                            if (!paymentData || paymentData.length === 0) {
                                const createPaymentResponse = await fetch(`${supabaseUrl}/rest/v1/commission_payments`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${serviceRoleKey}`,
                                        'apikey': serviceRoleKey,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        commission_schedule_id: scheduleId,
                                        payment_id: paymentId,
                                        status: normalizedStatus,
                                        created_at: new Date().toISOString()
                                    })
                                });
                                
                                const newPayment = await createPaymentResponse.json();
                                if (createPaymentResponse.ok) {
                                    paymentData = [newPayment];
                                }
                            }
                        }
                    }
                }
                
                if (!paymentData || paymentData.length === 0) {
                    throw new Error(`Linha ${i + 2}: Pagamento com ID ${paymentId} não encontrado e não foi possível criar.`);
                }

                const payment = paymentData[0];

                // Preparar dados para atualização
                const updateData = {
                    status: normalizedStatus,
                    updated_at: new Date().toISOString()
                };

                // Processar data de pagamento se status for PAGO
                if (normalizedStatus === 'PAGO' && dataPagamento && dataPagamento !== '') {
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
                } else if (normalizedStatus === 'PAGO' && (!dataPagamento || dataPagamento === '')) {
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
                        body: JSON.stringify({ status: normalizedStatus })
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