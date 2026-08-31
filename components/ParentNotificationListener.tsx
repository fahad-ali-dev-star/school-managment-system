'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, X, AlertTriangle, CheckCircle, Info, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface NotificationItem {
  id: string
  title?: string
  message: string
  type: string
  created_at: string
}

export default function ParentNotificationListener({
  userEmail,
}: {
  userEmail?: string
}) {
  const [activePopup, setActivePopup] = useState<NotificationItem | null>(null)

  useEffect(() => {
    if (!userEmail) return

    const supabase = createClient()
    const cleanEmail = userEmail.trim().toLowerCase()

    // Listen to new notification_logs inserts for this parent
    const channel = supabase
      .channel(`parent-notifications-${cleanEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs',
          filter: `recipient=ilike.${cleanEmail}`,
        },
        (payload) => {
          const newAlert = payload.new as any
          if (newAlert) {
            const item: NotificationItem = {
              id: newAlert.id,
              type: newAlert.type || 'announcement',
              message: newAlert.message || 'You have a new school notification.',
              created_at: newAlert.created_at || new Date().toISOString(),
            }
            setActivePopup(item)

            // Auto-dismiss popup after 8 seconds
            setTimeout(() => {
              setActivePopup((curr) => (curr?.id === item.id ? null : curr))
            }, 8000)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userEmail])

  if (!activePopup) return null

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'attendance':
      case 'absence':
        return <AlertTriangle size={20} color="#dc2626" />
      case 'fee':
        return <AlertTriangle size={20} color="#d97706" />
      case 'exam':
        return <Calendar size={20} color="#7c3aed" />
      default:
        return <Bell size={20} color="#2563eb" />
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          right: '1rem',
          maxWidth: '480px',
          margin: '0 auto',
          zIndex: 99999,
          cursor: 'pointer',
        }}
        onClick={() => {
          window.location.href = '/parent/alerts'
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '0.6rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {getIcon(activePopup.type)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2px',
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  textTransform: 'capitalize',
                }}
              >
                School Alert ({activePopup.type})
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Just now</span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '0.82rem',
                color: '#334155',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {activePopup.message}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setActivePopup(null)
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
