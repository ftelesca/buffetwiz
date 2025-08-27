-- Fix security vulnerability: Restrict customer data access to authenticated users only

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customer;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customer;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customer;
DROP POLICY IF EXISTS "Anyone can delete customers" ON public.customer;

-- Create secure policies that require authentication
CREATE POLICY "Authenticated users can view customers" 
ON public.customer 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert customers" 
ON public.customer 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers" 
ON public.customer 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete customers" 
ON public.customer 
FOR DELETE 
TO authenticated
USING (true);