import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const GOAL_LABELS: Record<string, string> = {
  diet: '다이어트 🔥',
  bulk: '벌크업 💪',
  maintain: '유지 ⚖️',
  endurance: '체력향상 🏃',
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: '저활동',
  moderate: '보통',
  active: '활동적',
  very_active: '매우 활동적',
}

export default async function MyPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: workoutCountData } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('finished_at', 'is', null)

  const totalWorkouts = (workoutCountData as unknown as { count: number } | null)?.count ?? 0

  const avatarLetter = (user.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase()
    ?? user.email?.[0]?.toUpperCase()
    ?? 'W'

  return (
    <main className="min-h-screen bg-[#0f0f0f]">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f] border-b border-[#2a2a2a] px-4 h-14 flex items-center">
        <h1 className="font-semibold text-[#f0f0f0]">마이</h1>
      </header>

      <div className="px-4 pt-6 pb-24 space-y-4">
        {/* 프로필 카드 */}
        <div className="bg-[#1a1a1a] rounded-[16px] p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#C8FF00] flex items-center justify-center">
            <span className="text-[#0f0f0f] text-xl font-bold">{avatarLetter}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[#f0f0f0] truncate">
              {(user.user_metadata?.full_name as string | undefined) ?? '사용자'}
            </p>
            <p className="text-xs text-[#888888] truncate mt-0.5">{user.email}</p>
          </div>
          {profile?.goal && (
            <span className="text-xs bg-[#C8FF00]/15 text-[#C8FF00] px-2.5 py-1 rounded-full font-medium shrink-0">
              {GOAL_LABELS[profile.goal] ?? profile.goal}
            </span>
          )}
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '총 운동', value: totalWorkouts, unit: '회' },
            { label: '현재 체중', value: profile?.current_weight_kg ?? '—', unit: 'kg' },
            { label: '목표 체중', value: profile?.target_weight_kg ?? '—', unit: 'kg' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-[#1a1a1a] rounded-[14px] p-3 text-center">
              <p className="text-xs text-[#888888] mb-1">{label}</p>
              <p className="text-lg font-bold text-[#f0f0f0] tabular-nums">{value}</p>
              <p className="text-[10px] text-[#555555]">{unit}</p>
            </div>
          ))}
        </div>

        {/* 프로필 정보 */}
        {profile && (
          <div className="bg-[#1a1a1a] rounded-[16px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2a2a]">
              <p className="text-sm font-semibold text-[#f0f0f0]">신체 정보</p>
            </div>
            {[
              { label: '키', value: profile.height_cm ? `${profile.height_cm}cm` : '—' },
              { label: '나이', value: profile.age ? `${profile.age}세` : '—' },
              { label: '활동량', value: profile.activity_level ? ACTIVITY_LABELS[profile.activity_level] ?? profile.activity_level : '—' },
              { label: '주 운동 횟수', value: profile.workout_days_per_week ? `${profile.workout_days_per_week}일` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] last:border-0">
                <span className="text-sm text-[#888888]">{label}</span>
                <span className="text-sm text-[#f0f0f0]">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* 영양 목표 */}
        {profile?.target_calories && (
          <div className="bg-[#1a1a1a] rounded-[16px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2a2a]">
              <p className="text-sm font-semibold text-[#f0f0f0]">영양 목표</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[#2a2a2a]">
              {[
                { label: '목표 칼로리', value: profile.target_calories, unit: 'kcal', color: '#C8FF00' },
                { label: '단백질', value: profile.target_protein_g, unit: 'g', color: '#4FC3F7' },
                { label: '탄수화물', value: profile.target_carbs_g, unit: 'g', color: '#81C784' },
                { label: '지방', value: profile.target_fat_g, unit: 'g', color: '#FFB74D' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="bg-[#1a1a1a] px-4 py-3 text-center">
                  <p className="text-[10px] text-[#888888]">{label}</p>
                  <p className="text-base font-bold tabular-nums mt-0.5" style={{ color }}>
                    {value ?? '—'}<span className="text-xs font-normal text-[#555555] ml-0.5">{unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 메뉴 링크 */}
        <div className="bg-[#1a1a1a] rounded-[16px] overflow-hidden">
          {[
            { href: '/body', label: '신체 기록', icon: '⚖️' },
            { href: '/routine', label: '나의 루틴', icon: '📋' },
            { href: '/settings', label: '설정 / 목표 수정', icon: '⚙️' },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a2a] last:border-0 hover:bg-[#242424] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <span className="text-sm text-[#f0f0f0]">{label}</span>
              </div>
              <ChevronRight size={16} className="text-[#555555]" />
            </Link>
          ))}
        </div>

        {/* 로그아웃 */}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full py-3.5 bg-[#1a1a1a] text-[#FF4B4B] font-medium rounded-[16px] text-sm"
          >
            로그아웃
          </button>
        </form>
      </div>
    </main>
  )
}
