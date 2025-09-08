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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Missing Supabase credentials');
    }

    const emails = [
      'admin@smooth.com.br',
      'master@smooth.com.br', 
      'escritorio@smooth.com.br',
      'assessor@smooth.com.br',
      'investidor@smooth.com.br'
    ];

    const results = [];
    
    for (const email of emails) {
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }
      
      const usersData = await response.json();
      const user = usersData.users?.find(u => u.email === email);
      
      if (user) {
        const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey
          },
          body: JSON.stringify({
            password: 'smooth123'
          })
        });
        
        if (updateResponse.ok) {
          results.push({ email, status: 'password_reset_success' });
        } else {
          const errorText = await updateResponse.text();
          results.push({ email, status: 'password_reset_failed', error: errorText });
        }
      } else {
        results.push({ email, status: 'user_not_found' });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Password reset completed for all demo accounts',
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: {
        code: 'PASSWORD_RESET_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});