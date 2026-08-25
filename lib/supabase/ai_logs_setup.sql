-- Run this in Supabase Dashboard → SQL Editor

-- 1. Create ai_action_logs table
CREATE TABLE IF NOT EXISTS ai_action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  action_name TEXT NOT NULL,
  parameters JSONB,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index for fast querying by school and date
CREATE INDEX IF NOT EXISTS idx_ai_action_logs_school_id ON ai_action_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_logs_created_at ON ai_action_logs(created_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Principals can view their school AI action logs" 
ON ai_action_logs 
FOR SELECT 
USING (
  school_id IN (
    SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'principal')
  )
);

-- 4. Verify table creation
SELECT * FROM ai_action_logs LIMIT 5;
