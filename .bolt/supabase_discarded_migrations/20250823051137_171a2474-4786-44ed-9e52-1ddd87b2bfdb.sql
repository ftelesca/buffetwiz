-- Update the handle_new_user function to check domain instead of specific emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the email is from the allowed domain
  IF NEW.email NOT LIKE '%@telesca.com.br' THEN
    RAISE EXCEPTION 'Email % is not authorized to access this system. Only telesca.com.br domain emails are allowed.', NEW.email;
  END IF;
  
  -- Create profile for the new user
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  RETURN NEW;
END;
$function$