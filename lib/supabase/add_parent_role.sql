-- Run this in Supabase Dashboard → SQL Editor
-- Add 'parent' to the users role enum (if using an enum type),
-- or if role is a text column, no change is needed.

-- Check your current role column type:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role';

-- If role is a text/varchar column (most common), just run:
-- (No change needed — 'parent' will be inserted as a string)

-- If role is a Postgres ENUM type, run:
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';

-- Verify the users table has the right structure:
SELECT id, email, role FROM users LIMIT 5;
