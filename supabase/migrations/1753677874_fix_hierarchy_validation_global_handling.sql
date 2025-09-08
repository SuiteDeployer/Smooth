-- Migration: fix_hierarchy_validation_global_handling
-- Created at: 1753677874

-- Migration: fix_hierarchy_validation_global_handling
-- Corrigir validação para tratar corretamente hierarquia com Global

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
    IF user_role_name = 'Investidor' THEN
        NEW.superior_user_id := NULL;
        RETURN NEW;
    END IF;
    
    -- Buscar regras de hierarquia permitidas
    SELECT can_be_under, is_top_level INTO allowed_superiors, is_top
    FROM hierarchy_rules
    WHERE role_name = user_role_name;
    
    -- Se não tem superior (superior_user_id = NULL), significa que está sob Global
    IF NEW.superior_user_id IS NULL THEN
        -- Verificar se pode estar sob Global
        IF 'Global' = ANY(allowed_superiors) OR is_top THEN
            RETURN NEW;
        ELSE
            RAISE EXCEPTION 'Usuário do tipo % não pode estar diretamente sob Global', user_role_name;
        END IF;
    END IF;
    
    -- Se tem superior, buscar nome do role do superior
    SELECT ur.role_name INTO superior_role_name
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = NEW.superior_user_id;
    
    IF superior_role_name IS NULL THEN
        RAISE EXCEPTION 'Superior hierárquico não encontrado';
    END IF;
    
    -- Verificar se a hierarquia é válida
    IF superior_role_name != ALL(allowed_superiors) THEN
        RAISE EXCEPTION 'Usuário do tipo % não pode estar subordinado a %', user_role_name, superior_role_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;;