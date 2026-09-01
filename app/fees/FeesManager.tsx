'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isOffline, queueOfflineMutation, getMergedOfflineState, generateUUID } from '@/lib/offlineSync'

interface Student {
  id: string
  full_name: string
  roll_number: string
  class_name: string
  fee_status?: string
  monthly_fee?: number
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }

function statusBadge(status: string) {
  const map: Record<string, [string, string]> = {
    paid:    ['#f0fdf4', '#16a34a'],
    pending: ['#fffbeb', '#d97706'],
    overdue: ['#fef2f2', '#dc2626'],
  }
  const [bg, color] = map[status] ?? map.pending
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize' as const }}>
      {status}
    </span>
  )
}

function typeBadge(type: string) {
  const map: Record<string, [string, string, string]> = {
    monthly:   ['#eef2ff', '#4338ca', '📅 Monthly'],
    admission: ['#fdf4ff', '#a21caf', '🎓 Admission'],
    exam:      ['#ecfeff', '#0e7490', '📝 Exam'],
    other:     ['#f1f5f9', '#475569', '🏷️ Other'],
  }
  const [bg, color, label] = map[type] ?? ['#f1f5f9', '#475569', type]
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}>
      {label}
    </span>
  )
}

export default function FeesManager({
  fees: init,
  students: initStudents,
  schoolId,
  currentMonthLabel,
}: {
  fees: any[]
  students: Student[]
  schoolId: string
  currentMonthLabel: string
}) {
  const [fees, setFees]         = useState(() => getMergedOfflineState('fees', init))
  const [students, setStudents] = useState(() => getMergedOfflineState('students', initStudents))
  const [showForm, setShowForm] = useState(false)
  const [editingFee, setEditingFee] = useState<any>(null)
  const [saving, setSaving]     = useState(false)
  
  // Tabs: 'monthly' | 'admission' | 'exam' | 'other' | 'students'
  const [activeTab, setActiveTab] = useState<'monthly' | 'admission' | 'exam' | 'other' | 'students'>('monthly')
  
  // Filters
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMonth, setFilterMonth]   = useState<string>(currentMonthLabel) // for monthly tab
  const [filterExam, setFilterExam]     = useState<string>('') // for exam tab
  
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const [form, setForm] = useState({
    student_id: '',
    amount: '',
    fee_type: 'monthly',
    month: currentMonthLabel,
    due_date: todayStr,
    paid_date: todayStr,
    status: 'paid',
    payment_method: 'cash',
    notes: '',
  })

  const supabase = createClient()

  // Distinct available months for dropdown
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>()
    monthsSet.add(currentMonthLabel)
    fees.forEach(f => {
      if (f.fee_type === 'monthly' && f.month) monthsSet.add(f.month)
    })
    return Array.from(monthsSet)
  }, [fees, currentMonthLabel])

  // Distinct exam sessions for dropdown
  const availableExams = useMemo(() => {
    const examsSet = new Set<string>()
    fees.forEach(f => {
      if (f.fee_type === 'exam' && f.month) examsSet.add(f.month)
    })
    return Array.from(examsSet)
  }, [fees])

  // Categorized records
  const monthlyFees   = useMemo(() => fees.filter(f => f.fee_type === 'monthly' || !f.fee_type), [fees])
  const admissionFees = useMemo(() => fees.filter(f => f.fee_type === 'admission'), [fees])
  const examFees      = useMemo(() => fees.filter(f => f.fee_type === 'exam'), [fees])
  const otherFees     = useMemo(() => fees.filter(f => f.fee_type === 'other'), [fees])

  // Current tab filtered fees
  const currentTabFees = useMemo(() => {
    switch (activeTab) {
      case 'monthly':
        return monthlyFees.filter(f => {
          const matchMonth = !filterMonth || f.month === filterMonth
          const matchStatus = !filterStatus || f.status === filterStatus
          const q = search.toLowerCase()
          const matchSearch = !q ||
            f.students?.full_name?.toLowerCase().includes(q) ||
            f.students?.roll_number?.includes(q) ||
            f.receipt_number?.toLowerCase().includes(q)
          return matchMonth && matchStatus && matchSearch
        })
      case 'admission':
        return admissionFees.filter(f => {
          const matchStatus = !filterStatus || f.status === filterStatus
          const q = search.toLowerCase()
          const matchSearch = !q ||
            f.students?.full_name?.toLowerCase().includes(q) ||
            f.students?.roll_number?.includes(q) ||
            f.receipt_number?.toLowerCase().includes(q) ||
            f.notes?.toLowerCase().includes(q)
          return matchStatus && matchSearch
        })
      case 'exam':
        return examFees.filter(f => {
          const matchExam = !filterExam || f.month === filterExam
          const matchStatus = !filterStatus || f.status === filterStatus
          const q = search.toLowerCase()
          const matchSearch = !q ||
            f.students?.full_name?.toLowerCase().includes(q) ||
            f.students?.roll_number?.includes(q) ||
            f.receipt_number?.toLowerCase().includes(q) ||
            f.month?.toLowerCase().includes(q)
          return matchExam && matchStatus && matchSearch
        })
      case 'other':
        return otherFees.filter(f => {
          const matchStatus = !filterStatus || f.status === filterStatus
          const q = search.toLowerCase()
          const matchSearch = !q ||
            f.students?.full_name?.toLowerCase().includes(q) ||
            f.students?.roll_number?.includes(q) ||
            f.receipt_number?.toLowerCase().includes(q)
          return matchStatus && matchSearch
        })
      default:
        return []
    }
  }, [activeTab, monthlyFees, admissionFees, examFees, otherFees, filterMonth, filterExam, filterStatus, search])

  // Filtered students for Ledger tab
  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter(s => {
      return (!q || s.full_name?.toLowerCase().includes(q) || s.roll_number?.includes(q) || s.class_name?.toLowerCase().includes(q))
        && (!filterStatus || s.fee_status === filterStatus)
    })
  }, [students, search, filterStatus])

  // Summary calculations per tab
  const tabStats = useMemo(() => {
    if (activeTab === 'monthly') {
      const targetMonthFees = monthlyFees.filter(f => !filterMonth || f.month === filterMonth)
      const collected = targetMonthFees.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount || 0), 0)
      const pending   = targetMonthFees.filter(f => f.status !== 'paid' && Number(f.amount || 0) > 0).reduce((s, f) => s + Number(f.amount || 0), 0)
      return [
        { label: `${filterMonth || 'All'} — Collected`, value: `Rs ${collected.toLocaleString()}`, color: '#16a34a', bg: '#f0fdf4' },
        { label: `${filterMonth || 'All'} — Pending`,   value: `Rs ${pending.toLocaleString()}`,   color: '#d97706', bg: '#fffbeb' },
        { label: 'Total Monthly Records',               value: targetMonthFees.length,             color: '#4f46e5', bg: '#eef2ff' },
      ]
    } else if (activeTab === 'admission') {
      const collected = admissionFees.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount || 0), 0)
      const pending   = admissionFees.filter(f => f.status !== 'paid' && Number(f.amount || 0) > 0).reduce((s, f) => s + Number(f.amount || 0), 0)
      return [
        { label: 'Admission Fee Collected', value: `Rs ${collected.toLocaleString()}`, color: '#16a34a', bg: '#f0fdf4' },
        { label: 'Admission Pending',       value: `Rs ${pending.toLocaleString()}`,   color: '#d97706', bg: '#fffbeb' },
        { label: 'Admission Records',       value: admissionFees.length,               color: '#a21caf', bg: '#fdf4ff' },
      ]
    } else if (activeTab === 'exam') {
      const targetExams = examFees.filter(f => !filterExam || f.month === filterExam)
      const collected = targetExams.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount || 0), 0)
      const pending   = targetExams.filter(f => f.status !== 'paid' && Number(f.amount || 0) > 0).reduce((s, f) => s + Number(f.amount || 0), 0)
      return [
        { label: 'Exam Fees Collected', value: `Rs ${collected.toLocaleString()}`, color: '#16a34a', bg: '#f0fdf4' },
        { label: 'Exam Fees Pending',   value: `Rs ${pending.toLocaleString()}`,   color: '#d97706', bg: '#fffbeb' },
        { label: 'Total Exam Records',  value: targetExams.length,                 color: '#0e7490', bg: '#ecfeff' },
      ]
    } else if (activeTab === 'other') {
      const collected = otherFees.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount || 0), 0)
      const pending   = otherFees.filter(f => f.status !== 'paid' && Number(f.amount || 0) > 0).reduce((s, f) => s + Number(f.amount || 0), 0)
      return [
        { label: 'Other Fees Collected', value: `Rs ${collected.toLocaleString()}`, color: '#16a34a', bg: '#f0fdf4' },
        { label: 'Other Fees Pending',   value: `Rs ${pending.toLocaleString()}`,   color: '#d97706', bg: '#fffbeb' },
        { label: 'Total Other Records',  value: otherFees.length,                   color: '#475569', bg: '#f1f5f9' },
      ]
    } else {
      const totalCount = students.length
      const paidCount = students.filter(s => s.fee_status === 'paid').length
      const pendingCount = students.filter(s => s.fee_status === 'pending' || s.fee_status === 'overdue').length
      return [
        { label: 'Total Active Students', value: totalCount,    color: '#4f46e5', bg: '#eef2ff' },
        { label: 'Fee Clear Students',    value: paidCount,      color: '#16a34a', bg: '#f0fdf4' },
        { label: 'Pending Dues Students', value: pendingCount,   color: '#dc2626', bg: '#fef2f2' },
      ]
    }
  }, [activeTab, monthlyFees, admissionFees, examFees, otherFees, filterMonth, filterExam, students])

  // Handles form submission & deduplication
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const amountVal = parseFloat(form.amount || '0')
    const isZero = amountVal === 0
    const finalStatus = isZero ? 'paid' : form.status
    const finalPaidDate = finalStatus === 'paid' ? (form.paid_date || todayStr) : null

    // Check if an existing fee record exists for this student, month/title and fee_type
    const targetExistingFee = editingFee || fees.find(f =>
      f.student_id === form.student_id &&
      (f.month || '').trim().toLowerCase() === (form.month || '').trim().toLowerCase() &&
      f.fee_type === form.fee_type
    )

    const prefix = form.fee_type === 'admission' ? 'ADM' : form.fee_type === 'exam' ? 'EXM' : 'MTH'

    if (isOffline()) {
      const feeId = targetExistingFee ? targetExistingFee.id : generateUUID()
      const receipt = targetExistingFee ? targetExistingFee.receipt_number : `RCP-${prefix}-${Date.now().toString(36).toUpperCase()}`
      const feeRecord = {
        id: feeId,
        school_id: schoolId,
        student_id: form.student_id,
        amount: amountVal,
        fee_type: form.fee_type,
        month: form.month,
        due_date: form.due_date,
        paid_date: finalPaidDate,
        status: finalStatus,
        payment_method: form.payment_method,
        receipt_number: receipt,
        notes: form.notes || null,
        created_at: targetExistingFee ? targetExistingFee.created_at : new Date().toISOString(),
        students: students.find(s => s.id === form.student_id) || null,
      }

      if (targetExistingFee) {
        queueOfflineMutation({
          type: 'supabase',
          target: 'fees',
          operation: 'update',
          payload: {
            student_id: form.student_id,
            amount: amountVal,
            fee_type: form.fee_type,
            month: form.month,
            due_date: form.due_date,
            paid_date: finalPaidDate,
            status: finalStatus,
            payment_method: form.payment_method,
            notes: form.notes || null,
          },
          matchKey: 'id',
          matchValue: feeId,
        })
        setFees(p => p.map(f => f.id === feeId ? feeRecord : f))
      } else {
        queueOfflineMutation({
          type: 'supabase',
          target: 'fees',
          operation: 'insert',
          payload: {
            id: feeId,
            school_id: schoolId,
            student_id: form.student_id,
            amount: amountVal,
            fee_type: form.fee_type,
            month: form.month,
            due_date: form.due_date,
            paid_date: finalPaidDate,
            status: finalStatus,
            payment_method: form.payment_method,
            receipt_number: receipt,
            notes: form.notes || null,
          },
        })
        setFees(p => [feeRecord, ...p])
      }

      if (form.fee_type === 'monthly') {
        queueOfflineMutation({
          type: 'supabase',
          target: 'students',
          operation: 'update',
          payload: { fee_status: finalStatus },
          matchKey: 'id',
          matchValue: form.student_id,
        })
        setStudents(p => p.map(s => s.id === form.student_id ? { ...s, fee_status: finalStatus } : s))
      }

      alert('Fee details saved locally. Changes will sync automatically when online.')
      setSaving(false)
      setShowForm(false)
      setEditingFee(null)
      return
    }

    if (targetExistingFee) {
      const { data, error } = await supabase.from('fees').update({
        ...form,
        amount: amountVal,
        status: finalStatus,
        paid_date: finalPaidDate,
      }).eq('id', targetExistingFee.id).select('*, students(full_name, roll_number, class_name)').single()
      
      if (!error && data) {
        setFees(p => p.map(f => f.id === data.id ? data : f))
        if (form.fee_type === 'monthly') {
          await supabase.from('students').update({ fee_status: finalStatus }).eq('id', form.student_id)
          setStudents(p => p.map(s => s.id === form.student_id ? { ...s, fee_status: finalStatus } : s))
        }
      }
    } else {
      const receipt = `RCP-${prefix}-${Date.now().toString(36).toUpperCase()}`
      const { data, error } = await supabase.from('fees').insert({
        ...form,
        school_id: schoolId,
        amount: amountVal,
        status: finalStatus,
        receipt_number: receipt,
        paid_date: finalPaidDate,
      }).select('*, students(full_name, roll_number, class_name)').single()
      
      if (!error && data) {
        setFees(p => [data, ...p])
        if (form.fee_type === 'monthly') {
          await supabase.from('students').update({ fee_status: finalStatus }).eq('id', form.student_id)
          setStudents(p => p.map(s => s.id === form.student_id ? { ...s, fee_status: finalStatus } : s))
        }
      }
    }

    setSaving(false)
    setShowForm(false)
    setEditingFee(null)
  }

  async function updateStudentStatus(studentId: string, newStatus: string) {
    if (isOffline()) {
      queueOfflineMutation({
        type: 'supabase',
        target: 'students',
        operation: 'update',
        payload: { fee_status: newStatus },
        matchKey: 'id',
        matchValue: studentId,
      })
      setStudents(p => p.map(s => s.id === studentId ? { ...s, fee_status: newStatus } : s))
      alert('Student status updated locally. Changes will sync automatically when online.')
      return
    }
    const { error } = await supabase.from('students').update({ fee_status: newStatus }).eq('id', studentId)
    if (!error) {
      setStudents(p => p.map(s => s.id === studentId ? { ...s, fee_status: newStatus } : s))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this fee record?')) return
    if (isOffline()) {
      queueOfflineMutation({
        type: 'supabase',
        target: 'fees',
        operation: 'delete',
        matchKey: 'id',
        matchValue: id,
      })
      setFees(p => p.filter(f => f.id !== id))
      alert('Delete saved locally. Will sync automatically when online.')
      return
    }
    const { error } = await supabase.from('fees').delete().eq('id', id)
    if (!error) setFees(p => p.filter(f => f.id !== id))
  }

  function openEdit(fee: any) {
    setEditingFee(fee)
    setForm({
      student_id: fee.student_id,
      amount: fee.amount?.toString() ?? '',
      fee_type: fee.fee_type || 'monthly',
      month: fee.month || '',
      due_date: fee.due_date || todayStr,
      paid_date: fee.paid_date ?? todayStr,
      status: fee.status || 'paid',
      payment_method: fee.payment_method || 'cash',
      notes: fee.notes ?? '',
    })
    setShowForm(true)
  }

  function openAdd(typeOverride?: string, studentIdOverride?: string) {
    setEditingFee(null)
    const targetType = typeOverride || (activeTab === 'students' ? 'monthly' : activeTab)
    const defaultStudent = studentIdOverride ? students.find(s => s.id === studentIdOverride) : null

    let defaultMonth = currentMonthLabel
    let defaultNotes = ''
    if (targetType === 'admission') {
      defaultMonth = `Admission ${now.getFullYear()}`
      defaultNotes = 'One-time admission registration fee'
    } else if (targetType === 'exam') {
      defaultMonth = `Term Exam ${now.getFullYear()}`
      defaultNotes = 'Exam entry & assessment fee'
    } else if (targetType === 'other') {
      defaultMonth = `Miscellaneous ${now.getFullYear()}`
    }

    setForm({
      student_id: studentIdOverride || '',
      amount: targetType === 'monthly' && defaultStudent?.monthly_fee ? defaultStudent.monthly_fee.toString() : '',
      fee_type: targetType,
      month: defaultMonth,
      due_date: todayStr,
      paid_date: todayStr,
      status: 'paid',
      payment_method: 'cash',
      notes: defaultNotes,
    })
    setShowForm(true)
  }

  // When student selection changes in modal
  function handleStudentChange(studentId: string) {
    const s = students.find(st => st.id === studentId)
    setForm(prev => ({
      ...prev,
      student_id: studentId,
      amount: prev.fee_type === 'monthly' && s?.monthly_fee ? s.monthly_fee.toString() : prev.amount,
    }))
  }

  return (
    <div className="responsive-page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Fee Management</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            Organized records for Monthly Tuition, Admission Fees, Exam Fees & Student Ledger
          </p>
        </div>
        <button
          onClick={() => openAdd()}
          style={{
            padding: '9px 18px', background: '#4f46e5', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <span>+</span>
          <span>
            {activeTab === 'admission' ? 'Record Admission Fee' :
             activeTab === 'exam'      ? 'Record Exam Fee' :
             activeTab === 'other'     ? 'Record Other Fee' :
             'Record Fee Payment'}
          </span>
        </button>
      </div>

      {/* Main Category Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: 2 }}>
        {[
          { id: 'monthly',   label: '📅 Monthly Tuition', count: monthlyFees.length },
          { id: 'admission', label: '🎓 Admission Fees',   count: admissionFees.length },
          { id: 'exam',      label: '📝 Exam Fees',        count: examFees.length },
          { id: 'other',     label: '🏷️ Other Fees',       count: otherFees.length },
          { id: 'students',  label: '👥 Student Ledger',   count: students.length },
        ].map(t => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any)
                setFilterStatus('')
                setSearch('')
              }}
              style={{
                padding: '10px 16px',
                background: isActive ? '#eef2ff' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2.5px solid #4f46e5' : '2.5px solid transparent',
                color: isActive ? '#4f46e5' : '#64748b',
                fontSize: 13.5,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{t.label}</span>
              <span style={{
                background: isActive ? '#c7d2fe' : '#f1f5f9',
                color: isActive ? '#3730a3' : '#64748b',
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 10,
              }}>
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
        {tabStats.map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem', background: s.bg, border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              {s.label}
            </p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color, margin: 0 }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search student, roll number, receipt…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="responsive-search-input"
          style={inp}
        />

        {/* Tab specific filter: Month dropdown */}
        {activeTab === 'monthly' && (
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            style={{ ...inp, width: 'auto', flexShrink: 0, fontWeight: 500 }}
          >
            <option value="">All Months</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{m} {m === currentMonthLabel ? '(Current)' : ''}</option>
            ))}
          </select>
        )}

        {/* Tab specific filter: Exam dropdown */}
        {activeTab === 'exam' && availableExams.length > 0 && (
          <select
            value={filterExam}
            onChange={e => setFilterExam(e.target.value)}
            style={{ ...inp, width: 'auto', flexShrink: 0, fontWeight: 500 }}
          >
            <option value="">All Exams</option>
            {availableExams.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>
        )}

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ ...inp, width: 'auto', flexShrink: 0 }}
        >
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Main Content Area */}
      <div className="card table-responsive-wrapper" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {activeTab !== 'students' ? (
            /* Tables for Monthly, Admission, Exam, Other fees */
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Receipt #', 'Student', 'Fee Category', activeTab === 'exam' ? 'Exam / Term' : activeTab === 'admission' ? 'Session' : 'Month', 'Amount', 'Payment Method', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentTabFees.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                      <div style={{ fontWeight: 500, color: '#64748b' }}>No {activeTab} fee records found.</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Click "+ Record Fee Payment" above to add one.</div>
                    </td>
                  </tr>
                ) : (
                  currentTabFees.map((f, i) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                      <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 11, color: '#6366f1', fontWeight: 600 }}>
                        {f.receipt_number ?? '—'}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{f.students?.full_name ?? '—'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{f.students?.class_name} · #{f.students?.roll_number}</div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>{typeBadge(f.fee_type || 'monthly')}</td>
                      <td style={{ padding: '11px 14px', color: '#334155', fontWeight: 500 }}>
                        {f.month || f.notes || '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0f172a' }}>
                        Rs {Number(f.amount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#475569', textTransform: 'capitalize' }}>
                        {f.payment_method ?? 'cash'}
                      </td>
                      <td style={{ padding: '11px 14px' }}>{statusBadge(f.status)}</td>
                      <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>
                        {f.paid_date ?? f.due_date ?? '—'}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={() => openEdit(f)}
                            style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(f.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* Student Ledger Table */
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Roll #', 'Student', 'Class', 'Current Month Status', 'Admission Fee', 'Exam Fee History', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      No students found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, i) => {
                    const studentFees = fees.filter(f => f.student_id === s.id)
                    const studentMonthlyFees = studentFees.filter(f => f.fee_type === 'monthly' || !f.fee_type)
                    const studentAdmissionFees = studentFees.filter(f => f.fee_type === 'admission')
                    const studentExamFees = studentFees.filter(f => f.fee_type === 'exam')

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: '#6366f1', fontWeight: 600 }}>
                          #{s.roll_number}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.full_name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Monthly Fee: Rs {s.monthly_fee ?? 0}</div>
                        </td>
                        <td style={{ padding: '11px 14px', color: '#475569', fontWeight: 500 }}>
                          {s.class_name}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select
                              value={(s as any).fee_status || 'paid'}
                              onChange={(e) => updateStudentStatus(s.id, e.target.value)}
                              style={{ ...inp, width: 'auto', padding: '4px 8px', fontSize: 12 }}
                            >
                              <option value="paid">Paid</option>
                              <option value="pending">Pending</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {studentAdmissionFees.length === 0 ? (
                            <button
                              onClick={() => openAdd('admission', s.id)}
                              style={{ background: '#fdf4ff', color: '#a21caf', border: '1px solid #f0abfc', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >
                              + Add Admission Fee
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {studentAdmissionFees.map(f => (
                                <span
                                  key={f.id}
                                  onClick={() => openEdit(f)}
                                  title={`Click to edit: Rs ${f.amount} (${f.status})`}
                                  style={{
                                    background: f.status === 'paid' ? '#f0fdf4' : '#fffbeb',
                                    color: f.status === 'paid' ? '#16a34a' : '#d97706',
                                    border: `1px solid ${f.status === 'paid' ? '#bbf7d0' : '#fde68a'}`,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Rs {Number(f.amount).toLocaleString()} ({f.status})
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {studentExamFees.length === 0 ? (
                            <button
                              onClick={() => openAdd('exam', s.id)}
                              style={{ background: '#ecfeff', color: '#0e7490', border: '1px solid #a5f3fc', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >
                              + Add Exam Fee
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {studentExamFees.map(f => (
                                <span
                                  key={f.id}
                                  onClick={() => openEdit(f)}
                                  title={`Click to edit: ${f.month} - Rs ${f.amount}`}
                                  style={{
                                    background: f.status === 'paid' ? '#ecfeff' : '#fffbeb',
                                    color: f.status === 'paid' ? '#0891b2' : '#d97706',
                                    border: `1px solid ${f.status === 'paid' ? '#a5f3fc' : '#fde68a'}`,
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {f.month} ({f.status})
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <button
                            onClick={() => {
                              const existingCurrentFee = studentMonthlyFees.find(f =>
                                (f.month || '').trim().toLowerCase() === currentMonthLabel.trim().toLowerCase()
                              )
                              if (existingCurrentFee) {
                                openEdit(existingCurrentFee)
                              } else {
                                openAdd('monthly', s.id)
                              }
                            }}
                            style={{
                              background: '#4f46e5', color: 'white',
                              border: 'none', borderRadius: 6, padding: '5px 12px',
                              fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            Record Payment
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal for Recording / Editing Payments */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250, padding: '1rem' }}>
          <div className="card fade-up" style={{ width: '100%', maxWidth: 520, padding: '1.5rem', maxHeight: '90dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  {editingFee ? 'Edit Fee Record' : 'Record Fee Payment'}
                </h2>
                <p style={{ color: '#64748b', fontSize: 12, margin: '3px 0 0 0' }}>
                  Category: <strong style={{ textTransform: 'capitalize' }}>{form.fee_type} Fee</strong>
                </p>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingFee(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#64748b', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '0.95rem' }}>
                {/* Student Selector */}
                <div>
                  <label style={lbl}>Student *</label>
                  <select
                    required
                    style={inp}
                    value={form.student_id}
                    onChange={e => handleStudentChange(e.target.value)}
                  >
                    <option value="">Select student…</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} — {s.class_name} (#{s.roll_number}) {s.monthly_fee ? `[Monthly: Rs ${s.monthly_fee}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fee Category & Amount */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <div>
                    <label style={lbl}>Fee Category *</label>
                    <select
                      required
                      style={inp}
                      value={form.fee_type}
                      onChange={e => {
                        const newType = e.target.value
                        let defaultMonth = currentMonthLabel
                        if (newType === 'admission') defaultMonth = `Admission ${now.getFullYear()}`
                        if (newType === 'exam') defaultMonth = `Term Exam ${now.getFullYear()}`
                        setForm(f => ({ ...f, fee_type: newType, month: defaultMonth }))
                      }}
                    >
                      <option value="monthly">📅 Monthly Fee</option>
                      <option value="admission">🎓 Admission Fee</option>
                      <option value="exam">📝 Exam Fee</option>
                      <option value="other">🏷️ Other Fee</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Amount (Rs) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      style={inp}
                      value={form.amount}
                      placeholder="e.g. 3500"
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Month / Title & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <div>
                    <label style={lbl}>
                      {form.fee_type === 'exam'      ? 'Exam Title / Session *' :
                       form.fee_type === 'admission' ? 'Admission Session *' :
                       form.fee_type === 'other'     ? 'Fee Description / Title *' :
                       'Fee Month *'}
                    </label>
                    <input
                      required
                      style={inp}
                      value={form.month}
                      placeholder={form.fee_type === 'exam' ? 'e.g. Mid-Term 2026' : form.fee_type === 'admission' ? 'e.g. 2026 Session' : 'e.g. September 2026'}
                      onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Payment Status *</label>
                    <select
                      required
                      style={inp}
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>

                {/* Payment Method & Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <div>
                    <label style={lbl}>Payment Method</label>
                    <select
                      style={inp}
                      value={form.payment_method}
                      onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="easypaisa">EasyPaisa</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Due Date *</label>
                    <input
                      required
                      type="date"
                      style={inp}
                      value={form.due_date}
                      onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    />
                  </div>
                </div>

                {form.status === 'paid' && (
                  <div>
                    <label style={lbl}>Paid Date</label>
                    <input
                      type="date"
                      style={inp}
                      value={form.paid_date}
                      onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))}
                    />
                  </div>
                )}

                <div>
                  <label style={lbl}>Notes / Remarks</label>
                  <input
                    style={inp}
                    value={form.notes}
                    placeholder="Optional details, receipt notes…"
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8,
                    background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2, padding: 10, background: saving ? '#a5b4fc' : '#4f46e5',
                    color: 'white', border: 'none', borderRadius: 8, fontSize: 13,
                    fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {saving ? 'Saving…' : (editingFee ? 'Update Record' : 'Save Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
