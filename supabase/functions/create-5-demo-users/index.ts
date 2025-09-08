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

    // Criar APENAS as 5 contas de demonstração
    const demoAccounts = [
      {
        email: 'admin@smooth.com.br',
        password: 'smooth123',
        full_name: 'Administrador Global',
        role: 'Global'
      },
      {
        email: 'master@smooth.com.br',
        password: 'smooth123',
        full_name: 'Master Demonstração',
        role: 'Master'
      },
      {
        email: 'escritorio@smooth.com.br',
        password: 'smooth123',
        full_name: 'Escritório Demonstração',
        role: 'Escritório'
      },
      {
        email: 'assessor@smooth.com.br',
        password: 'smooth123',
        full_name: 'Assessor Demonstração',
        role: 'Assessor'
      },
      {
        email: 'investidor@smooth.com.br',
        password: 'smooth123',
        full_name: 'Investidor Demonstração',
        role: 'Investidor'
      }
    ];

    // Criar cada conta de demonstração
    for (const account of demoAccounts) {
      try {
        // Criar no auth.users
        const authResult = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({
            email: account.email,
            password: account.password,
            email_confirm: true,
            user_metadata: {
              full_name: account.full_name
            }
          })
        });
        
        if (authResult.ok) {
          const authData = await authResult.json();
          
          // Criar no public.users (sem role_id por enquanto)
          const publicUserResult = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              id: authData.user.id,
              email: account.email,
              full_name: account.full_name,
              status: 'active'
            })
          });
          
          results.push(`✅ ${account.email} (${account.role})`);
        } else {
          const errorData = await authResult.json();
          results.push(`❌ ${account.email}: ${errorData.message || 'Auth error'}`);
        }
      } catch (accountError) {
        results.push(`❌ ${account.email}: ${accountError.message}`);
      }
    }

    // Criar dados básicos: debênture e séries
    try {
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
      
      if (debentureResult.ok) {
        const debenture = await debentureResult.json();
        results.push(`✅ Debênture criada`);
        
        if (debenture[0]?.id) {
          // Criar séries
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
              'apikey': SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify(seriesData)
          });
          
          if (seriesResult.ok) {
            results.push(`✅ 3 séries criadas`);
          }
        }
      }
    } catch (dataError) {
      results.push(`⚠️ Erro criando dados básicos: ${dataError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Demo setup completed',
      total_accounts: 5,
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