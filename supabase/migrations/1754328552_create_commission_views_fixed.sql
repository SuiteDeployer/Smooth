-- Migration: create_commission_views_fixed
-- Created at: 1754328552

-- STEP 5: Criar views para facilitar consultas e relatórios (corrigido)

-- View consolidada de comissões com todos os dados necessários
CREATE OR REPLACE VIEW commission_details AS
SELECT 
    cp.id,
    cp.payment_id,
    cp.recipient_name,
    cp.recipient_role,
    cp.series_code,
    cp.amount,
    cp.pix_key,
    cp.pix_key_type,
    cp.status,
    cp.paid_at,
    cs.payment_month,
    cs.installment_number,
    cs.total_installments,
    i.invested_amount,
    i.investment_date,
    investor.full_name as investor_name,
    registrador.full_name as registered_by,
    s.name as series_name,
    s.duration_months,
    cp.export_batch_id,
    cp.imported_at,
    cp.notes,
    cp.created_at
FROM commission_payments cp
JOIN commission_schedules cs ON cp.commission_schedule_id = cs.id
JOIN investments i ON cs.investment_id = i.id
JOIN users investor ON i.investor_user_id = investor.id
JOIN users registrador ON i.assessor_user_id = registrador.id
JOIN series s ON i.series_id = s.id
ORDER BY cp.created_at DESC;

-- View para dashboard de comissões mensais
CREATE OR REPLACE VIEW commission_monthly_summary AS
SELECT 
    DATE_TRUNC('month', cs.payment_month) as month_year,
    cs.recipient_role,
    COUNT(*) as total_payments,
    SUM(cp.amount) as total_amount,
    SUM(CASE WHEN cp.status = 'PAGO' THEN cp.amount ELSE 0 END) as paid_amount,
    SUM(CASE WHEN cp.status = 'PENDENTE' THEN cp.amount ELSE 0 END) as pending_amount,
    SUM(CASE WHEN cp.status = 'CANCELADO' THEN cp.amount ELSE 0 END) as cancelled_amount,
    COUNT(CASE WHEN cp.status = 'PAGO' THEN 1 END) as paid_count,
    COUNT(CASE WHEN cp.status = 'PENDENTE' THEN 1 END) as pending_count,
    COUNT(CASE WHEN cp.status = 'CANCELADO' THEN 1 END) as cancelled_count
FROM commission_schedules cs
JOIN commission_payments cp ON cs.id = cp.commission_schedule_id
GROUP BY DATE_TRUNC('month', cs.payment_month), cs.recipient_role
ORDER BY month_year DESC, cs.recipient_role;

-- View para comissões vencidas (alertas)
CREATE OR REPLACE VIEW commission_overdue AS
SELECT 
    cp.id,
    cp.payment_id,
    cp.recipient_name,
    cp.recipient_role,
    cp.series_code,
    cp.amount,
    cs.payment_month,
    cs.installment_number,
    (CURRENT_DATE - cs.payment_month) as days_overdue
FROM commission_payments cp
JOIN commission_schedules cs ON cp.commission_schedule_id = cs.id
WHERE cp.status = 'PENDENTE' 
AND cs.payment_month < CURRENT_DATE
ORDER BY days_overdue DESC;

-- Comentários nas views
COMMENT ON VIEW commission_details IS 'View consolidada com todos os detalhes das comissões';
COMMENT ON VIEW commission_monthly_summary IS 'Resumo mensal das comissões por role';
COMMENT ON VIEW commission_overdue IS 'Comissões vencidas para alertas';;