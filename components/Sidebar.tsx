'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from '@/types'
import { Lock } from 'lucide-react'
import PlanGate from './PlanGate'
import { PlanType, canAccess } from '@/lib/plans'

export interface NavItem {
  href: string
  label: string
  icon: string
}

const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard',     label: 'Dashboard',     icon: '◻' },
  { href: '/classes',       label: 'Classes',        icon: '🏫' },
  { href: '/teachers',      label: 'Teachers',       icon: '👨‍🏫' },
  { href: '/parents',       label: 'Parents',        icon: '👨‍👩‍👧' },
  { href: '/students',      label: 'Students',       icon: '👨‍🎓' },
  { href: '/attendance',    label: 'Attendance',     icon: '✅' },
  { href: '/fees',          label: 'Fees',           icon: '💰' },
  { href: '/exams',         label: 'Exams',          icon: '📝' },
  { href: '/report-cards',  label: 'Report Cards',   icon: '📄' },
  { href: '/leaves',        label: 'Leaves',         icon: '🏖️' },
  { href: '/notifications', label: 'Alerts',         icon: '📱' },
  { href: '/analytics',     label: 'Analytics',      icon: '📊' },
  { href: '/dashboard/settings', label: 'Settings',   icon: '⚙️' },
]

const TEACHER_NAV: NavItem[] = [
  { href: '/teacher',              label: 'Dashboard',     icon: '◻' },
  { href: '/teacher/attendance',   label: 'Attendance',    icon: '✅' },
  { href: '/teacher/exams',        label: 'Exams & Marks', icon: '📝' },
  { href: '/teacher/report-cards', label: 'Report Cards',  icon: '📄' },
  { href: '/teacher/fees',         label: 'Fees',          icon: '💰' },
  { href: '/teacher/account',      label: 'My Account',    icon: '🔑' },
]

const PARENT_NAV: NavItem[] = [
  { href: '/parent',              label: 'Dashboard',     icon: '◻' },
  { href: '/parent/report-cards', label: 'Report Cards',  icon: '📄' },
  { href: '/parent/attendance',   label: 'Attendance',    icon: '✅' },
  { href: '/parent/fees',         label: 'Fees',          icon: '💰' },
  { href: '/parent/account',      label: 'My Account',    icon: '🔑' },
]

export function navForRole(role: string): NavItem[] {
  if (role === 'teacher') return TEACHER_NAV
  if (role === 'parent')  return PARENT_NAV
  return ADMIN_NAV
}

const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
  principal: { bg: '#eef2ff', color: '#4338ca' },
  teacher:   { bg: '#f0fdf4', color: '#15803d' },
  admin:     { bg: '#fff7ed', color: '#c2410c' },
  parent:    { bg: '#fdf4ff', color: '#7e22ce' },
}

export default function Sidebar({ user, navItems }: { user: AuthUser; navItems?: NavItem[] }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [open, setOpen]               = useState(false)
  const [clickedHref, setClickedHref] = useState<string | null>(null)

  const nav = navItems ?? navForRole(user.role)
  const initials = user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const rc = ROLE_COLOR[user.role] ?? ROLE_COLOR.admin
  const currentPlan = (user.plan?.toLowerCase() || 'free') as PlanType

  // Close drawer and reset clicked highlight on route change
  useEffect(() => {
    setOpen(false)
    setClickedHref(null)
  }, [pathname])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const sidebarContent = (
    <aside style={{
      width: 240, height: '100%',
      background: 'white', borderRight: '1px solid #e2e8f0',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {/* Brand */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: '#4f46e5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{user.school_name}</p>
              <span style={{ 
                fontSize: 9, 
                fontWeight: 700, 
                padding: '1px 5px', 
                borderRadius: 4, 
                textTransform: 'uppercase',
                background: currentPlan === 'pro' ? '#f5f3ff' : currentPlan === 'basic' ? '#ecfdf5' : '#f1f5f9',
                color: currentPlan === 'pro' ? '#4f46e5' : currentPlan === 'basic' ? '#10b981' : '#64748b',
                border: `1px solid ${currentPlan === 'pro' ? '#ddd6fe' : currentPlan === 'basic' ? '#a7f3d0' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                {currentPlan}
                <button 
                  onClick={() => router.refresh()} 
                  title="Sync Plan Status"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    padding: 0, 
                    cursor: 'pointer', 
                    fontSize: 10,
                    opacity: 0.6,
                    color: 'inherit',
                    display: 'flex'
                  }}
                >
                  🔄
                </button>
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>School ERP</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem' }}>
        {nav.map(item => {
          const active    = clickedHref
            ? (clickedHref === item.href)
            : (pathname === item.href || pathname.startsWith(item.href + '/'))

          // Determine if this item needs gating
          let gatedFeature: any = null
          if (item.href === '/exams') gatedFeature = 'hasExams'
          if (item.href === '/report-cards') gatedFeature = 'hasExams'
          if (item.href === '/parents' || item.href.startsWith('/parent')) gatedFeature = 'hasParentPortal'
          if (item.href === '/attendance') gatedFeature = 'hasAttendance'
          if (item.href === '/fees') gatedFeature = 'hasFees'
          if (item.href === '/leaves') gatedFeature = 'hasLeaves'
          if (item.href === '/notifications') gatedFeature = 'hasAlerts'
          if (item.href === '/analytics') gatedFeature = 'hasAnalytics'

          if (gatedFeature && !canAccess(currentPlan, gatedFeature)) {
            return null
          }

          const isGated = gatedFeature && !canAccess(currentPlan, gatedFeature)

          const linkStyle: React.CSSProperties = {
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '9px 12px', borderRadius: 8, marginBottom: 2,
            background: active ? '#eef2ff' : 'transparent',
            color: active ? '#4f46e5' : '#475569',
            fontWeight: active ? 600 : 400,
            fontSize: 14, border: 'none', cursor: isGated ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'background 0.15s',
            justifyContent: 'space-between',
            textDecoration: 'none',
            boxSizing: 'border-box',
            opacity: isGated ? 0.6 : 1
          }

          const buttonContent = (
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </span>
          )

          if (isGated) {
            return (
              <button key={item.href} disabled style={linkStyle}>
                {buttonContent}
                <Lock size={12} style={{ color: '#94a3b8' }} />
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              style={linkStyle}
              onClick={() => {
                if (pathname === item.href) {
                  return
                }
                setClickedHref(item.href)
                setOpen(false)
              }}
            >
              {buttonContent}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: 10, borderRadius: 8, background: '#f8fafc', marginBottom: 8,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#4f46e5',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, flexShrink: 0,
          }}>{initials}</div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.full_name}
            </p>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px',
              borderRadius: 4, textTransform: 'capitalize',
              background: rc.bg, color: rc.color,
            }}>{user.role}</span>
          </div>
        </div>
        <button onClick={logout} style={{
          width: '100%', padding: 8, border: '1px solid #e2e8f0',
          borderRadius: 8, background: 'transparent', cursor: 'pointer',
          fontSize: 13, color: '#64748b', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          ← Sign out
        </button>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </aside>
  )

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <div style={{
        width: 240, flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
        display: 'none',
      }} className="sidebar-desktop">
        {sidebarContent}
      </div>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="sidebar-hamburger"
        style={{
          position: 'fixed', top: 12, left: 12, zIndex: 200,
          width: 40, height: 40, borderRadius: 10, background: '#4f46e5',
          border: 'none', cursor: 'pointer', display: 'none',
          alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 5,
        }}
        aria-label="Toggle menu"
      >
        <span style={{ width: 18, height: 2, background: 'white', borderRadius: 2, display: 'block' }}/>
        <span style={{ width: 18, height: 2, background: 'white', borderRadius: 2, display: 'block' }}/>
        <span style={{ width: 18, height: 2, background: 'white', borderRadius: 2, display: 'block' }}/>
      </button>

      {/* Mobile: overlay drawer */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(15,23,42,0.5)' }}
          onClick={() => setOpen(false)}
        />
      )}
      <div style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 195,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
      }} className="sidebar-mobile-drawer">
        {sidebarContent}
      </div>

      {clickedHref && clickedHref !== pathname && (
        <div className="main-loading-overlay">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="loading-spinner-circle" />
            <span className="loading-spinner-text">
              Loading page...
            </span>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 769px) {
          .sidebar-desktop { display: block !important; }
          .sidebar-hamburger { display: none !important; }
          .sidebar-mobile-drawer { display: none !important; }
        }
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-hamburger { display: flex !important; }
          .sidebar-mobile-drawer { display: block !important; }
        }

        .main-loading-overlay {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          background: rgba(248, 250, 252, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease-out;
        }
        @media (min-width: 769px) {
          .main-loading-overlay {
            left: 240px;
          }
        }
        @media (max-width: 768px) {
          .main-loading-overlay {
            left: 0;
          }
        }
        .loading-spinner-circle {
          width: 48px;
          height: 48px;
          border: 3.5px solid #e2e8f0;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin-custom 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .loading-spinner-text {
          font-size: 13.5px;
          font-weight: 600;
          color: #475569;
          animation: pulse-text 1.5s ease-in-out infinite;
          letter-spacing: 0.03em;
          font-family: inherit;
        }
        @keyframes spin-custom {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 0.6; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}
