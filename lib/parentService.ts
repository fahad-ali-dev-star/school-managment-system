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

  // 1. Check if user already exists in users table for this school
  const { data: existingUser } = await admin
    .from('users')
    .select('id, full_name, email')
    .eq('school_id', schoolId)
    .eq('email', cleanEmail)
    .maybeSingle()

  if (existingUser) {
    if (existingUser.full_name !== cleanName) {
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

  // 3. Upsert record into users table
  const { error: userErr } = await admin.from('users').upsert({
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

  return { id: uid, email: cleanEmail, full_name: cleanName }
}
