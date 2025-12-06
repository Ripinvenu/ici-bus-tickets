-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own tickets" ON public.boletos;

-- Create a new policy that allows anyone to view tickets by folio
CREATE POLICY "Anyone can view tickets by folio"
ON public.boletos
FOR SELECT
USING (true);