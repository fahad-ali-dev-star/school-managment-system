'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from '@/types'

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
  const [loadingHref, setLoadingHref] = useState<string | null>(null)
  const [, startTransition]           = useTransition()
  const [open, setOpen]               = useState(false)

  const nav = navItems ?? navForRole(user.role)
  const initials = user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const rc = ROLE_COLOR[user.role] ?? ROLE_COLOR.admin

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function handleNavClick(href: string) {
    if (href === pathname) return
    setLoadingHref(href)
    startTransition(() => { router.push(href) })
    setTimeout(() => setLoadingHref(null), 3000)
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
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{user.school_name}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>School ERP</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem' }}>
        {nav.map(item => {
          const active    = pathname === item.href || pathname.startsWith(item.href + '/')
          const isLoading = loadingHref === item.href
          return (
            <button key={item.href} onClick={() => handleNavClick(item.href)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              background: active ? '#eef2ff' : 'transparent',
              color: active ? '#4f46e5' : '#475569',
              fontWeight: active ? 600 : 400,
              fontSize: 14, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s',
              justifyContent: 'space-between',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </span>
              {isLoading && (
                <span style={{
                  width: 14, height: 14, border: '2px solid #e2e8f0',
                  borderTop: '2px solid #4f46e5', borderRadius: '50%',
                  display: 'inline-block', flexShrink: 0,
                  animation: 'spin 0.7s linear infinite',
                }}/>
              )}
            </button>
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
      `}</style>
    </>
  )
}
