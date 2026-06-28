# 🤖 AI Chatbot Integration — Beacon Light School ERP

> Complete implementation guide for GitHub Copilot / AI coding assistants.
> Built for Next.js 14 + Supabase + Gemini 1.5 Flash (free tier).
> Includes voice input in Urdu and English using Web Speech API.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Step 1 — Install Dependencies](#step-1--install-dependencies)
6. [Step 2 — Environment Variables](#step-2--environment-variables)
7. [Step 3 — Create API Route](#step-3--create-api-route)
8. [Step 4 — Create AIChatbot Component](#step-4--create-aichatbot-component)
9. [Step 5 — Add to Dashboard Layout](#step-5--add-to-dashboard-layout)
10. [Step 6 — Gate Behind Pro Plan](#step-6--gate-behind-pro-plan)
11. [Voice Input Implementation](#voice-input-implementation)
12. [Example Prompts to Test](#example-prompts-to-test)
13. [Exact Table Names Reference](#exact-table-names-reference)
14. [Error Handling](#error-handling)
15. [File Structure Summary](#file-structure-summary)

---

## Overview

This feature adds a floating AI chatbot to the admin dashboard that can answer questions about the school's data in plain English or Urdu. It uses:

- **Google Gemini 1.5 Flash** — free AI model, 1 million tokens/day free limit
- **Web Speech API** — built-in browser API, no extra package needed for voice
- **Your existing Supabase data** — passes live school data to Gemini as context
- **Your existing auth pattern** — uses the same `users` table and `getProfile` pattern already in the codebase

The chatbot is gated behind the `pro` plan using your existing `PlanGate` component.

---

## Features

- 💬 Text chat with school data awareness
- 🎤 Voice input — speak in Urdu or English, text appears automatically
- 🌐 Bilingual — Gemini responds in the same language the admin uses
- 📊 Answers questions about students, fees, attendance, exams, teachers
- ✍️ Writes WhatsApp/SMS notification messages on request
- 🔒 Pro plan only — uses existing `PlanGate` and `canAccess` logic
- 🎯 Context-aware — always knows which school's data to query (multi-tenant safe)

---

## Architecture

```
Admin types or speaks a question
        ↓
AIChatbot.tsx (Client Component)
        ↓
POST /api/ai/chat   ← Next.js API Route (Server)
        ↓
Fetch school data from Supabase
(students, fees, attendance, teachers tables)
        ↓
Build system prompt with live data + user question
        ↓
Call Gemini 1.5 Flash API
        ↓
Return AI reply → display in chat bubble
```

---

## Prerequisites

Before starting, make sure you have:

- [ ] A Google account to get a Gemini API key
- [ ] Access to your `.env.local` file
- [ ] Access to your Vercel project environment variables

---

## Step 1 — Install Dependencies

Run this in the project root:

```bash
npm install @google/generative-ai
```

That's the only new package needed. Voice input uses the browser's built-in Web Speech API — no package required.

---

## Step 2 — Environment Variables

### `.env.local` (local development)

Add this line:

```env
GEMINI_API_KEY=your_api_key_here
```

### How to get the free Gemini API key

1. Go to https://aistudio.google.com
2. Sign in with your Google account
3. Click **Get API Key** → **Create API key**
4. Copy the key (starts with `AIzaSy...`)
5. Paste it as the value above

### Vercel (production)

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add: `GEMINI_API_KEY` = your key
4. Redeploy

---

## Step 3 — Create API Route

Create this file exactly at this path:

**`app/api/ai/chat/route.ts`**

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

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

    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Fetch school data in parallel — uses exact table names from the codebase:
    // 'students', 'fees', 'attendance', 'teachers', 'classes'
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

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Admin's question: ${message.trim()}` }
    ])

    const reply = result.response.text()

    return NextResponse.json({ reply })

  } catch (error: any) {
    console.error('AI Chat error:', error)

    // Handle Gemini API specific errors
    if (error?.message?.includes('API_KEY_INVALID')) {
      return NextResponse.json({ error: 'Invalid Gemini API key. Check GEMINI_API_KEY in environment variables.' }, { status: 500 })
    }

    return NextResponse.json(
      { error: 'AI service temporarily unavailable. Please try again.' },
      { status: 500 }
    )
  }
}
```

---

## Step 4 — Create AIChatbot Component

Create this file:

**`components/AIChatbot.tsx`**

```tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Send, Mic, MicOff, Loader2, MessageSquare } from 'lucide-react'

interface Message {
  role: 'user' | 'ai'
  content: string
  timestamp: Date
}

// Suggested quick questions shown in the chat
const SUGGESTIONS = [
  'How many students have overdue fees?',
  'Who was absent today?',
  'Total fee collection this month?',
  'Which class has lowest attendance?',
  'Write a WhatsApp fee reminder message',
  'کتنے طلباء کی فیس باقی ہے؟',
  'آج کتنے طلباء غیر حاضر تھے؟',
]

// Web Speech API types (built into browsers, no package needed)
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: 'السلام علیکم! میں آپ کے اسکول کا AI اسسٹنٹ ہوں۔\n\nHello! I am your school AI assistant. Ask me anything about students, fees, attendance, or request me to write notification messages. You can type or use the microphone 🎤',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voiceLang, setVoiceLang] = useState<'ur-PK' | 'en-US'>('ur-PK')
  const [showSuggestions, setShowSuggestions] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Cleanup voice recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    setShowSuggestions(false)
    setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: new Date() }])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      setMessages(prev => [
        ...prev,
        { role: 'ai', content: data.reply, timestamp: new Date() }
      ])
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}`,
          timestamp: new Date()
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  // Voice input using Web Speech API — supports Urdu and English
  const startVoiceInput = useCallback(() => {
    setVoiceError(null)

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    // Stop if already listening
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    // Language setting: 'ur-PK' for Urdu, 'en-US' for English
    recognition.lang = voiceLang
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setVoiceError(null)
    }

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')

      // Show interim results in the input field
      setInput(transcript)

      // If final result, auto-send
      if (event.results[event.results.length - 1].isFinal) {
        setInput(transcript)
      }
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      switch (event.error) {
        case 'not-allowed':
          setVoiceError('Microphone access denied. Please allow microphone in browser settings.')
          break
        case 'no-speech':
          setVoiceError('No speech detected. Please try again.')
          break
        case 'network':
          setVoiceError('Network error. Please check your connection.')
          break
        default:
          setVoiceError(`Voice error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }, [isListening, voiceLang])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Open AI assistant"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 50,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isOpen ? '#374151' : '#1e1b4b',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 4px 20px rgba(30, 27, 75, 0.4)',
          transition: 'background 0.2s',
        }}
      >
        {isOpen ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '24px',
            zIndex: 50,
            width: '360px',
            maxHeight: '560px',
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: '#1e1b4b',
              color: 'white',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>School AI Assistant</div>
              <div style={{ fontSize: '11px', opacity: 0.75 }}>Powered by Gemini • Urdu & English</div>
            </div>

            {/* Voice language toggle */}
            <button
              onClick={() => setVoiceLang(prev => prev === 'ur-PK' ? 'en-US' : 'ur-PK')}
              title={`Voice language: ${voiceLang === 'ur-PK' ? 'Urdu' : 'English'} — click to switch`}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 8px',
                cursor: 'pointer',
              }}
            >
              {voiceLang === 'ur-PK' ? '🇵🇰 اردو' : '🇺🇸 EN'}
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minHeight: 0,
              maxHeight: '340px',
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 12px',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.role === 'user' ? '#1e1b4b' : '#f3f4f6',
                    color: msg.role === 'user' ? 'white' : '#111827',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    // Right-to-left for Urdu text detection
                    direction: /[\u0600-\u06FF]/.test(msg.content) ? 'rtl' : 'ltr',
                    textAlign: /[\u0600-\u06FF]/.test(msg.content) ? 'right' : 'left',
                  }}
                >
                  {msg.content}
                </div>
                <span style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    background: '#f3f4f6',
                    borderRadius: '12px 12px 12px 2px',
                    padding: '10px 14px',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                  }}
                >
                  <Loader2 size={14} color="#6b7280" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Thinking...</span>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showSuggestions && messages.length === 1 && (
              <div style={{ marginTop: '4px' }}>
                <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>Try asking:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      style={{
                        fontSize: '11px',
                        padding: '5px 10px',
                        borderRadius: '20px',
                        border: '1px solid #e0e7ff',
                        background: '#eef2ff',
                        color: '#4338ca',
                        cursor: 'pointer',
                        direction: /[\u0600-\u06FF]/.test(s) ? 'rtl' : 'ltr',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice error */}
          {voiceError && (
            <div
              style={{
                padding: '8px 12px',
                background: '#fef2f2',
                borderTop: '1px solid #fecaca',
                fontSize: '11px',
                color: '#b91c1c',
                flexShrink: 0,
              }}
            >
              {voiceError}
            </div>
          )}

          {/* Input Row */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid #f3f4f6',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              flexShrink: 0,
              background: 'white',
            }}
          >
            {/* Microphone button */}
            <button
              onClick={startVoiceInput}
              title={isListening ? 'Listening... click to stop' : `Voice input (${voiceLang === 'ur-PK' ? 'Urdu' : 'English'}) — click language button in header to switch`}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: isListening ? '2px solid #dc2626' : '1px solid #e5e7eb',
                background: isListening ? '#fef2f2' : '#f9fafb',
                color: isListening ? '#dc2626' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                animation: isListening ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? '🎤 Listening...' : 'Type or speak your question...'}
              disabled={isLoading}
              dir={/[\u0600-\u06FF]/.test(input) ? 'rtl' : 'ltr'}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '20px',
                border: '1px solid #e5e7eb',
                fontSize: '13px',
                outline: 'none',
                background: isLoading ? '#f9fafb' : 'white',
                color: '#111827',
                fontFamily: 'inherit',
              }}
            />

            {/* Send button */}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: input.trim() && !isLoading ? '#1e1b4b' : '#e5e7eb',
                color: input.trim() && !isLoading ? 'white' : '#9ca3af',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <Send size={15} />
            </button>
          </div>

          {/* Listening animation style */}
          <style>{`
            @keyframes pulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.3); }
              50% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
```

---

## Step 5 — Add to Dashboard Layout

Open the file `app/dashboard/layout.tsx` and import and add the chatbot component:

```tsx
// At the top of app/dashboard/layout.tsx — add this import
import AIChatbot from '@/components/AIChatbot'

// Inside your layout's return — add <AIChatbot /> just before the closing tag
// Example:
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* your existing sidebar and content */}
      {children}
      <AIChatbot />   {/* ← add this line */}
    </div>
  )
}
```

---

## Step 6 — Gate Behind Pro Plan

The API route already rejects non-pro users. But you can also hide the UI bubble for free users.

If your layout has access to `currentPlan`, wrap the component:

```tsx
import PlanGate from '@/components/PlanGate'

// Inside your layout:
<PlanGate currentPlan={currentPlan} feature="hasAnalytics">
  <AIChatbot />
</PlanGate>
```

This shows a lock icon to free/basic users instead of the chatbot.

---

## Voice Input Implementation

The voice feature uses the **Web Speech API** which is built into Chrome, Edge, and Safari — no package required.

### Language Toggle

There is a language button in the chat header that toggles between:

| Button label | Language code | What it recognizes |
|---|---|---|
| 🇵🇰 اردو | `ur-PK` | Urdu (spoken in Pakistan) |
| 🇺🇸 EN | `en-US` | English (American accent works best) |

Admin clicks the language button in the header BEFORE clicking the microphone.

### How voice works

1. Admin clicks the language toggle to pick Urdu or English
2. Admin clicks the microphone button (🎤)
3. Browser asks for microphone permission (only first time)
4. Admin speaks — text appears live in the input field
5. When done speaking, recognition stops automatically
6. Admin presses Enter or the Send button to send the message

### Browser support

| Browser | Support |
|---|---|
| Chrome (desktop & Android) | ✅ Full support |
| Edge | ✅ Full support |
| Safari (iOS & Mac) | ✅ Supported |
| Firefox | ❌ Not supported |

If unsupported, a clear error message appears in the chat.

### Urdu display

The input field automatically switches to right-to-left direction when Urdu text is detected. This happens using Unicode range detection: if the text contains characters in the range `\u0600-\u06FF` (Arabic/Urdu script), the field flips to RTL. No manual switching needed.

---

## Example Prompts to Test

After setup, test these in the chatbot:

**English:**
- `How many students have overdue fees?`
- `Who was absent today?`
- `Which class has the most students?`
- `Show me total fee collection this month`
- `Write a WhatsApp message for students with pending fees`
- `List all teachers and their assigned classes`

**Urdu (type or speak):**
- `کتنے طلباء کی فیس باقی ہے؟`
- `آج کتنے طلباء غیر حاضر تھے؟`
- `سب سے زیادہ فیس کس طالب علم پر باقی ہے؟`
- `فیس یاددہانی کے لیے واٹس ایپ پیغام لکھو`

---

## Exact Table Names Reference

These are the actual Supabase table names used in this codebase (verified from existing routes):

| Table | Used in route | What it stores |
|---|---|---|
| `users` | All routes | Auth profiles, roles, school_id |
| `schools` | `users` join | School name, plan, billing |
| `students` | `/api/students` | Student records |
| `fees` | `/api/fees` | Fee records (NOT `fee_records`) |
| `attendance` | `/api/attendance` | Attendance (NOT `attendance_records`) |
| `teachers` | `/api/teachers` | Teacher records |
| `classes` | `/api/classes` | Class definitions |

> ⚠️ Important: The AI route uses `fees` (not `fee_records`) and `attendance` (not `attendance_records`). These are the exact names confirmed from reading the existing route files.

---

## Error Handling

| Error | Cause | Fix |
|---|---|---|
| `Invalid Gemini API key` | Wrong or missing key | Check `GEMINI_API_KEY` in `.env.local` and Vercel |
| `AI features require Pro plan` | School is on free plan | Upgrade plan in billing, or test with a pro school |
| `Microphone access denied` | Browser blocked mic | Go to browser site settings → Allow microphone |
| `No speech detected` | Mic picked up nothing | Speak louder, closer to mic, or in quieter environment |
| `Voice input not supported` | Firefox or old browser | Switch to Chrome or Edge |
| `Unauthorized` | Not logged in or session expired | Refresh and log back in |

---

## File Structure Summary

After implementation, these are the new/modified files:

```
app/
  api/
    ai/
      chat/
        route.ts          ← NEW: Gemini API route
  dashboard/
    layout.tsx            ← MODIFIED: Add <AIChatbot /> import and usage

components/
  AIChatbot.tsx           ← NEW: Full chat UI + voice input

.env.local                ← MODIFIED: Add GEMINI_API_KEY
```

Vercel environment variables:
```
GEMINI_API_KEY = AIzaSy...   ← ADD THIS
```

---

## Notes for Copilot

- The auth pattern uses `supabase.from('users')` — NOT `supabase.from('profiles')`
- The fees table is named `fees` — NOT `fee_records`
- The attendance table is named `attendance` — NOT `attendance_records`
- `school_id` is on the `users` table, joined with `schools` table
- `PlanGate` component requires `currentPlan` prop explicitly — it does not read it from context
- The component uses `position: fixed` which is fine here since it's NOT inside an artifact/iframe
- Lucide icons already installed — use `Sparkles`, `X`, `Send`, `Mic`, `MicOff`, `Loader2`
- Do NOT use `position: fixed` inside the chat window itself — only on the outer wrapper
- Voice recognition works without any npm package — use `window.SpeechRecognition` directly
