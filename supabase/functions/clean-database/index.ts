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

    // 1. Limpar tabela de investimentos
    const investmentsResult = await fetch(`${SUPABASE_URL}/rest/v1/investments`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    results.push(`Investments deleted: ${investmentsResult.status}`);

    // 2. Limpar tabela de comissões
    const commissionsResult = await fetch(`${SUPABASE_URL}/rest/v1/commissions`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    results.push(`Commissions deleted: ${commissionsResult.status}`);

    // 3. Limpar tabela de notificações
    const notificationsResult = await fetch(`${SUPABASE_URL}/rest/v1/alerts_notifications`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    results.push(`Notifications deleted: ${notificationsResult.status}`);

    // 4. Limpar tabela de logs de auditoria
    const auditResult = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    results.push(`Audit logs deleted: ${auditResult.status}`);

    // 5. Limpar debentures (manter apenas algumas básicas)
    const debenturesResult = await fetch(`${SUPABASE_URL}/rest/v1/debentures`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    results.push(`Debentures deleted: ${debenturesResult.status}`);

    // 6. Limpar séries (manter apenas algumas básicas)
    const seriesResult = await fetch(`${SUPABASE_URL}/rest/v1/series`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    results.push(`Series deleted: ${seriesResult.status}`);

    // 7. Manter apenas usuários essenciais de teste - deletar outros
    const keepEmails = [
      'admin@smooth.com.br',
      'master@smooth.com.br', 
      'assessor@smooth.com.br',
      'escritorio@smooth.com.br',
      'investidor.teste@smooth.com.br'
    ];

    // Deletar usuários não essenciais da tabela public.users
    const deleteUsersResult = await fetch(`${SUPABASE_URL}/rest/v1/users?email=not.in.(${keepEmails.map(e => `"${e}"`).join(',')})`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    results.push(`Non-essential users deleted: ${deleteUsersResult.status}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Database cleaned successfully',
      results,
      kept_users: keepEmails
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