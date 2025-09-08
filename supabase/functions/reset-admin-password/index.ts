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

    // Redefinir senha do admin
    const resetResponse = await fetch(
      'https://cisoewbdzdxombthxqfi.supabase.co/auth/v1/admin/users',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({
          email: 'admin@smooth.com.br',
          password: '123456',
          email_confirm: true
        })
      }
    );

    if (!resetResponse.ok) {
      const errorText = await resetResponse.text();
      console.error('Erro ao redefinir senha:', errorText);
      
      // Se o usuário já existe, vamos tentar atualizar a senha
      const users = await fetch(
        'https://cisoewbdzdxombthxqfi.supabase.co/auth/v1/admin/users?email=admin%40smooth.com.br',
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        }
      );
      
      const usersData = await users.json();
      
      if (usersData.users && usersData.users.length > 0) {
        const userId = usersData.users[0].id;
        
        const updateResponse = await fetch(
          `https://cisoewbdzdxombthxqfi.supabase.co/auth/v1/admin/users/${userId}`,
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
          throw new Error(`Falha ao atualizar senha: ${updateError}`);
        }
        
        return new Response(JSON.stringify({ 
          data: { message: 'Senha do admin redefinida com sucesso via update', userId } 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        throw new Error(`Falha ao redefinir senha: ${errorText}`);
      }
    }

    const resetData = await resetResponse.json();
    
    return new Response(JSON.stringify({ 
      data: { message: 'Senha do admin redefinida com sucesso', user: resetData } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorResponse = {
      error: {
        code: 'PASSWORD_RESET_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});