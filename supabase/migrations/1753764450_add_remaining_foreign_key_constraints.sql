-- Migration: add_remaining_foreign_key_constraints
-- Created at: 1753764450

-- Adicionar foreign key constraints restantes

-- Foreign key entre users e user_roles
ALTER TABLE users 
ADD CONSTRAINT fk_users_role 
FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE RESTRICT;

-- Foreign key entre users e superior (self-reference)
ALTER TABLE users 
ADD CONSTRAINT fk_users_superior 
FOREIGN KEY (superior_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Foreign key entre debentures e users (created_by)
ALTER TABLE debentures 
ADD CONSTRAINT fk_debentures_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;;