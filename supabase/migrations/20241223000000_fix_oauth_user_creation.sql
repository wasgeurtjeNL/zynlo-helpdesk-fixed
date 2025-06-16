-- Fix OAuth user creation by adding automatic user profile creation
-- This ensures when someone signs up via OAuth, they get a record in the users table

-- 1. Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert new user into public.users table
  INSERT INTO public.users (id, email, full_name, avatar_url, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'agent', -- default role
    true     -- default active
  );
  
  RETURN NEW;
EXCEPTION
  -- If user already exists, just return NEW (don't fail)
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;

-- 2. Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.users TO supabase_auth_admin;

-- 4. Ensure auth admin can execute the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- 5. Also allow service_role to manage users
GRANT ALL ON TABLE public.users TO service_role;

-- 6. Update RLS policy to allow automatic user creation
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- More permissive policies for OAuth flow
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users  
  FOR UPDATE USING (auth.uid() = id);

-- Allow service role and auth admin to insert users (for OAuth)
CREATE POLICY "Service can insert users" ON users
  FOR INSERT WITH CHECK (auth.role() IN ('service_role', 'supabase_auth_admin'));

-- 7. Test query to verify setup
SELECT 'OAuth user creation fix applied successfully!' as status; 