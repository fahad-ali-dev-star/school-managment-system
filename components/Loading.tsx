export default function Loading() {
  return (
    <div style={{
      padding: '2.5rem',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1.5rem',
      width: '100%',
      maxWidth: 1200,
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      {/* Shimmering Skeletons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="skeleton-block" style={{ width: '240px', height: '36px' }} />
        <div className="skeleton-block" style={{ width: '130px', height: '40px' }} />
      </div>

      <div className="skeleton-block" style={{ width: '100%', height: '180px', borderRadius: 12 }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="skeleton-block" style={{ height: '140px', borderRadius: 12 }} />
        <div className="skeleton-block" style={{ height: '140px', borderRadius: 12 }} />
        <div className="skeleton-block" style={{ height: '140px', borderRadius: 12 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.75rem', marginTop: '1rem' }}>
        <div className="skeleton-block" style={{ width: '100%', height: '48px' }} />
        <div className="skeleton-block" style={{ width: '100%', height: '48px' }} />
        <div className="skeleton-block" style={{ width: '100%', height: '48px' }} />
      </div>

      <style>{`
        .skeleton-block {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border-radius: 8px;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
