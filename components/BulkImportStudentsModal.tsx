'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UploadCloud, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Check,
  Users,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isOffline, queueOfflineMutation, generateUUID } from '@/lib/offlineSync'
import type { Student } from '@/types'

interface ClassOption {
  id: string
  name: string
  section: string
}

interface ParsedStudentRow {
  full_name: string
  roll_number: string
  class_name: string
  section: string
  gender: 'male' | 'female' | 'other'
  parent_name: string
  parent_phone: string
  parent_email: string
  monthly_fee: number
  fee_status: 'paid' | 'pending' | 'overdue'
  date_of_birth: string
  isValid: boolean
  errors: string[]
}

interface Props {
  classes: ClassOption[]
  existingStudents: Student[]
  schoolId: string
  planLimit: number
  onClose: () => void
  onSuccess: (newStudents: Student[]) => void
}

export default function BulkImportStudentsModal({
  classes,
  existingStudents,
  schoolId,
  planLimit,
  onClose,
  onSuccess
}: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importError, setImportError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Download Sample CSV template
  const downloadTemplate = () => {
    const headers = [
      'Full Name',
      'Roll Number',
      'Class Name',
      'Section',
      'Gender',
      'Parent Name',
      'Parent Phone',
      'Parent Email',
      'Monthly Fee',
      'Fee Status',
      'Date of Birth'
    ]

    const sampleRows = [
      ['Ahmad Raza', '2026-101', 'Class 10', 'A', 'male', 'Muhammad Raza', '+92-300-1234567', 'raza.parent@gmail.com', '5000', 'pending', '2010-05-14'],
      ['Fatima Noor', '2026-102', 'Class 10', 'A', 'female', 'Tariq Mahmood', '+92-301-7654321', 'tariq.m@gmail.com', '5000', 'paid', '2010-08-22'],
      ['Bilal Khan', '2026-103', 'Class 9', 'B', 'male', 'Kamran Khan', '+92-302-9876543', '', '4500', 'pending', '2011-01-10']
    ]

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'students_bulk_import_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Parse CSV text into objects
  const parseCSV = (csvText: string) => {
    const lines = csvText
      .split(/\r\n|\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)

    if (lines.length < 2) {
      setImportError('The CSV file is empty or missing data rows.')
      return
    }

    // Split row respecting quotes
    const splitCSVLine = (line: string): string[] => {
      const result: string[] = []
      let cur = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim())
          cur = ''
        } else {
          cur += char
        }
      }
      result.push(cur.trim())
      return result.map(s => s.replace(/^"|"$/g, '').trim())
    }

    const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
    
    // Column index finders
    const findIndex = (keywords: string[]) => {
      return headers.findIndex(h => keywords.some(k => h.includes(k)))
    }

    const nameIdx = findIndex(['fullname', 'name', 'studentname'])
    const rollIdx = findIndex(['rollnumber', 'rollno', 'roll'])
    const classIdx = findIndex(['classname', 'class', 'grade'])
    const sectionIdx = findIndex(['section', 'sec'])
    const genderIdx = findIndex(['gender', 'sex'])
    const parentNameIdx = findIndex(['parentname', 'fathername', 'guardian'])
    const parentPhoneIdx = findIndex(['parentphone', 'phone', 'mobile', 'contact'])
    const parentEmailIdx = findIndex(['parentemail', 'email', 'gmail'])
    const feeIdx = findIndex(['monthlyfee', 'fee', 'tuitionfee', 'amount'])
    const statusIdx = findIndex(['feestatus', 'status'])
    const dobIdx = findIndex(['dateofbirth', 'dob', 'birthdate'])

    const existingRolls = new Set(existingStudents.map(s => s.roll_number.toLowerCase()))
    const seenRollsInFile = new Set<string>()

    const rows: ParsedStudentRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i])
      if (cols.length === 0 || cols.every(c => !c)) continue

      const fullName = (nameIdx >= 0 ? cols[nameIdx] : cols[0]) || ''
      const rollNumber = (rollIdx >= 0 ? cols[rollIdx] : cols[1]) || ''
      const className = (classIdx >= 0 ? cols[classIdx] : cols[2]) || ''
      const section = (sectionIdx >= 0 ? cols[sectionIdx] : cols[3]) || 'A'
      
      let genderRaw = (genderIdx >= 0 ? cols[genderIdx] : 'male').toLowerCase()
      let gender: 'male' | 'female' | 'other' = 'male'
      if (genderRaw.startsWith('f')) gender = 'female'
      else if (genderRaw.startsWith('o')) gender = 'other'

      const parentName = (parentNameIdx >= 0 ? cols[parentNameIdx] : cols[5]) || ''
      const parentPhone = (parentPhoneIdx >= 0 ? cols[parentPhoneIdx] : cols[6]) || ''
      const parentEmail = (parentEmailIdx >= 0 ? cols[parentEmailIdx] : '') || ''
      
      const rawFee = feeIdx >= 0 ? cols[feeIdx] : ''
      const monthlyFee = parseFloat(rawFee.replace(/[^0-9.]/g, '')) || 0

      let statusRaw = (statusIdx >= 0 ? cols[statusIdx] : 'pending').toLowerCase()
      let feeStatus: 'paid' | 'pending' | 'overdue' = 'pending'
      if (statusRaw.includes('paid')) feeStatus = 'paid'
      else if (statusRaw.includes('overdue')) feeStatus = 'overdue'

      const dateOfBirth = (dobIdx >= 0 ? cols[dobIdx] : '') || ''

      const errors: string[] = []
      if (!fullName) errors.push('Name is required')
      if (!rollNumber) errors.push('Roll number is required')
      if (!className) errors.push('Class is required')
      if (!parentName) errors.push('Parent Name is required')
      if (!parentPhone) errors.push('Phone is required')

      const rollLower = rollNumber.toLowerCase()
      if (rollNumber && seenRollsInFile.has(rollLower)) {
        errors.push(`Duplicate roll number in file (${rollNumber})`)
      } else if (rollNumber && existingRolls.has(rollLower)) {
        errors.push(`Roll number already exists in system (${rollNumber})`)
      }
      if (rollNumber) seenRollsInFile.add(rollLower)

      rows.push({
        full_name: fullName,
        roll_number: rollNumber,
        class_name: className,
        section: section || 'A',
        gender,
        parent_name: parentName,
        parent_phone: parentPhone,
        parent_email: parentEmail,
        monthly_fee: monthlyFee,
        fee_status: feeStatus,
        date_of_birth: dateOfBirth,
        isValid: errors.length === 0,
        errors
      })
    }

    setParsedRows(rows)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    processFile(selectedFile)
  }

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.txt')) {
      setImportError('Please upload a valid CSV (.csv) file.')
      return
    }

    setFile(selectedFile)
    setImportError(null)
    setIsProcessing(true)

    const reader = new FileReader()
    reader.onload = event => {
      try {
        const text = event.target?.result as string
        parseCSV(text)
      } catch (err: any) {
        setImportError('Failed to parse file: ' + (err.message || 'Unknown error'))
      } finally {
        setIsProcessing(false)
      }
    }
    reader.onerror = () => {
      setImportError('Error reading the selected file.')
      setIsProcessing(false)
    }
    reader.readAsText(selectedFile)
  }

  const validRows = parsedRows.filter(r => r.isValid)
  const invalidRows = parsedRows.filter(r => !r.isValid)
  const remainingSlots = Math.max(0, planLimit - existingStudents.length)

  // Handle final batch import
  const handleImportSubmit = async () => {
    if (validRows.length === 0) {
      setImportError('No valid student rows to import.')
      return
    }

    if (validRows.length > remainingSlots) {
      setImportError(`Cannot import ${validRows.length} students. Your plan limit only allows ${remainingSlots} more student(s). Upgrade your plan to increase limits.`)
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportProgress({ current: 0, total: validRows.length })

    const newCreatedStudents: Student[] = []
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const monthLabel = now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear()
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0]

    try {
      if (isOffline()) {
        // Offline handling with offline sync queue
        validRows.forEach((row, idx) => {
          const studentId = generateUUID()
          const studentRecord: Student = {
            id: studentId,
            school_id: schoolId,
            full_name: row.full_name,
            roll_number: row.roll_number,
            class_name: row.class_name,
            section: row.section,
            gender: row.gender,
            parent_name: row.parent_name,
            parent_phone: row.parent_phone,
            parent_email: row.parent_email || undefined,
            fee_status: row.monthly_fee === 0 ? 'paid' : row.fee_status,
            monthly_fee: row.monthly_fee,
            date_of_birth: row.date_of_birth || undefined,
            is_active: true,
            admission_date: todayStr,
            created_at: now.toISOString()
          }

          queueOfflineMutation({
            type: 'supabase',
            target: 'students',
            operation: 'insert',
            payload: studentRecord
          })

          // Add initial fee record if applicable
          if (row.monthly_fee > 0) {
            queueOfflineMutation({
              type: 'supabase',
              target: 'fees',
              operation: 'insert',
              payload: {
                id: generateUUID(),
                student_id: studentId,
                school_id: schoolId,
                fee_type: 'monthly',
                month: monthLabel,
                amount: row.monthly_fee,
                status: row.fee_status,
                due_date: dueDate,
                paid_date: row.fee_status === 'paid' ? todayStr : null,
                payment_method: 'cash',
                receipt_number: 'RCP-' + Date.now().toString(36).toUpperCase() + '-' + idx,
                notes: 'Imported in bulk'
              }
            })
          }

          // Parent account creation if email provided
          if (row.parent_email && row.parent_name) {
            queueOfflineMutation({
              type: 'supabase',
              target: 'users',
              operation: 'insert',
              payload: {
                id: generateUUID(),
                school_id: schoolId,
                full_name: row.parent_name,
                email: row.parent_email.toLowerCase(),
                role: 'parent'
              }
            })
          }

          newCreatedStudents.push(studentRecord)
          setImportProgress({ current: idx + 1, total: validRows.length })
        })

        onSuccess(newCreatedStudents)
        return
      }

      // Online batch insert
      const studentPayloads = validRows.map(row => ({
        school_id: schoolId,
        full_name: row.full_name,
        roll_number: row.roll_number,
        class_name: row.class_name,
        section: row.section,
        gender: row.gender,
        parent_name: row.parent_name,
        parent_phone: row.parent_phone,
        parent_email: row.parent_email || null,
        monthly_fee: row.monthly_fee,
        fee_status: row.monthly_fee === 0 ? 'paid' : row.fee_status,
        date_of_birth: row.date_of_birth || null,
        is_active: true,
        admission_date: todayStr
      }))

      // Batch insert in chunks of 50
      const chunkSize = 50
      for (let i = 0; i < studentPayloads.length; i += chunkSize) {
        const chunk = studentPayloads.slice(i, i + chunkSize)
        const { data: inserted, error: insertErr } = await supabase
          .from('students')
          .insert(chunk)
          .select()

        if (insertErr) throw insertErr

        if (inserted) {
          newCreatedStudents.push(...(inserted as Student[]))

          // Create initial fees for inserted students
          const feeInserts = inserted
            .filter(st => st.monthly_fee && st.monthly_fee > 0)
            .map((st, fIdx) => ({
              school_id: schoolId,
              student_id: st.id,
              fee_type: 'monthly',
              month: monthLabel,
              amount: st.monthly_fee,
              status: st.fee_status,
              due_date: dueDate,
              paid_date: st.fee_status === 'paid' ? todayStr : null,
              payment_method: 'cash',
              receipt_number: 'RCP-' + Date.now().toString(36).toUpperCase() + '-' + fIdx,
              notes: 'Imported via CSV'
            }))

          if (feeInserts.length > 0) {
            await supabase.from('fees').insert(feeInserts)
          }

          // Trigger auto parent account generation for parents with email
          for (const st of inserted) {
            if (st.parent_email && st.parent_name) {
              try {
                await fetch('/api/admin/parents', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: st.parent_email.trim(),
                    full_name: st.parent_name.trim()
                  })
                })
              } catch (pErr) {
                console.warn('Auto parent creation error in bulk import:', pErr)
              }
            }
          }
        }

        setImportProgress({ current: Math.min(i + chunkSize, studentPayloads.length), total: studentPayloads.length })
      }

      onSuccess(newCreatedStudents)
    } catch (err: any) {
      setImportError(err.message || 'Failed to import student records.')
      setIsImporting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      padding: '1rem'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="card"
        style={{
          width: '100%',
          maxWidth: 820,
          background: 'white',
          borderRadius: 16,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#e0e7ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Bulk Import Students
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                Upload an Excel or CSV file to import multiple students at once
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 4,
              borderRadius: 6
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {importError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              padding: '12px 16px',
              color: '#b91c1c',
              fontSize: 13,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{importError}</div>
            </div>
          )}

          {/* Step 1: Template Download Banner */}
          {!file && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#166534', fontSize: 13 }}>
                  Need the sample format?
                </div>
                <div style={{ color: '#15803d', fontSize: 12 }}>
                  Download the ready-to-use CSV template pre-configured with the correct columns.
                </div>
              </div>
              <button
                type="button"
                onClick={downloadTemplate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                <Download size={15} /> Download CSV Template
              </button>
            </div>
          )}

          {/* Upload Area */}
          {!file ? (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setIsDragging(false)
                if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0])
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#4f46e5' : '#cbd5e1'}`,
                background: isDragging ? '#f5f3ff' : '#f8fafc',
                borderRadius: 14,
                padding: '3rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: '#eef2ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <UploadCloud size={28} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                Click to browse or drag &amp; drop your CSV file here
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Supports UTF-8 CSV files with up to {remainingSlots} students
              </div>
            </div>
          ) : (
            <div>
              {/* File Info & Stats */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#e0e7ff',
                    color: '#4338ca',
                    fontWeight: 600,
                    fontSize: 12
                  }}>
                    📄 {file.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFile(null); setParsedRows([]) }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Change File
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#16a34a',
                    background: '#f0fdf4',
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <Check size={14} /> {validRows.length} Valid
                  </div>
                  {invalidRows.length > 0 && (
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#dc2626',
                      background: '#fef2f2',
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid #fecaca',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5
                    }}>
                      <AlertTriangle size={14} /> {invalidRows.length} Errors
                    </div>
                  )}
                </div>
              </div>

              {/* Table Preview */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                overflow: 'hidden',
                maxHeight: 280,
                overflowY: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Roll No</th>
                      <th style={{ padding: '8px 12px' }}>Student Name</th>
                      <th style={{ padding: '8px 12px' }}>Class</th>
                      <th style={{ padding: '8px 12px' }}>Parent Name</th>
                      <th style={{ padding: '8px 12px' }}>Phone</th>
                      <th style={{ padding: '8px 12px' }}>Monthly Fee</th>
                      <th style={{ padding: '8px 12px' }}>Notes / Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: row.isValid ? (idx % 2 === 0 ? 'white' : '#fafafa') : '#fff5f5'
                        }}
                      >
                        <td style={{ padding: '8px 12px' }}>
                          {row.isValid ? (
                            <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Check size={13} /> OK
                            </span>
                          ) : (
                            <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <X size={13} /> Invalid
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#4f46e5' }}>
                          {row.roll_number || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: '#0f172a' }}>
                          {row.full_name || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>
                          {row.class_name} ({row.section})
                        </td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>
                          {row.parent_name || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>
                          {row.parent_phone || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                          {row.monthly_fee > 0 ? `Rs ${row.monthly_fee.toLocaleString()}` : 'Free'}
                        </td>
                        <td style={{ padding: '8px 12px', color: row.isValid ? '#64748b' : '#dc2626', fontSize: 11 }}>
                          {row.isValid
                            ? (row.parent_email ? '✓ Parent login will be created' : 'Ready')
                            : row.errors.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Progress bar when importing */}
              {isImporting && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#4f46e5', marginBottom: 6 }}>
                    <span>Importing students...</span>
                    <span>{importProgress.current} / {importProgress.total}</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(importProgress.current / Math.max(1, importProgress.total)) * 100}%`,
                      height: '100%',
                      background: '#4f46e5',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Current Capacity: <strong>{remainingSlots}</strong> seats left on your plan
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                background: 'white',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: isImporting ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={isImporting || validRows.length === 0}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: 8,
                background: validRows.length === 0 || isImporting ? '#94a3b8' : '#4f46e5',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: validRows.length === 0 || isImporting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {isImporting ? 'Importing...' : `Import ${validRows.length} Students`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
