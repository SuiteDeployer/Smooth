Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();
    
    // Simular login e testar RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // 1. Fazer login com o usuário
    const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginData.error_description || loginData.message}`);
    }
    
    const accessToken = loginData.access_token;
    
    // 2. Fazer consulta às comissões com o token do usuário (RLS aplicado)
    // A nova política deve filtrar apenas Master, Escritório, Assessor
    const commissionsResponse = await fetch(`${supabaseUrl}/rest/v1/commissions?select=id,recipient_user_id,commission_amount,commission_type,users(email,full_name,user_roles(role_name))`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}` // Usar token do usuário, não service role
      }
    });
    
    const commissionsData = await commissionsResponse.json();
    
    // 3. Fazer consulta às remunerações para comparar
    const remuneracoesResponse = await fetch(`${supabaseUrl}/rest/v1/remuneracoes?select=id_pagamento,user_id,valor_remuneracao`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}` // Usar token do usuário, não service role
      }
    });
    
    const remuneracoesData = await remuneracoesResponse.json();
    
    const result = {
      user: {
        email: email,
        access_token: accessToken.substring(0, 20) + '...' // Apenas mostrar início do token
      },
      commissions: {
        count: commissionsData.length,
        data: commissionsData
      },
      remuneracoes: {
        count: remuneracoesData.length,
        data: remuneracoesData
      },
      debug: {
        commissions_response_ok: commissionsResponse.ok,
        remuneracoes_response_ok: remuneracoesResponse.ok
      }
    };
    
    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    const errorResponse = {
      error: {
        code: 'TEST_RLS_ERROR',
        message: error.message,
        details: error.toString()
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});