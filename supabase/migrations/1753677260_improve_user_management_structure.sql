-- Migration: improve_user_management_structure
-- Created at: 1753677260

-- Adicionar campos faltantes na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'network_user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS investor_profile VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS responsible_advisor_id UUID;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_superior_user_id ON users(superior_user_id);
CREATE INDEX IF NOT EXISTS idx_users_responsible_advisor_id ON users(responsible_advisor_id);

-- Atualizar dados existentes
UPDATE users SET 
  user_type = 'network_user'
WHERE user_type IS NULL;

-- Adicionar constraint para user_type
ALTER TABLE users ADD CONSTRAINT check_user_type 
CHECK (user_type IN ('network_user', 'investor'));

-- Adicionar foreign key para responsible_advisor_id
ALTER TABLE users ADD CONSTRAINT fk_users_responsible_advisor 
FOREIGN KEY (responsible_advisor_id) REFERENCES users(id) ON DELETE SET NULL;;