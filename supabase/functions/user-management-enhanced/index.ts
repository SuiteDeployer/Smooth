import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Helper function para registrar ações de auditoria
async function logAuditAction(
    supabaseAdmin: any,
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
        const { error } = await supabaseAdmin.rpc('log_audit_action', {
            p_user_id: userId,
            p_action_type: actionType,
            p_resource_type: resourceType,
            p_resource_id: resourceId || null,
            p_resource_name: resourceName || null,
            p_old_values: oldValues || null,
            p_new_values: newValues || null,
            p_description: description || null
        });
        
        if (error) {
            console.error('Erro ao registrar log de auditoria:', error);
        }
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

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        
        // Obter token de autorização
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Token de autorização necessário');
        }

        const token = authHeader.replace('Bearer ', '');
        
        // Validar token
        const { data: { user: currentAuthUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !currentAuthUser) {
            throw new Error('Token inválido ou expirado');
        }

        // Buscar dados completos do usuário atual usando a view
        const { data: currentUserData, error: userError } = await supabaseAdmin
            .from('user_hierarchy_view')
            .select('*')
            .eq('auth_user_id', currentAuthUser.id)
            .single();

        if (userError || !currentUserData) {
            throw new Error('Usuário não encontrado no sistema');
        }

        const currentUser = currentUserData;

        // AÇÃO: Listar usuários da rede (subordinados)
        if (action === 'get_network_users') {
            const { data: networkUsers, error: networkError } = await supabaseAdmin
                .from('user_hierarchy_view')
                .select('*')
                .eq('superior_user_id', currentUser.id)
                .eq('user_type', 'network_user')
                .order('created_at', { ascending: false });

            if (networkError) {
                throw new Error('Erro ao buscar usuários da rede');
            }

            return new Response(JSON.stringify({ data: networkUsers || [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // AÇÃO: Listar investidores
        if (action === 'get_investors') {
            // Para investidores, buscar os que estão sob responsabilidade do usuário atual
            const { data: investors, error: investorsError } = await supabaseAdmin
                .from('user_hierarchy_view')
                .select('*')
                .eq('responsible_advisor_id', currentUser.id)
                .eq('user_type', 'investor')
                .order('created_at', { ascending: false });

            if (investorsError) {
                throw new Error('Erro ao buscar investidores');
            }

            return new Response(JSON.stringify({ data: investors || [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // AÇÃO: Obter possíveis superiores hierárquicos
        if (action === 'get_possible_superiors') {
            const roleParam = url.searchParams.get('role');
            if (!roleParam) {
                throw new Error('Parâmetro role é obrigatório');
            }

            // Buscar regras de hierarquia para o role
            const { data: hierarchyRule, error: hierarchyError } = await supabaseAdmin
                .from('hierarchy_rules')
                .select('*')
                .eq('role_name', roleParam)
                .single();

            if (hierarchyError || !hierarchyRule) {
                throw new Error('Regra de hierarquia não encontrada');
            }

            // Se pode ser top level, incluir opção "Global"
            let possibleSuperiors = [];
            if (hierarchyRule.is_top_level) {
                possibleSuperiors.push({ id: null, full_name: 'Global', role_name: 'Global' });
            }

            // Buscar usuários que podem ser superiores
            if (hierarchyRule.can_be_under.length > 0) {
                const { data: superiors, error: superiorsError } = await supabaseAdmin
                    .from('user_hierarchy_view')
                    .select('id, full_name, role_name, company_name')
                    .in('role_name', hierarchyRule.can_be_under)
                    .eq('user_type', 'network_user')
                    .neq('id', currentUser.id) // Não incluir o próprio usuário
                    .order('full_name');

                if (!superiorsError && superiors) {
                    possibleSuperiors = [...possibleSuperiors, ...superiors];
                }
            }

            return new Response(JSON.stringify({ data: possibleSuperiors }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // AÇÃO: Criar usuário
        if (action === 'create_user') {
            const requestData = await req.json();
            const { 
                email, 
                full_name, 
                role_name, 
                company_name,
                cpf_cnpj, 
                phone, 
                commission_percentage,
                superior_user_id,
                investor_profile
            } = requestData;

            // Validar permissões
            if (!currentUser.can_create_roles || !currentUser.can_create_roles.includes(role_name)) {
                throw new Error(`Você não tem permissão para criar usuários do tipo ${role_name}`);
            }

            // Buscar role_id
            const { data: targetRoleData, error: targetRoleError } = await supabaseAdmin
                .from('user_roles')
                .select('*')
                .eq('role_name', role_name)
                .single();

            if (targetRoleError || !targetRoleData) {
                throw new Error('Tipo de usuário não encontrado');
            }

            // Preparar dados do usuário
            const userData: any = {
                email,
                full_name,
                role_id: targetRoleData.id,
                cpf_cnpj,
                phone,
                commission_percentage: commission_percentage || 0,
                status: 'active',
                user_type: role_name === 'Investidor' ? 'investor' : 'network_user',
                detailed_user_type: role_name
            };

            // Para usuários de rede
            if (role_name !== 'Investidor') {
                if (!company_name || company_name.trim() === '') {
                    throw new Error('Nome da empresa é obrigatório para usuários da rede');
                }
                userData.company_name = company_name;
                userData.superior_user_id = superior_user_id || currentUser.id;
            } else {
                // Para investidores
                userData.company_name = 'N/A - Investidor';
                userData.investor_profile = investor_profile;
                userData.responsible_advisor_id = currentUser.id;
            }

            // Criar usuário
            const { data: newUser, error: createError } = await supabaseAdmin
                .from('users')
                .insert(userData)
                .select()
                .single();

            if (createError) {
                throw new Error(`Erro ao criar usuário: ${createError.message}`);
            }

            // Registrar log de auditoria para criação de usuário
            await logAuditAction(
                supabaseAdmin,
                currentUser.id,
                'CREATE',
                'USER',
                newUser.id,
                newUser.full_name,
                null,
                {
                    email: newUser.email,
                    full_name: newUser.full_name,
                    role_name: role_name,
                    company_name: newUser.company_name,
                    user_type: newUser.user_type
                },
                `Usuário ${role_name} criado: ${newUser.full_name} (${newUser.email})`
            );

            // Criar notificações automáticas para novo usuário
            try {
                const notificationResponse = await fetch(
                    `${supabaseUrl}/functions/v1/notification-creator?action=create_user_notification`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: newUser.id
                        })
                    }
                );

                if (notificationResponse.ok) {
                    const notificationResult = await notificationResponse.json();
                    console.log('Notificações criadas para novo usuário:', notificationResult.data);
                } else {
                    console.warn('Erro ao criar notificações automáticas para usuário:', await notificationResponse.text());
                    // Não falhamos a operação principal por erro de notificação
                }
            } catch (notificationError) {
                console.warn('Erro ao criar notificações automáticas para usuário:', notificationError);
                // Não falhamos a operação principal por erro de notificação
            }

            return new Response(JSON.stringify({
                data: { message: 'Usuário criado com sucesso', user: newUser }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // AÇÃO: Atualizar usuário
        if (action === 'update_user') {
            const requestData = await req.json();
            const { user_id, ...updateData } = requestData;

            // Verificar se o usuário pode editar este usuário
            const { data: targetUser, error: targetError } = await supabaseAdmin
                .from('user_hierarchy_view')
                .select('*')
                .eq('id', user_id)
                .single();

            if (targetError || !targetUser) {
                throw new Error('Usuário não encontrado');
            }

            // Verificar permissões (pode editar subordinados diretos)
            if (targetUser.superior_user_id !== currentUser.id && targetUser.responsible_advisor_id !== currentUser.id) {
                throw new Error('Você não tem permissão para editar este usuário');
            }

            // Capturar valores antigos para auditoria
            const oldValues = {
                email: targetUser.email,
                full_name: targetUser.full_name,
                company_name: targetUser.company_name,
                phone: targetUser.phone,
                commission_percentage: targetUser.commission_percentage,
                status: targetUser.status
            };

            // Atualizar usuário
            const { data: updatedUser, error: updateError } = await supabaseAdmin
                .from('users')
                .update(updateData)
                .eq('id', user_id)
                .select()
                .single();

            if (updateError) {
                throw new Error(`Erro ao atualizar usuário: ${updateError.message}`);
            }

            // Registrar log de auditoria para atualização de usuário
            await logAuditAction(
                supabaseAdmin,
                currentUser.id,
                'UPDATE',
                'USER',
                updatedUser.id,
                updatedUser.full_name,
                oldValues,
                {
                    email: updatedUser.email,
                    full_name: updatedUser.full_name,
                    company_name: updatedUser.company_name,
                    phone: updatedUser.phone,
                    commission_percentage: updatedUser.commission_percentage,
                    status: updatedUser.status
                },
                `Usuário atualizado: ${updatedUser.full_name} (${updatedUser.email})`
            );

            return new Response(JSON.stringify({
                data: { message: 'Usuário atualizado com sucesso', user: updatedUser }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // AÇÃO: Deletar usuário
        if (action === 'delete_user') {
            const requestData = await req.json();
            const { user_id } = requestData;

            // Verificar se o usuário pode deletar
            const { data: targetUser, error: targetError } = await supabaseAdmin
                .from('user_hierarchy_view')
                .select('*')
                .eq('id', user_id)
                .single();

            if (targetError || !targetUser) {
                throw new Error('Usuário não encontrado');
            }

            // Verificar permissões
            if (targetUser.superior_user_id !== currentUser.id && targetUser.responsible_advisor_id !== currentUser.id) {
                throw new Error('Você não tem permissão para deletar este usuário');
            }

            // Verificar se usuário tem subordinados
            const { data: subordinates, error: subError } = await supabaseAdmin
                .from('users')
                .select('id')
                .or(`superior_user_id.eq.${user_id},responsible_advisor_id.eq.${user_id}`)
                .limit(1);

            if (subError) {
                throw new Error('Erro ao verificar subordinados');
            }

            if (subordinates && subordinates.length > 0) {
                throw new Error('Não é possível deletar usuário que possui subordinados. Transfira ou delete os subordinados primeiro.');
            }

            // Capturar dados do usuário para auditoria antes da exclusão
            const deletedUserData = {
                email: targetUser.email,
                full_name: targetUser.full_name,
                role_name: targetUser.role_name,
                company_name: targetUser.company_name,
                user_type: targetUser.user_type,
                status: targetUser.status
            };

            // Deletar usuário
            const { error: deleteError } = await supabaseAdmin
                .from('users')
                .delete()
                .eq('id', user_id);

            if (deleteError) {
                throw new Error(`Erro ao deletar usuário: ${deleteError.message}`);
            }

            // Registrar log de auditoria para exclusão de usuário
            await logAuditAction(
                supabaseAdmin,
                currentUser.id,
                'DELETE',
                'USER',
                user_id,
                targetUser.full_name,
                deletedUserData,
                null,
                `Usuário deletado: ${targetUser.full_name} (${targetUser.email}) - ${targetUser.role_name}`
            );

            return new Response(JSON.stringify({
                data: { message: 'Usuário deletado com sucesso' }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // AÇÃO: Obter papéis disponíveis para criação
        if (action === 'get_available_roles') {
            return new Response(JSON.stringify({
                data: currentUser.can_create_roles || []
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // AÇÃO: Obter perfil do usuário atual
        if (action === 'get_profile') {
            // Registrar log de auditoria para visualização de perfil
            await logAuditAction(
                supabaseAdmin,
                currentUser.id,
                'VIEW',
                'USER',
                currentUser.id,
                currentUser.full_name,
                null,
                null,
                `Usuário visualizou próprio perfil: ${currentUser.full_name}`
            );

            return new Response(JSON.stringify({
                data: currentUser
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Ação não reconhecida: ${action}`);

    } catch (error) {
        console.error('Erro no gerenciamento de usuários:', {
            message: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method
        });

        const errorResponse = {
            error: {
                code: 'USER_MANAGEMENT_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        let statusCode = 500;
        if (error.message.includes('Token') || error.message.includes('autorização')) {
            statusCode = 401;
        } else if (error.message.includes('permissão')) {
            statusCode = 403;
        } else if (error.message.includes('não encontrado')) {
            statusCode = 404;
        }

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});