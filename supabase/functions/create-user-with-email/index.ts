// supabase/functions/create-user-with-email/index.ts
// Versão robusta com mapeamento correto de roles
// Autor: Sistema Automatizado - Correção Definitiva

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Mapeamento de roles
const ROLE_MAPPING = {
  "Global": "c3702780-f93e-4a0d-86c2-5afe1a431fa7",
  "Master": "6030fa09-a484-4fae-b1c9-c368eaa7bbbe", 
  "Escritório": "83dc077f-70c8-481b-b1ef-83e1b05f17a9",
  "Assessor": "94f63f57-397d-4e88-a8fc-15d6c8bc548e",
  "Investidor": "88cf5ee9-2adc-47e3-936a-209231a05d8c",
  // Alias para compatibilidade
  "global": "c3702780-f93e-4a0d-86c2-5afe1a431fa7",
  "master": "6030fa09-a484-4fae-b1c9-c368eaa7bbbe",
  "escritorio": "83dc077f-70c8-481b-b1ef-83e1b05f17a9",
  "assessor": "94f63f57-397d-4e88-a8fc-15d6c8bc548e",
  "investidor": "88cf5ee9-2adc-47e3-936a-209231a05d8c"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error("Env faltando", { hasUrl: !!SUPABASE_URL, hasService: !!SERVICE_ROLE });
    return new Response(JSON.stringify({
      ok: false,
      code: "ENV_MISSING",
      error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados na função.",
    }), { status: 500, headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    // Garante JSON válido mesmo se o front esquecer o header
    let body: any = {};
    try { 
      body = await req.json(); 
    } catch { 
      const text = await req.text();
      if (text) body = JSON.parse(text);
    }

    const { 
      email, 
      full_name, 
      role_name, 
      cpf_cnpj, 
      phone, 
      company_name, 
      superior_user_id, 
      status,
      pix,
      pix_key_type
    } = body ?? {};
    
    if (!email || !role_name) {
      return new Response(JSON.stringify({
        ok: false,
        code: "VALIDATION_FAILED",
        error: "Campos obrigatórios: email, role_name.",
      }), { status: 422, headers: corsHeaders });
    }

    // Mapear role_name para role_id
    const role_id = ROLE_MAPPING[role_name] || ROLE_MAPPING[role_name.toLowerCase()];
    if (!role_id) {
      return new Response(JSON.stringify({
        ok: false,
        code: "INVALID_ROLE",
        error: `Role inválido: ${role_name}. Roles disponíveis: Global, Master, Escritório, Assessor, Investidor.`,
      }), { status: 422, headers: corsHeaders });
    }

    console.log("✅ Iniciando criação de usuário:", { email, role_name, role_id, full_name });

    // 1) Cria usuário no Auth (GoTrue). Se já existir, retorna 409 com detalhe útil.
    const userPassword = email.split('@')[0] + '123!';
    
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: { full_name, role_name },
      app_metadata: { roles: [role_name] },
    });

    if (createErr) {
      // mapeia erros comuns
      const msg = createErr.message || String(createErr);
      const code = msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists") ? "EMAIL_EXISTS" : "AUTH_ADMIN_ERROR";
      const status = code === "EMAIL_EXISTS" ? 409 : 500;

      console.error("createUser error:", createErr);
      return new Response(JSON.stringify({ ok: false, code, error: msg }), {
        status, headers: corsHeaders,
      });
    }

    const user = created?.user;
    if (!user?.id) {
      return new Response(JSON.stringify({
        ok: false,
        code: "NO_USER_RETURNED",
        error: "Auth não retornou o usuário criado.",
      }), { status: 500, headers: corsHeaders });
    }

    console.log("✅ Usuário criado no Auth:", user.id);

    // 2) Cria perfil no Postgres (bypassa RLS com service role)
    // Garantir que company_name não seja null para usuários que precisam
    const finalCompanyName = company_name && company_name.trim() !== '' ? company_name : 'N/A';
    
    const { error: profErr } = await admin
      .from("users")
      .insert({
        id: user.id,
        auth_user_id: user.id, // Relaciona com auth.users
        email,
        full_name: full_name ?? 'Nome não informado',
        role_id, // Usar role_id mapeado
        cpf_cnpj: cpf_cnpj ?? null,
        phone: phone ?? null,
        company_name: finalCompanyName,
        superior_user_id: superior_user_id ?? null,
        status: status ?? 'active',
        pix: pix ?? null,
        pix_key_type: pix_key_type ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profErr) {
      console.error("insert users error:", profErr);
      
      // Rollback: deletar usuário do Auth em caso de erro no perfil
      try {
        await admin.auth.admin.deleteUser(user.id);
        console.log("✅ Rollback do Auth executado");
      } catch (rollbackErr) {
        console.error("❌ Erro no rollback:", rollbackErr);
      }
      
      return new Response(JSON.stringify({
        ok: false,
        code: "PROFILE_INSERT_ERROR",
        error: profErr.message || String(profErr),
      }), { status: 500, headers: corsHeaders });
    }

    console.log("✅ Perfil criado com sucesso");

    return new Response(JSON.stringify({
      ok: true,
      data: { 
        user_id: user.id, 
        email, 
        role_name,
        role_id,
        message: "Usuário criado com sucesso",
        temporaryPassword: userPassword
      },
    }), { status: 201, headers: corsHeaders });

  } catch (err) {
    console.error("UNHANDLED:", err);
    return new Response(JSON.stringify({
      ok: false,
      code: "UNHANDLED",
      error: err?.message || String(err),
    }), { status: 500, headers: corsHeaders });
  }
});