-- Migration: update_demo_data_for_flexible_hierarchy
-- Created at: 1753677799

-- Migration: update_demo_data_for_flexible_hierarchy
-- Atualizar dados de demonstração para a nova estrutura hierárquica flexível

-- Primeiro, corrigir dados existentes para atender às novas regras
UPDATE users 
SET company_name = CASE 
    WHEN role_id IN (SELECT id FROM user_roles WHERE role_name = 'Investidor') 
        THEN 'N/A - Investidor'
    WHEN company_name IS NULL OR company_name = '' OR company_name = 'Empresa Temporária'
        THEN 'Empresa ' || full_name
    ELSE company_name
END;

-- Atualizar user_type e detailed_user_type baseado nos roles
UPDATE users 
SET user_type = CASE 
    WHEN role_id IN (SELECT id FROM user_roles WHERE role_name = 'Investidor') 
        THEN 'investor'
    ELSE 'network_user'
END,
detailed_user_type = (
    SELECT role_name 
    FROM user_roles 
    WHERE user_roles.id = users.role_id
);

-- Criar alguns usuários de demonstração com hierarquia flexível
-- Escritório que está diretamente sob Global
INSERT INTO users (
    email, full_name, role_id, superior_user_id, company_name, 
    cpf_cnpj, phone, commission_percentage, status, user_type, detailed_user_type
)
SELECT 
    'escritorio.global@smooth.com.br',
    'Escritório Global Direto',
    ur.id,
    NULL, -- Superior hierárquico será Global (NULL)
    'Escritório Global Ltda',
    '12.345.678/0001-90',
    '(11) 98765-4321',
    2.5,
    'active',
    'network_user',
    'Escritório'
FROM user_roles ur 
WHERE ur.role_name = 'Escritório'
AND NOT EXISTS (
    SELECT 1 FROM users 
    WHERE email = 'escritorio.global@smooth.com.br'
);

-- Assessor que está diretamente sob Global (sem Master ou Escritório intermediário)
INSERT INTO users (
    email, full_name, role_id, superior_user_id, company_name, 
    cpf_cnpj, phone, commission_percentage, status, user_type, detailed_user_type
)
SELECT 
    'assessor.global@smooth.com.br',
    'Assessor Independente Global',
    ur.id,
    NULL, -- Superior hierárquico será Global (NULL)
    'Assessoria Independente Ltda',
    '98.765.432/0001-10',
    '(11) 99876-5432',
    3.0,
    'active',
    'network_user',
    'Assessor'
FROM user_roles ur 
WHERE ur.role_name = 'Assessor'
AND NOT EXISTS (
    SELECT 1 FROM users 
    WHERE email = 'assessor.global@smooth.com.br'
);

-- Alguns investidores de demonstração
INSERT INTO users (
    email, full_name, role_id, responsible_advisor_id, company_name, 
    cpf_cnpj, phone, status, user_type, detailed_user_type, investor_profile
)
SELECT 
    'investidor1@example.com',
    'João Silva Investidor',
    ur.id,
    u.id, -- Será vinculado ao primeiro assessor encontrado
    'N/A - Investidor',
    '123.456.789-00',
    '(11) 91234-5678',
    'active',
    'investor',
    'Investidor',
    'conservador'
FROM user_roles ur, users u
WHERE ur.role_name = 'Investidor'
AND u.detailed_user_type = 'Assessor'
AND NOT EXISTS (
    SELECT 1 FROM users 
    WHERE email = 'investidor1@example.com'
)
LIMIT 1;

INSERT INTO users (
    email, full_name, role_id, responsible_advisor_id, company_name, 
    cpf_cnpj, phone, status, user_type, detailed_user_type, investor_profile
)
SELECT 
    'investidor2@example.com',
    'Maria Santos Investidora',
    ur.id,
    u.id, -- Será vinculado ao primeiro assessor encontrado
    'N/A - Investidor',
    '987.654.321-00',
    '(11) 98765-4321',
    'active',
    'investor',
    'Investidor',
    'moderado'
FROM user_roles ur, users u
WHERE ur.role_name = 'Investidor'
AND u.detailed_user_type = 'Assessor'
AND NOT EXISTS (
    SELECT 1 FROM users 
    WHERE email = 'investidor2@example.com'
)
LIMIT 1;;