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

// Gemini Tools declarations for actions the AI can perform
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
      date: { type: SchemaType.STRING, description: 'The date for attendance in YYYY-MM-DD format (e.g., "2026-06-29")' },
      status: { type: SchemaType.STRING, description: 'The attendance status: "present", "absent", or "late"' },
      notes: { type: SchemaType.STRING, description: 'Optional comments or notes about the attendance' }
    },
    required: ['studentId', 'date', 'status']
  } as any
}

const createFeeRecordTool = {
  name: 'createFeeRecord',
  description: 'Create a new pending fee invoice for a student.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      studentId: { type: SchemaType.STRING, description: 'The UUID of the student' },
      amount: { type: SchemaType.NUMBER, description: 'The fee amount in PKR' },
      feeType: { type: SchemaType.STRING, description: 'The description of the fee type (e.g. "Monthly Tuition", "Admission Fee")' },
      month: { type: SchemaType.STRING, description: 'The billing month (e.g. "June 2026", "July 2026")' },
      dueDate: { type: SchemaType.STRING, description: 'The payment due date in YYYY-MM-DD format' }
    },
    required: ['studentId', 'amount', 'feeType', 'month', 'dueDate']
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

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    // Auth check — same pattern used throughout the codebase
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile — same pattern as other routes (uses 'users' table, not 'profiles')
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

    // Only admin/principal can use the chatbot
    if (!['admin', 'principal'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const schoolData = (profile as any).schools
    const schoolId = profile.school_id
    const schoolName = schoolData?.name ?? 'School'
    const plan = schoolData?.plan ?? 'free'

    // Check pro plan
    if (plan === 'free') {
      return NextResponse.json({ error: 'AI features require Pro plan' }, { status: 403 })
    }

    const { message } = await req.json()

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

    // Fetch school data in parallel
    const [
      studentsRes,
      feesRes,
      attendanceRes,
      teachersRes,
      examsRes,
      marksRes,
      leavesRes,
      subjectsRes
    ] = await Promise.all([
      supabase
        .from('students')
        .select('id, full_name, roll_number, class_name, section, fee_status, is_active, parent_name, parent_phone, monthly_fee')
        .eq('school_id', schoolId)
        .eq('is_active', true),

      supabase
        .from('fees')
        .select('id, student_id, amount, fee_type, month, due_date, paid_date, status, payment_method')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(200),

      supabase
        .from('attendance')
        .select('id, student_id, date, status, notes')
        .eq('school_id', schoolId)
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: false }),

      supabase
        .from('teachers')
        .select('id, full_name, email, subject, class_assigned, is_active, salary')
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
        .eq('school_id', schoolId)
    ])

    const students = studentsRes.data ?? []
    const fees = feesRes.data ?? []
    const attendance = attendanceRes.data ?? []
    const teachers = teachersRes.data ?? []
    const exams = examsRes.data ?? []
    const marks = marksRes.data ?? []
    const leaves = leavesRes.data ?? []
    const subjects = subjectsRes.data ?? []

    // Compute summary stats for the system prompt
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
    const approvedLeaves = leaves.filter(l => l.status === 'approved').length

    // Build system prompt with school context
    const systemPrompt = `
You are an intelligent AI assistant for ${schoolName}, a school management system.
Today's date: ${today}
Language instruction: Detect the language of the user's question and reply in the SAME language.
If the user writes in Urdu (اردو), reply fully in Urdu. If in English, reply in English.

=== SCHOOL SUMMARY ===
School: ${schoolName}
Total active students: ${students.length}
Total active teachers: ${teachers.length}

=== TODAY'S ATTENDANCE (${today}) ===
Present: ${presentToday}
Absent: ${absentToday}
Late: ${lateToday}
Total marked: ${todayAttendance.length}
Attendance rate: ${students.length > 0 ? Math.round((presentToday / students.length) * 100) : 0}%

=== FEE STATUS ===
Students with pending fees: ${pendingFees.length}
Total pending amount: PKR ${totalPendingAmount.toLocaleString()}
Students with overdue fees: ${overdueFees.length}
Total overdue amount: PKR ${totalOverdueAmount.toLocaleString()}
Total collected this month: PKR ${totalCollectedThisMonth.toLocaleString()}

=== LEAVE APPLICATIONS ===
Pending leaves: ${pendingLeaves}
Approved leaves: ${approvedLeaves}

=== FULL DATA (use for specific lookups) ===
STUDENTS: ${JSON.stringify(students.slice(0, 150))}
FEES (recent 200): ${JSON.stringify(fees)}
LAST 7 DAYS ATTENDANCE: ${JSON.stringify(attendance.slice(0, 300))}
TEACHERS: ${JSON.stringify(teachers)}
EXAMS: ${JSON.stringify(exams)}
EXAM SUBJECTS: ${JSON.stringify(subjects)}
MARKS (recent 300): ${JSON.stringify(marks)}
LEAVES (recent 100): ${JSON.stringify(leaves)}

=== ACTIONS / CAPABILITIES ===
You are equipped with tools to perform real-time actions. If the administrator requests you to do any of the following, call the appropriate tool instead of just answering with text:
1. Send an SMS or WhatsApp notification to parents/others.
2. Mark attendance (present/absent/late) for any student.
3. Create a pending fee invoice for a student.
4. Approve or reject a leave request.

=== RESPONSE RULES ===
- Be concise but complete.
- Use PKR for currency amounts.
- When listing students, include name, class, roll number.
- When writing in Urdu, use proper Urdu script (not Roman Urdu).
- If asked to send a notification, always confirm the message contents and the channel (sms/whatsapp/both) and then invoke the tool.
- If asked something you don't have data for, say so honestly.
- Never make up data that isn't in the context above.
    `.trim()

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{
        functionDeclarations: [
          sendNotificationTool,
          markAttendanceTool,
          createFeeRecordTool,
          updateLeaveStatusTool
        ]
      }]
    })

    // Start a chat to cleanly process tool calls and return conversational confirmation
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I have loaded the school database context and am ready to assist you or perform actions.' }] }
      ]
    })

    let response = await chat.sendMessage(`Admin's request: ${message.trim()}`)
    const functionCalls = response.response.functionCalls()

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0]
      let actionResult: any

      try {
        if (call.name === 'sendNotification') {
          const { to, message: msgText, channel } = call.args as any
          actionResult = await sendNotification(to, msgText, channel)
        } else if (call.name === 'markAttendance') {
          const { studentId, date, status, notes } = call.args as any
          
          // Prevent duplicate key constraints by checking if the record already exists
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
          if (existing?.id) {
            upsertData.id = existing.id
          }

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
        } else if (call.name === 'updateLeaveStatus') {
          const { leaveId, status } = call.args as any
          const { data, error } = await supabase
            .from('leave_applications')
            .update({ status })
            .eq('id', leaveId)
            .eq('school_id', schoolId)
            .select()

          actionResult = error ? { success: false, error: error.message } : { success: true, data }
        } else {
          actionResult = { success: false, error: 'Unknown tool call requested.' }
        }
      } catch (err: any) {
        console.error('Failed executing tool:', err)
        actionResult = { success: false, error: err.message || 'Internal tool execution error' }
      }

      // Send the execution response back to Gemini to get a final conversational reply
      response = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: { result: actionResult }
        }
      }])
    }

    const reply = response.response.text()
    return NextResponse.json({ reply })

  } catch (error: any) {
    console.error('AI Chat error:', error)

    // Handle Gemini API specific errors
    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
      return NextResponse.json({ error: 'Invalid Gemini API key. Check GEMINI_API_KEY in environment variables.' }, { status: 500 })
    }

    return NextResponse.json(
      { error: 'AI service temporarily unavailable. Please try again.' },
      { status: 500 }
    )
  }
}
