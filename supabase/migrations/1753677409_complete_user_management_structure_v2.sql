-- Migration: complete_user_management_structure_v2
-- Created at: 1753677409

-- Migration: complete_user_management_structure_v2
-- Completar estrutura para gestão flexível de usuários

-- Tornar company_name obrigatório apenas para usuários de rede
-- Vamos fazer isso via check constraint ao invés de NOT NULL direto
ALTER TABLE users ADD CONSTRAINT check_company_name_required 
CHECK (
    (user_type = 'investor') OR 
    (user_type = 'network_user' AND company_name IS NOT NULL AND company_name != '')
);

-- Criar tabela para configurações hierárquicas flexíveis
CREATE TABLE IF NOT EXISTS hierarchy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) NOT NULL UNIQUE,
    can_be_under TEXT[] NOT NULL DEFAULT '{}',
    is_top_level BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir regras de hierarquia flexível
INSERT INTO hierarchy_rules (role_name, can_be_under, is_top_level) VALUES
('Global', '{}', TRUE),
('Master', '{Global}', FALSE),
('Escritório', '{Global,Master}', FALSE),
('Assessor', '{Global,Master,Escritório}', FALSE),
('Investidor', '{}', FALSE)
ON CONFLICT (role_name) DO UPDATE SET
  can_be_under = EXCLUDED.can_be_under,
  is_top_level = EXCLUDED.is_top_level;

-- Adicionar campo para tipo de usuário mais específico
ALTER TABLE users ADD COLUMN IF NOT EXISTS detailed_user_type VARCHAR(50);

-- Atualizar tipos existentes
UPDATE users 
SET detailed_user_type = ur.role_name,
    user_type = CASE 
        WHEN ur.role_name = 'Investidor' THEN 'investor'
        ELSE 'network_user'
    END
FROM user_roles ur 
WHERE users.role_id = ur.id;

-- Criar vista para facilitar consultas com hierarquia
CREATE OR REPLACE VIEW user_hierarchy_view AS
SELECT 
    u.*,
    ur.role_name,
    ur.hierarchy_level,
    ur.can_create_roles,
    hr.can_be_under,
    hr.is_top_level,
    sup.full_name as superior_name,
    sup_ur.role_name as superior_role
FROM users u
LEFT JOIN user_roles ur ON u.role_id = ur.id
LEFT JOIN hierarchy_rules hr ON ur.role_name = hr.role_name
LEFT JOIN users sup ON u.superior_user_id = sup.id
LEFT JOIN user_roles sup_ur ON sup.role_id = sup_ur.id;

-- Função para validar hierarquia antes de inserção/atualização
CREATE OR REPLACE FUNCTION validate_user_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    user_role_name VARCHAR(50);
    superior_role_name VARCHAR(50);
    allowed_superiors TEXT[];
    is_top BOOLEAN;
BEGIN
    -- Buscar nome do role do usuário
    SELECT role_name INTO user_role_name
    FROM user_roles 
    WHERE id = NEW.role_id;
    
    -- Se não tem superior, verificar se pode ser top level
    IF NEW.superior_user_id IS NULL THEN
        SELECT is_top_level INTO is_top
        FROM hierarchy_rules
        WHERE role_name = user_role_name;
        
        IF NOT FOUND OR NOT is_top THEN
            RAISE EXCEPTION 'Usuário do tipo % deve ter um superior hierárquico', user_role_name;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Buscar nome do role do superior
    SELECT ur.role_name INTO superior_role_name
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = NEW.superior_user_id;
    
    -- Buscar regras de hierarquia permitidas
    SELECT can_be_under INTO allowed_superiors
    FROM hierarchy_rules
    WHERE role_name = user_role_name;
    
    -- Verificar se a hierarquia é válida
    IF superior_role_name != ALL(allowed_superiors) THEN
        RAISE EXCEPTION 'Usuário do tipo % não pode estar subordinado a %', user_role_name, superior_role_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validação
DROP TRIGGER IF EXISTS trigger_validate_user_hierarchy ON users;
CREATE TRIGGER trigger_validate_user_hierarchy
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_hierarchy();

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_detailed_user_type ON users(detailed_user_type);
CREATE INDEX IF NOT EXISTS idx_hierarchy_rules_role_name ON hierarchy_rules(role_name);;