-- Limpar dados existentes para teste do zero
-- ATENÇÃO: Esta migração deleta TODOS os dados de investimentos, comissões e remunerações

-- Deletar comissões e remunerações Manus existentes
DELETE FROM commissions_manus;
DELETE FROM remuneracoes_manus;

-- Deletar comissões antigas (se existirem)
DELETE FROM commissions WHERE 1=1;
DELETE FROM commission_schedules WHERE 1=1;
DELETE FROM commission_payments WHERE 1=1;

-- Deletar remunerações antigas (se existirem)  
DELETE FROM remuneracoes WHERE 1=1;

-- Deletar investimentos existentes
DELETE FROM investments WHERE 1=1;

-- Reset das sequences para começar do ID 1
ALTER SEQUENCE IF EXISTS investments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS commissions_manus_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS remuneracoes_manus_id_seq RESTART WITH 1;

