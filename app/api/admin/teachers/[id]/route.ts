import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('school_id, role').eq('id', user.id).single()
  if (!profile || !['admin', 'principal'].includes(profile.role)) return null
  return { user, profile, supabase }
}

// PUT  – update teacher email (admin only) / other fields
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await assertAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { email, full_name, ...rest } = body
  const admin = createAdminClient()

  // If email changed or is being added for the first time
  if (email) {
    const newEmail = email.trim().toLowerCase()
    // Find the old email from the teachers table
    const { data: oldTeacher } = await ctx.supabase.from('teachers').select('email, full_name').eq('id', params.id).single()
    const oldEmail = oldTeacher?.email ?? ''

    // Try to find an existing user in the users table by the old email
    const { data: userRow } = await admin.from('users').select('id').eq('email', oldEmail).single()
    
    if (userRow?.id) {
      // Update existing auth user
      await admin.auth.admin.updateUserById(userRow.id, { email: newEmail })
      await admin.from('users').update({ email: newEmail, ...(full_name ? { full_name } : {}) }).eq('id', userRow.id)
    } else {
      // No auth user exists for this teacher yet! Let's create one.
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email: newEmail,
        password: 'teacher1122',
        email_confirm: true,
      })
      if (!authErr && authData?.user) {
        // Insert into users table
        await admin.from('users').insert({
          id: authData.user.id,
          school_id: ctx.profile.school_id,
          full_name: full_name || oldTeacher?.full_name || 'Teacher',
          email: newEmail,
          role: 'teacher',
        })
      }
    }
  }

  const { data, error } = await admin.from('teachers')
    .update({ ...(email ? { email: email.trim().toLowerCase() } : {}), ...(full_name ? { full_name } : {}), ...rest })
    .eq('id', params.id)
    .eq('school_id', ctx.profile.school_id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE – delete teacher auth user + profile + teacher row
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await assertAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Get email from teachers table
  const { data: teacher } = await admin.from('teachers').select('email').eq('id', params.id).single()

  // Soft-delete teacher row
  await admin.from('teachers').update({ is_active: false }).eq('id', params.id).eq('school_id', ctx.profile.school_id)

  // Delete auth user
  if (teacher?.email) {
    const { data: userRow } = await admin.from('users').select('id').eq('email', teacher.email).single()
    if (userRow?.id) {
      await admin.auth.admin.deleteUser(userRow.id)
      await admin.from('users').delete().eq('id', userRow.id)
    }
  }

  return NextResponse.json({ success: true })
}
