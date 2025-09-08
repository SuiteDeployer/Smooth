-- Migration: limpeza_dados_transacionais_ambiente_teste
-- Created at: 1757292747

-- LIMPEZA COMPLETA DE DADOS TRANSACIONAIS
-- Mantendo apenas usuários administrativos e estrutura do sistema
-- Data: 2025-09-08 08:51:49

-- 1. LIMPAR DADOS TRANSACIONAIS (respeitando foreign keys)

-- Limpar comissões (depende de investments)
DELETE FROM commissions;

-- Limpar remunerações (depende de users)
DELETE FROM remuneracoes;

-- Limpar investimentos (depende de series e users)
DELETE FROM investments;

-- Limpar hierarchy_tracking se existir
DELETE FROM hierarchy_tracking WHERE 1=1;

-- Limpar séries (depende de debentures)
DELETE FROM series;

-- Limpar debêntures
DELETE FROM debentures;

-- 2. REMOVER USUÁRIOS DE DEMONSTRAÇÃO (manter apenas os especificados + admin global)
DELETE FROM users 
WHERE email NOT IN (
    'Master@otmow.com', 'Esc@otmow.com', 'Asse@otmow.com', 'Invs@otmow.com',
    'mast@otmow.com', 'Esc2@otmow.com', 'ass2@otmow.com', 'inv2@otmow.com',
    'admin@smooth.com.br'  -- Manter admin global para administração
);

-- 3. RESETAR SEQUENCES/CONTADORES se necessário
-- (Não aplicável para UUIDs, mas importante para outros IDs)

-- 4. LIMPAR LOGS/AUDITORIAS NÃO CRÍTICOS se existirem
-- DELETE FROM audit_logs WHERE 1=1; -- se a tabela existir
-- DELETE FROM system_logs WHERE log_type != 'CRITICAL'; -- se a tabela existir;