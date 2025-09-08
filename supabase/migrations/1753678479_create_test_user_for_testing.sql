-- Migration: create_test_user_for_testing
-- Created at: 1753678479

-- Migration: create_test_user_for_testing
-- Criar usuário de teste para validação do sistema

-- Criar usuário de teste como Global para poder testar todas as funcionalidades
INSERT INTO users (
    email, 
    full_name, 
    role_id, 
    superior_user_id, 
    company_name, 
    cpf_cnpj, 
    phone, 
    commission_percentage, 
    status, 
    user_type, 
    detailed_user_type
)
SELECT 
    'dcplunhn@minimax.com',
    'Usuário de Teste Global',
    ur.id,
    NULL, -- Global não tem superior
    'MiniMax Test Company',
    '99.999.999/0001-99',
    '(11) 99999-9999',
    0.00,
    'active',
    'network_user',
    'Global'
FROM user_roles ur 
WHERE ur.role_name = 'Global'
AND NOT EXISTS (
    SELECT 1 FROM users 
    WHERE email = 'dcplunhn@minimax.com'
);;