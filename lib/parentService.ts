import { createAdminClient } from '@/lib/supabase/admin'

export async function ensureParentAccount({
  schoolId,
  email,
  fullName,
}: {
  schoolId: string
  email: string
  fullName: string
}) {
  const cleanEmail = email.trim().toLowerCase()
  const cleanName = fullName.trim()

  if (!cleanEmail || !cleanName) return null

  const admin = createAdminClient()

  // 1. Check if user profile already exists by email
  const { data: existingUser } = await admin
    .from('users')
    .select('id, full_name, email, school_id')
    .eq('email', cleanEmail)
    .maybeSingle()

  if (existingUser) {
    // Parent profile already exists — preserve existing school_id to avoid multi-school collision
    if (!existingUser.full_name || existingUser.full_name !== cleanName) {
      await admin.from('users').update({ full_name: cleanName }).eq('id', existingUser.id)
    }
    return { id: existingUser.id, email: cleanEmail, full_name: cleanName }
  }

  // 2. Try creating auth user
  let uid: string | null = null
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password: 'parent1122',
    email_confirm: true,
    user_metadata: { is_default_password: true },
  })

  if (authErr) {
    // If user already registered in Supabase auth, find their uid
    const { data: { users: authUsers } } = await admin.auth.admin.listUsers()
    const foundAuth = authUsers.find(u => u.email?.toLowerCase() === cleanEmail)
    if (foundAuth) {
      uid = foundAuth.id
    } else {
      console.error('Error creating parent auth user:', authErr.message)
      return null
    }
  } else {
    uid = authData.user.id
  }

  if (!uid) return null

  // 3. Create or preserve record in users table without overwriting school_id
  const { data: profileCheck } = await admin
    .from('users')
    .select('id, school_id')
    .eq('id', uid)
    .maybeSingle()

  if (!profileCheck) {
    const { error: userErr } = await admin.from('users').insert({
      id: uid,
      school_id: schoolId,
      full_name: cleanName,
      email: cleanEmail,
      role: 'parent',
    })

    if (userErr) {
      console.error('Error creating parent user profile:', userErr.message)
      return null
    }
  } else if (!profileCheck.school_id) {
    await admin.from('users').update({ school_id: schoolId }).eq('id', uid)
  }

  return { id: uid, email: cleanEmail, full_name: cleanName }
}
