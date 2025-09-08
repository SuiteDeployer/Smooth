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

        // Obter token de autorização
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Token de autorização necessário');
        }

        const token = authHeader.replace('Bearer ', '');
        
        // Validar token usando a API correta do Supabase
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'apikey': serviceRoleKey,
                'authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!authResponse.ok) {
            const errorText = await authResponse.text();
            console.error('Auth error:', authResponse.status, errorText);
            throw new Error('Token inválido ou expirado');
        }
        
        const currentAuthUser = await authResponse.json();
        console.log('Auth user ID:', currentAuthUser.id);

        // Buscar dados do usuário atual
        const userQuery = `user_hierarchy_view?auth_user_id=eq.${currentAuthUser.id}&select=*`;
        const userData = await supabaseRequest(userQuery);
        
        if (!userData || userData.length === 0) {
            console.error('User not found for auth_user_id:', currentAuthUser.id);
            throw new Error('Usuário não encontrado no sistema');
        }
        
        const currentUser = userData[0];
        console.log('Current user:', currentUser.id, currentUser.email);

        // AÇÃO: Buscar notificações do usuário
        if (action === 'get_notifications') {
            // Filtrar apenas tipos de notificação relevantes conforme STEP 2.5.1
            // Excluir 'performance' pois metas ainda não são implementadas para investidores
            const relevantTypes = ['investment', 'user_action', 'system'];
            const typeFilter = `alert_type.in.(${relevantTypes.join(',')})`;
            const notificationsQuery = `alerts_notifications?recipient_user_id=eq.${currentUser.id}&${typeFilter}&select=*&order=created_at.desc&limit=50`;
            
            const notifications = await supabaseRequest(notificationsQuery);

            // Buscar informações completas dos usuários relacionados - STEP 2.5.1 Enhanced
            const enrichedNotifications = [];
            
            for (const n of notifications || []) {
                let enhancedData = {
                    hierarchy: {
                        investor: null,
                        assessor: null,
                        escritorio: null,
                        master: null,
                        global: null
                    },
                    investment: null,
                    action_details: null
                };
                
                // Se for notificação de investimento, buscar cadeia hierárquica completa
                if (n.alert_type === 'investment' && n.related_entity_id) {
                    try {
                        // Buscar detalhes do investimento com série
                        const investmentQuery = `investments?id=eq.${n.related_entity_id}&select=*`;
                        const investmentData = await supabaseRequest(investmentQuery);
                        
                        if (investmentData && investmentData.length > 0) {
                            const investment = investmentData[0];
                            
                            // Buscar dados da série
                            let serieData = null;
                            if (investment.series_id) {
                                const serieQuery = `series?id=eq.${investment.series_id}&select=id,name,series_code,interest_rate`;
                                const serieResult = await supabaseRequest(serieQuery);
                                serieData = serieResult && serieResult.length > 0 ? serieResult[0] : null;
                            }
                            
                            // Armazenar dados do investimento
                            enhancedData.investment = {
                                id: investment.id,
                                amount: investment.invested_amount,
                                date: investment.investment_date,
                                status: investment.status,
                                serie: serieData
                            };
                            
                            // Buscar hierarquia completa - STEP 2.5.1 Enhanced
                            const hierarchyQuery = `hierarchy_tracking?investment_id=eq.${n.related_entity_id}&select=*`;
                            const hierarchyData = await supabaseRequest(hierarchyQuery);
                            
                            if (hierarchyData && hierarchyData.length > 0) {
                                const hierarchy = hierarchyData[0];
                                
                                // Buscar dados de todos os usuários da cadeia hierárquica
                                const userIds = [
                                    hierarchy.investor_user_id,
                                    hierarchy.assessor_user_id,
                                    hierarchy.escritorio_user_id,
                                    hierarchy.master_user_id,
                                    hierarchy.global_user_id
                                ].filter(id => id);
                                
                                const usersQuery = `user_hierarchy_view?id=in.(${userIds.join(',')})&select=id,full_name,email,role_name`;
                                const usersData = await supabaseRequest(usersQuery);
                                
                                // Organizar usuários por papel - estrutura hierárquica completa
                                const usersMap = {};
                                usersData.forEach(user => {
                                    usersMap[user.id] = {
                                        id: user.id,
                                        name: user.full_name,
                                        email: user.email,
                                        role: user.role_name
                                    };
                                });
                                
                                // Estruturar hierarquia completa conforme especificação STEP 2.5.1
                                enhancedData.hierarchy = {
                                    investor: usersMap[hierarchy.investor_user_id] || null,
                                    assessor: usersMap[hierarchy.assessor_user_id] || null,
                                    escritorio: usersMap[hierarchy.escritorio_user_id] || null,
                                    master: usersMap[hierarchy.master_user_id] || null,
                                    global: usersMap[hierarchy.global_user_id] || null
                                };
                            } else {
                                // Fallback: buscar dados básicos do investimento e construir hierarquia manualmente
                                if (investment.investor_user_id) {
                                    const investorQuery = `user_hierarchy_view?id=eq.${investment.investor_user_id}&select=id,full_name,email,role_name,superior_user_id,superior_name,superior_role`;
                                    const investorData = await supabaseRequest(investorQuery);
                                    
                                    if (investorData && investorData.length > 0) {
                                        const investor = investorData[0];
                                        
                                        // Definir investidor na hierarquia
                                        enhancedData.hierarchy.investor = {
                                            id: investor.id,
                                            name: investor.full_name,
                                            email: investor.email,
                                            role: investor.role_name
                                        };
                                        
                                        // Construir cadeia hierárquica a partir do investidor
                                        const hierarchyChain = [];
                                        
                                        // Buscar toda a cadeia hierárquica
                                        let currentUserId = investor.superior_user_id;
                                        while (currentUserId) {
                                            try {
                                                const superiorQuery = `user_hierarchy_view?id=eq.${currentUserId}&select=id,full_name,email,role_name,superior_user_id`;
                                                const superiorData = await supabaseRequest(superiorQuery);
                                                
                                                if (superiorData && superiorData.length > 0) {
                                                    hierarchyChain.push(superiorData[0]);
                                                    currentUserId = superiorData[0].superior_user_id;
                                                } else {
                                                    break;
                                                }
                                            } catch (error) {
                                                break;
                                            }
                                        }
                                        
                                        // Organizar hierarquia por role
                                        hierarchyChain.forEach(user => {
                                            const userData = {
                                                id: user.id,
                                                name: user.full_name,
                                                email: user.email,
                                                role: user.role_name
                                            };
                                            
                                            if (user.role_name === 'Assessor') {
                                                enhancedData.hierarchy.assessor = userData;
                                            } else if (user.role_name === 'Escritório') {
                                                enhancedData.hierarchy.escritorio = userData;
                                            } else if (user.role_name === 'Master') {
                                                enhancedData.hierarchy.master = userData;
                                            } else if (user.role_name === 'Global') {
                                                enhancedData.hierarchy.global = userData;
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.warn('Erro ao buscar detalhes do investimento:', error);
                    }
                }
                
                // Se for notificação de ação de usuário, buscar hierarquia do usuário relacionado
                if (n.alert_type === 'user_action' && n.related_entity_id) {
                    try {
                        const relatedUserQuery = `user_hierarchy_view?id=eq.${n.related_entity_id}&select=id,full_name,email,role_name,superior_user_id,superior_name,superior_role`;
                        const relatedUserData = await supabaseRequest(relatedUserQuery);
                        
                        if (relatedUserData && relatedUserData.length > 0) {
                            const user = relatedUserData[0];
                            
                            // Definir usuário principal na hierarquia baseado no role
                            const userData = {
                                id: user.id,
                                name: user.full_name,
                                email: user.email,
                                role: user.role_name
                            };
                            
                            if (user.role_name === 'Investidor') {
                                enhancedData.hierarchy.investor = userData;
                            } else if (user.role_name === 'Assessor') {
                                enhancedData.hierarchy.assessor = userData;
                            } else if (user.role_name === 'Escritório') {
                                enhancedData.hierarchy.escritorio = userData;
                            } else if (user.role_name === 'Master') {
                                enhancedData.hierarchy.master = userData;
                            } else if (user.role_name === 'Global') {
                                enhancedData.hierarchy.global = userData;
                            }
                            
                            enhancedData.action_details = {
                                action_type: n.alert_type,
                                primary_user: userData,
                                context: n.message
                            };
                        }
                    } catch (error) {
                        console.warn('Erro ao buscar detalhes do usuário:', error);
                    }
                }
                
                // Para notificações de sistema ou outras, manter dados mínimos
                if (n.alert_type === 'system') {
                    enhancedData.action_details = {
                        action_type: 'system',
                        context: n.message,
                        system_notification: true
                    };
                }
                
                // Adaptar para formato STEP 2.5.1 - estrutura hierárquica completa
                const adaptedNotification = {
                    id: n.id,
                    user_id: n.recipient_user_id,
                    notification_type: n.alert_type,
                    title: n.title,
                    message: n.message,
                    priority: n.severity || 'medium',
                    status: n.is_read ? 'read' : 'unread',
                    created_at: n.created_at,
                    read_at: n.is_read ? n.created_at : null,
                    link: `/users/${n.related_entity_id || currentUser.id}`,
                    enhanced_data: enhancedData
                };
                
                enrichedNotifications.push(adaptedNotification);
            }
            
            return new Response(JSON.stringify({ 
                data: enrichedNotifications
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // AÇÃO: Marcar notificação como lida
        if (action === 'mark_read') {
            const requestData = await req.json();
            const { notification_id } = requestData;

            if (!notification_id) {
                throw new Error('ID da notificação é obrigatório');
            }

            // Atualizar status da notificação
            const updateData = {
                is_read: true,
                read_at: new Date().toISOString()
            };

            await supabaseRequest(`alerts_notifications?id=eq.${notification_id}`, {
                method: 'PATCH',
                body: JSON.stringify(updateData)
            });

            return new Response(JSON.stringify({ 
                data: { message: 'Notificação marcada como lida' }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // AÇÃO: Marcar todas as notificações como lidas
        if (action === 'mark_all_read') {
            // Atualizar todas as notificações não lidas do usuário
            const updateData = {
                is_read: true,
                read_at: new Date().toISOString()
            };

            await supabaseRequest(`alerts_notifications?recipient_user_id=eq.${currentUser.id}&is_read=eq.false`, {
                method: 'PATCH',
                body: JSON.stringify(updateData)
            });

            return new Response(JSON.stringify({ 
                data: { message: 'Todas as notificações marcadas como lidas' }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error('Ação não reconhecida');

    } catch (error) {
        console.error('Edge function error:', error);
        const errorResponse = {
            error: {
                code: 'NOTIFICATIONS_MANAGEMENT_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});