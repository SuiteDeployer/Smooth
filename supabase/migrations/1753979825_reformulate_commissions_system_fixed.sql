-- Migration: reformulate_commissions_system_fixed
-- Created at: 1753979825

-- Migration: reformulate_commissions_system_fixed
-- Created at: 2025-08-01
-- Purpose: Reformular o sistema de comissões com controle de parcelas e novos campos

-- 1. Remover constraint de status antiga
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_payment_status_check;

-- 2. Adicionar campo para controle de parcelas pagas
ALTER TABLE commissions 
ADD COLUMN IF NOT EXISTS paid_installments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_installments INTEGER DEFAULT 1;

-- 3. Atualizar os status possíveis para apenas 3: PAGO, PENDENTE, CANCELADO
UPDATE commissions 
SET payment_status = CASE 
    WHEN payment_status IN ('paid', 'approved') THEN 'PAGO'
    WHEN payment_status IN ('pending', 'processing') THEN 'PENDENTE'
    WHEN payment_status IN ('rejected', 'canceled', 'cancelled') THEN 'CANCELADO'
    ELSE 'PENDENTE'
END;

-- 4. Adicionar nova constraint com os 3 status simplificados
ALTER TABLE commissions 
ADD CONSTRAINT commissions_payment_status_check 
CHECK (payment_status IN ('PAGO', 'PENDENTE', 'CANCELADO'));

-- 5. Criar função para detectar tipo de chave PIX
CREATE OR REPLACE FUNCTION detect_pix_key_type(pix_key TEXT)
RETURNS TEXT AS $$
BEGIN
    IF pix_key IS NULL OR LENGTH(pix_key) = 0 THEN
        RETURN 'N/A';
    END IF;
    
    -- CPF (11 dígitos)
    IF pix_key ~ '^\d{11}$' THEN
        RETURN 'CPF';
    END IF;
    
    -- CNPJ (14 dígitos)
    IF pix_key ~ '^\d{14}$' THEN
        RETURN 'CNPJ';
    END IF;
    
    -- Email
    IF pix_key ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN 'Email';
    END IF;
    
    -- Telefone (formato brasileiro)
    IF pix_key ~ '^\+?55\d{10,11}$' OR pix_key ~ '^\d{10,11}$' THEN
        RETURN 'Telefone';
    END IF;
    
    -- Chave aleatória (UUID)
    IF pix_key ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        RETURN 'Chave Aleatória';
    END IF;
    
    RETURN 'Outro';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Criar view para facilitar consultas de comissões com todas as informações necessárias
CREATE OR REPLACE VIEW commissions_detailed AS
SELECT 
    c.id,
    c.investment_id,
    c.recipient_user_id,
    c.commission_percentage,
    c.commission_amount,
    c.commission_type,
    c.payment_status,
    c.paid_installments,
    c.total_installments,
    c.payment_month,
    c.created_at,
    c.paid_at,
    
    -- Dados do beneficiário
    u.full_name as beneficiary_name,
    u.pix as beneficiary_pix,
    detect_pix_key_type(u.pix) as pix_key_type,
    
    -- Dados da série
    s.duration_months,
    s.name as series_name,
    s.series_code,
    
    -- Calcular comissão mensal
    CASE 
        WHEN s.duration_months > 0 THEN c.commission_amount / s.duration_months
        ELSE c.commission_amount
    END as monthly_commission,
    
    -- Calcular parcelas pendentes
    CASE 
        WHEN s.duration_months > 0 THEN s.duration_months - c.paid_installments
        ELSE 1 - c.paid_installments
    END as pending_installments,
    
    -- Dados do investimento
    i.invested_amount,
    i.investment_date,
    
    -- Dados do investidor
    investor.full_name as investor_name,
    investor.cpf_cnpj as investor_document
    
FROM commissions c
LEFT JOIN users u ON c.recipient_user_id = u.id
LEFT JOIN investments i ON c.investment_id = i.id
LEFT JOIN series s ON i.series_id = s.id
LEFT JOIN users investor ON i.investor_user_id = investor.id;

-- 7. Função para atualizar total_installments baseado na série
CREATE OR REPLACE FUNCTION update_commission_installments()
RETURNS VOID AS $$
BEGIN
    UPDATE commissions 
    SET total_installments = COALESCE(s.duration_months, 1)
    FROM investments i
    JOIN series s ON i.series_id = s.id
    WHERE commissions.investment_id = i.id;
END;
$$ LANGUAGE plpgsql;

-- 8. Executar a atualização das parcelas totais
SELECT update_commission_installments();

-- 9. Criar comentários para documentar os novos campos
COMMENT ON COLUMN commissions.paid_installments IS 'Número de parcelas já pagas desta comissão';
COMMENT ON COLUMN commissions.total_installments IS 'Total de parcelas desta comissão (baseado no prazo da série)';
COMMENT ON VIEW commissions_detailed IS 'View completa com todas as informações necessárias para o sistema de comissões reformulado';;