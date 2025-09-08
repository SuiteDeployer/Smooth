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
        const expectedHeaders = [
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
                
                if (values.length < 9) {
                    throw new Error(`Linha ${i + 2}: Formato inválido. Esperado 9 colunas, encontrado ${values.length}.`);
                }

                // Extrair valores conforme formato especificado (já limpos pelo parseCSVLine)
                const idPagamento = values[0];                     // ID Pagamento
                const nomeInvestidor = values[1];                  // Nome do Investidor  
                const debenture = values[2];                       // Debênture
                const serie = values[3];                           // Série
                const valorRemuneracao = values[4];                // Valor da Remuneração
                const status = values[5];                          // Status
                const dataVencimento = values[6];                  // Data de Vencimento
                const dataPagamento = values[7];                   // Data do Pagamento
                const pix = values[8];                             // PIX

                if (!idPagamento) {
                    throw new Error(`Linha ${i + 2}: ID de pagamento não pode estar vazio.`);
                }

                const normalizedStatus = status.toUpperCase().trim();
                const validStatuses = ['PAGO', 'PENDENTE', 'ERRO'];
                
                if (!status || !validStatuses.includes(normalizedStatus)) {
                    throw new Error(`Linha ${i + 2}: Status deve ser PAGO, PENDENTE ou ERRO.`);
                }

                // Buscar a remuneração pelo id_pagamento
                const remuneracaoResponse = await fetch(`${supabaseUrl}/rest/v1/remuneracoes?select=id_pagamento,status&id_pagamento=eq.${encodeURIComponent(idPagamento)}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                });

                if (!remuneracaoResponse.ok) {
                    throw new Error(`Linha ${i + 2}: Erro ao buscar remuneração ${idPagamento}.`);
                }

                const remuneracaoData = await remuneracaoResponse.json();
                
                if (!remuneracaoData || remuneracaoData.length === 0) {
                    throw new Error(`Linha ${i + 2}: Remuneração com ID ${idPagamento} não encontrada.`);
                }

                // Preparar dados para atualização (apenas status e data_pagamento)
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
                            
                            // Criar data em timezone local
                            const parsedDate = new Date(year, month, day);
                            
                            if (!isNaN(parsedDate.getTime())) {
                                updateData.data_pagamento = parsedDate.toISOString().split('T')[0]; // Apenas a data
                            }
                        }
                    } catch (dateError) {
                        console.warn(`Data inválida na linha ${i + 2}: ${dataPagamento}`);
                    }
                } else if (normalizedStatus === 'PAGO' && (!dataPagamento || dataPagamento === '')) {
                    // Se status é PAGO mas não há data específica, usar data atual
                    updateData.data_pagamento = new Date().toISOString().split('T')[0];
                }

                // Atualizar a remuneração na tabela
                const updateResponse = await fetch(`${supabaseUrl}/rest/v1/remuneracoes?id_pagamento=eq.${encodeURIComponent(idPagamento)}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    throw new Error(`Linha ${i + 2}: Erro ao atualizar remuneração ${idPagamento}: ${errorText}`);
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
                errors: errors.slice(0, 10) // Limitar a 10 erros para não sobrecarregar
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