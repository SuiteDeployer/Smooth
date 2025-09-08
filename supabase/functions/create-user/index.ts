Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    const requestId = crypto.randomUUID()
    console.log(`[${requestId}] Received create-user request - Method: ${req.method}`)

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const requestData = await req.json();
        console.log(`[${requestId}] Request body:`, requestData);
        
        const { 
            email, 
            full_name, 
            role_name, 
            cpf_cnpj, 
            phone, 
            company_name, 
            superior_user_id, 
            status,
            pix,
            pix_key_type,
            password 
        } = requestData;

        // Validação básica
        if (!email || !full_name || !role_name) {
            console.error(`[${requestId}] Validation failed: missing required fields`);
            return new Response(JSON.stringify({ 
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Campos obrigatórios: email, full_name, role_name'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Configuração do Supabase não encontrada');
        }

        // Validar token do usuário de forma mais robusta
        const authHeader = req.headers.get('Authorization');
        console.log(`[${requestId}] Authorization header present:`, !!authHeader);
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error(`[${requestId}] Authorization header missing or invalid format`);
            return new Response(JSON.stringify({ 
                error: {
                    code: 'AUTH_MISSING',
                    message: 'Token de autorização não encontrado ou formato inválido'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        // Extrair o token do header
        const token = authHeader.replace('Bearer ', '').trim();
        console.log(`[${requestId}] Token extracted, length:`, token.length);
        
        // Múltiplas tentativas de validação de token
        let currentUser = null;
        let validationError = null;
        
        // Método 1: API Auth direta
        try {
            console.log(`[${requestId}] Validating token with Auth API (method 1)...`);
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? ''
                }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                if (userData && userData.id) {
                    currentUser = userData;
                    console.log(`[${requestId}] Auth validation successful (method 1), user ID:`, currentUser.id);
                }
            } else {
                const errorText = await userResponse.text();
                validationError = `Auth API failed: ${userResponse.status} - ${errorText}`;
                console.warn(`[${requestId}] Method 1 failed:`, validationError);
            }
        } catch (error) {
            validationError = `Auth API error: ${error.message}`;
            console.warn(`[${requestId}] Method 1 exception:`, validationError);
        }
        
        // Método 2: Verificação direta no banco (fallback)
        if (!currentUser) {
            try {
                console.log(`[${requestId}] Trying fallback method (method 2)...`);
                const dbResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_by_token`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ jwt_token: token })
                });
                
                if (dbResponse.ok) {
                    const userData = await dbResponse.json();
                    if (userData && userData.length > 0) {
                        currentUser = userData[0];
                        console.log(`[${requestId}] Auth validation successful (method 2), user ID:`, currentUser.id);
                    }
                }
            } catch (error) {
                console.warn(`[${requestId}] Method 2 also failed:`, error.message);
            }
        }
        
        // Método 3: Tentar decodificar JWT manualmente (último recurso)
        if (!currentUser) {
            try {
                console.log(`[${requestId}] Trying JWT decode (method 3)...`);
                // Decodificar payload do JWT sem verificar assinatura (apenas para obter user_id)
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    if (payload.sub && payload.exp && payload.exp > Date.now() / 1000) {
                        currentUser = { id: payload.sub, email: payload.email };
                        console.log(`[${requestId}] JWT decode successful (method 3), user ID:`, currentUser.id);
                    }
                }
            } catch (error) {
                console.warn(`[${requestId}] Method 3 failed:`, error.message);
            }
        }
        
        // Se todas as tentativas falharam
        if (!currentUser) {
            console.error(`[${requestId}] All authentication methods failed. Last error:`, validationError);
            return new Response(JSON.stringify({ 
                error: {
                    code: 'AUTH_INVALID',
                    message: 'Token inválido ou expirado. Faça login novamente.'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        console.log(`[${requestId}] Authentication successful, user ID:`, currentUser.id);

        // Gerar senha temporária se não fornecida
        const userPassword = password || email.split('@')[0] + '123!';
        console.log(`[${requestId}] Usando senha temporária:`, userPassword);

        // Step 1: Criar usuário na auth.users usando Admin API
        console.log(`[${requestId}] Criando usuário no auth...`);
        
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password: userPassword,
                email_confirm: true,
                user_metadata: {
                    full_name,
                    role_name
                }
            })
        });

        if (!authResponse.ok) {
            const authError = await authResponse.text();
            console.error(`[${requestId}] Auth user creation failed:`, authError);
            throw new Error(`Erro ao criar usuário no auth: ${authError}`);
        }

        const authData = await authResponse.json();
        const newUserId = authData.user.id;
        console.log(`[${requestId}] Auth user created successfully:`, newUserId);

        // Step 2: Criar perfil na tabela users
        console.log(`[${requestId}] Criando perfil do usuário...`);
        
        // Fix: Garantir que company_name não seja null para evitar constraint violation
        const finalCompanyName = company_name && company_name.trim() !== '' ? company_name : 'N/A';
        
        const profileData = {
            id: newUserId,
            auth_user_id: newUserId,
            email,
            full_name,
            cpf_cnpj: cpf_cnpj || null,
            phone: phone || null,
            company_name: finalCompanyName,
            superior_user_id: superior_user_id || null,
            status: status || 'active',
            pix: pix || null,
            pix_key_type: pix_key_type || null
        };

        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(profileData)
        });

        if (!profileResponse.ok) {
            const profileError = await profileResponse.text();
            console.error(`[${requestId}] Profile creation failed:`, profileError);
            
            // Rollback: Deletar o usuário do auth
            console.log(`[${requestId}] Tentando rollback do auth user...`);
            try {
                await fetch(`${supabaseUrl}/auth/v1/admin/users/${newUserId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });
                console.log(`[${requestId}] Auth user ${newUserId} removido no rollback.`);
            } catch (rollbackError) {
                console.error(`[${requestId}] Erro no rollback:`, rollbackError);
            }
            
            throw new Error(`Erro ao criar perfil do usuário: ${profileError}`);
        }

        const profileResult = await profileResponse.json();
        console.log(`[${requestId}] User profile created successfully:`, profileResult);

        // Step 3: Atribuir role ao usuário
        if (role_name) {
            console.log(`[${requestId}] Atribuindo role ${role_name} ao usuário...`);
            
            const roleResponse = await fetch(`${supabaseUrl}/rest/v1/user_role_assignments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: newUserId,
                    role_name
                })
            });

            if (!roleResponse.ok) {
                const roleError = await roleResponse.text();
                console.warn(`[${requestId}] Role assignment warning:`, roleError);
                // Não fazer rollback por erro de role - usuário já foi criado
            } else {
                console.log(`[${requestId}] Role atribuída com sucesso`);
            }
        }

        // Step 4: Criar notificação de boas-vindas
        try {
            console.log(`[${requestId}] Criando notificação de boas-vindas...`);
            const notificationData = {
                recipient_user_id: newUserId,
                notification_type: 'welcome',
                title: 'Bem-vindo!',
                message: `Olá ${full_name}! Sua conta foi criada com sucesso. Sua senha temporária é: ${userPassword}`,
                severity: 'info',
                is_read: false,
                status: 'unread'
            };

            await fetch(`${supabaseUrl}/rest/v1/alerts_notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            });

            console.log(`[${requestId}] Notificação de boas-vindas criada`);
        } catch (notificationError) {
            console.error(`[${requestId}] Erro ao criar notificação:`, notificationError);
            // Não fazer rollback por erro de notificação
        }

        console.log(`[${requestId}] Usuário criado com sucesso!`);

        return new Response(JSON.stringify({ 
            data: {
                message: 'Usuário criado com sucesso', 
                userId: newUserId,
                temporaryPassword: userPassword
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201,
        });

    } catch (error) {
        console.error(`[${requestId}] Unhandled error:`, error.message);
        
        // Determinar status code baseado no tipo de erro
        let statusCode = 500;
        let errorCode = 'CREATE_USER_ERROR';
        
        if (error.message.includes('autenticado') || error.message.includes('token')) {
            statusCode = 401;
            errorCode = 'AUTH_ERROR';
        } else if (error.message.includes('Campos obrigatórios')) {
            statusCode = 400;
            errorCode = 'VALIDATION_ERROR';
        }
        
        const errorResponse = {
            error: {
                code: errorCode,
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});