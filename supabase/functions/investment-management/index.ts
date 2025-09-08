// Helper function para fazer requisições ao Supabase
async function supabaseRequest(endpoint: string, serviceRoleKey: string, supabaseUrl: string, options: RequestInit = {}) {
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

// Helper function para registrar ações de auditoria
async function logAuditAction(
    serviceRoleKey: string,
    supabaseUrl: string,
    userId: string,
    actionType: string,
    resourceType: string,
    resourceId?: string,
    resourceName?: string,
    oldValues?: any,
    newValues?: any,
    description?: string
) {
    try {
        // Usar RPC via REST API
        await fetch(`${supabaseUrl}/rest/v1/rpc/log_audit_action`, {
            method: 'POST',
            headers: {
                'apikey': serviceRoleKey,
                'authorization': `Bearer ${serviceRoleKey}`,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                p_user_id: userId,
                p_action_type: actionType,
                p_resource_type: resourceType,
                p_resource_id: resourceId || null,
                p_resource_name: resourceName || null,
                p_old_values: oldValues || null,
                p_new_values: newValues || null,
                p_description: description || null
            })
        });
    } catch (auditError) {
        console.error('Erro na função de auditoria:', auditError);
        // Não falhamos a operação principal por erro de auditoria
    }
}

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
        const action = url.searchParams.get('action');
        
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuração do Supabase não encontrada');
        }

        if (action === 'get_investments') {
            // Buscar todos os investimentos com filtros avançados
            const status = url.searchParams.get('status');
            const investor_name = url.searchParams.get('investor_name');
            const series_id = url.searchParams.get('series_id');
            const min_amount = url.searchParams.get('min_amount');
            const max_amount = url.searchParams.get('max_amount');
            const date_from = url.searchParams.get('date_from');
            const date_to = url.searchParams.get('date_to');
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const offset = (page - 1) * limit;

            // Obter token de autorização
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('Token de autorização necessário');
            }

            const token = authHeader.replace('Bearer ', '');
            
            // Validar token
            const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'apikey': serviceRoleKey,
                    'authorization': `Bearer ${token}`
                }
            });
            
            if (!authResponse.ok) {
                throw new Error('Token inválido ou expirado');
            }
            
            const currentAuthUser = await authResponse.json();

            // Buscar dados do usuário
            const userQuery = `users?auth_user_id=eq.${currentAuthUser.id}&select=*`;
            const userData = await supabaseRequest(userQuery, serviceRoleKey, supabaseUrl);
            
            if (!userData || userData.length === 0) {
                throw new Error('Usuário não encontrado no sistema');
            }
            
            const user = userData[0];

            // Construir query base
            let query = `investments?select=*,series(*,debentures(*)),investor:investor_user_id(full_name,email),assessor:assessor_user_id(full_name)`;

            // Aplicar filtros
            const filters = [];
            if (status) filters.push(`status.eq.${status}`);
            if (series_id) filters.push(`series_id.eq.${series_id}`);
            if (min_amount) filters.push(`invested_amount.gte.${min_amount}`);
            if (max_amount) filters.push(`invested_amount.lte.${max_amount}`);
            if (date_from) filters.push(`investment_date.gte.${date_from}`);
            if (date_to) filters.push(`investment_date.lte.${date_to}`);

            if (filters.length > 0) {
                query += `&${filters.join('&')}`;
            }

            query += `&order=created_at.desc&limit=${limit}&offset=${offset}`;

            const investments = await supabaseRequest(query, serviceRoleKey, supabaseUrl);

            // Contar total para paginação
            let countQuery = `investments?select=id&count=exact`;
            if (filters.length > 0) {
                countQuery += `&${filters.join('&')}`;
            }
            
            const countResponse = await fetch(`${supabaseUrl}/rest/v1/${countQuery}`, {
                headers: {
                    'apikey': serviceRoleKey,
                    'authorization': `Bearer ${serviceRoleKey}`,
                    'content-type': 'application/json',
                    'prefer': 'count=exact'
                },
                method: 'GET'
            });

            const totalCount = parseInt(countResponse.headers.get('content-range')?.split('/')[1] || '0');

            return new Response(JSON.stringify({
                data: {
                    investments,
                    pagination: {
                        page,
                        limit,
                        total: totalCount,
                        totalPages: Math.ceil(totalCount / limit)
                    }
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'update_investment') {
            const requestData = await req.json();
            const { id, invested_amount, interest_type, status } = requestData;

            // Obter token de autorização
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('Token de autorização necessário');
            }

            const token = authHeader.replace('Bearer ', '');
            
            // Validar token
            const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'apikey': serviceRoleKey,
                    'authorization': `Bearer ${token}`
                }
            });
            
            if (!authResponse.ok) {
                throw new Error('Token inválido ou expirado');
            }
            
            const currentAuthUser = await authResponse.json();

            // Buscar dados do usuário atual
            const userQuery = `users?auth_user_id=eq.${currentAuthUser.id}&select=*`;
            const userData = await supabaseRequest(userQuery, serviceRoleKey, supabaseUrl);
            
            if (!userData || userData.length === 0) {
                throw new Error('Usuário não encontrado no sistema');
            }
            
            const user = userData[0];

            // Buscar investimento atual
            const currentInvestmentQuery = `investments?id=eq.${id}&select=*`;
            const currentInvestmentData = await supabaseRequest(currentInvestmentQuery, serviceRoleKey, supabaseUrl);
            
            if (!currentInvestmentData || currentInvestmentData.length === 0) {
                throw new Error('Investimento não encontrado');
            }
            
            const currentInvestment = currentInvestmentData[0];

            // Preparar dados de atualização
            const updateData: any = {};
            if (invested_amount !== undefined) updateData.invested_amount = invested_amount;
            if (interest_type !== undefined) updateData.interest_type = interest_type;
            if (status !== undefined) updateData.status = status;
            updateData.updated_at = new Date().toISOString();

            // Atualizar investimento
            const investment = await supabaseRequest(`investments?id=eq.${id}`, serviceRoleKey, supabaseUrl, {
                method: 'PATCH',
                body: JSON.stringify(updateData)
            });

            // Registrar log de auditoria
            await logAuditAction(
                serviceRoleKey,
                supabaseUrl,
                user.id,
                'UPDATE',
                'INVESTMENT',
                id,
                `Investimento ${id}`,
                currentInvestment,
                updateData,
                `Investimento atualizado: ${id}`
            );

            return new Response(JSON.stringify({
                data: {
                    message: 'Investimento atualizado com sucesso',
                    investment: investment[0] || investment
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'delete_investment') {
            const id = url.searchParams.get('id');
            if (!id) {
                throw new Error('ID do investimento é obrigatório');
            }

            // Obter token de autorização
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('Token de autorização necessário');
            }

            const token = authHeader.replace('Bearer ', '');
            
            // Validar token
            const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'apikey': serviceRoleKey,
                    'authorization': `Bearer ${token}`
                }
            });
            
            if (!authResponse.ok) {
                throw new Error('Token inválido ou expirado');
            }
            
            const currentAuthUser = await authResponse.json();

            // Buscar dados do usuário atual
            const userQuery = `users?auth_user_id=eq.${currentAuthUser.id}&select=*`;
            const userData = await supabaseRequest(userQuery, serviceRoleKey, supabaseUrl);
            
            if (!userData || userData.length === 0) {
                throw new Error('Usuário não encontrado no sistema');
            }
            
            const user = userData[0];

            // Buscar investimento antes de deletar
            const investmentQuery = `investments?id=eq.${id}&select=*`;
            const investmentData = await supabaseRequest(investmentQuery, serviceRoleKey, supabaseUrl);
            
            if (!investmentData || investmentData.length === 0) {
                throw new Error('Investimento não encontrado');
            }
            
            const investment = investmentData[0];

            // Deletar investimento
            await supabaseRequest(`investments?id=eq.${id}`, serviceRoleKey, supabaseUrl, {
                method: 'DELETE'
            });

            // Registrar log de auditoria
            await logAuditAction(
                serviceRoleKey,
                supabaseUrl,
                user.id,
                'DELETE',
                'INVESTMENT',
                id,
                `Investimento ${id}`,
                investment,
                null,
                `Investimento deletado: ${id} - Valor: R$ ${investment.invested_amount}`
            );

            return new Response(JSON.stringify({
                data: {
                    message: 'Investimento deletado com sucesso'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'create_investment') {
            const requestData = await req.json();
            const { series_id, investor_user_id, invested_amount, interest_type } = requestData;

            // Obter token de autorização
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('Token de autorização necessário');
            }

            const token = authHeader.replace('Bearer ', '');
            
            // Validar token
            const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'apikey': serviceRoleKey,
                    'authorization': `Bearer ${token}`
                }
            });
            
            if (!authResponse.ok) {
                throw new Error('Token inválido ou expirado');
            }
            
            const currentAuthUser = await authResponse.json();

            // Buscar dados do assessor
            const assessorQuery = `users?auth_user_id=eq.${currentAuthUser.id}&select=*`;
            const assessorData = await supabaseRequest(assessorQuery, serviceRoleKey, supabaseUrl);
            
            if (!assessorData || assessorData.length === 0) {
                throw new Error('Assessor não encontrado no sistema');
            }
            
            const assessor = assessorData[0];

            // Buscar dados da série
            const seriesQuery = `series?id=eq.${series_id}&select=*`;
            const seriesData = await supabaseRequest(seriesQuery, serviceRoleKey, supabaseUrl);
            
            if (!seriesData || seriesData.length === 0) {
                throw new Error('Série não encontrada');
            }
            
            const series = seriesData[0];

            // Validar valor mínimo
            if (invested_amount < series.minimum_investment) {
                throw new Error(`Valor mínimo de investimento é R$ ${series.minimum_investment}`);
            }

            // Verificar se não excede a captação máxima
            if (series.max_total_captation && (series.current_captation + invested_amount) > series.max_total_captation) {
                throw new Error('Investimento excede a captação máxima da série');
            }

            // Calcular data de vencimento
            const investmentDate = new Date();
            const maturityDate = new Date(investmentDate);
            maturityDate.setMonth(maturityDate.getMonth() + series.maturity_period_months);

            // Criar investimento
            const investmentData = {
                series_id,
                investor_user_id,
                assessor_user_id: assessor.id,
                invested_amount,
                investment_date: investmentDate.toISOString().split('T')[0],
                maturity_date: maturityDate.toISOString().split('T')[0],
                interest_type: interest_type || series.interest_type,
                interest_rate: series.interest_rate,
                status: 'active'
            };

            const investment = await supabaseRequest('investments', serviceRoleKey, supabaseUrl, {
                method: 'POST',
                body: JSON.stringify(investmentData)
            });

            if (!investment || investment.length === 0) {
                throw new Error('Erro ao criar investimento');
            }

            const investmentRecord = Array.isArray(investment) ? investment[0] : investment;
            const investmentId = investmentRecord.id;

            // Registrar log de auditoria simples
            await logAuditAction(
                serviceRoleKey,
                supabaseUrl,
                assessor.id,
                'CREATE',
                'INVESTMENT',
                investmentRecord.id,
                `Investimento ${investmentRecord.id}`,
                null,
                {
                    series_id: investmentRecord.series_id,
                    investor_user_id: investmentRecord.investor_user_id,
                    assessor_user_id: investmentRecord.assessor_user_id,
                    invested_amount: investmentRecord.invested_amount,
                    investment_date: investmentRecord.investment_date,
                    maturity_date: investmentRecord.maturity_date,
                    interest_rate: investmentRecord.interest_rate,
                    status: investmentRecord.status
                },
                `Investimento criado: R$ ${investmentRecord.invested_amount} na Série ${series.series_code} - Assessor: ${assessor.full_name}`
            );

            return new Response(JSON.stringify({
                data: {
                    message: 'Investimento criado com sucesso',
                    investment: investmentRecord
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'get_change_history') {
            // Buscar histórico de alterações
            const requestData = await req.json();
            const { resource_type, resource_id } = requestData;

            // Por enquanto retornar vazio pois não implementamos audit logs detalhados
            return new Response(JSON.stringify({
                data: []
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'get_saved_filters') {
            // Buscar filtros salvos
            const requestData = await req.json();
            const { filter_type } = requestData;

            // Por enquanto retornar vazio pois não implementamos filtros salvos
            return new Response(JSON.stringify({
                data: []
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Ação não reconhecida: ${action}`);

    } catch (error) {
        console.error('Erro no gerenciamento de investimentos:', {
            message: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method
        });

        const errorResponse = {
            error: {
                code: 'INVESTMENT_MANAGEMENT_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        // Determinar o status code apropriado
        let statusCode = 500;
        if (error.message.includes('Token') || error.message.includes('autorização')) {
            statusCode = 401;
        } else if (error.message.includes('permissão') || error.message.includes('não tem')) {
            statusCode = 403;
        } else if (error.message.includes('não encontrado')) {
            statusCode = 404;
        } else if (error.message.includes('Valor mínimo') || error.message.includes('excede')) {
            statusCode = 400;
        }

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});