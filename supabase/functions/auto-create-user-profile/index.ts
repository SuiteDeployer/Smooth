import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

        // Buscar usuário existente
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
        console.error('Erro no auto-create user profile:', {
            message: error.message,
            stack: error.stack
        });

        const errorResponse = {
            error: {
                code: 'AUTO_CREATE_USER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        let statusCode = 500;
        if (error.message.includes('Token') || error.message.includes('autorização')) {
            statusCode = 401;
        }

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});