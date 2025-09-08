-- Migration: add_final_foreign_key_constraints
-- Created at: 1753764461

-- Adicionar foreign key constraints finais

-- Foreign key constraints para alerts_notifications
ALTER TABLE alerts_notifications 
ADD CONSTRAINT fk_alerts_recipient 
FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Foreign key constraints para commissions
ALTER TABLE commissions 
ADD CONSTRAINT fk_commissions_investment 
FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE;

ALTER TABLE commissions 
ADD CONSTRAINT fk_commissions_hierarchy 
FOREIGN KEY (hierarchy_tracking_id) REFERENCES hierarchy_tracking(id) ON DELETE CASCADE;

ALTER TABLE commissions 
ADD CONSTRAINT fk_commissions_recipient 
FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE;;