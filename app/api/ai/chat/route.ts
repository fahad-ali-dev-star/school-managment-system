import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Initialize generative AI outside handler, checking key dynamically
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('API_KEY_INVALID')
  }
  return new GoogleGenerativeAI(apiKey)
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

    // Fetch school data in parallel — uses exact table names from the codebase:
    // 'students', 'fees', 'attendance', 'teachers'
    const [studentsRes, feesRes, attendanceRes, teachersRes] = await Promise.all([
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
    ])

    const students = studentsRes.data ?? []
    const fees = feesRes.data ?? []
    const attendance = attendanceRes.data ?? []
    const teachers = teachersRes.data ?? []

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

=== FULL DATA (use for specific name/class lookups) ===
STUDENTS: ${JSON.stringify(students.slice(0, 150))}
FEES (recent 200): ${JSON.stringify(fees)}
LAST 7 DAYS ATTENDANCE: ${JSON.stringify(attendance.slice(0, 300))}
TEACHERS: ${JSON.stringify(teachers)}

=== RESPONSE RULES ===
- Be concise but complete
- Use PKR for currency amounts
- When listing students, include name, class, roll number
- If asked to write a WhatsApp or SMS message, write a proper professional message
- For fee reminders, make the tone polite but firm
- When writing in Urdu, use proper Urdu script (not Roman Urdu)
- If asked something you don't have data for, say so honestly
- Never make up data that isn't in the context above
    `.trim()

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Admin's question: ${message.trim()}` }
    ])

    const reply = result.response.text()

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
