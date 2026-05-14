
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add subscription columns to the schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 2. Update RLS (Row Level Security)
-- This ensures only authenticated admins/principals can see the billing info for their own school
CREATE POLICY "Admins can view their school's billing info" 
ON schools 
FOR SELECT 
USING (
  id IN (
    SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'principal')
  )
);

-- 3. Verify the changes
SELECT id, name, plan, stripe_customer_id FROM schools LIMIT 5;
