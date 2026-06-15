import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Simple env parser for .env.local to avoid extra dependencies
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local')
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf8')
  const env = {}
  content.split('\n').forEach(line => {
    // Handle comments and empty lines
    if (!line || line.startsWith('#')) return
    const [key, ...value] = line.split('=')
    if (key && value) {
      env[key.trim()] = value.join('=').trim()
    }
  })
  return env
}

const env = loadEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

async function main() {
  console.log('\n=======================================')
  console.log('   Beacon ERP - School Onboarding      ')
  console.log('=======================================\n')
  
  const schoolName = await question('School Name: ')
  const address    = await question('Address: ')
  const phone      = await question('Phone: ')
  const adminName  = await question('Principal/Admin Name: ')
  const adminEmail = await question('Admin Email: ')
  const adminPass  = await question('Admin Password (min 6 chars): ')

  if (!schoolName || !adminEmail || !adminPass) {
    console.error('\n❌ Error: School Name, Admin Email, and Admin Password are required.')
    rl.close()
    return
  }

  try {
    console.log('\n🚀 Starting onboarding sequence...')

    // 1. Create School
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert([{ name: schoolName, address, phone }])
      .select()
      .single()

    if (schoolError) throw schoolError
    const schoolId = school.id
    console.log(`✅ School created: ${schoolName} (ID: ${schoolId})`)

    // 2. Create Auth User (Service Role bypasses registration restrictions)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPass,
      email_confirm: true,
      user_metadata: { full_name: adminName }
    })

    if (authError) throw authError
    const authUserId = authData.user.id
    console.log(`✅ Auth user created: ${adminEmail} (UID: ${authUserId})`)

    // 3. Create User Profile in 'users' table
    const { error: profileError } = await supabase
      .from('users')
      .insert([{
        id: authUserId,
        school_id: schoolId,
        full_name: adminName,
        email: adminEmail,
        role: 'principal'
      }])

    if (profileError) throw profileError
    console.log('✅ Principal profile linked to school')

    // 4. Seed Leave Types
    const { error: leaveError } = await supabase
      .from('leave_types')
      .insert([
        { school_id: schoolId, name: 'Sick Leave', max_days: 10, color: '#dc2626', description: 'Medical illness' },
        { school_id: schoolId, name: 'Casual Leave', max_days: 6, color: '#d97706', description: 'Personal reasons' },
        { school_id: schoolId, name: 'Emergency Leave', max_days: 3, color: '#7c3aed', description: 'Family emergency' }
      ])

    if (leaveError) throw leaveError
    console.log('✅ Leave types seeded')

    // 5. Seed Notification Templates
    const { error: notifError } = await supabase
      .from('notification_templates')
      .insert([
        {
          school_id: schoolId,
          type: 'attendance',
          name: 'Absence Alert',
          message: 'Dear {{parent_name}}, your child {{student_name}} (Roll: {{roll_number}}, Class: {{class_name}}) was marked ABSENT on {{date}}. Contact school if needed. - {{school_name}}',
          is_active: true
        },
        {
          school_id: schoolId,
          type: 'fee',
          name: 'Fee Reminder',
          message: 'Dear {{parent_name}}, fee payment of Rs {{amount}} for {{student_name}} ({{class_name}}) is pending. Please pay by due date. - {{school_name}}',
          is_active: true
        },
        {
          school_id: schoolId,
          type: 'announcement',
          name: 'General Notice',
          message: 'Dear {{parent_name}}, {{student_name}} ({{class_name}}): {{message}} - {{school_name}}',
          is_active: true
        },
        {
          school_id: schoolId,
          type: 'exam',
          name: 'Exam Result',
          message: 'Dear {{parent_name}}, {{student_name}} scored {{percentage}}% (Grade: {{grade}}) in {{exam_title}}. Rank: {{rank}} of {{total_students}}. - {{school_name}}',
          is_active: true
        },
        {
          school_id: schoolId,
          type: 'leave',
          name: 'Leave Status',
          message: 'Dear {{parent_name}}, leave request for {{student_name}} has been {{status}}. - {{school_name}}',
          is_active: true
        }
      ])

    if (notifError) throw notifError
    console.log('✅ Notification templates seeded')

    console.log(`\n🎉 Success! "${schoolName}" is ready for use.`)
    console.log(`\nAdmin Email: ${adminEmail}`)
    console.log(`Admin Pass:  ${adminPass}`)
    console.log('\n=======================================')

  } catch (err) {
    console.error('\n❌ Onboarding Error:', err.message)
    if (err.details) console.error('Details:', err.details)
  } finally {
    rl.close()
  }
}

main()
