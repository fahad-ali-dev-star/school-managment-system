'use client'

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts'

interface Props {
  data: {
    kpis: {
      totalStudents: number; totalTeachers: number; totalClasses: number
      totalCollected: number; totalPending: number; attRate: number
      totalLeaves: number; totalNotifs: number
    }
    feeChartData:        { month: string; collected: number; pending: number; overdue: number }[]
    attendanceChartData: { date: string; present: number; absent: number; late: number }[]
    gradeChartData:      { grade: string; count: number }[]
    feeStatusPie:        { name: string; value: number; color: string }[]
    leaveChartData:      { name: string; value: number; color: string }[]
    notifChartData:      { type: string; count: number }[]
    classAttChartData:   { class: string; rate: number }[]
  }
  schoolName: string
}

const GRADE_COLORS: Record<string, string> = {
  'A+': '#16a34a', 'A': '#22c55e', 'B': '#0284c7',
  'C': '#d97706', 'D': '#ea580c', 'F': '#dc2626',
}

const cardStyle: React.CSSProperties = {
  background: 'white', border: '1px solid #e2e8f0',
  borderRadius: 12, padding: '1.25rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: '0 0 6px' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize: 12, color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{typeof p.value === 'number' && p.value > 1000 ? `Rs ${p.value.toLocaleString()}` : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsDashboard({ data, schoolName }: Props) {
  const { kpis } = data
  const today = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const kpiCards = [
    { label: 'Total Students',   value: kpis.totalStudents,                          color: '#4f46e5', icon: '👨‍🎓', bg: '#eef2ff' },
    { label: 'Total Teachers',   value: kpis.totalTeachers,                          color: '#0284c7', icon: '👨‍🏫', bg: '#f0f9ff' },
    { label: 'Total Classes',    value: kpis.totalClasses,                           color: '#7c3aed', icon: '🏫', bg: '#f5f3ff' },
    { label: 'Attendance Rate',  value: `${kpis.attRate}%`,                          color: kpis.attRate >= 80 ? '#16a34a' : '#d97706', icon: '✅', bg: '#f0fdf4' },
    { label: 'Fees Collected',   value: `Rs ${kpis.totalCollected.toLocaleString()}`, color: '#16a34a', icon: '💰', bg: '#f0fdf4' },
    { label: 'Fees Pending',     value: `Rs ${kpis.totalPending.toLocaleString()}`,   color: '#d97706', icon: '⏳', bg: '#fffbeb' },
    { label: 'Leave Requests',   value: kpis.totalLeaves,                            color: '#0891b2', icon: '🏖️', bg: '#f0f9ff' },
    { label: 'Alerts Sent',      value: kpis.totalNotifs,                            color: '#16a34a', icon: '📱', bg: '#f0fdf4' },
  ]

  return (
    <div style={{ padding: '2rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          📊 Analytics Dashboard
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{schoolName} · {today}</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {kpiCards.map((k, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={labelStyle}>{k.label}</p>
              <span style={{ fontSize: 20 }}>{k.icon}</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: k.color, margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Row 1: Fee Bar Chart + Attendance Line Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Fee Collection Bar Chart */}
        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>
            💰 Monthly Fee Collection
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.feeChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="collected" name="Collected" fill="#16a34a" radius={[4,4,0,0]} />
              <Bar dataKey="pending"   name="Pending"   fill="#d97706" radius={[4,4,0,0]} />
              <Bar dataKey="overdue"   name="Overdue"   fill="#dc2626" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Line Chart */}
        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>
            ✅ Attendance Trend (Last 14 Days)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.attendanceChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="present" name="Present" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="absent"  name="Absent"  stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="late"    name="Late"    stroke="#d97706" strokeWidth={2}   dot={{ r: 3 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Grade Bar + Fee Pie + Leave Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Grade Distribution */}
        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>
            📝 Grade Distribution
          </p>
          {data.gradeChartData.every(g => g.count === 0)
            ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>No marks data yet</div>
            : <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.gradeChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="grade" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Students" radius={[4,4,0,0]}>
                  {data.gradeChartData.map((entry, i) => (
                    <Cell key={i} fill={GRADE_COLORS[entry.grade] ?? '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
        </div>

        {/* Fee Status Pie */}
        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>
            💳 Fee Status
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data.feeStatusPie.filter(d => d.value > 0)}
                cx="50%" cy="50%"
                innerRadius={40} outerRadius={65}
                paddingAngle={3} dataKey="value"
              >
                {data.feeStatusPie.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => [v]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {data.feeStatusPie.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Leave Status Pie */}
        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>
            🏖️ Leave Status
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data.leaveChartData.filter(d => d.value > 0)}
                cx="50%" cy="50%"
                innerRadius={40} outerRadius={65}
                paddingAngle={3} dataKey="value"
              >
                {data.leaveChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => [v]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {data.leaveChartData.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Notification types + Attendance Rate Radial */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Notification by type bar */}
        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>
            📱 Alerts Sent by Type
          </p>
          {data.notifChartData.length === 0
            ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>No notifications sent yet</div>
            : <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.notifChartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Sent" fill="#4f46e5" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          }
        </div>

        {/* Attendance Rate Radial */}
        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>
            🎯 Overall Attendance Rate
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <ResponsiveContainer width={160} height={160}>
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="60%" outerRadius="90%"
                data={[{ name: 'Rate', value: kpis.attRate, fill: kpis.attRate >= 80 ? '#16a34a' : kpis.attRate >= 60 ? '#d97706' : '#dc2626' }]}
                startAngle={90} endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f1f5f9' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div>
              <p style={{ fontSize: '3rem', fontWeight: 800, color: kpis.attRate >= 80 ? '#16a34a' : kpis.attRate >= 60 ? '#d97706' : '#dc2626', margin: 0, lineHeight: 1 }}>
                {kpis.attRate}%
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 12px' }}>Attendance Rate</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: 'Excellent', range: '≥ 90%', color: '#16a34a' },
                  { label: 'Good',      range: '75–89%', color: '#0284c7' },
                  { label: 'Average',   range: '60–74%', color: '#d97706' },
                  { label: 'Poor',      range: '< 60%',  color: '#dc2626' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                    <span style={{ fontSize: 11, color: '#64748b' }}>{r.label}: {r.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Summary table */}
      <div style={cardStyle}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>
          📋 School Summary
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
          {[
            { label: 'Total Students Enrolled',   value: kpis.totalStudents,                                     icon: '👨‍🎓' },
            { label: 'Active Teachers',            value: kpis.totalTeachers,                                     icon: '👨‍🏫' },
            { label: 'Classes & Sections',         value: kpis.totalClasses,                                      icon: '🏫' },
            { label: 'Total Fees Collected',       value: `Rs ${kpis.totalCollected.toLocaleString()}`,           icon: '💰' },
            { label: 'Outstanding Fees',           value: `Rs ${kpis.totalPending.toLocaleString()}`,             icon: '⏳' },
            { label: 'Collection Rate',            value: kpis.totalCollected + kpis.totalPending > 0 ? `${Math.round((kpis.totalCollected / (kpis.totalCollected + kpis.totalPending)) * 100)}%` : '0%', icon: '📈' },
            { label: 'Leave Applications',         value: kpis.totalLeaves,                                       icon: '🏖️' },
            { label: 'Notifications Sent',         value: kpis.totalNotifs,                                       icon: '📱' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{row.icon}</span>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{row.label}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '2px 0 0' }}>{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
