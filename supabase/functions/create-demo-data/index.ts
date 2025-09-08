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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!serviceRoleKey) {
      throw new Error('Service role key não configurada');
    }

    const supabaseUrl = 'https://cisoewbdzdxombthxqfi.supabase.co';
    const results = [];

    // 1. Criar debêntures de demonstração se não existir
    const debenturesResponse = await fetch(`${supabaseUrl}/rest/v1/debentures?select=count`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Accept': 'application/vnd.pgrst.object+json'
      }
    });

    if (debenturesResponse.ok) {
      const debentures = await debenturesResponse.json();
      
      if (!debentures || debentures.length === 0) {
        // Buscar usuário global para criar debêntures
        const globalUserResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.admin@smooth.com.br&select=*`, {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        });

        const globalUsers = await globalUserResponse.json();
        
        if (globalUsers && globalUsers.length > 0) {
          const globalUser = globalUsers[0];
          
          // Criar debênture demo
          const createDebentureResponse = await fetch(`${supabaseUrl}/rest/v1/debentures`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              name: 'Debênture Infraestrutura Brasil 2025',
              issuer_company: 'Infraestrutura Brasil S.A.',
              total_value: 50000000.00,
              interest_rate: 12.50,
              maturity_date: '2028-12-31',
              issue_date: '2025-01-15',
              status: 'active',
              created_by: globalUser.id,
              description: 'Debênture para financiamento de projetos de infraestrutura nacional'
            })
          });

          if (createDebentureResponse.ok) {
            const newDebenture = await createDebentureResponse.json();
            results.push('✅ Debênture de demonstração criada');
            
            // Criar séries para esta debênture
            const series = [
              {
                debenture_id: newDebenture[0].id,
                series_letter: 'A',
                min_investment: 10000.00,
                max_investment: 500000.00,
                units_available: 1000,
                units_sold: 450,
                status: 'active'
              },
              {
                debenture_id: newDebenture[0].id,
                series_letter: 'B',
                min_investment: 50000.00,
                max_investment: 1000000.00,
                units_available: 500,
                units_sold: 180,
                status: 'active'
              }
            ];

            for (const serie of series) {
              const createSeriesResponse = await fetch(`${supabaseUrl}/rest/v1/series`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(serie)
              });

              if (createSeriesResponse.ok) {
                results.push(`✅ Série ${serie.series_letter} criada`);
              }
            }
          }
        }
      } else {
        results.push('✅ Debêntures já existem');
      }
    }

    // 2. Criar investimentos de demonstração
    const investmentsResponse = await fetch(`${supabaseUrl}/rest/v1/investments?select=count`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Accept': 'application/vnd.pgrst.object+json'
      }
    });

    if (investmentsResponse.ok) {
      const investments = await investmentsResponse.json();
      
      if (!investments || investments.length === 0) {
        // Buscar usuários para criar investimentos demo
        const usersResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=*`, {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        });

        const users = await usersResponse.json();
        const investidor = users.find(u => u.email === 'investidor@smooth.com.br');
        const assessor = users.find(u => u.email === 'assessor@smooth.com.br');

        // Buscar séries disponíveis
        const seriesResponse = await fetch(`${supabaseUrl}/rest/v1/series?select=*`, {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        });

        const seriesData = await seriesResponse.json();

        if (investidor && assessor && seriesData && seriesData.length > 0) {
          const investmentDemo = {
            investor_user_id: investidor.id,
            advisor_user_id: assessor.id,
            series_id: seriesData[0].id,
            investment_amount: 25000.00,
            units_quantity: 25,
            investment_date: '2025-01-20',
            status: 'confirmed'
          };

          const createInvestmentResponse = await fetch(`${supabaseUrl}/rest/v1/investments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(investmentDemo)
          });

          if (createInvestmentResponse.ok) {
            results.push('✅ Investimento de demonstração criado');
          }
        }
      } else {
        results.push('✅ Investimentos já existem');
      }
    }

    return new Response(JSON.stringify({ 
      data: { 
        message: 'Dados de demonstração verificados/criados',
        results: results
      } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'DEMO_DATA_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});