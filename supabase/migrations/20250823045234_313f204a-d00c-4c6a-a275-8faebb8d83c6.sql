-- Fix function security by setting search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_email_record record;
BEGIN
  -- Check if the email is in our allowed list
  SELECT * INTO allowed_email_record 
  FROM public.allowed_emails 
  WHERE email = NEW.email;
  
  IF allowed_email_record IS NULL THEN
    RAISE EXCEPTION 'Email % is not authorized to access this system', NEW.email;
  END IF;
  
  -- Create profile for the new user
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', allowed_email_record.full_name),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  RETURN NEW;
END;
$$;

-- Fix update function security by setting search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;