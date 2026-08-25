import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotification } from '@/lib/notificationService'

// Initialize generative AI outside handler, checking key dynamically
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('API_KEY_INVALID')
  }
  return new GoogleGenerativeAI(apiKey)
}

// ==========================================
// GEMINI TOOL DECLARATIONS FOR AI AGENT
// ==========================================

const sendNotificationTool = {
  name: 'sendNotification',
  description: 'Send an SMS or WhatsApp notification to a parent or phone number.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      to: { type: SchemaType.STRING, description: 'The phone number of the recipient (e.g. +923001234567 or 03001234567)' },
      message: { type: SchemaType.STRING, description: 'The body text of the SMS or WhatsApp message' },
      channel: { type: SchemaType.STRING, description: 'The channel to use: "whatsapp", "sms", or "both"' }
    },
    required: ['to', 'message', 'channel']
  } as any
}

const markAttendanceTool = {
  name: 'markAttendance',
  description: 'Mark attendance for a student on a specific date.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      studentId: { type: SchemaType.STRING, description: 'The UUID of the student' },
      date: { type: SchemaType.STRING, description: 'The date for attendance in YYYY-MM-DD format' },
      status: { type: SchemaType.STRING, description: 'The attendance status: "present", "absent", "late", or "leave"' },
      notes: { type: SchemaType.STRING, description: 'Optional comments or notes about the attendance' }
    },
    required: ['studentId', 'date', 'status']
  } as any
}

const createFeeRecordTool = {
  name: 'createFeeRecord',
  description: 'Create a new pending fee invoice for a single student.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      studentId: { type: SchemaType.STRING, description: 'The UUID of the student' },
      amount: { type: SchemaType.NUMBER, description: 'The fee amount in PKR' },
      feeType: { type: SchemaType.STRING, description: 'The description/type of fee (e.g. "Monthly Tuition", "Admission Fee", "Exam Fee")' },
      month: { type: SchemaType.STRING, description: 'The billing month (e.g. "July 2026")' },
      dueDate: { type: SchemaType.STRING, description: 'The payment due date in YYYY-MM-DD format' }
    },
    required: ['studentId', 'amount', 'feeType', 'month', 'dueDate']
  } as any
}

const recordFeePaymentTool = {
  name: 'recordFeePayment',
  description: 'Mark an existing pending/overdue fee record as paid.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      feeId: { type: SchemaType.STRING, description: 'The UUID of the fee record' },
      paymentMethod: { type: SchemaType.STRING, description: 'Method of payment: "cash", "bank", "jazzcash", or "easypaisa"' },
      paidDate: { type: SchemaType.STRING, description: 'Date of payment in YYYY-MM-DD format (defaults to today)' },
      notes: { type: SchemaType.STRING, description: 'Optional payment notes or receipt number' }
    },
    required: ['feeId', 'paymentMethod']
  } as any
}

const generateMonthlyFeesTool = {
  name: 'generateMonthlyFees',
  description: 'Bulk generate pending monthly fee slips for all active students in a class or the entire school.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      month: { type: SchemaType.STRING, description: 'Billing month name (e.g. "July 2026")' },
      dueDate: { type: SchemaType.STRING, description: 'Payment due date in YYYY-MM-DD format' },
      className: { type: SchemaType.STRING, description: 'Optional class name filter (e.g. "Class 10"). Omit to generate for all students.' }
    },
    required: ['month', 'dueDate']
  } as any
}

const updateLeaveStatusTool = {
  name: 'updateLeaveStatus',
  description: 'Approve or reject a student or teacher leave request.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      leaveId: { type: SchemaType.STRING, description: 'The UUID of the leave application' },
      status: { type: SchemaType.STRING, description: 'The status to set: "approved" or "rejected"' }
    },
    required: ['leaveId', 'status']
  } as any
}

const addStudentTool = {
  name: 'addStudent',
  description: 'Register a new student into the school database.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      fullName: { type: SchemaType.STRING, description: 'Full name of the student' },
      className: { type: SchemaType.STRING, description: 'Class name (e.g. "Class 5", "Grade 10")' },
      section: { type: SchemaType.STRING, description: 'Section name (e.g. "A", "B")' },
      rollNumber: { type: SchemaType.STRING, description: 'Roll number of the student' },
      parentName: { type: SchemaType.STRING, description: 'Full name of parent/guardian' },
      parentPhone: { type: SchemaType.STRING, description: 'Parent phone number' },
      parentEmail: { type: SchemaType.STRING, description: 'Optional parent email address' },
      monthlyFee: { type: SchemaType.NUMBER, description: 'Monthly fee amount in PKR (e.g. 5000)' }
    },
    required: ['fullName', 'className', 'section', 'rollNumber', 'parentName', 'parentPhone']
  } as any
}

const addTeacherTool = {
  name: 'addTeacher',
  description: 'Register a new teacher profile in the school directory.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      fullName: { type: SchemaType.STRING, description: 'Full name of the teacher' },
      email: { type: SchemaType.STRING, description: 'Teacher email address' },
      phone: { type: SchemaType.STRING, description: 'Teacher phone number' },
      subject: { type: SchemaType.STRING, description: 'Main subject taught (e.g. "Mathematics", "Science")' },
      classAssigned: { type: SchemaType.STRING, description: 'Assigned class/section (e.g. "Class 10-A")' },
      salary: { type: SchemaType.NUMBER, description: 'Monthly salary amount in PKR' }
    },
    required: ['fullName', 'email', 'subject']
  } as any
}

const createExamTool = {
  name: 'createExam',
  description: 'Create and schedule a new exam for a class.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      examName: { type: SchemaType.STRING, description: 'Name of the exam (e.g. "Mid-Term Examination 2026")' },
      className: { type: SchemaType.STRING, description: 'Class name (e.g. "Class 10")' },
      section: { type: SchemaType.STRING, description: 'Section name (e.g. "A")' },
      examDate: { type: SchemaType.STRING, description: 'Start date of exam in YYYY-MM-DD format' }
    },
    required: ['examName', 'className', 'examDate']
  } as any
}

const addHolidayTool = {
  name: 'addHoliday',
  description: 'Add a new holiday or school event to the calendar.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING, description: 'Title of the holiday/event (e.g. "Independence Day", "Summer Vacation")' },
      date: { type: SchemaType.STRING, description: 'Start date in YYYY-MM-DD format' },
      endDate: { type: SchemaType.STRING, description: 'Optional end date for multi-day breaks in YYYY-MM-DD format' },
      type: { type: SchemaType.STRING, description: 'Type: "national", "school", "exam_break", "summer", or "winter"' },
      description: { type: SchemaType.STRING, description: 'Optional details or note' }
    },
    required: ['title', 'date', 'type']
  } as any
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    // Auth check — same pattern used throughout the codebase
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile — uses 'users' table
    const { data: profile } = await supabase
      .from('users')
      .select(`
        id,
        school_id,
        role,
        schools (
          name,
          plan
        )
      `)
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 401 })
    }

    // Only admin/principal can use the AI Agent
    if (!['admin', 'principal'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const schoolData = (profile as any).schools
    const schoolId = profile.school_id
    const schoolName = schoolData?.name ?? 'School'
    const plan = schoolData?.plan ?? 'free'

    // Check Pro plan requirement
    if (plan === 'free') {
      return NextResponse.json({ error: 'AI Agent features require Pro plan subscription.' }, { status: 403 })
    }

    const body = await req.json()
    const { message, confirmAction } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Initialize Gemini
    let genAI
    try {
      genAI = getGenAI()
    } catch (e: any) {
      return NextResponse.json(
        { error: 'Invalid Gemini API key. Please check GEMINI_API_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Fetch school data in parallel to build context
    const [
      studentsRes,
      feesRes,
      attendanceRes,
      teachersRes,
      examsRes,
      marksRes,
      leavesRes,
      subjectsRes,
      holidaysRes
    ] = await Promise.all([
      supabase
        .from('students')
        .select('id, full_name, roll_number, class_name, section, fee_status, is_active, parent_name, parent_phone, parent_email, monthly_fee')
        .eq('school_id', schoolId)
        .eq('is_active', true),

      supabase
        .from('fees')
        .select('id, student_id, amount, fee_type, month, due_date, paid_date, status, payment_method')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(250),

      supabase
        .from('attendance')
        .select('id, student_id, date, status, notes')
        .eq('school_id', schoolId)
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: false }),

      supabase
        .from('teachers')
        .select('id, full_name, email, phone, subject, class_assigned, is_active, salary')
        .eq('school_id', schoolId)
        .eq('is_active', true),

      supabase
        .from('exams')
        .select('id, exam_name, class_name, section, exam_date')
        .eq('school_id', schoolId)
        .order('exam_date', { ascending: false }),

      supabase
        .from('marks')
        .select('id, student_id, exam_id, subject_id, marks_obtained, grade')
        .eq('school_id', schoolId)
        .limit(300),

      supabase
        .from('leave_applications')
        .select('id, student_id, status, from_date, to_date, total_days, reason')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(100),

      supabase
        .from('subjects')
        .select('id, exam_id, name, total_marks, passing_marks')
        .eq('school_id', schoolId),

      supabase
        .from('holidays')
        .select('id, title, date, end_date, type, description')
        .eq('school_id', schoolId)
        .limit(50)
    ])

    const students = studentsRes.data ?? []
    const fees = feesRes.data ?? []
    const attendance = attendanceRes.data ?? []
    const teachers = teachersRes.data ?? []
    const exams = examsRes.data ?? []
    const marks = marksRes.data ?? []
    const leaves = leavesRes.data ?? []
    const subjects = subjectsRes.data ?? []
    const holidays = holidaysRes.data ?? []

    // Compute summary stats
    const todayAttendance = attendance.filter(a => a.date === today)
    const presentToday = todayAttendance.filter(a => a.status === 'present').length
    const absentToday = todayAttendance.filter(a => a.status === 'absent').length
    const lateToday = todayAttendance.filter(a => a.status === 'late').length

    const pendingFees = fees.filter(f => f.status === 'pending')
    const overdueFees = fees.filter(f => f.status === 'overdue')
    const totalPendingAmount = pendingFees.reduce((sum, f) => sum + (f.amount || 0), 0)
    const totalOverdueAmount = overdueFees.reduce((sum, f) => sum + (f.amount || 0), 0)
    const totalCollectedThisMonth = fees
      .filter(f => f.status === 'paid' && f.paid_date?.startsWith(today.slice(0, 7)))
      .reduce((sum, f) => sum + (f.amount || 0), 0)

    const pendingLeaves = leaves.filter(l => l.status === 'pending').length

    // System prompt with full context and instructions
    const systemPrompt = `
You are the Autonomous AI Agent & Operations Controller for ${schoolName}.
Today's date: ${today}

=== LANGUAGE & MULTILINGUAL INSTRUCTION ===
Detect the language of the user's message. Reply in the EXACT SAME language.
- If Urdu (اردو), reply fully in proper Urdu script (نستعلیق/اردو رسم الخط). Do NOT use Roman Urdu unless explicitly requested.
- If English, reply in clear professional English.

=== SCHOOL LIVE SUMMARY ===
School Name: ${schoolName}
Total Active Students: ${students.length}
Total Active Teachers: ${teachers.length}

=== TODAY'S ATTENDANCE (${today}) ===
Present: ${presentToday} | Absent: ${absentToday} | Late: ${lateToday}
Attendance Rate: ${students.length > 0 ? Math.round((presentToday / students.length) * 100) : 0}%

=== FINANCIAL & FEES ===
Pending Fee Records: ${pendingFees.length} (Total: PKR ${totalPendingAmount.toLocaleString()})
Overdue Fee Records: ${overdueFees.length} (Total: PKR ${totalOverdueAmount.toLocaleString()})
Collected This Month: PKR ${totalCollectedThisMonth.toLocaleString()}

=== LEAVES & HOLIDAYS ===
Pending Leaves: ${pendingLeaves}
Total Scheduled Holidays: ${holidays.length}

=== LIVE DATABASE CONTEXT ===
STUDENTS: ${JSON.stringify(students.slice(0, 150))}
FEES (recent 250): ${JSON.stringify(fees)}
LAST 7 DAYS ATTENDANCE: ${JSON.stringify(attendance.slice(0, 250))}
TEACHERS: ${JSON.stringify(teachers)}
EXAMS: ${JSON.stringify(exams)}
UPCOMING HOLIDAYS: ${JSON.stringify(holidays)}

=== AUTONOMOUS AI AGENT TOOLS & CONTROLS ===
You have 10 powerful tools to directly control the ERP system. Execute appropriate tool calls whenever the administrator asks you to perform an action:
1. sendNotification - Send SMS or WhatsApp message to parent/phone.
2. markAttendance - Mark attendance (present/absent/late/leave) for a student.
3. createFeeRecord - Create a single fee voucher.
4. recordFeePayment - Mark a pending/overdue fee as paid (cash/bank/jazzcash/easypaisa).
5. generateMonthlyFees - Bulk generate monthly fee slips for a class or entire school.
6. updateLeaveStatus - Approve or reject leave applications.
7. addStudent - Add a new student record to the school.
8. addTeacher - Add a new teacher profile.
9. createExam - Schedule a new exam for a class.
10. addHoliday - Post a new holiday or event to the calendar.

=== EXECUTION RULES ===
- Always invoke tool calls directly when an action is requested.
- After tool execution completes, summarize the outcome clearly to the administrator.
- Always use PKR for currency.
- Never invent mock data that isn't in context.
    `.trim()

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{
        functionDeclarations: [
          sendNotificationTool,
          markAttendanceTool,
          createFeeRecordTool,
          recordFeePaymentTool,
          generateMonthlyFeesTool,
          updateLeaveStatusTool,
          addStudentTool,
          addTeacherTool,
          createExamTool,
          addHolidayTool
        ]
      }]
    })

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I am online as the Autonomous AI ERP Agent for ' + schoolName + '. Ready to execute actions.' }] }
      ]
    })

    let response = await chat.sendMessage(`Admin request: ${message.trim()}`)

    const executedActions: Array<{ action: string; parameters: any; result: any }> = []
    let iterations = 0
    const maxIterations = 5

    let functionCalls = response.response.functionCalls()

    while (functionCalls && functionCalls.length > 0 && iterations < maxIterations) {
      iterations++
      const call = functionCalls[0]
      let actionResult: any
      let actionStatus = 'success'
      let errorMessage: string | null = null

      try {
        if (call.name === 'sendNotification') {
          const { to, message: msgText, channel } = call.args as any
          actionResult = await sendNotification(to, msgText, channel)

          try {
            const cleanedPhone = to.replace(/[\s\-\(\)]/g, '')
            const suffix = cleanedPhone.slice(-10)
            const phoneQuery = `%${suffix}`

            const { data: student } = await supabase
              .from('students')
              .select('id')
              .eq('school_id', schoolId)
              .like('parent_phone', phoneQuery)
              .limit(1)
              .maybeSingle()

            await supabase
              .from('notification_logs')
              .insert({
                school_id:  schoolId,
                student_id: student?.id ?? null,
                type:       'ai_assistant',
                channel:    channel ?? 'whatsapp',
                recipient:  to,
                message:    msgText,
                status:     actionResult.success ? 'sent' : 'failed',
                error_msg:  actionResult.error ?? null,
                sent_at:    actionResult.success ? new Date().toISOString() : null,
              })
          } catch (logErr) {
            console.error('Failed to log AI notification:', logErr)
          }

        } else if (call.name === 'markAttendance') {
          const { studentId, date, status, notes } = call.args as any
          const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('school_id', schoolId)
            .eq('date', date)
            .eq('student_id', studentId)
            .maybeSingle()

          const upsertData: any = {
            school_id: schoolId,
            student_id: studentId,
            date,
            status,
            notes: notes || ''
          }
          if (existing?.id) upsertData.id = existing.id

          const { data, error } = await supabase
            .from('attendance')
            .upsert(upsertData)
            .select()

          actionResult = error ? { success: false, error: error.message } : { success: true, data }

        } else if (call.name === 'createFeeRecord') {
          const { studentId, amount, feeType, month, dueDate } = call.args as any
          const { data, error } = await supabase
            .from('fees')
            .insert({
              school_id: schoolId,
              student_id: studentId,
              amount: Number(amount),
              fee_type: feeType,
              month,
              due_date: dueDate,
              status: 'pending'
            })
            .select()

          actionResult = error ? { success: false, error: error.message } : { success: true, data }

        } else if (call.name === 'recordFeePayment') {
          const { feeId, paymentMethod, paidDate, notes } = call.args as any
          const { data, error } = await supabase
            .from('fees')
            .update({
              status: 'paid',
              payment_method: paymentMethod,
              paid_date: paidDate || today,
              notes: notes || 'Paid via AI Agent'
            })
            .eq('id', feeId)
            .eq('school_id', schoolId)
            .select()

          actionResult = error ? { success: false, error: error.message } : { success: true, data }

        } else if (call.name === 'generateMonthlyFees') {
          const { month, dueDate, className } = call.args as any

          if (!confirmAction) {
            return NextResponse.json({
              reply: `⚠️ **Action Confirmation Required:**\n\nAre you sure you want to bulk generate monthly fee vouchers for **${month || 'this month'}**${className ? ` for ${className}` : ' for all active students'}?`,
              requiresConfirmation: true,
              pendingAction: {
                name: call.name,
                args: call.args,
                summary: `Bulk generate monthly fee vouchers (${month || 'Current Month'})`
              }
            })
          }

          let query = supabase
            .from('students')
            .select('id, monthly_fee, class_name')
            .eq('school_id', schoolId)
            .eq('is_active', true)

          if (className) {
            query = query.eq('class_name', className)
          }

          const { data: targetStudents, error: fetchErr } = await query

          if (fetchErr) throw fetchErr

          if (!targetStudents || targetStudents.length === 0) {
            actionResult = { success: false, error: 'No active students found matching criteria.' }
          } else {
            const feeInserts = targetStudents.map(st => ({
              school_id: schoolId,
              student_id: st.id,
              amount: st.monthly_fee || 5000,
              fee_type: 'monthly',
              month,
              due_date: dueDate,
              status: 'pending'
            }))

            const { data: insertedFees, error: insertErr } = await supabase
              .from('fees')
              .insert(feeInserts)
              .select()

            actionResult = insertErr
              ? { success: false, error: insertErr.message }
              : { success: true, generatedCount: insertedFees?.length ?? 0 }
          }

        } else if (call.name === 'updateLeaveStatus') {
          const { leaveId, status } = call.args as any
          const { data, error } = await supabase
            .from('leave_applications')
            .update({ status })
            .eq('id', leaveId)
            .eq('school_id', schoolId)
            .select()

          actionResult = error ? { success: false, error: error.message } : { success: true, data }

        } else if (call.name === 'addStudent') {
          const { fullName, className, section, rollNumber, parentName, parentPhone, parentEmail, monthlyFee } = call.args as any

          const { data: newStudent, error: studentErr } = await supabase
            .from('students')
            .insert({
              school_id: schoolId,
              full_name: fullName,
              class_name: className,
              section,
              roll_number: rollNumber,
              parent_name: parentName,
              parent_phone: parentPhone,
              parent_email: parentEmail || null,
              monthly_fee: monthlyFee || 5000,
              fee_status: 'pending',
              is_active: true,
              admission_date: today
            })
            .select()
            .single()

          if (studentErr) {
            actionResult = { success: false, error: studentErr.message }
          } else {
            if (parentEmail && parentEmail.trim()) {
              try {
                const { ensureParentAccount } = await import('@/lib/parentService')
                await ensureParentAccount({
                  schoolId,
                  email: parentEmail,
                  fullName: parentName
                })
              } catch (pErr) {
                console.error('Failed auto parent creation in AI agent:', pErr)
              }
            }
            actionResult = { success: true, student: newStudent }
          }

        } else if (call.name === 'addTeacher') {
          const { fullName, email, phone, subject, classAssigned, salary } = call.args as any

          const { data: newTeacher, error: teacherErr } = await supabase
            .from('teachers')
            .insert({
              school_id: schoolId,
              full_name: fullName,
              email,
              phone: phone || null,
              subject,
              class_assigned: classAssigned || null,
              salary: salary ? Number(salary) : null,
              is_active: true
            })
            .select()
            .single()

          actionResult = teacherErr ? { success: false, error: teacherErr.message } : { success: true, teacher: newTeacher }

        } else if (call.name === 'createExam') {
          const { examName, className, section, examDate } = call.args as any

          const { data: newExam, error: examErr } = await supabase
            .from('exams')
            .insert({
              school_id: schoolId,
              exam_name: examName,
              class_name: className,
              section: section || 'A',
              exam_date: examDate
            })
            .select()
            .single()

          actionResult = examErr ? { success: false, error: examErr.message } : { success: true, exam: newExam }

        } else if (call.name === 'addHoliday') {
          const { title, date, endDate, type, description } = call.args as any

          const { data: newHoliday, error: holidayErr } = await supabase
            .from('holidays')
            .insert({
              school_id: schoolId,
              title,
              date,
              end_date: endDate || date,
              type,
              description: description || ''
            })
            .select()
            .single()

          actionResult = holidayErr ? { success: false, error: holidayErr.message } : { success: true, holiday: newHoliday }

        } else {
          actionResult = { success: false, error: 'Unknown tool call requested.' }
        }

      } catch (err: any) {
        console.error('Failed executing AI Agent tool:', err)
        actionStatus = 'failed'
        errorMessage = err.message || 'Internal tool execution error'
        actionResult = { success: false, error: errorMessage }
      }

      // Log AI Action to ai_action_logs table in Supabase for audit trail
      try {
        await supabase.from('ai_action_logs').insert({
          school_id: schoolId,
          user_id: user.id,
          user_email: user.email,
          action_name: call.name,
          parameters: call.args,
          result: actionResult,
          status: actionResult?.success === false ? 'failed' : actionStatus,
          error_message: errorMessage || (actionResult?.success === false ? actionResult?.error : null)
        })
      } catch (auditErr) {
        console.error('Failed to log AI audit action:', auditErr)
      }

      executedActions.push({
        action: call.name,
        parameters: call.args,
        result: actionResult
      })

      // Send execution result back to Gemini for next step or conversational reply
      response = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: { result: actionResult }
        }
      }])

      functionCalls = response.response.functionCalls()
    }

    const reply = response.response.text()
    return NextResponse.json({ reply, executedActions })

  } catch (error: any) {
    console.error('AI Agent Chat error:', error)

    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
      return NextResponse.json({ error: 'Invalid Gemini API key. Check GEMINI_API_KEY in environment variables.' }, { status: 500 })
    }

    return NextResponse.json(
      { error: 'AI service temporarily unavailable. Please try again.' },
      { status: 500 }
    )
  }
}

