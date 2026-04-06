export default function DashboardLoading() {
  return (
    <div style={{
      backgroundColor: '#0f0f0f', minHeight: '100vh',
      maxWidth: '430px', margin: '0 auto',
      paddingBottom: '96px', color: '#f0f0f0',
      fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
    }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        backgroundColor: '#0f0f0f', borderBottom: '1px solid #2a2a2a',
        padding: '16px 20px',
      }}>
        <div style={{ width: 60, height: 24, backgroundColor: '#242424', borderRadius: 8 }} />
      </header>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Stat Pills skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a',
              borderRadius: '12px', padding: '14px 16px',
            }}>
              <div style={{ width: 60, height: 12, backgroundColor: '#242424', borderRadius: 6, marginBottom: 8 }} />
              <div style={{ width: 80, height: 20, backgroundColor: '#2a2a2a', borderRadius: 6 }} />
            </div>
          ))}
        </div>

        {/* Section skeletons */}
        {[180, 240, 160, 200].map((h, i) => (
          <div key={i} style={{ marginBottom: '24px' }}>
            <div style={{ width: 120, height: 16, backgroundColor: '#242424', borderRadius: 6, marginBottom: 10 }} />
            <div style={{
              backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a',
              borderRadius: '16px', padding: '16px', height: h,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '100%', height: '80%',
                background: 'linear-gradient(90deg, #1a1a1a 0%, #242424 50%, #1a1a1a 100%)',
                borderRadius: 8,
                animation: 'shimmer 1.5s infinite',
              }} />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
