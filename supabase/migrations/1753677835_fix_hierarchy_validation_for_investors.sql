-- Migration: fix_hierarchy_validation_for_investors
-- Created at: 1753677835

-- Migration: fix_hierarchy_validation_for_investors
-- Corrigir validação de hierarquia para tratar investidores corretamente

-- Atualizar função de validação para tratar investidores separadamente
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
    
    -- Se é investidor, não validar hierarquia tradicional
    -- Investidores usam responsible_advisor_id, não superior_user_id
    IF user_role_name = 'Investidor' THEN
        -- Para investidores, superior_user_id deve ser NULL
        NEW.superior_user_id := NULL;
        RETURN NEW;
    END IF;
    
    -- Para usuários de rede, validar hierarquia normal
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
$$ LANGUAGE plpgsql;;