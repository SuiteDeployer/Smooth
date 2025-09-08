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

        console.log('🔍 Buscando usuário por auth_user_id:', currentAuthUser.id);

        // Buscar usuário existente por auth_user_id
        const { data: existingUser, error: searchError } = await supabaseAdmin
            .from('users')
            .select(`
                *,
                user_roles (
                    id,
                    role_name,
                    hierarchy_level
                )
            `)
            .eq('auth_user_id', currentAuthUser.id)
            .single();

        if (existingUser && !searchError) {
            console.log('✅ Usuário encontrado por auth_user_id:', existingUser.full_name);
            
            return new Response(JSON.stringify({
                data: existingUser
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('🔍 Usuário não encontrado por auth_user_id, buscando por email:', currentAuthUser.email);

        // Buscar usuário por email para vincular auth_user_id
        const { data: userByEmail, error: emailError } = await supabaseAdmin
            .from('users')
            .select(`
                *,
                user_roles (
                    id,
                    role_name,
                    hierarchy_level
                )
            `)
            .eq('email', currentAuthUser.email)
            .single();

        if (userByEmail && !emailError) {
            console.log('✅ Usuário encontrado por email, vinculando auth_user_id:', userByEmail.full_name);
            
            // Atualizar com auth_user_id
            const { data: updatedUser, error: updateError } = await supabaseAdmin
                .from('users')
                .update({ auth_user_id: currentAuthUser.id })
                .eq('id', userByEmail.id)
                .select(`
                    *,
                    user_roles (
                        id,
                        role_name,
                        hierarchy_level
                    )
                `)
                .single();

            if (updateError) {
                console.error('❌ Erro ao vincular usuário:', updateError);
                throw new Error(`Erro ao vincular usuário: ${updateError.message}`);
            }

            console.log('✅ Usuário vinculado com sucesso');

            return new Response(JSON.stringify({
                data: updatedUser,
                message: 'Usuário vinculado com sucesso'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('ℹ️ Usuário não encontrado, criando novo usuário Global');

        // Se não existe, criar novo usuário Global
        const { data: globalRole, error: roleError } = await supabaseAdmin
            .from('user_roles')
            .select('id')
            .eq('role_name', 'Global')
            .single();

        if (roleError || !globalRole) {
            console.error('❌ Role Global não encontrado:', roleError);
            throw new Error('Role Global não encontrado');
        }

        const newUserData = {
            auth_user_id: currentAuthUser.id,
            email: currentAuthUser.email,
            full_name: currentAuthUser.user_metadata?.full_name || currentAuthUser.email.split('@')[0],
            role_id: globalRole.id,
            company_name: 'Empresa Padrão',
            status: 'active',
            user_type: 'network_user',
            commission_percentage: 0
        };

        console.log('📝 Criando novo usuário:', newUserData);

        const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert(newUserData)
            .select(`
                *,
                user_roles (
                    id,
                    role_name,
                    hierarchy_level
                )
            `)
            .single();

        if (createError) {
            console.error('❌ Erro ao criar usuário:', createError);
            throw new Error(`Erro ao criar usuário: ${createError.message}`);
        }

        console.log('✅ Usuário criado com sucesso:', newUser.full_name);

        return new Response(JSON.stringify({
            data: newUser,
            message: 'Usuário criado automaticamente'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Erro na busca de perfil:', {
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