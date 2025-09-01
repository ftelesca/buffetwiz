-- Remover políticas RLS que exigem autenticação e criar políticas públicas
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customer;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customer;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customer;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customer;

-- Criar políticas que permitem acesso público
CREATE POLICY "Anyone can view customers" 
ON public.customer 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert customers" 
ON public.customer 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update customers" 
ON public.customer 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete customers" 
ON public.customer 
FOR DELETE 
USING (true);