'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Send, Mic, MicOff, Loader2 } from 'lucide-react'

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
    const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
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
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI assistant"
          className="ai-chat-btn"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 50,
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#1e1b4b',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 20px rgba(30, 27, 75, 0.4)',
            transition: 'background 0.2s, transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Sparkles size={22} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="ai-chat-window"
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

              {/* Header Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close AI assistant"
                title="Close Chat"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="ai-chat-messages"
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

          {/* Responsive stylesheet */}
          <style>{`
            .ai-chat-window {
              position: fixed;
              bottom: 90px;
              right: 24px;
              z-index: 50;
              width: 360px;
              max-height: 560px;
              display: flex;
              flex-direction: column;
              background: white;
              border-radius: 16px;
              border: 1px solid #e5e7eb;
              box-shadow: 0 8px 40px rgba(0,0,0,0.12);
              overflow: hidden;
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .ai-chat-btn {
              transition: all 0.2s ease;
            }

            @media (max-width: 480px) {
              .ai-chat-window {
                bottom: 0 !important;
                right: 0 !important;
                width: 100% !important;
                height: 100% !important;
                max-height: 100vh !important;
                max-height: -webkit-fill-available !important;
                border-radius: 0 !important;
                border: none !important;
              }
              .ai-chat-messages {
                max-height: none !important;
              }
              .ai-chat-btn {
                bottom: 16px !important;
                right: 16px !important;
              }
            }

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
