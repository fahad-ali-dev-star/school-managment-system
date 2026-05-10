import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Authorization check using our Super Admin Key (consistent with DELETE route)
function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-super-admin-key')
    ?? new URL(req.url).searchParams.get('key')
  return secret === process.env.NEXT_PUBLIC_SUPER_ADMIN_KEY
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = createAdminClient()

  // Fetch schools with counts
  const { data: schools, error } = await supabase
    .from('schools')
    .select(`
      *,
      users(count),
      students(count)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const formatted = schools.map(s => ({
    ...s,
    user_count: s.users?.[0]?.count ?? 0,
    student_count: s.students?.[0]?.count ?? 0
  }))

  return NextResponse.json(formatted)
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const body = await req.json()

  // Support both camelCase and snake_case
  const school_name = body.name || body.school_name
  const school_address = body.address || body.school_address
  const school_phone = body.phone || body.school_phone
  const principal_name = body.principalName || body.principal_name
  const principal_email = body.email || body.principal_email
  const principal_password = body.password || body.principal_password

  if (!school_name || !principal_email || !principal_password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // 0. Check if user already exists in Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError
    
    const existingUser = users.find(u => u.email?.toLowerCase() === principal_email.toLowerCase())
    if (existingUser) {
      return NextResponse.json({ 
        error: `A user with email ${principal_email} already exists. Please use a different email.` 
      }, { status: 400 })
    }

    // 1. Create School
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert([{ name: school_name, address: school_address, phone: school_phone }])
      .select()
      .single()

    if (schoolError) throw schoolError
    const schoolId = school.id

    let authUserId: string | null = null

    try {
      // 2. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: principal_email,
        password: principal_password,
        email_confirm: true,
        user_metadata: { full_name: principal_name }
      })

      if (authError) throw authError
      authUserId = authData.user.id

      // 3. Create User Profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authUserId,
          school_id: schoolId,
          full_name: principal_name,
          email: principal_email,
          role: 'principal'
        }])

      if (profileError) throw profileError

      // 4. Seed Leave Types
      await supabase.from('leave_types').insert([
        { school_id: schoolId, name: 'Sick Leave', max_days: 10, color: '#dc2626', description: 'Medical illness' },
        { school_id: schoolId, name: 'Casual Leave', max_days: 6, color: '#d97706', description: 'Personal reasons' },
        { school_id: schoolId, name: 'Emergency Leave', max_days: 3, color: '#7c3aed', description: 'Family emergency' },
        { school_id: schoolId, name: 'Study Leave', max_days: 5, color: '#0284c7', description: 'Exam preparation' }
      ])

      // 5. Seed Notification Templates
      await supabase.from('notification_templates').insert([
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
          message: 'Dear {{parent_name}}, fee payment for {{student_name}} ({{class_name}}) is pending. Please clear dues to avoid any issues. - {{school_name}}',
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

      return NextResponse.json({ success: true, schoolId })
    } catch (innerErr: any) {
      // ROLLBACK: Delete the school if user creation failed
      await supabase.from('schools').delete().eq('id', schoolId)
      if (authUserId) {
        await supabase.auth.admin.deleteUser(authUserId)
      }
      throw innerErr
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

}
