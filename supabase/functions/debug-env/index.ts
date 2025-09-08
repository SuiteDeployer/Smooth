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
        // Listar todas as variáveis de ambiente disponíveis
        const envVars = {
            SUPABASE_URL: Deno.env.get('SUPABASE_URL') || 'Não encontrada',
            SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'Não encontrada',
            SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') || 'Não encontrada',
            // Tentar outras possíveis chaves
            _SUPABASE_SERVICE_KEY: Deno.env.get('_SUPABASE_SERVICE_KEY') || 'Não encontrada',
            SUPABASE_SERVICE_KEY: Deno.env.get('SUPABASE_SERVICE_KEY') || 'Não encontrada'
        };

        console.log('🔍 Variáveis de ambiente:', envVars);

        return new Response(JSON.stringify({ 
            data: {
                message: 'Debug de variáveis de ambiente',
                envVars: envVars
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        
        return new Response(JSON.stringify({
            error: {
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});