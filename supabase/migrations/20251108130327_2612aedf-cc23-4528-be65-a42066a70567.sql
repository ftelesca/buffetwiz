-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_endpoint 
ON public.api_rate_limits(user_id, endpoint, window_start);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only see their own rate limit records
CREATE POLICY "Users can view their own rate limits"
ON public.api_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all rate limits (for edge functions)
CREATE POLICY "Service role can manage all rate limits"
ON public.api_rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to clean up old rate limit entries (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.api_rate_limits 
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_rate_limits_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_api_rate_limits_updated_at
BEFORE UPDATE ON public.api_rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_rate_limits_updated_at();