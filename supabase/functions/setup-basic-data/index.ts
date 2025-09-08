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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    
    if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) {
      throw new Error('Missing Supabase credentials');
    }

    const results = [];

    // 1. Criar debênture básica
    const debentureData = {
      issuer_name: 'Smooth Capital',
      series_prefix: 'SC',
      issue_date: '2025-01-01',
      maturity_date: '2026-12-31',
      total_value: 50000000.00,
      min_investment: 1000.00,
      max_investment: 1000000.00,
      status: 'active'
    };

    const debentureResult = await fetch(`${SUPABASE_URL}/rest/v1/debentures`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(debentureData)
    });
    const debenture = await debentureResult.json();
    results.push(`Debenture created: ${debentureResult.status}`);

    if (debenture[0]?.id) {
      // 2. Criar séries básicas
      const seriesData = [
        {
          debenture_id: debenture[0].id,
          series_code: 'SC2025-A',
          name: 'Série A - Conservadora',
          minimum_investment: 1000.00,
          maximum_investment: 100000.00,
          maturity_period_months: 12,
          interest_rate: 12.50,
          max_commission_percentage: 2.00,
          status: 'active'
        },
        {
          debenture_id: debenture[0].id,
          series_code: 'SC2025-B',
          name: 'Série B - Moderada',
          minimum_investment: 5000.00,
          maximum_investment: 500000.00,
          maturity_period_months: 24,
          interest_rate: 15.00,
          max_commission_percentage: 3.00,
          status: 'active'
        },
        {
          debenture_id: debenture[0].id,
          series_code: 'SC2025-C',
          name: 'Série C - Arrojada',
          minimum_investment: 25000.00,
          maximum_investment: 1000000.00,
          maturity_period_months: 36,
          interest_rate: 18.00,
          max_commission_percentage: 4.00,
          status: 'active'
        }
      ];

      const seriesResult = await fetch(`${SUPABASE_URL}/rest/v1/series`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(seriesData)
      });
      results.push(`Series created: ${seriesResult.status}`);
    }

    // 3. Criar usuários de teste essenciais
    const testUsers = [
      {
        email: 'admin@smooth.com.br',
        password: 'smooth123',
        full_name: 'Administrador Smooth',
        role: 'Global'
      },
      {
        email: 'master@smooth.com.br',
        password: 'smooth123',
        full_name: 'Master Teste',
        role: 'Master'
      },
      {
        email: 'assessor@smooth.com.br',
        password: 'smooth123',
        full_name: 'Assessor Teste',
        role: 'Assessor'
      },
      {
        email: 'escritorio@smooth.com.br',
        password: 'smooth123',
        full_name: 'Escritório Teste',
        role: 'Escritório'
      },
      {
        email: 'investidor.teste@smooth.com.br',
        password: 'smooth123',
        full_name: 'Investidor Teste',
        role: 'Investidor'
      }
    ];

    // Criar usuários no auth.users
    for (const user of testUsers) {
      const authResult = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name
          }
        })
      });
      
      if (authResult.ok) {
        const authData = await authResult.json();
        
        // Criar no public.users
        await fetch(`${SUPABASE_URL}/rest/v1/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            id: authData.user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            status: 'active'
          })
        });
        
        results.push(`User created: ${user.email}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Basic data setup completed',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});