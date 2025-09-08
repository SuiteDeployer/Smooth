-- Migration: insert_default_commission_profiles
-- Created at: 1754328514

-- STEP 4: Inserir perfis de comissão padrão para todas as séries ativas

-- Inserir perfis padrão baseados na lógica fornecida
INSERT INTO commission_profiles (series_id, role_name, percentage)
SELECT 
    s.id as series_id,
    'Master' as role_name,
    0.20 as percentage
FROM series s 
WHERE s.status = 'active' AND s.deleted_at IS NULL
ON CONFLICT (series_id, role_name) DO NOTHING;

INSERT INTO commission_profiles (series_id, role_name, percentage)
SELECT 
    s.id as series_id,
    'Escritório' as role_name,
    0.40 as percentage
FROM series s 
WHERE s.status = 'active' AND s.deleted_at IS NULL
ON CONFLICT (series_id, role_name) DO NOTHING;

INSERT INTO commission_profiles (series_id, role_name, percentage)
SELECT 
    s.id as series_id,
    'Assessor' as role_name,
    1.00 as percentage
FROM series s 
WHERE s.status = 'active' AND s.deleted_at IS NULL
ON CONFLICT (series_id, role_name) DO NOTHING;;