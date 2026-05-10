'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import './super-admin.css'

interface School {
  id: string
  name: string
  address: string
  phone: string
  created_at: string
  user_count?: number
  student_count?: number
}

export default function SuperAdminPage() {
  const searchParams = useSearchParams()
  const key = searchParams.get('key')
  const isValid = key === process.env.NEXT_PUBLIC_SUPER_ADMIN_KEY

  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState<School | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    principalName: '',
    email: '',
    password: 'School@' + new Date().getFullYear()
  })

  useEffect(() => {
    if (isValid) fetchSchools()
  }, [isValid])

  const fetchSchools = async () => {
    try {
      const res = await fetch(`/api/super-admin/schools?key=${key}`)
      const data = await res.json()
      
      // Ensure we only set schools if the data is an array
      if (Array.isArray(data)) {
        setSchools(data)
      } else {
        console.error('API Error:', data.error)
        setSchools([])
      }
    } catch (err) {
      console.error('Failed to fetch schools')
      setSchools([])
    } finally {
      setLoading(false)
    }
  }

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/schools?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const result = await res.json()
      if (res.ok) {
        alert(`School created successfully!\n\nEmail: ${formData.email}\nPassword: ${formData.password}`)
        setIsModalOpen(false)
        fetchSchools()
        setFormData({ ...formData, name: '', address: '', phone: '', email: '', principalName: '' })
      } else {
        alert('Error: ' + result.error)
      }
    } catch (err) {
      alert('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will remove all associated users and data.`)) return
    
    try {
      const res = await fetch(`/api/super-admin/schools/${id}?key=${key}`, { method: 'DELETE' })
      if (res.ok) {
        setSchools(schools.filter(s => s.id !== id))
      } else {
        const error = await res.json()
        alert('Deletion failed: ' + error.error)
      }
    } catch (err) {
      alert('Failed to delete')
    }
  }

  if (!isValid) {
    return (
      <div className="admin-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="stat-card" style={{ maxWidth: 400, textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>Unauthorized Access</h2>
          <p style={{ color: '#64748b', marginTop: 10 }}>This panel is reserved for platform administrators. Please provide a valid security key.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            <span style={{ color: '#4f46e5' }}>Beacon</span> Control Center
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Platform Multi-Tenant Management</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <span>+</span> Onboard New School
        </button>
      </header>

      <main className="admin-content">
        {/* Platform Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Schools</div>
            <div className="stat-value">{schools.length}</div>
            <div className="stat-trend" style={{ color: '#10b981' }}>
              ↑ 2 this month
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Students</div>
            <div className="stat-value">--</div>
            <div className="stat-trend" style={{ color: '#64748b' }}>
              Platform-wide aggregation
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">System Health</div>
            <div className="stat-value" style={{ color: '#10b981' }}>Optimal</div>
            <div className="stat-trend">RLS Isolation: Active</div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Provisioned Schools</h2>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Showing all active instances</span>
        </div>

        <div className="school-grid">
          {loading && schools.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading schools...</div>
          ) : (
            schools.map(school => (
              <div key={school.id} className="school-card">
                <div className="school-icon">🏫</div>
                <div className="school-info">
                  <h3>{school.name}</h3>
                  <div className="school-meta">
                    <span>📍 {school.address}</span>
                    <span>📞 {school.phone}</span>
                    <span>📅 Joined {new Date(school.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="school-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setEditingSchool(school)}
                  >
                    Manage
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(school.id, school.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
          {!loading && schools.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏗️</div>
              <h3 style={{ fontWeight: 600 }}>No schools found</h3>
              <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Start by onboarding your first client school.</p>
            </div>
          )}
        </div>
      </main>

      {/* Onboarding Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Onboard New School</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleOnboard} className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">School Name</label>
                  <input 
                    required className="form-input" placeholder="e.g. Beacon Light Grammar"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    required className="form-input" placeholder="+92-XXX-XXXXXXX"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input 
                  required className="form-input" placeholder="City, Province"
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div style={{ margin: '2rem 0 1rem', padding: '1rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: '#4f46e5' }}>Principal Account Details</h4>
                
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    required className="form-input" placeholder="Principal's Name"
                    value={formData.principalName} onChange={e => setFormData({...formData, principalName: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    required type="email" className="form-input" placeholder="principal@school.com"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input 
                    required className="form-input" 
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }} disabled={loading}>
                {loading ? 'Processing...' : 'Complete Onboarding'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage School Modal */}
      {editingSchool && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>School Management</h2>
              <button 
                onClick={() => setEditingSchool(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: 12, marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>{editingSchool.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <p style={{ color: '#64748b' }}>Total Users</p>
                    <p style={{ fontWeight: 700, fontSize: '1.25rem' }}>{editingSchool.user_count}</p>
                  </div>
                  <div>
                    <p style={{ color: '#64748b' }}>Total Students</p>
                    <p style={{ fontWeight: 700, fontSize: '1.25rem' }}>{editingSchool.student_count}</p>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Update School Name</label>
                <input className="form-input" defaultValue={editingSchool.name} />
              </div>
              <div className="form-group">
                <label className="form-label">Update Address</label>
                <input className="form-input" defaultValue={editingSchool.address} />
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => alert('Settings updated (Mockup)')}>
                  Save Changes
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => window.open(`/dashboard?school=${editingSchool.id}`, '_blank')}>
                  View Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
