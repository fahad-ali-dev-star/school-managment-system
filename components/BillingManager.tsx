
'use client'

import { useState } from 'react'
import { CreditCard, Check, Zap } from 'lucide-react'

interface BillingProps {
  schoolId: string
  currentPlan?: string
}

export default function BillingManager({ schoolId, currentPlan = 'free' }: BillingProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpgrade = async (priceId: string, planName: string) => {
    setLoading(planName)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, schoolId })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Error: ' + data.error)
      }
    } catch (err) {
      alert('Failed to initiate checkout')
    } finally {
      setLoading(null)
    }
  }

  const handleManageBilling = async () => {
    setLoading('manage')
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to open billing portal')
      }
    } catch (err) {
      alert('Error opening billing portal')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="billing-section" style={{ padding: '2rem', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ padding: '0.5rem', background: '#f5f3ff', color: '#4f46e5', borderRadius: '10px' }}>
          <CreditCard size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Subscription & Billing</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Manage your school's plan and invoices</p>
        </div>
        {currentPlan !== 'free' && (
          <button 
            onClick={handleManageBilling}
            disabled={loading === 'manage'}
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              background: 'white', 
              fontSize: '0.875rem', 
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {loading === 'manage' ? 'Loading...' : 'Manage Billing'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* Basic Plan */}
        <PlanCard 
          name="Basic"
          price="$49"
          isActive={currentPlan.toLowerCase() === 'basic'}
          features={['Up to 200 Students', 'Smart Attendance', 'Fee Management', 'Class Management']}
          onUpgrade={() => handleUpgrade('price_1TWIMdBlPZJKU93IE7uwcvjS', 'Basic')}
          loading={loading === 'Basic'}
        />

        {/* Pro Plan */}
        <PlanCard 
          name="Professional"
          price="$99"
          isActive={currentPlan.toLowerCase() === 'pro'}
          isPopular={true}
          features={['Unlimited Students', 'Digital Exams', 'Report Cards', 'SMS Alerts', 'Advanced Analytics']}
          onUpgrade={() => handleUpgrade('price_1TWIMeBlPZJKU93IcCdkMgPt', 'Professional')}
          loading={loading === 'Professional'}
        />

      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Zap size={16} style={{ color: '#d97706' }} />
        Secure payments powered by Stripe. You can cancel your subscription at any time.
      </div>
    </div>
  )
}

function PlanCard({ name, price, features, isActive, onUpgrade, loading, isPopular = false }: any) {
  return (
    <div style={{ 
      padding: '1.5rem', 
      borderRadius: '16px', 
      border: isActive ? '2px solid #4f46e5' : '1px solid #e2e8f0',
      background: isActive ? '#f5f3ff' : 'white',
      position: 'relative'
    }}>
      {isPopular && <span style={{ position: 'absolute', top: '-12px', right: '20px', background: '#4f46e5', color: 'white', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>Most Popular</span>}
      
      <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>{name}</h3>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '1rem 0' }}>{price}<span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#64748b' }}>/mo</span></div>
      
      <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0', fontSize: '0.875rem' }}>
        {features.map((f: string, i: number) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#475569' }}>
            <Check size={16} style={{ color: '#10b981' }} /> {f}
          </li>
        ))}
      </ul>

      <button 
        onClick={onUpgrade}
        disabled={isActive || loading}
        style={{ 
          width: '100%', 
          padding: '0.75rem', 
          borderRadius: '10px', 
          border: 'none',
          background: isActive ? '#10b981' : '#4f46e5',
          color: 'white',
          fontWeight: 600,
          cursor: isActive ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Processing...' : isActive ? 'Current Plan' : `Upgrade to ${name}`}
      </button>
    </div>
  )
}
