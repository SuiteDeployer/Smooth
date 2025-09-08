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

        if (action === 'create_investment') {
            const requestData = await req.json();
            const { 
                series_id, 
                investor_user_id, 
                assessor_user_id,
                invested_amount, 
                investment_date,
                maturity_date,
                interest_type,
                commission_master = 0,
                commission_escritorio = 0,
                commission_assessor = 0
            } = requestData;

            console.log('📊 Dados recebidos:', {
                series_id,
                investor_user_id,
                assessor_user_id,
                invested_amount,
                investment_date,
                commission_master,
                commission_escritorio,
                commission_assessor
            });

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

            // Buscar dados da série
            const seriesQuery = `series?id=eq.${series_id}&select=*`;
            const seriesData = await supabaseRequest(seriesQuery);
            
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

            // Validar comissões não excedem o limite da série
            const totalCommissions = commission_master + commission_escritorio + commission_assessor;
            if (totalCommissions > series.max_commission_percentage) {
                throw new Error(`Total de comissões (${totalCommissions}%) excede o limite da série (${series.max_commission_percentage}%)`);
            }

            // Buscar dados completos do assessor selecionado
            const assessorQuery = `users?id=eq.${assessor_user_id}&select=*,user_roles(role_name)`;
            const assessorData = await supabaseRequest(assessorQuery);
            
            if (!assessorData || assessorData.length === 0) {
                throw new Error('Assessor selecionado não encontrado');
            }
            
            const assessor = assessorData[0];

            // Criar investimento
            const investmentData = {
                series_id,
                investor_user_id,
                assessor_user_id,
                invested_amount,
                investment_date: investment_date || new Date().toISOString().split('T')[0],
                maturity_date: maturity_date || (() => {
                    const investDate = new Date(investment_date || new Date());
                    const maturity = new Date(investDate);
                    maturity.setMonth(maturity.getMonth() + series.maturity_period_months);
                    return maturity.toISOString().split('T')[0];
                })(),
                interest_type: interest_type || series.interest_type || 'fixed',
                interest_rate: series.interest_rate || 0,
                status: 'active'
            };

            console.log('💾 Criando investimento:', investmentData);

            const investment = await supabaseRequest('investments', {
                method: 'POST',
                body: JSON.stringify(investmentData)
            });

            if (!investment || investment.length === 0) {
                throw new Error('Erro ao criar investimento');
            }

            const newInvestment = investment[0];
            console.log('✅ Investimento criado:', newInvestment.id);

            // BUSCAR HIERARQUIA COMPLETA BASEADA NO ASSESSOR
            // Identificar Master, Escritório baseado no assessor selecionado
            let masterUser = null;
            let escritorioUser = null;
            let globalUser = null;

            // Buscar hierarquia do assessor selecionado
            const hierarchyQuery = `
                WITH RECURSIVE user_hierarchy AS (
                    -- Base case: start with selected assessor
                    SELECT id, superior_id, role_id, full_name, email, 1 as level
                    FROM users 
                    WHERE id = '${assessor_user_id}'
                    
                    UNION ALL
                    
                    -- Recursive case: find superiors
                    SELECT u.id, u.superior_id, u.role_id, u.full_name, u.email, uh.level + 1
                    FROM users u
                    INNER JOIN user_hierarchy uh ON u.id = uh.superior_id
                    WHERE uh.level < 10  -- prevent infinite recursion
                )
                SELECT uh.*, ur.role_name
                FROM user_hierarchy uh
                LEFT JOIN user_roles ur ON uh.role_id = ur.id
                ORDER BY level;
            `;

            const hierarchyResult = await supabaseRequest(`rpc/execute_sql?sql=${encodeURIComponent(hierarchyQuery)}`);
            console.log('🌳 Hierarquia encontrada:', hierarchyResult);

            // Se não conseguir via RPC, buscar manualmente
            if (!hierarchyResult || hierarchyResult.length === 0) {
                // Buscar superior do assessor (pode ser Escritório)
                if (assessor.superior_id) {
                    const superiorQuery = `users?id=eq.${assessor.superior_id}&select=*,user_roles(role_name)`;
                    const superiorData = await supabaseRequest(superiorQuery);
                    
                    if (superiorData && superiorData.length > 0) {
                        const superior = superiorData[0];
                        const roleName = superior.user_roles?.role_name;
                        
                        if (roleName === 'Escritório') {
                            escritorioUser = superior;
                            
                            // Buscar Master (superior do escritório)
                            if (superior.superior_id) {
                                const masterQuery = `users?id=eq.${superior.superior_id}&select=*,user_roles(role_name)`;
                                const masterData = await supabaseRequest(masterQuery);
                                
                                if (masterData && masterData.length > 0) {
                                    const master = masterData[0];
                                    if (master.user_roles?.role_name === 'Master') {
                                        masterUser = master;
                                        
                                        // Buscar Global (superior do Master)
                                        if (master.superior_id) {
                                            const globalQuery = `users?id=eq.${master.superior_id}&select=*,user_roles(role_name)`;
                                            const globalData = await supabaseRequest(globalQuery);
                                            if (globalData && globalData.length > 0) {
                                                globalUser = globalData[0];
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (roleName === 'Master') {
                            masterUser = superior;
                            
                            // Buscar Global (superior do Master)
                            if (superior.superior_id) {
                                const globalQuery = `users?id=eq.${superior.superior_id}&select=*,user_roles(role_name)`;
                                const globalData = await supabaseRequest(globalQuery);
                                if (globalData && globalData.length > 0) {
                                    globalUser = globalData[0];
                                }
                            }
                        } else if (roleName === 'Global') {
                            globalUser = superior;
                        }
                    }
                }
            }

            // Se não encontrou Global, buscar o admin padrão
            if (!globalUser) {
                const globalQuery = `users?email=eq.admin@smooth.com.br&select=*`;
                const globalData = await supabaseRequest(globalQuery);
                if (globalData && globalData.length > 0) {
                    globalUser = globalData[0];
                }
            }

            console.log('👥 Hierarquia identificada:', {
                assessor: assessor.full_name,
                escritorio: escritorioUser?.full_name || 'N/A',
                master: masterUser?.full_name || 'N/A',
                global: globalUser?.full_name || 'N/A'
            });

            // CRIAR REGISTRO DE HIERARCHY_TRACKING
            const hierarchyTrackingData = {
                investment_id: newInvestment.id,
                investor_user_id,
                assessor_user_id,
                escritorio_user_id: escritorioUser?.id || null,
                master_user_id: masterUser?.id || null,
                global_user_id: globalUser?.id || null
            };

            const hierarchyTracking = await supabaseRequest('hierarchy_tracking', {
                method: 'POST',
                body: JSON.stringify(hierarchyTrackingData)
            });

            console.log('📊 Hierarchy tracking criado:', hierarchyTracking[0]?.id);

            // CALCULAR E CRIAR COMISSÕES
            const commissions = [];
            
            // Comissão do Assessor
            if (commission_assessor > 0) {
                const commissionAmount = (invested_amount * commission_assessor) / 100;
                commissions.push({
                    investment_id: newInvestment.id,
                    hierarchy_tracking_id: hierarchyTracking[0].id,
                    recipient_user_id: assessor_user_id,
                    commission_percentage: commission_assessor,
                    commission_amount: commissionAmount,
                    commission_type: 'assessor',
                    payment_status: 'pending'
                });
            }

            // Comissão do Escritório
            if (commission_escritorio > 0 && escritorioUser) {
                const commissionAmount = (invested_amount * commission_escritorio) / 100;
                commissions.push({
                    investment_id: newInvestment.id,
                    hierarchy_tracking_id: hierarchyTracking[0].id,
                    recipient_user_id: escritorioUser.id,
                    commission_percentage: commission_escritorio,
                    commission_amount: commissionAmount,
                    commission_type: 'escritorio',
                    payment_status: 'pending'
                });
            }

            // Comissão do Master
            if (commission_master > 0 && masterUser) {
                const commissionAmount = (invested_amount * commission_master) / 100;
                commissions.push({
                    investment_id: newInvestment.id,
                    hierarchy_tracking_id: hierarchyTracking[0].id,
                    recipient_user_id: masterUser.id,
                    commission_percentage: commission_master,
                    commission_amount: commissionAmount,
                    commission_type: 'master',
                    payment_status: 'pending'
                });
            }

            // Salvar todas as comissões
            if (commissions.length > 0) {
                for (const commission of commissions) {
                    await supabaseRequest('commissions', {
                        method: 'POST',
                        body: JSON.stringify(commission)
                    });
                }
                console.log(`💰 ${commissions.length} comissões criadas`);
            }

            // Atualizar captação atual da série
            const updatedCaptation = series.current_captation + invested_amount;
            await supabaseRequest(`series?id=eq.${series_id}`, {
                method: 'PATCH',
                body: JSON.stringify({ current_captation: updatedCaptation })
            });

            // Criar notificações automáticas para novo investimento
            try {
                console.log('🔔 Criando notificação para investimento:', newInvestment.id);
                
                const notificationData = {
                    recipient_user_id: assessor_user_id,
                    alert_type: 'investment',
                    title: 'Novo Investimento Realizado',
                    message: `Investimento de R$ ${invested_amount} foi criado com sucesso${commissions.length > 0 ? ` com ${commissions.length} comissões geradas` : ''}`,
                    related_entity_type: 'investment',
                    related_entity_id: newInvestment.id,
                    severity: 'info',
                    is_read: false
                };

                await supabaseRequest('alerts_notifications', {
                    method: 'POST',
                    body: JSON.stringify(notificationData)
                });

                console.log('✅ Notificação criada');
            } catch (notificationError) {
                console.warn('⚠️ Erro ao criar notificação:', notificationError);
            }

            // Buscar dados completos do investimento com joins para resposta
            const fullInvestmentQuery = `investments?id=eq.${newInvestment.id}&select=*,series(*,debentures(*)),users!investor_user_id(*)`;
            
            try {
                const fullInvestmentResponse = await supabaseRequest(fullInvestmentQuery);
                if (fullInvestmentResponse && fullInvestmentResponse.length > 0) {
                    return new Response(JSON.stringify({
                        data: {
                            message: 'Investimento criado com sucesso',
                            investment: fullInvestmentResponse[0],
                            commissions_created: commissions.length,
                            hierarchy_tracking_id: hierarchyTracking[0]?.id,
                            commission_summary: {
                                assessor: commission_assessor > 0 ? `${commission_assessor}%` : '0%',
                                escritorio: commission_escritorio > 0 && escritorioUser ? `${commission_escritorio}%` : '0%',
                                master: commission_master > 0 && masterUser ? `${commission_master}%` : '0%',
                                total: `${totalCommissions}%`
                            }
                        }
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            } catch (fetchError) {
                console.warn('Erro ao buscar dados completos do investimento:', fetchError);
            }

            return new Response(JSON.stringify({
                data: {
                    message: 'Investimento criado com sucesso',
                    investment: newInvestment,
                    commissions_created: commissions.length,
                    commission_summary: {
                        assessor: commission_assessor > 0 ? `${commission_assessor}%` : '0%',
                        escritorio: commission_escritorio > 0 && escritorioUser ? `${commission_escritorio}%` : '0%',
                        master: commission_master > 0 && masterUser ? `${commission_master}%` : '0%',
                        total: `${totalCommissions}%`
                    }
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Ação não reconhecida: ${action}`);

    } catch (error) {
        console.error('Erro no gerenciamento de investimentos:', error);

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