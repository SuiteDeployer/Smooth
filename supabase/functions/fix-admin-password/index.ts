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

    // ID correto do usuário admin
    const adminUserId = '43c67ef5-61d4-4155-8500-9b2b7b5e74f1';
    
    // Atualizar senha do admin com o ID correto
    const updateResponse = await fetch(
      `https://cisoewbdzdxombthxqfi.supabase.co/auth/v1/admin/users/${adminUserId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({
          password: '123456'
        })
      }
    );
    
    if (!updateResponse.ok) {
      const updateError = await updateResponse.text();
      throw new Error(`Falha ao atualizar senha do admin: ${updateError}`);
    }
    
    const userData = await updateResponse.json();
    
    return new Response(JSON.stringify({ 
      data: { 
        message: 'Senha do admin corrigida com sucesso', 
        userId: adminUserId,
        email: userData.email 
      } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorResponse = {
      error: {
        code: 'PASSWORD_FIX_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});