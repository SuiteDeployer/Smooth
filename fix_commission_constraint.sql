-- Fix commission constraint in investments table
-- The current constraint requires commission total to be exactly 100%, which is incorrect
-- It should allow any total up to the maximum allowed by the series

-- Drop the incorrect constraint
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS commission_total_check;

-- Add correct constraint that allows commission total to be <= series maximum
-- Note: We'll validate against series maximum in the application logic
-- For now, just ensure total doesn't exceed 100% and individual percentages are valid
ALTER TABLE public.investments ADD CONSTRAINT commission_total_check CHECK (
    assessor_commission_percentage + escritorio_commission_percentage + master_commission_percentage <= 100
    AND assessor_commission_percentage >= 0 
    AND escritorio_commission_percentage >= 0 
    AND master_commission_percentage >= 0
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT commission_total_check ON public.investments IS 'Ensures commission percentages are non-negative and total does not exceed 100%';

