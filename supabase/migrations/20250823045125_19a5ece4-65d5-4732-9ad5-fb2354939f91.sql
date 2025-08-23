-- Create profiles table for user management
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Insert allowed users
INSERT INTO public.profiles (id, email, full_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'fernando@telesca.com.br', 'Fernando'),
  ('00000000-0000-0000-0000-000000000002', 'luciana@telesca.com.br', 'Luciana');

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Function to handle new user registration with email validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  allowed_email text;
BEGIN
  -- Check if the email is in our allowed list
  SELECT email INTO allowed_email 
  FROM public.profiles 
  WHERE email = NEW.email;
  
  IF allowed_email IS NULL THEN
    RAISE EXCEPTION 'Email % is not authorized to access this system', NEW.email;
  END IF;
  
  -- Update the profile with the user's auth ID
  UPDATE public.profiles 
  SET id = NEW.id, 
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', full_name),
      avatar_url = NEW.raw_user_meta_data->>'avatar_url',
      updated_at = now()
  WHERE email = NEW.email;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate users on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();