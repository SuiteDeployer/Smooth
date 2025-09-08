-- Migration: add_missing_foreign_key_constraints
-- Created at: 1753764438

-- Adicionar foreign key constraints que estão faltando para suportar joins

-- Foreign key entre investments e series
ALTER TABLE investments 
ADD CONSTRAINT fk_investments_series 
FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE RESTRICT;

-- Foreign key entre investments e users (investor)
ALTER TABLE investments 
ADD CONSTRAINT fk_investments_investor 
FOREIGN KEY (investor_user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Foreign key entre investments e users (assessor)
ALTER TABLE investments 
ADD CONSTRAINT fk_investments_assessor 
FOREIGN KEY (assessor_user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Foreign key entre series e debentures
ALTER TABLE series 
ADD CONSTRAINT fk_series_debentures 
FOREIGN KEY (debenture_id) REFERENCES debentures(id) ON DELETE RESTRICT;;