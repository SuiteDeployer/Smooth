-- Migration: fix_create_user_rpc_superior_id
-- Created at: 1754317900

-- Corrigir função RPC para tratar superior_user_id corretamente
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role_name TEXT,
  p_cpf_cnpj TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_superior_user_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'active',
  p_pix TEXT DEFAULT NULL,
  p_pix_key_type TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  role_id_var UUID;
  result JSON;
BEGIN
  -- Log de entrada
  RAISE NOTICE 'Criando usuário: % (%)', p_full_name, p_email;
  
  -- Buscar role_id
  SELECT id INTO role_id_var 
  FROM user_roles 
  WHERE role_name = p_role_name 
  LIMIT 1;
  
  IF role_id_var IS NULL THEN
    RAISE EXCEPTION 'Role não encontrada: %', p_role_name;
  END IF;
  
  -- Inserir na tabela users
  INSERT INTO users (
    id,
    auth_user_id,
    email,
    full_name,
    role_id,
    cpf_cnpj,
    phone,
    company_name,
    superior_user_id,
    status,
    pix,
    pix_key_type,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_user_id,
    p_email,
    p_full_name,
    role_id_var,
    p_cpf_cnpj,
    p_phone,
    p_company_name,
    CASE WHEN p_superior_user_id != '' AND p_superior_user_id IS NOT NULL 
         THEN p_superior_user_id::UUID 
         ELSE NULL 
    END,
    p_status,
    p_pix,
    p_pix_key_type,
    NOW(),
    NOW()
  );
  
  -- Criar role assignment
  INSERT INTO user_role_assignments (
    user_id,
    role_name,
    created_at
  ) VALUES (
    p_user_id,
    p_role_name,
    NOW()
  );
  
  -- Retornar sucesso
  result := json_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'Usuário criado com sucesso'
  );
  
  RAISE NOTICE 'Usuário criado com sucesso: %', p_user_id;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao criar usuário: %', SQLERRM;
    RAISE EXCEPTION 'Erro ao criar usuário: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;