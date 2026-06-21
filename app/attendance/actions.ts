'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateDashboard() {
  revalidatePath('/dashboard')
  revalidatePath('/teacher')
}
