import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getProfile } from '@/lib/supabase/getProfile'
import type { AuthUser } from '@/types'
import PlanGate from '@/components/PlanGate'
import AIChatbot from '@/components/AIChatbot'
import { Lock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  const authUser: AuthUser = {
    id: profile.id,
    school_id: profile.school_id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role as AuthUser['role'],
    school_name: profile.school_name,
    plan: profile.plan as string
  }

  const userPlan = (profile.plan?.toLowerCase() || 'free') as any

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={authUser} />
      <main style={{ flex: 1, overflow: 'auto', background: '#f8fafc' }}>
        {children}
      </main>
      <PlanGate 
        currentPlan={userPlan} 
        feature="hasAnalytics"
        fallback={
          <button
            title="AI Chatbot (Upgrade to Pro)"
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 50,
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#9ca3af',
              border: 'none',
              cursor: 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              opacity: 0.8
            }}
          >
            <Lock size={20} />
          </button>
        }
      >
        <AIChatbot />
      </PlanGate>
    </div>
  )
}

