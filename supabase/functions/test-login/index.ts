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
    const { email, password } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    console.log('🔐 Testando login para:', email);

    // Tentar fazer login
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      console.error('❌ Erro de autenticação:', authData);
      return new Response(JSON.stringify({
        success: false,
        error: authData.error_description || authData.message || 'Erro de autenticação',
        details: authData
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Login bem-sucedido!');

    // Buscar dados do perfil
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/users?auth_user_id=eq.${authData.user.id}&select=*,user_roles(*)`, {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      }
    });

    const profileData = await profileResponse.json();

    return new Response(JSON.stringify({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        profile: profileData?.[0] || null
      },
      token_info: {
        access_token: authData.access_token?.substring(0, 20) + '...',
        expires_in: authData.expires_in,
        token_type: authData.token_type
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'Falha no teste de login'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
