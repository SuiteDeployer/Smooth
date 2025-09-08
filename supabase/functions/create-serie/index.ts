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
    // Verificar se o usuário está autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização não fornecido');
    }

    // Configurar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    // Fazer a requisição manual ao banco para verificar usuário autenticado
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_user_role`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      console.error('Erro ao verificar usuário:', await response.text());
      throw new Error('Erro ao verificar permissões do usuário');
    }

    const userData = await response.json();
    console.log('Dados do usuário:', userData);

    // Verificar se o usuário é válido (removendo restrição de role Global)
    if (!userData || userData.length === 0) {
      throw new Error('Usuário não encontrado ou não autenticado');
    }

    // Extrair dados da requisição
    const requestData = await req.json();
    const { 
      debenture_id, 
      series_code, 
      name, 
      description, 
      minimum_investment, 
      interest_rate, 
      duration_months 
    } = requestData;

    // Validação básica
    if (!debenture_id || !series_code || !name) {
      throw new Error('Campos obrigatórios: debenture_id, series_code, name');
    }
    
    // Validação de campos numéricos obrigatórios
    const parsedMinimumInvestment = parseFloat(minimum_investment);
    const parsedInterestRate = parseFloat(interest_rate);
    
    if (isNaN(parsedMinimumInvestment) || parsedMinimumInvestment <= 0) {
      throw new Error('minimum_investment deve ser um número válido maior que zero');
    }
    
    if (isNaN(parsedInterestRate) || parsedInterestRate <= 0) {
      throw new Error('interest_rate deve ser um número válido maior que zero');
    }

    // Preparar dados da série
    const seriesData = {
      debenture_id,
      series_code,
      name,
      description: description || '',
      minimum_investment: parsedMinimumInvestment,
      interest_rate: parsedInterestRate,
      duration_months: parseInt(duration_months) || 12,
      interest_type: 'simple',
      current_captation: 0,
      status: 'active',
      max_commission_percentage: 5.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Dados da série a serem inseridos:', seriesData);

    // Inserir série no banco
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/series`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(seriesData)
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('Erro ao inserir série:', errorText);
      throw new Error(`Erro ao criar série: ${errorText}`);
    }

    const insertedSeries = await insertResponse.json();
    console.log('Série criada com sucesso:', insertedSeries);

    return new Response(JSON.stringify({ 
      success: true, 
      data: insertedSeries,
      message: 'Série criada com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro na função create-serie:', error);
    
    const errorResponse = {
      error: {
        code: 'CREATE_SERIE_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});