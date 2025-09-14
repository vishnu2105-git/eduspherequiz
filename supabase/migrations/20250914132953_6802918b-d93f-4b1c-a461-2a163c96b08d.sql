-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.generate_access_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;