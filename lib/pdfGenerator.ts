import { jsPDF } from 'jspdf'

interface SubjectMark {
  subject: string
  total_marks: number
  passing_marks: number
  obtained: number | null
  grade: string | null
  passed: boolean | null
}

interface StudentReport {
  student: {
    full_name: string
    roll_number: string
    class_name: string
    section: string
    gender: string
    parent_name: string
    parent_phone: string
    admission_date: string
  }
  exam: {
    title: string
    exam_type: string
    exam_date: string
    class_name: string
    section: string
  }
  subjectMarks: SubjectMark[]
  totalObtained: number
  totalPossible: number
  percentage: number
  overallGrade: string
  passed: boolean
  rank: number | string
  totalStudents: number
  attendance: {
    presentDays: number
    absentDays: number
    lateDays: number
    totalDays: number
    attPercent: number
  }
}

interface ReportData {
  school: { name: string; address: string; phone: string }
  exam: {
    title: string; exam_type: string; exam_date: string
    class_name: string; section: string
    total_marks: number; passing_marks: number
  }
  reports: StudentReport[]
}

function gradeColor(grade: string): [number, number, number] {
  if (grade === 'A+' || grade === 'A') return [22, 163, 74]   // green
  if (grade === 'B') return [2, 132, 199]                       // blue
  if (grade === 'C') return [217, 119, 6]                       // amber
  if (grade === 'D') return [234, 88, 12]                       // orange
  return [220, 38, 38]                                          // red
}

export function generateReportCardPDF(data: ReportData, singleStudent?: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210 // A4 width mm
  const H = 297 // A4 height mm

  const reports = singleStudent
    ? data.reports.filter(r => r.student.full_name === singleStudent)
    : data.reports

  reports.forEach((report, pageIndex) => {
    if (pageIndex > 0) doc.addPage()

    let y = 0

    // ── HEADER BAND ─────────────────────────────────────────
    doc.setFillColor(79, 70, 229) // indigo-600
    doc.rect(0, 0, W, 38, 'F')

    // School name
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(data.school.name.toUpperCase(), W / 2, 14, { align: 'center' })

    // School address + phone
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`${data.school.address}  |  ${data.school.phone}`, W / 2, 21, { align: 'center' })

    // Report card label
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(W / 2 - 35, 26, 70, 10, 2, 2, 'F')
    doc.setTextColor(79, 70, 229)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('STUDENT RESULT CARD', W / 2, 33, { align: 'center' })

    y = 46

    // ── EXAM INFO BAR ────────────────────────────────────────
    doc.setFillColor(241, 245, 249) // slate-100
    doc.rect(10, y, W - 20, 10, 'F')
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')

    const examDate = new Date(report.exam.exam_date + 'T12:00:00').toLocaleDateString('en-PK', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    doc.text(
      `${report.exam.title.toUpperCase()}  |  ${report.exam.class_name} — Section ${report.exam.section}  |  Date: ${examDate}`,
      W / 2, y + 6.5,
      { align: 'center' }
    )

    y = 62

    // ── STUDENT INFO + RESULT SUMMARY ─────────────────────────
    // Left box — student details
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(10, y, 118, 38, 2, 2, 'FD')

    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')

    const infoRows = [
      ['Student Name', report.student.full_name],
      ['Roll Number',  report.student.roll_number],
      ['Father Name',  report.student.parent_name],
      ['Class',        `${report.student.class_name} — Section ${report.student.section}`],
      ['Gender',       report.student.gender.charAt(0).toUpperCase() + report.student.gender.slice(1)],
      ['Contact',      report.student.parent_phone],
    ]

    infoRows.forEach((row, i) => {
      const rowY = y + 7 + i * 5.2
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(71, 85, 105)
      doc.text(row[0] + ':', 14, rowY)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(15, 23, 42)
      doc.text(row[1], 50, rowY)
    })

    // Right box — result summary
    doc.roundedRect(132, y, 68, 38, 2, 2, 'FD')

    const [gr, gg, gb] = gradeColor(report.overallGrade)
    doc.setFillColor(gr, gg, gb)
    doc.roundedRect(148, y + 3, 36, 20, 3, 3, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text(report.overallGrade, 166, y + 16, { align: 'center' })

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('OVERALL GRADE', 166, y + 26, { align: 'center' })

    const resultRows = [
      [`${report.totalObtained}/${report.totalPossible}`, 'Total Marks'],
      [`${report.percentage}%`, 'Percentage'],
      [`${report.rank} / ${report.totalStudents}`, 'Class Rank'],
      [report.passed ? 'PASS' : 'FAIL', 'Result'],
    ]

    resultRows.forEach((row, i) => {
      const rY = y + 6 + i * 4.8
      const col = i % 2 === 0 ? 136 : 163
      const labelCol = i % 2 === 0 ? 136 : 163
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(i === 3 && !report.passed ? 220 : 15, i === 3 && !report.passed ? 38 : 23, i === 3 && !report.passed ? 38 : 42)
      doc.text(row[0], 136, y + 29 + i * 2.5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(100, 116, 139)
      doc.text(row[1], 136, y + 32 + i * 2.5)
    })

    y = 106

    // ── SUBJECT MARKS TABLE ──────────────────────────────────
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Subject-wise Performance', 10, y)
    y += 5

    // Table header
    doc.setFillColor(79, 70, 229)
    doc.rect(10, y, W - 20, 9, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')

    const cols = { subject: 12, max: 100, pass: 130, obtained: 152, percent: 172, grade: 192, result: 202 }
    doc.text('Subject',           cols.subject, y + 6)
    doc.text('Max Marks',         cols.max,     y + 6)
    doc.text('Pass Marks',        cols.pass,    y + 6)
    doc.text('Obtained',          cols.obtained,y + 6)
    doc.text('Percentage',        cols.percent, y + 6)
    doc.text('Grade',             cols.grade,   y + 6)
    doc.text('Result',            cols.result,  y + 6)

    y += 9

    report.subjectMarks.forEach((sm, i) => {
      const rowBg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255]
      doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
      doc.rect(10, y, W - 20, 8, 'F')

      doc.setDrawColor(226, 232, 240)
      doc.rect(10, y, W - 20, 8, 'D')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(15, 23, 42)
      doc.text(sm.subject, cols.subject, y + 5.5)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(71, 85, 105)
      doc.text(String(sm.total_marks),     cols.max,      y + 5.5)
      doc.text(String(sm.passing_marks),   cols.pass,     y + 5.5)

      if (sm.obtained !== null) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 23, 42)
        doc.text(String(sm.obtained), cols.obtained, y + 5.5)

        const subPct = Math.round((sm.obtained / sm.total_marks) * 100)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105)
        doc.text(`${subPct}%`, cols.percent, y + 5.5)

        if (sm.grade) {
          const [r, g, b] = gradeColor(sm.grade)
          doc.setTextColor(r, g, b)
          doc.setFont('helvetica', 'bold')
          doc.text(sm.grade, cols.grade, y + 5.5)
        }

        const passColor: [number, number, number] = sm.passed ? [22, 163, 74] : [220, 38, 38]
        doc.setTextColor(...passColor)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.text(sm.passed ? 'PASS' : 'FAIL', cols.result, y + 5.5)
      } else {
        doc.setTextColor(148, 163, 184)
        doc.text('—', cols.obtained, y + 5.5)
        doc.text('—', cols.percent,  y + 5.5)
        doc.text('—', cols.grade,    y + 5.5)
        doc.text('N/A', cols.result, y + 5.5)
      }

      y += 8
    })

    y += 6

    // ── TOTALS ROW ───────────────────────────────────────────
    doc.setFillColor(241, 245, 249)
    doc.rect(10, y, W - 20, 10, 'F')
    doc.setDrawColor(203, 213, 225)
    doc.rect(10, y, W - 20, 10, 'D')

    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('TOTAL', cols.subject, y + 7)

    doc.text(String(report.totalPossible), cols.max, y + 7)

    const [rr, rg, rb] = gradeColor(report.overallGrade)
    doc.setTextColor(rr, rg, rb)
    doc.text(`${report.totalObtained} / ${report.totalPossible}`, cols.obtained, y + 7)
    doc.text(`${report.percentage}%`, cols.percent, y + 7)
    doc.text(report.overallGrade, cols.grade, y + 7)

    const passC: [number, number, number] = report.passed ? [22, 163, 74] : [220, 38, 38]
    doc.setTextColor(...passC)
    doc.text(report.passed ? 'PASS' : 'FAIL', cols.result, y + 7)

    y += 18

    // ── ATTENDANCE SECTION ───────────────────────────────────
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Attendance Summary', 10, y)
    y += 5

    const att     = report.attendance
    const attCols = [
      { label: 'Total Days',   value: att.totalDays,   bg: [241, 245, 249] as [number,number,number] },
      { label: 'Present',      value: att.presentDays, bg: [240, 253, 244] as [number,number,number] },
      { label: 'Absent',       value: att.absentDays,  bg: [254, 242, 242] as [number,number,number] },
      { label: 'Late',         value: att.lateDays,    bg: [255, 251, 235] as [number,number,number] },
      { label: 'Att. Rate',    value: `${att.attPercent}%`, bg: att.attPercent >= 75 ? [240, 253, 244] as [number,number,number] : [254, 242, 242] as [number,number,number] },
    ]

    const boxW = (W - 20) / attCols.length

    attCols.forEach((col, i) => {
      const bx = 10 + i * boxW
      doc.setFillColor(...col.bg)
      doc.roundedRect(bx, y, boxW - 2, 18, 2, 2, 'F')
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(bx, y, boxW - 2, 18, 2, 2, 'D')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(15, 23, 42)
      doc.text(String(col.value), bx + (boxW - 2) / 2, y + 10, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(100, 116, 139)
      doc.text(col.label, bx + (boxW - 2) / 2, y + 15.5, { align: 'center' })
    })

    y += 25

    // ── GRADING SCALE ────────────────────────────────────────
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(10, y, W - 20, 16, 2, 2, 'F')

    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('GRADING SCALE:', 15, y + 6)

    const grades = [
      { g: 'A+', r: '90-100%' }, { g: 'A', r: '80-89%' }, { g: 'B', r: '70-79%' },
      { g: 'C', r: '60-69%' },   { g: 'D', r: '40-59%' }, { g: 'F', r: 'Below 40%' },
    ]

    grades.forEach((gd, i) => {
      const gx = 52 + i * 27
      const [r, g, b] = gradeColor(gd.g)
      doc.setTextColor(r, g, b)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(gd.g, gx, y + 6)
      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(gd.r, gx, y + 11)
    })

    y += 22

    // ── SIGNATURES ───────────────────────────────────────────
    const sigCols = [
      { label: "Class Teacher's Signature", x: 20 },
      { label: "Principal's Signature",     x: 85 },
      { label: "Parent's Signature",        x: 152 },
    ]

    sigCols.forEach(sig => {
      doc.setDrawColor(203, 213, 225)
      doc.line(sig.x, y + 12, sig.x + 50, y + 12)
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(sig.label, sig.x + 25, y + 17, { align: 'center' })
    })

    y += 22

    // ── FOOTER ───────────────────────────────────────────────
    doc.setFillColor(79, 70, 229)
    doc.rect(0, H - 12, W, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${data.school.name}  |  Generated on ${new Date().toLocaleDateString('en-PK')}  |  This is a computer-generated document`,
      W / 2, H - 5, { align: 'center' }
    )
  })

  // Save
  const fileName = reports.length === 1
    ? `Report_Card_${reports[0].student.roll_number}_${data.exam.title.replace(/\s+/g, '_')}.pdf`
    : `Report_Cards_${data.exam.class_name}_${data.exam.section}_${data.exam.title.replace(/\s+/g, '_')}.pdf`

  doc.save(fileName)
}
