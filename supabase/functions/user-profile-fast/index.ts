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
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuração do Supabase não encontrada');
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        
        // Validar autenticação
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Token de autorização necessário');
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: currentAuthUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !currentAuthUser) {
            throw new Error('Token inválido ou expirado');
        }

        // Buscar usuário existente por auth_user_id
        const { data: existingUser, error: searchError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('auth_user_id', currentAuthUser.id)
            .single();

        if (existingUser && !searchError) {
            // Se usuário já existe, retornar com role
            const { data: roleData } = await supabaseAdmin
                .from('user_roles')
                .select('*')
                .eq('id', existingUser.role_id)
                .single();

            // Registrar log de auditoria para login/acesso ao sistema
            await logAuditAction(
                supabaseAdmin,
                existingUser.id,
                'LOGIN',
                'SESSION',
                existingUser.id,
                existingUser.full_name,
                null,
                {
                    email: existingUser.email,
                    role_name: roleData?.role_name,
                    login_time: new Date().toISOString()
                },
                `Login realizado: ${existingUser.full_name} (${existingUser.email})`
            );

            return new Response(JSON.stringify({
                data: {
                    ...existingUser,
                    user_roles: roleData
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Buscar usuário por email para vincular auth_user_id
        const { data: userByEmail, error: emailError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', currentAuthUser.email)
            .single();

        if (userByEmail && !emailError) {
            // Atualizar com auth_user_id
            const { data: updatedUser, error: updateError } = await supabaseAdmin
                .from('users')
                .update({ auth_user_id: currentAuthUser.id })
                .eq('id', userByEmail.id)
                .select()
                .single();

            if (updateError) {
                throw new Error(`Erro ao vincular usuário: ${updateError.message}`);
            }

            // Buscar role
            const { data: roleData } = await supabaseAdmin
                .from('user_roles')
                .select('*')
                .eq('id', updatedUser.role_id)
                .single();

            // Registrar log de auditoria para vinculação de conta
            await logAuditAction(
                supabaseAdmin,
                updatedUser.id,
                'UPDATE',
                'USER',
                updatedUser.id,
                updatedUser.full_name,
                { auth_user_id: null },
                { auth_user_id: currentAuthUser.id },
                `Conta vinculada ao sistema de autenticação: ${updatedUser.full_name} (${updatedUser.email})`
            );

            // Registrar login após vinculação
            await logAuditAction(
                supabaseAdmin,
                updatedUser.id,
                'LOGIN',
                'SESSION',
                updatedUser.id,
                updatedUser.full_name,
                null,
                {
                    email: updatedUser.email,
                    role_name: roleData?.role_name,
                    login_time: new Date().toISOString(),
                    first_login_after_link: true
                },
                `Login realizado após vinculação: ${updatedUser.full_name} (${updatedUser.email})`
            );

            return new Response(JSON.stringify({
                data: {
                    ...updatedUser,
                    user_roles: roleData
                },
                message: 'Usuário vinculado com sucesso'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Se não existe, criar novo usuário Global
        const { data: globalRole } = await supabaseAdmin
            .from('user_roles')
            .select('id')
            .eq('role_name', 'Global')
            .single();

        if (!globalRole) {
            throw new Error('Role Global não encontrado');
        }

        const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
                auth_user_id: currentAuthUser.id,
                email: currentAuthUser.email,
                full_name: currentAuthUser.user_metadata?.full_name || currentAuthUser.email.split('@')[0],
                role_id: globalRole.id,
                company_name: 'Empresa de Teste',
                status: 'active',
                user_type: 'network_user',
                detailed_user_type: 'Global',
                commission_percentage: 0
            })
            .select()
            .single();

        if (createError) {
            throw new Error(`Erro ao criar usuário: ${createError.message}`);
        }

        // Buscar role criado
        const { data: roleData } = await supabaseAdmin
            .from('user_roles')
            .select('*')
            .eq('id', globalRole.id)
            .single();

        // Registrar log de auditoria para criação automática de usuário
        await logAuditAction(
            supabaseAdmin,
            newUser.id,
            'CREATE',
            'USER',
            newUser.id,
            newUser.full_name,
            null,
            {
                email: newUser.email,
                full_name: newUser.full_name,
                role_name: 'Global',
                user_type: newUser.user_type,
                auto_created: true
            },
            `Usuário Global criado automaticamente: ${newUser.full_name} (${newUser.email})`
        );

        // Registrar primeiro login do usuário recém-criado
        await logAuditAction(
            supabaseAdmin,
            newUser.id,
            'LOGIN',
            'SESSION',
            newUser.id,
            newUser.full_name,
            null,
            {
                email: newUser.email,
                role_name: roleData?.role_name,
                login_time: new Date().toISOString(),
                first_login: true
            },
            `Primeiro login após criação automática: ${newUser.full_name} (${newUser.email})`
        );

        return new Response(JSON.stringify({
            data: {
                ...newUser,
                user_roles: roleData
            },
            message: 'Usuário criado automaticamente'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro na busca de perfil:', {
            message: error.message,
            stack: error.stack
        });

        const errorResponse = {
            error: {
                code: 'USER_PROFILE_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        let statusCode = 500;
        if (error.message.includes('Token') || error.message.includes('autorização')) {
            statusCode = 401;
        } else if (error.message.includes('não encontrado')) {
            statusCode = 404;
        }

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});