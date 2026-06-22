const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const envFile = fs.readFileSync('.env.local', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [k, ...rest] = line.split('=')
  const v = rest.join('=')
  if (k && v) env[k.trim()] = v.trim().replace(/^"|"$/g, '')
})

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

async function test() {
  const { data: schools } = await supabase.from('schools').select('id').limit(1)
  if (!schools || schools.length === 0) return console.log('no schools')
  
  const school_id = schools[0].id
  
  const { data: students } = await supabase.from('students').select('id').eq('school_id', school_id).limit(1)
  if (!students || students.length === 0) return console.log('no students')
  
  const student_id = students[0].id

  const { data: users } = await supabase.from('users').select('id').eq('school_id', school_id).limit(1)
  const teacher_id = users?.[0]?.id || '00000000-0000-0000-0000-000000000000'

  const date = new Date().toISOString().split('T')[0]

  console.log('Testing with student_id:', student_id)

  console.log('1. Upserting with school_id,student_id,date ...')
  const res1 = await supabase.from('attendance').upsert({
    school_id, student_id, teacher_id, date, status: 'present'
  }, { onConflict: 'school_id,student_id,date' })
  
  console.log('Result 1:', res1.error ? res1.error.message : 'Success')

  console.log('2. Upserting with student_id,date ...')
  const res2 = await supabase.from('attendance').upsert({
    school_id, student_id, teacher_id, date, status: 'present'
  }, { onConflict: 'student_id,date' })
  
  console.log('Result 2:', res2.error ? res2.error.message : 'Success')
  
  console.log('3. Upserting without onConflict ...')
  const res3 = await supabase.from('attendance').upsert({
    school_id, student_id, teacher_id, date, status: 'present'
  })
  
  console.log('Result 3:', res3.error ? res3.error.message : 'Success')
}

test()
