import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    
    // Verificar se já existe um investidor de teste
    const { data: existingInvestors, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'investidor.teste@smooth.com.br')
    
    if (checkError) {
      throw new Error(`Erro ao verificar investidor existente: ${checkError.message}`)
    }
    
    if (existingInvestors && existingInvestors.length > 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Investidor de teste já existe',
        investor: existingInvestors[0]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Buscar o ID do role 'Investidor'
    const { data: investorRole, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role_name', 'Investidor')
      .single()
    
    if (roleError || !investorRole) {
      throw new Error('Role Investidor não encontrado')
    }
    
    // Buscar um usuário superior para ser o parent
    const { data: parentUsers, error: parentError } = await supabase
      .from('users')
      .select('id, email, detailed_user_type')
      .in('detailed_user_type', ['Global', 'Master', 'Escritório', 'Assessor'])
      .limit(1)
    
    if (parentError || !parentUsers || parentUsers.length === 0) {
      throw new Error('Nenhum usuário superior encontrado para ser parent')
    }
    
    const parentUser = parentUsers[0]
    
    // Criar usuário no auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'investidor.teste@smooth.com.br',
      password: 'teste123',
      email_confirm: true
    })
    
    if (authError || !authUser.user) {
      throw new Error(`Erro ao criar usuário de auth: ${authError?.message}`)
    }
    
    // Criar usuário na tabela users
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        email: 'investidor.teste@smooth.com.br',
        full_name: 'Investidor Teste',
        role_id: investorRole.id,
        superior_user_id: parentUser.id,
        cpf_cnpj: '123.456.789-00',
        phone: '+55 11 99999-1111',
        status: 'active',
        commission_percentage: '0.00',
        company_name: 'Empresa Teste Ltda',
        user_type: 'network_user',
        detailed_user_type: 'Investidor',
        investor_profile: 'qualified'
      })
      .select()
      .single()
    
    if (userError) {
      // Limpar o usuário de auth se falhou
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Erro ao criar usuário: ${userError.message}`)
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Investidor de teste criado com sucesso',
      investor: newUser,
      parent: parentUser
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Erro na função seed-investor-data:', error)
    
    return new Response(JSON.stringify({
      error: {
        code: 'SEED_INVESTOR_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})