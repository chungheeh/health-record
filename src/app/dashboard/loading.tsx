export default function DashboardLoading() {
  return (
    <div style={{
      backgroundColor: 'var(--bg-primary)', minHeight: '100vh',
      maxWidth: '430px', margin: '0 auto',
      paddingBottom: '96px', color: 'var(--text-primary)',
      fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
    }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border)',
        padding: '16px 20px',
      }}>
        <div style={{ width: 60, height: 24, backgroundColor: 'var(--bg-tertiary)', borderRadius: 8 }} />
      </header>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Stat Pills skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '14px 16px',
            }}>
              <div style={{ width: 60, height: 12, backgroundColor: 'var(--bg-tertiary)', borderRadius: 6, marginBottom: 8 }} />
              <div style={{ width: 80, height: 20, backgroundColor: 'var(--border)', borderRadius: 6 }} />
            </div>
          ))}
        </div>

        {/* Section skeletons */}
        {[180, 240, 160, 200].map((h, i) => (
          <div key={i} style={{ marginBottom: '24px' }}>
            <div style={{ width: 120, height: 16, backgroundColor: 'var(--bg-tertiary)', borderRadius: 6, marginBottom: 10 }} />
            <div style={{
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '16px', height: h,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '100%', height: '80%',
                background: 'linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-tertiary) 50%, var(--bg-secondary) 100%)',
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
