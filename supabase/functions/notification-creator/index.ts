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

        // AÇÃO: Criar notificação de novo investimento
        if (action === 'create_investment_notification') {
            const requestData = await req.json();
            const { investment_id } = requestData;

            if (!investment_id) {
                throw new Error('ID do investimento é obrigatório');
            }

            try {
                // Buscar detalhes do investimento
                const investmentQuery = `investments?id=eq.${investment_id}&select=*`;
                const investmentData = await supabaseRequest(investmentQuery);
                
                if (!investmentData || investmentData.length === 0) {
                    throw new Error('Investimento não encontrado');
                }
                
                const investment = investmentData[0];
                
                // Buscar dados do investidor
                const investorQuery = `user_hierarchy_view?id=eq.${investment.investor_user_id}&select=*`;
                const investorData = await supabaseRequest(investorQuery);
                
                if (!investorData || investorData.length === 0) {
                    throw new Error('Investidor não encontrado');
                }
                
                const investor = investorData[0];
                
                // Criar notificações para toda a hierarquia superior
                const notifications = [];
                const baseTitle = "Novo Investimento Realizado";
                const baseMessage = `${investor.full_name} realizou investimento de R$ ${investment.invested_amount}`;
                
                // Lista de usuários para notificar (hierarquia superior)
                const usersToNotify = [];
                
                // Notificar assessor direto
                if (investor.superior_user_id) {
                    usersToNotify.push(investor.superior_user_id);
                }
                
                // Buscar toda a cadeia hierárquica superior
                let currentUserId = investor.superior_user_id;
                while (currentUserId) {
                    try {
                        const superiorQuery = `user_hierarchy_view?id=eq.${currentUserId}&select=id,superior_user_id`;
                        const superiorData = await supabaseRequest(superiorQuery);
                        
                        if (superiorData && superiorData.length > 0) {
                            const superior = superiorData[0];
                            if (superior.superior_user_id && !usersToNotify.includes(superior.superior_user_id)) {
                                usersToNotify.push(superior.superior_user_id);
                            }
                            currentUserId = superior.superior_user_id;
                        } else {
                            break;
                        }
                    } catch (error) {
                        break;
                    }
                }
                
                console.log(`Criando notificações para ${usersToNotify.length} usuários na hierarquia`);
                
                // Criar notificações para todos na hierarquia
                for (const userId of usersToNotify) {
                    const notificationData = {
                        recipient_user_id: userId,
                        alert_type: 'investment',
                        title: baseTitle,
                        message: baseMessage,
                        related_entity_type: 'investment',
                        related_entity_id: investment.id,
                        severity: 'info'
                    };
                    
                    await supabaseRequest('alerts_notifications', {
                        method: 'POST',
                        body: JSON.stringify(notificationData)
                    });
                    
                    notifications.push(notificationData);
                }
                
                return new Response(JSON.stringify({ 
                    data: { 
                        message: `${notifications.length} notificações criadas com sucesso`,
                        notifications: notifications.length,
                        usersNotified: usersToNotify
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
                
            } catch (error) {
                console.error('Erro ao criar notificações de investimento:', error);
                throw error;
            }
        }

        // AÇÃO: Criar notificação de novo usuário
        if (action === 'create_user_notification') {
            const requestData = await req.json();
            const { user_id } = requestData;

            if (!user_id) {
                throw new Error('ID do usuário é obrigatório');
            }

            try {
                // Buscar dados do novo usuário
                const userQuery = `user_hierarchy_view?id=eq.${user_id}&select=*`;
                const userData = await supabaseRequest(userQuery);
                
                if (!userData || userData.length === 0) {
                    throw new Error('Usuário não encontrado');
                }
                
                const user = userData[0];
                
                // Criar notificações para hierarquia superior
                const notifications = [];
                const baseTitle = "Novo Usuário Cadastrado";
                const baseMessage = `${user.full_name} foi cadastrado como ${user.role_name}`;
                
                // Lista de usuários para notificar
                const usersToNotify = [];
                
                // Notificar superior direto
                if (user.superior_user_id) {
                    usersToNotify.push(user.superior_user_id);
                }
                
                // Buscar toda a cadeia hierárquica superior
                let currentUserId = user.superior_user_id;
                while (currentUserId) {
                    try {
                        const superiorQuery = `user_hierarchy_view?id=eq.${currentUserId}&select=id,superior_user_id`;
                        const superiorData = await supabaseRequest(superiorQuery);
                        
                        if (superiorData && superiorData.length > 0) {
                            const superior = superiorData[0];
                            if (superior.superior_user_id && !usersToNotify.includes(superior.superior_user_id)) {
                                usersToNotify.push(superior.superior_user_id);
                            }
                            currentUserId = superior.superior_user_id;
                        } else {
                            break;
                        }
                    } catch (error) {
                        break;
                    }
                }
                
                console.log(`Criando notificações para ${usersToNotify.length} usuários na hierarquia`);
                
                // Criar notificações para todos na hierarquia
                for (const userId of usersToNotify) {
                    const notificationData = {
                        recipient_user_id: userId,
                        alert_type: 'user_action',
                        title: baseTitle,
                        message: baseMessage,
                        related_entity_type: 'user',
                        related_entity_id: user.id,
                        severity: 'info'
                    };
                    
                    await supabaseRequest('alerts_notifications', {
                        method: 'POST',
                        body: JSON.stringify(notificationData)
                    });
                    
                    notifications.push(notificationData);
                }
                
                return new Response(JSON.stringify({ 
                    data: { 
                        message: `${notifications.length} notificações criadas com sucesso`,
                        notifications: notifications.length,
                        usersNotified: usersToNotify
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
                
            } catch (error) {
                console.error('Erro ao criar notificações de usuário:', error);
                throw error;
            }
        }

        throw new Error('Ação não reconhecida');

    } catch (error) {
        console.error('Edge function error:', error);
        const errorResponse = {
            error: {
                code: 'NOTIFICATION_CREATOR_ERROR',
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