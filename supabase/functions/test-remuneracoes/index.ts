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
        // Connect to Supabase database
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        console.log('Testing remuneracoes access...');

        // Test direct access to remuneracoes table
        const response = await fetch(`${SUPABASE_URL}/rest/v1/remuneracoes`, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        console.log('Remuneracoes response:', data);

        // Test as specific user - let's get a global user first
        const usersResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?role_id=in.(select%20id%20from%20user_roles%20where%20role_name='Global')&limit=1`, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json'
            }
        });

        const usersData = await usersResponse.json();
        console.log('Global users:', usersData);

        return new Response(JSON.stringify({ 
            remuneracoes: data,
            global_users: usersData,
            success: true 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error:', error);
        const errorResponse = {
            error: {
                code: 'FUNCTION_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});