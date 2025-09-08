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
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Configuração do Supabase não encontrada');
        }

        console.log('🔄 Resetando senha do admin para teste...');

        // Resetar senha do admin para 'smooth123'
        const resetResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/639e8ee5-fd6f-4ede-99d4-b54e4d4e8594`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: 'smooth123'
            })
        });

        if (!resetResponse.ok) {
            const errorText = await resetResponse.text();
            console.error('❌ Erro ao resetar senha:', errorText);
            throw new Error(`Erro ao resetar senha: ${errorText}`);
        }

        const result = await resetResponse.json();
        console.log('✅ Senha do admin resetada com sucesso');

        return new Response(JSON.stringify({ 
            message: 'Senha do admin resetada para smooth123',
            user: result
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Erro geral:', error);
        const errorResponse = {
            error: {
                code: 'PASSWORD_RESET_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});