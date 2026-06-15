
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  const { data: profile, error } = await supabase
    .from('users')
    .select(`
      id, 
      school_id, 
      full_name, 
      email, 
      role, 
      schools (
        name,
        plan
      )
    `)
    .eq('school_id', 'aaaaaaaa-0000-0000-0000-000000000001')
    .limit(1)
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Profile Result:', JSON.stringify(profile, null, 2))
  
  const schoolData = profile.schools
  console.log('schoolData type:', typeof schoolData)
  console.log('schoolData isArray:', Array.isArray(schoolData))
  console.log('schoolData.plan:', schoolData?.plan)
}

test()
