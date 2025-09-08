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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseServiceKey) {
      throw new Error('Service role key not configured');
    }

    // Admin API endpoint for updating user
    const adminApiUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users`;
    
    // First, get the user by email
    const getUserResponse = await fetch(`${adminApiUrl}?email=admin@smooth.com.br`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!getUserResponse.ok) {
      throw new Error(`Failed to get user: ${getUserResponse.statusText}`);
    }
    
    const users = await getUserResponse.json();
    
    if (!users.users || users.users.length === 0) {
      // Create the admin user if it doesn't exist
      const createUserResponse = await fetch(adminApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@smooth.com.br',
          password: 'smooth123',
          email_confirm: true,
          user_metadata: {},
        }),
      });
      
      if (!createUserResponse.ok) {
        throw new Error(`Failed to create user: ${createUserResponse.statusText}`);
      }
      
      const createdUser = await createUserResponse.json();
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Admin user created successfully',
        user: createdUser 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Update existing user password
      const userId = users.users[0].id;
      
      const updateUserResponse = await fetch(`${adminApiUrl}/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: 'smooth123',
        }),
      });
      
      if (!updateUserResponse.ok) {
        throw new Error(`Failed to update user: ${updateUserResponse.statusText}`);
      }
      
      const updatedUser = await updateUserResponse.json();
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Admin password updated successfully',
        user: updatedUser 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});