import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Authorization check using our Super Admin Key
function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-super-admin-key')
    ?? new URL(req.url).searchParams.get('key')
  
  return secret === process.env.NEXT_PUBLIC_SUPER_ADMIN_KEY
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const schoolId = params.id
  const admin = createAdminClient()

  try {
    // 1. Delete data in correct order to respect potential foreign keys
    // Updated list includes portal_sessions and portal_users which were missing
    const tables = [
      'portal_sessions',        // Delete sessions first
      'portal_users',           // Then portal users
      'notification_logs',
      'notification_templates',
      'leave_balance',
      'leave_applications',
      'leave_types',
      'marks',
      'subjects',
      'exams',
      'attendance',
      'fees',
      'students',
      'classes',
      'teachers',
    ]

    for (const table of tables) {
      // Use .delete() with .eq('school_id', schoolId)
      // Note: portal_sessions doesn't have school_id in some versions, 
      // but let's try to delete it via school_id if it exists, 
      // or handle cases where it might fail.
      const { error } = await admin.from(table).delete().eq('school_id', schoolId)
      if (error) {
        console.warn(`Warning: Could not delete from ${table} via school_id:`, error.message)
      }
    }

    // 2. Get all users associated with this school
    const { data: users, error: fetchError } = await admin
      .from('users')
      .select('id')
      .eq('school_id', schoolId)

    if (fetchError) throw fetchError

    // 3. Delete Supabase Auth accounts
    if (users && users.length > 0) {
      for (const user of users) {
        await admin.auth.admin.deleteUser(user.id)
      }
    }

    // 4. Delete user profiles
    await admin.from('users').delete().eq('school_id', schoolId)

    // 5. Finally, delete the school itself
    const { error: schoolDeleteError } = await admin.from('schools').delete().eq('id', schoolId)
    if (schoolDeleteError) throw schoolDeleteError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('School Deletion Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const schoolId = params.id
  const admin = createAdminClient()
  const body = await req.json()

  try {
    const { name, address, plan } = body
    
    const { error } = await admin
      .from('schools')
      .update({ 
        name, 
        address, 
        plan: plan?.toLowerCase() 
      })
      .eq('id', schoolId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('School Update Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
