
'use client'

import React from 'react'
import { PlanType, canAccess, PlanFeatures } from '@/lib/plans'
import { Lock } from 'lucide-react'

interface PlanGateProps {
  currentPlan: PlanType
  feature: keyof PlanFeatures
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function PlanGate({ 
  currentPlan, 
  feature, 
  children, 
  fallback 
}: PlanGateProps) {
  const hasAccess = canAccess(currentPlan, feature)

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  // Default locked state UI
  return (
    <div style={{ 
      position: 'relative', 
      opacity: 0.6, 
      cursor: 'not-allowed',
      pointerEvents: 'none',
      userSelect: 'none'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        background: 'white',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: '#4f46e5',
        fontWeight: 600,
        fontSize: '0.875rem',
        border: '1px solid #e2e8f0'
      }}>
        <Lock size={16} />
        {currentPlan === 'free' ? 'Basic Feature' : currentPlan === 'basic' ? 'Pro Feature' : 'Upgrade Required'}
      </div>
      {children}
    </div>
  )
}
