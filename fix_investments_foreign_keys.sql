-- Fix foreign key references in investments table
-- Change from auth.users to public.users to match the application structure

-- Drop existing foreign key constraints
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_investor_id_fkey;
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_assessor_id_fkey;
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_escritorio_id_fkey;
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_master_id_fkey;
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_created_by_fkey;
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_updated_by_fkey;

-- Add correct foreign key constraints referencing public.users
ALTER TABLE public.investments ADD CONSTRAINT investments_investor_id_fkey 
    FOREIGN KEY (investor_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.investments ADD CONSTRAINT investments_assessor_id_fkey 
    FOREIGN KEY (assessor_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.investments ADD CONSTRAINT investments_escritorio_id_fkey 
    FOREIGN KEY (escritorio_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.investments ADD CONSTRAINT investments_master_id_fkey 
    FOREIGN KEY (master_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.investments ADD CONSTRAINT investments_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.investments ADD CONSTRAINT investments_updated_by_fkey 
    FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Add comment explaining the fix
COMMENT ON TABLE public.investments IS 'Investment records with hierarchical user relationships and commission splits - Fixed to reference public.users instead of auth.users';

