import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

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
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // Test with service role (bypass RLS)
        const serviceResponse = await fetch(`${SUPABASE_URL}/rest/v1/remuneracoes?nome_investidor=eq.Investidor%20Teste%20Manual`, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json'
            }
        });

        const serviceData = await serviceResponse.json();
        console.log('Service role data:', serviceData);

        // Check the admin user auth status
        const adminCheck = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.admin@smooth.com.br&select=id,full_name,email,role_id`, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json'
            }
        });

        const adminData = await adminCheck.json();
        console.log('Admin data:', adminData);

        // Test RLS policy manually
        const rlsTest = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_admin_access`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_email: 'admin@smooth.com.br'
            })
        });

        let rlsData = null;
        if (rlsTest.ok) {
            rlsData = await rlsTest.json();
        } else {
            rlsData = { error: 'RPC function not found' };
        }

        return new Response(JSON.stringify({ 
            service_role_remuneracoes: serviceData,
            admin_user: adminData,
            rls_test: rlsData,
            total_count: serviceData?.length || 0,
            success: true 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'FUNCTION_ERROR',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});