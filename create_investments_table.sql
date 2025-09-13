-- Create investments table
CREATE TABLE IF NOT EXISTS public.investments (
    id SERIAL PRIMARY KEY,
    debenture_id UUID NOT NULL REFERENCES public.debentures(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assessor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    escritorio_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    master_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Investment details
    investment_amount DECIMAL(15,2) NOT NULL CHECK (investment_amount > 0),
    investment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    maturity_date DATE NOT NULL,
    
    -- Commission split (must total 100%)
    assessor_commission_percentage DECIMAL(5,2) NOT NULL CHECK (assessor_commission_percentage >= 0 AND assessor_commission_percentage <= 100),
    escritorio_commission_percentage DECIMAL(5,2) NOT NULL CHECK (escritorio_commission_percentage >= 0 AND escritorio_commission_percentage <= 100),
    master_commission_percentage DECIMAL(5,2) NOT NULL CHECK (master_commission_percentage >= 0 AND master_commission_percentage <= 100),
    
    -- Calculated fields
    assessor_commission_amount DECIMAL(15,2) GENERATED ALWAYS AS (investment_amount * assessor_commission_percentage / 100) STORED,
    escritorio_commission_amount DECIMAL(15,2) GENERATED ALWAYS AS (investment_amount * escritorio_commission_percentage / 100) STORED,
    master_commission_amount DECIMAL(15,2) GENERATED ALWAYS AS (investment_amount * master_commission_percentage / 100) STORED,
    
    -- Status and metadata
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraint to ensure commission percentages total 100%
    CONSTRAINT commission_total_check CHECK (
        assessor_commission_percentage + escritorio_commission_percentage + master_commission_percentage = 100
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_investments_debenture_id ON public.investments(debenture_id);
CREATE INDEX IF NOT EXISTS idx_investments_series_id ON public.investments(series_id);
CREATE INDEX IF NOT EXISTS idx_investments_investor_id ON public.investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_assessor_id ON public.investments(assessor_id);
CREATE INDEX IF NOT EXISTS idx_investments_escritorio_id ON public.investments(escritorio_id);
CREATE INDEX IF NOT EXISTS idx_investments_master_id ON public.investments(master_id);
CREATE INDEX IF NOT EXISTS idx_investments_investment_date ON public.investments(investment_date);
CREATE INDEX IF NOT EXISTS idx_investments_maturity_date ON public.investments(maturity_date);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_created_at ON public.investments(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_investments_updated_at 
    BEFORE UPDATE ON public.investments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investments table

-- Global users can see all investments
CREATE POLICY "Global users can view all investments" ON public.investments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Global'
        )
    );

-- Master users can see investments in their network
CREATE POLICY "Master users can view network investments" ON public.investments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Master'
            AND (
                investments.master_id = auth.uid()
                OR investments.escritorio_id IN (
                    SELECT id FROM public.users 
                    WHERE master_id = auth.uid()
                )
                OR investments.assessor_id IN (
                    SELECT id FROM public.users 
                    WHERE master_id = auth.uid() 
                    OR escritorio_id IN (
                        SELECT id FROM public.users 
                        WHERE master_id = auth.uid()
                    )
                )
            )
        )
    );

-- Escritório users can see investments in their office network
CREATE POLICY "Escritorio users can view office investments" ON public.investments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Escritório'
            AND (
                investments.escritorio_id = auth.uid()
                OR investments.assessor_id IN (
                    SELECT id FROM public.users 
                    WHERE escritorio_id = auth.uid()
                )
            )
        )
    );

-- Assessor users can see their own investments
CREATE POLICY "Assessor users can view own investments" ON public.investments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Assessor'
            AND investments.assessor_id = auth.uid()
        )
    );

-- Investor users can see only their own investments
CREATE POLICY "Investor users can view own investments" ON public.investments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Investidor'
            AND investments.investor_id = auth.uid()
        )
    );

-- INSERT policies (only non-investor users can create investments)
CREATE POLICY "Global users can insert investments" ON public.investments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Global'
        )
    );

CREATE POLICY "Master users can insert network investments" ON public.investments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Master'
            AND (
                NEW.master_id = auth.uid()
                OR NEW.escritorio_id IN (
                    SELECT id FROM public.users 
                    WHERE master_id = auth.uid()
                )
                OR NEW.assessor_id IN (
                    SELECT id FROM public.users 
                    WHERE master_id = auth.uid() 
                    OR escritorio_id IN (
                        SELECT id FROM public.users 
                        WHERE master_id = auth.uid()
                    )
                )
            )
        )
    );

CREATE POLICY "Escritorio users can insert office investments" ON public.investments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Escritório'
            AND (
                NEW.escritorio_id = auth.uid()
                OR NEW.assessor_id IN (
                    SELECT id FROM public.users 
                    WHERE escritorio_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Assessor users can insert own investments" ON public.investments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Assessor'
            AND NEW.assessor_id = auth.uid()
        )
    );

-- UPDATE policies (same as INSERT but for updates)
CREATE POLICY "Global users can update investments" ON public.investments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Global'
        )
    );

CREATE POLICY "Master users can update network investments" ON public.investments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Master'
            AND (
                investments.master_id = auth.uid()
                OR investments.escritorio_id IN (
                    SELECT id FROM public.users 
                    WHERE master_id = auth.uid()
                )
                OR investments.assessor_id IN (
                    SELECT id FROM public.users 
                    WHERE master_id = auth.uid() 
                    OR escritorio_id IN (
                        SELECT id FROM public.users 
                        WHERE master_id = auth.uid()
                    )
                )
            )
        )
    );

CREATE POLICY "Escritorio users can update office investments" ON public.investments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Escritório'
            AND (
                investments.escritorio_id = auth.uid()
                OR investments.assessor_id IN (
                    SELECT id FROM public.users 
                    WHERE escritorio_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Assessor users can update own investments" ON public.investments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Assessor'
            AND investments.assessor_id = auth.uid()
        )
    );

-- DELETE policies (only Global and Master users can delete)
CREATE POLICY "Global users can delete investments" ON public.investments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Global'
        )
    );

CREATE POLICY "Master users can delete network investments" ON public.investments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'Master'
            AND (
                investments.master_id = auth.uid()
                OR investments.escritorio_id IN (
                    SELECT id FROM public.users 
                    WHERE master_id = auth.uid()
                )
                OR investments.assessor_id IN (
                    SELECT id FROM public.users 
                    WHERE master_id = auth.uid() 
                    OR escritorio_id IN (
                        SELECT id FROM public.users 
                        WHERE master_id = auth.uid()
                    )
                )
            )
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.investments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.investments_id_seq TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.investments IS 'Investment records with hierarchical user relationships and commission splits';
COMMENT ON COLUMN public.investments.id IS 'Auto-generated investment ID';
COMMENT ON COLUMN public.investments.debenture_id IS 'Reference to the debenture being invested in';
COMMENT ON COLUMN public.investments.series_id IS 'Reference to the specific series of the debenture';
COMMENT ON COLUMN public.investments.investor_id IS 'The user making the investment';
COMMENT ON COLUMN public.investments.assessor_id IS 'The assessor handling this investment';
COMMENT ON COLUMN public.investments.escritorio_id IS 'The office (escritório) associated with this investment';
COMMENT ON COLUMN public.investments.master_id IS 'The master user in the hierarchy for this investment';
COMMENT ON COLUMN public.investments.investment_amount IS 'Amount being invested in BRL';
COMMENT ON COLUMN public.investments.investment_date IS 'Date when the investment was made';
COMMENT ON COLUMN public.investments.maturity_date IS 'Date when the investment matures';
COMMENT ON COLUMN public.investments.assessor_commission_percentage IS 'Percentage of commission for the assessor (0-100)';
COMMENT ON COLUMN public.investments.escritorio_commission_percentage IS 'Percentage of commission for the office (0-100)';
COMMENT ON COLUMN public.investments.master_commission_percentage IS 'Percentage of commission for the master (0-100)';
COMMENT ON COLUMN public.investments.status IS 'Current status of the investment (active, matured, cancelled)';

