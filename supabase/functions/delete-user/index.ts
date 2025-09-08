Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Verificar método
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
                status: 405,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Obter dados do request
        const requestData = await req.json();
        const { user_id } = requestData;

        console.log('🗑️ Iniciando deleção do usuário:', user_id);

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

        // Fazer hard delete (apagar completamente do banco)
        const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            console.error('❌ Erro ao deletar usuário:', errorText);
            return new Response(JSON.stringify({ 
                error: { 
                    code: 'DELETE_FAILED',
                    message: `Erro ao deletar usuário: ${errorText}` 
                } 
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('✅ Usuário deletado permanentemente do banco de dados');

        // Retornar sucesso
        const result = {
            data: {
                user_id: user_id,
                message: 'Usuário deletado com sucesso'
            }
        };

        console.log('🎉 Usuário apagado permanentemente com sucesso!');

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Erro na deleção do usuário:', error);

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