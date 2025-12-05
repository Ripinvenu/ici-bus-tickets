-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view their tickets by folio" ON public.boletos;

-- Create a secure SELECT policy that allows:
-- 1. Authenticated users to view their own tickets (by user_id)
-- 2. Anyone to view tickets by matching email (for guest purchases)
-- 3. Admins to view all tickets
CREATE POLICY "Users can view own tickets" 
ON public.boletos 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR is_admin()
);

-- Create a separate policy for searching tickets by folio (for guest lookup)
-- This requires knowing the exact folio, preventing mass data scraping
CREATE OR REPLACE FUNCTION public.get_boleto_by_folio(p_folio text)
RETURNS SETOF boletos
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM boletos WHERE folio = p_folio LIMIT 1;
$$;