export default function Loading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44,
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #4f46e5',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Loading…</p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
