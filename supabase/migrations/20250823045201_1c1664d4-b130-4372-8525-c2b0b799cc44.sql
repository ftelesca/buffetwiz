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

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Create allowed emails table
CREATE TABLE public.allowed_emails (
  email text PRIMARY KEY,
  full_name text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on allowed emails
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- Insert allowed emails
INSERT INTO public.allowed_emails (email, full_name) VALUES
  ('fernando@telesca.com.br', 'Fernando'),
  ('luciana@telesca.com.br', 'Luciana');

-- Create policy for allowed emails (only authenticated users can view)
CREATE POLICY "Authenticated users can view allowed emails" ON public.allowed_emails
  FOR SELECT TO authenticated USING (true);

-- Function to handle new user registration with email validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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