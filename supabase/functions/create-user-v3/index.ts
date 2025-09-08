// supabase/functions/create-user-v3/index.ts
// RECONSTRUÇÃO COMPLETA - Edge Function Simplificada
// Data: 2025-08-21 - Autor: MiniMax Agent

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Mapeamento SIMPLIFICADO de roles
const ROLES = {
  "Global": "c3702780-f93e-4a0d-86c2-5afe1a431fa7",
  "Master": "6030fa09-a484-4fae-b1c9-c368eaa7bbbe", 
  "Escritório": "83dc077f-70c8-481b-b1ef-83e1b05f17a9",
  "Assessor": "94f63f57-397d-4e88-a8fc-15d6c8bc548e",
  "Investidor": "88cf5ee9-2adc-47e3-936a-209231a05d8c"
};

Deno.serve(async (req) => {
  console.log(`🚀 [create-user-v3] Nova requisição: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    console.log(`✅ [create-user-v3] OPTIONS request - retornando CORS`);
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log(`❌ [create-user-v3] Método inválido: ${req.method}`);
    return new Response(
      JSON.stringify({ error: "Método não permitido. Use POST." }), 
      { status: 405, headers: corsHeaders }
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(`❌ [create-user-v3] Variáveis de ambiente faltando:`, {
      hasUrl: !!SUPABASE_URL,
      hasServiceKey: !!SERVICE_ROLE_KEY
    });
    return new Response(
      JSON.stringify({ error: "Configuração do servidor incompleta" }), 
      { status: 500, headers: corsHeaders }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    // Parsing do body com logs detalhados
    let requestData;
    try {
      const bodyText = await req.text();
      console.log(`📥 [create-user-v3] Body recebido:`, bodyText);
      requestData = JSON.parse(bodyText);
    } catch (parseError) {
      console.error(`❌ [create-user-v3] Erro ao fazer parse do JSON:`, parseError);
      return new Response(
        JSON.stringify({ error: "JSON inválido no corpo da requisição" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📋 [create-user-v3] Dados parseados:`, requestData);

    const { 
      email, 
      full_name, 
      role_name, 
      cpf_cnpj, 
      phone, 
      company_name, 
      superior_user_id, 
      status = 'active',
      pix,
      pix_key_type = 'cpf_cnpj'
    } = requestData;
    
    // VALIDAÇÃO MÍNIMA - apenas campos obrigatórios
    if (!email) {
      console.log(`❌ [create-user-v3] Email não fornecido`);
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    if (!full_name) {
      console.log(`❌ [create-user-v3] Nome não fornecido`);
      return new Response(
        JSON.stringify({ error: "Nome completo é obrigatório" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    if (!role_name) {
      console.log(`❌ [create-user-v3] Role não fornecido`);
      return new Response(
        JSON.stringify({ error: "Tipo de usuário é obrigatório" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // Validar role
    const role_id = ROLES[role_name];
    if (!role_id) {
      console.log(`❌ [create-user-v3] Role inválido: ${role_name}`);
      const availableRoles = Object.keys(ROLES).join(', ');
      return new Response(
        JSON.stringify({ 
          error: `Tipo de usuário inválido: ${role_name}. Disponíveis: ${availableRoles}` 
        }), 
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`✅ [create-user-v3] Validação básica OK. Iniciando criação...`);
    console.log(`📝 [create-user-v3] Dados finais:`, {
      email,
      full_name,
      role_name,
      role_id,
      status
    });

    // 1. Criar usuário no Auth
    const temporaryPassword = `${email.split('@')[0]}123!`;
    
    console.log(`🔐 [create-user-v3] Criando usuário no Auth com senha temporária`);
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { 
        full_name, 
        role_name 
      },
      app_metadata: { 
        role: role_name 
      }
    });

    if (authError) {
      console.error(`❌ [create-user-v3] Erro na criação do Auth:`, authError);
      
      // Tratamento de erros específicos
      if (authError.message?.includes('already registered') || 
          authError.message?.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: `Email ${email} já está em uso` }), 
          { status: 409, headers: corsHeaders }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Erro na autenticação: ${authError.message}` }), 
        { status: 500, headers: corsHeaders }
      );
    }

    if (!authUser?.user?.id) {
      console.error(`❌ [create-user-v3] Auth não retornou usuário`);
      return new Response(
        JSON.stringify({ error: "Falha na criação do usuário" }), 
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ [create-user-v3] Usuário criado no Auth: ${authUser.user.id}`);

    // 2. Criar perfil na tabela users
    const userData = {
      id: authUser.user.id,
      auth_user_id: authUser.user.id,
      email: email,
      full_name: full_name,
      role_id: role_id,
      cpf_cnpj: cpf_cnpj || null,
      phone: phone || null,
      company_name: company_name || 'N/A',
      superior_user_id: superior_user_id || null,
      status: status,
      pix: pix || null,
      pix_key_type: pix_key_type,
      user_type: 'network_user',
      commission_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log(`💾 [create-user-v3] Inserindo perfil:`, userData);

    const { error: profileError } = await supabase
      .from('users')
      .insert(userData);

    if (profileError) {
      console.error(`❌ [create-user-v3] Erro na inserção do perfil:`, profileError);
      
      // Rollback: deletar usuário do Auth
      try {
        await supabase.auth.admin.deleteUser(authUser.user.id);
        console.log(`🔄 [create-user-v3] Rollback executado - usuário removido do Auth`);
      } catch (rollbackError) {
        console.error(`❌ [create-user-v3] Erro no rollback:`, rollbackError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Erro ao criar perfil: ${profileError.message}` 
        }), 
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ [create-user-v3] Perfil criado com sucesso`);

    // Resposta de sucesso
    const response = {
      success: true,
      message: "Usuário criado com sucesso",
      data: {
        user_id: authUser.user.id,
        email: email,
        full_name: full_name,
        role_name: role_name,
        temporary_password: temporaryPassword
      }
    };

    console.log(`🎉 [create-user-v3] Sucesso total! Retornando:`, response);
    
    return new Response(
      JSON.stringify(response), 
      { status: 201, headers: corsHeaders }
    );

  } catch (error) {
    console.error(`💥 [create-user-v3] Erro não tratado:`, error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor", 
        details: error.message 
      }), 
      { status: 500, headers: corsHeaders }
    );
  }
});
