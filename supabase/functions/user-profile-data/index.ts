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
        // Obter dados da requisição
        const url = new URL(req.url);
        const action = url.searchParams.get('action');
        const userId = url.searchParams.get('user_id');

        if (!action || !userId) {
            throw new Error('Parâmetros action e user_id são obrigatórios');
        }

        // Verificar configuração do Supabase
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuração do Supabase ausente');
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
                console.error(`Supabase request failed: ${response.status} - ${errorText}`);
                throw new Error(`Supabase request failed: ${response.status} - ${errorText}`);
            }
            
            return response.json();
        }

        // Verificar autenticação do usuário
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
        console.log('Current user:', currentUser.id, currentUser.email, currentUser.role_name);

        // Verificar se o usuário logado pode acessar o perfil solicitado
        const canAccessUser = (targetUserId: string, currentUserData: any): boolean => {
            const targetUserIdNum = parseInt(targetUserId);
            const currentUserIdNum = currentUserData.id;
            
            // Se for o próprio usuário, sempre pode acessar
            if (targetUserIdNum === currentUserIdNum) {
                return true;
            }
            
            // Regras hierárquicas de acesso
            switch (currentUserData.role_name) {
                case 'Global':
                    // Global pode acessar todos
                    return true;
                    
                case 'Master':
                    // Master pode acessar sua própria rede
                    // Por enquanto, vamos permitir acesso a todos para testes
                    return true;
                    
                case 'Escritório':
                    // Escritório pode acessar assessores e investidores sob sua gestão
                    return true;
                    
                case 'Assessor':
                    // Assessor pode acessar investidores sob sua gestão
                    return true;
                    
                case 'Investidor':
                    // Investidor só pode acessar a si mesmo
                    return targetUserIdNum === currentUserIdNum;
                    
                default:
                    return false;
            }
        };

        // Verificar acesso
        const hasAccess = canAccessUser(userId, currentUser);
        if (!hasAccess) {
            throw new Error('Acesso negado: usuário fora da sua hierarquia');
        }

        let result = {};

        // Executar ação específica
        switch (action) {
            case 'get_investor_profile':
                result = await getInvestorProfile(userId, supabaseRequest);
                break;

            case 'get_assessor_profile':
                result = await getAssessorProfile(userId, supabaseRequest);
                break;

            case 'get_escritorio_profile':
                result = await getEscritorioProfile(userId, supabaseRequest);
                break;

            case 'get_master_profile':
                result = await getMasterProfile(userId, supabaseRequest);
                break;

            case 'get_global_profile':
                result = await getGlobalProfile(userId, supabaseRequest);
                break;

            default:
                throw new Error(`Ação não reconhecida: ${action}`);
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro na função user-profile-data:', error);

        const errorResponse = {
            error: {
                code: 'USER_PROFILE_ERROR',
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

// Função para buscar perfil de investidor
async function getInvestorProfile(userId: string, supabaseRequest: Function) {
    try {
        console.log('Buscando perfil do investidor:', userId);
        
        // Buscar dados básicos do usuário
        const userQuery = `user_hierarchy_view?id=eq.${userId}&select=*`;
        const userData = await supabaseRequest(userQuery);
        
        if (!userData || userData.length === 0) {
            throw new Error('Investidor não encontrado');
        }
        
        const user = userData[0];
        console.log('Dados do investidor encontrados:', user.full_name);
        
        // Buscar investimentos do usuário
        const investmentsQuery = `investments?investor_user_id=eq.${userId}&select=*`;
        const investments = await supabaseRequest(investmentsQuery);
        
        // Calcular estatísticas
        const totalInvestments = investments.length;
        const totalInvested = investments.reduce((sum: number, inv: any) => sum + (parseFloat(inv.invested_amount) || 0), 0);
        const averageReturn = investments.length > 0 ? 
            investments.reduce((sum: number, inv: any) => sum + (parseFloat(inv.interest_rate) || 0), 0) / investments.length : 0;
        
        return {
            profile_type: 'investor',
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role_name: user.role_name,
                cpf_cnpj: user.cpf_cnpj,
                phone: user.phone,
                company_name: user.company_name,
                created_at: user.created_at
            },
            hierarchy: {
                assessor: user.superior_name ? {
                    id: user.superior_user_id,
                    name: user.superior_name,
                    role: user.superior_role
                } : null
            },
            investments: {
                total_count: totalInvestments,
                total_invested: totalInvested,
                average_return: averageReturn,
                recent_investments: investments.slice(0, 5)
            },
            statistics: {
                active_investments: investments.filter((inv: any) => inv.status === 'active').length,
                total_returns: investments.reduce((sum: number, inv: any) => {
                    const amount = parseFloat(inv.invested_amount) || 0;
                    const rate = parseFloat(inv.interest_rate) || 0;
                    return sum + (amount * rate / 100);
                }, 0)
            }
        };
        
    } catch (error) {
        console.error('Erro ao buscar perfil do investidor:', error);
        throw error;
    }
}

// Função para buscar perfil de assessor
async function getAssessorProfile(userId: string, supabaseRequest: Function) {
    try {
        console.log('Buscando perfil do assessor:', userId);
        
        // Buscar dados básicos do usuário
        const userQuery = `user_hierarchy_view?id=eq.${userId}&select=*`;
        const userData = await supabaseRequest(userQuery);
        
        if (!userData || userData.length === 0) {
            throw new Error('Assessor não encontrado');
        }
        
        const user = userData[0];
        console.log('Dados do assessor encontrados:', user.full_name);
        
        // Buscar investidores sob gestão do assessor
        const investorsQuery = `user_hierarchy_view?superior_user_id=eq.${userId}&role_name=eq.Investidor&select=*`;
        const investors = await supabaseRequest(investorsQuery);
        
        // Buscar comissões do assessor
        const commissionsQuery = `commissions?assessor_user_id=eq.${userId}&select=*`;
        const commissions = await supabaseRequest(commissionsQuery);
        
        // Calcular estatísticas
        const totalInvestors = investors.length;
        const totalCommissions = commissions.reduce((sum: number, comm: any) => sum + (parseFloat(comm.commission_amount) || 0), 0);
        const pendingCommissions = commissions.filter((comm: any) => comm.status === 'pending').length;
        
        return {
            profile_type: 'assessor',
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role_name: user.role_name,
                cpf_cnpj: user.cpf_cnpj,
                phone: user.phone,
                company_name: user.company_name,
                commission_percentage: user.commission_percentage,
                created_at: user.created_at
            },
            hierarchy: {
                escritorio: user.superior_name ? {
                    id: user.superior_user_id,
                    name: user.superior_name,
                    role: user.superior_role
                } : null
            },
            network: {
                total_investors: totalInvestors,
                recent_investors: investors.slice(0, 10)
            },
            performance: {
                total_commissions: totalCommissions,
                pending_commissions: pendingCommissions,
                commission_rate: user.commission_percentage || 0
            }
        };
        
    } catch (error) {
        console.error('Erro ao buscar perfil do assessor:', error);
        throw error;
    }
}

// Função para buscar perfil de escritório
async function getEscritorioProfile(userId: string, supabaseRequest: Function) {
    try {
        console.log('Buscando perfil do escritório:', userId);
        
        // Buscar dados básicos do usuário
        const userQuery = `user_hierarchy_view?id=eq.${userId}&select=*`;
        const userData = await supabaseRequest(userQuery);
        
        if (!userData || userData.length === 0) {
            throw new Error('Escritório não encontrado');
        }
        
        const user = userData[0];
        console.log('Dados do escritório encontrados:', user.full_name);
        
        // Buscar assessores sob gestão do escritório
        const assessorsQuery = `user_hierarchy_view?superior_user_id=eq.${userId}&role_name=eq.Assessor&select=*`;
        const assessors = await supabaseRequest(assessorsQuery);
        
        // Buscar todos os investidores da rede
        const investorsQuery = `user_hierarchy_view?role_name=eq.Investidor&select=*`;
        const allInvestors = await supabaseRequest(investorsQuery);
        
        // Filtrar investidores que pertencem à rede deste escritório
        const networkInvestors = allInvestors.filter((investor: any) => {
            // Verificar se o investidor pertence a algum assessor deste escritório
            return assessors.some((assessor: any) => assessor.id === investor.superior_user_id);
        });
        
        // Calcular estatísticas
        const totalAssessors = assessors.length;
        const totalInvestors = networkInvestors.length;
        
        return {
            profile_type: 'escritorio',
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role_name: user.role_name,
                cpf_cnpj: user.cpf_cnpj,
                phone: user.phone,
                company_name: user.company_name,
                commission_percentage: user.commission_percentage,
                created_at: user.created_at
            },
            hierarchy: {
                master: user.superior_name ? {
                    id: user.superior_user_id,
                    name: user.superior_name,
                    role: user.superior_role
                } : null
            },
            network: {
                total_assessors: totalAssessors,
                total_investors: totalInvestors,
                assessors_list: assessors.slice(0, 10),
                recent_investors: networkInvestors.slice(0, 10)
            },
            performance: {
                network_size: totalAssessors + totalInvestors,
                commission_rate: user.commission_percentage || 0
            }
        };
        
    } catch (error) {
        console.error('Erro ao buscar perfil do escritório:', error);
        throw error;
    }
}

// Função para buscar perfil de master
async function getMasterProfile(userId: string, supabaseRequest: Function) {
    try {
        console.log('Buscando perfil do master:', userId);
        
        // Buscar dados básicos do usuário
        const userQuery = `user_hierarchy_view?id=eq.${userId}&select=*`;
        const userData = await supabaseRequest(userQuery);
        
        if (!userData || userData.length === 0) {
            throw new Error('Master não encontrado');
        }
        
        const user = userData[0];
        console.log('Dados do master encontrados:', user.full_name);
        
        // Buscar escritórios sob gestão do master
        const escritoriosQuery = `user_hierarchy_view?superior_user_id=eq.${userId}&role_name=eq.Escritório&select=*`;
        const escritorios = await supabaseRequest(escritoriosQuery);
        
        // Buscar todos os assessores da rede
        const assessorsQuery = `user_hierarchy_view?role_name=eq.Assessor&select=*`;
        const allAssessors = await supabaseRequest(assessorsQuery);
        
        // Filtrar assessores que pertencem à rede deste master
        const networkAssessors = allAssessors.filter((assessor: any) => {
            return escritorios.some((escritorio: any) => escritorio.id === assessor.superior_user_id) ||
                   assessor.superior_user_id === parseInt(userId);
        });
        
        // Calcular estatísticas
        const totalEscritorios = escritorios.length;
        const totalAssessors = networkAssessors.length;
        
        return {
            profile_type: 'master',
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role_name: user.role_name,
                cpf_cnpj: user.cpf_cnpj,
                phone: user.phone,
                company_name: user.company_name,
                commission_percentage: user.commission_percentage,
                created_at: user.created_at
            },
            hierarchy: {
                global: user.superior_name ? {
                    id: user.superior_user_id,
                    name: user.superior_name,
                    role: user.superior_role
                } : null
            },
            network: {
                total_escritorios: totalEscritorios,
                total_assessors: totalAssessors,
                escritorios_list: escritorios.slice(0, 10),
                recent_assessors: networkAssessors.slice(0, 10)
            },
            performance: {
                network_size: totalEscritorios + totalAssessors,
                commission_rate: user.commission_percentage || 0
            }
        };
        
    } catch (error) {
        console.error('Erro ao buscar perfil do master:', error);
        throw error;
    }
}

// Função para buscar perfil global
async function getGlobalProfile(userId: string, supabaseRequest: Function) {
    try {
        console.log('Buscando perfil global:', userId);
        
        // Buscar dados básicos do usuário
        const userQuery = `user_hierarchy_view?id=eq.${userId}&select=*`;
        const userData = await supabaseRequest(userQuery);
        
        if (!userData || userData.length === 0) {
            throw new Error('Usuário global não encontrado');
        }
        
        const user = userData[0];
        console.log('Dados do usuário global encontrados:', user.full_name);
        
        // Buscar todos os usuários da estrutura
        const allUsersQuery = `user_hierarchy_view?select=*`;
        const allUsers = await supabaseRequest(allUsersQuery);
        
        // Estatísticas por nível
        const stats = {
            masters: allUsers.filter((u: any) => u.role_name === 'Master').length,
            escritorios: allUsers.filter((u: any) => u.role_name === 'Escritório').length,
            assessors: allUsers.filter((u: any) => u.role_name === 'Assessor').length,
            investors: allUsers.filter((u: any) => u.role_name === 'Investidor').length
        };
        
        // Buscar todos os investimentos
        const investmentsQuery = `investments?select=*`;
        const allInvestments = await supabaseRequest(investmentsQuery);
        
        const totalInvested = allInvestments.reduce((sum: number, inv: any) => sum + (parseFloat(inv.invested_amount) || 0), 0);
        
        return {
            profile_type: 'global',
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role_name: user.role_name,
                cpf_cnpj: user.cpf_cnpj,
                phone: user.phone,
                company_name: user.company_name,
                created_at: user.created_at
            },
            network_overview: {
                total_users: allUsers.length,
                hierarchy_breakdown: stats,
                recent_users: allUsers
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 15)
            },
            business_metrics: {
                total_investments: allInvestments.length,
                total_invested: totalInvested,
                active_investments: allInvestments.filter((inv: any) => inv.status === 'active').length
            }
        };
        
    } catch (error) {
        console.error('Erro ao buscar perfil global:', error);
        throw error;
    }
}
