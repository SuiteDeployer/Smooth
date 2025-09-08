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
        // Verificar método
        if (!['POST', 'PATCH', 'PUT'].includes(req.method)) {
            return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
                status: 405,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Obter dados do request
        const requestData = await req.json();
        const { user_id, updates } = requestData;

        console.log('📥 Iniciando atualização do usuário:', user_id);
        console.log('📦 Dados recebidos:', updates);

        // Validação básica
        if (!user_id) {
            return new Response(JSON.stringify({ 
                error: { 
                    code: 'INVALID_INPUT',
                    message: 'ID do usuário é obrigatório' 
                } 
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!updates || typeof updates !== 'object') {
            return new Response(JSON.stringify({ 
                error: { 
                    code: 'INVALID_INPUT',
                    message: 'Dados de atualização são obrigatórios' 
                } 
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Obter service role key
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            console.error('❌ Configuração do Supabase ausente');
            return new Response(JSON.stringify({ 
                error: { 
                    code: 'CONFIGURATION_ERROR',
                    message: 'Configuração do servidor não encontrada' 
                } 
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Preparar dados para atualização (apenas campos permitidos)
        const allowedFields = [
            'email', 'full_name', 'cpf_cnpj', 'phone', 'company_name', 
            'pix', 'pix_key_type', 'status', 'commission_percentage'
        ];
        
        const updateData = {};
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateData[key] = value;
            }
        }

        // Adicionar timestamp de atualização
        updateData.updated_at = new Date().toISOString();

        console.log('📋 Dados filtrados para atualização:', updateData);

        // Atualizar usuário diretamente
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('❌ Erro ao atualizar usuário:', errorText);
            return new Response(JSON.stringify({ 
                error: { 
                    code: 'UPDATE_FAILED',
                    message: `Erro ao atualizar usuário: ${errorText}` 
                } 
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const updatedUser = await updateResponse.json();
        console.log('✅ Usuário atualizado com sucesso');

        // Retornar sucesso
        const result = {
            data: updatedUser[0] || { id: user_id, ...updateData },
            message: 'Usuário atualizado com sucesso'
        };

        console.log('🎉 Atualização concluída com sucesso!');

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Erro na atualização do usuário:', error);

        const errorResponse = {
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Erro interno do servidor'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});