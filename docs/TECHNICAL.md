# W.E — Technical Architecture Document

**버전**: 1.0  
**최종 수정**: 2026-04-09

---

## 1. 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| Framework | Next.js (App Router) | 14.2.29 |
| Language | TypeScript | 5.7 |
| Styling | Tailwind CSS | 3.4 |
| Animation | Framer Motion | 11.15 |
| Chart | Recharts | 2.15 |
| Heatmap | react-calendar-heatmap | 1.9 |
| Icons | lucide-react | 0.474 |
| DB/Auth | Supabase | 2.49 |
| AI (주) | Anthropic Claude Sonnet | SDK 0.37 |
| AI (폴백) | Google Gemini 2.5 Flash | SDK 0.24 |
| PWA | @ducanh2912/next-pwa | 10.2 |
| 배포 | Vercel | - |

---

## 2. 프로젝트 구조

```
src/
├── app/                          # Next.js App Router 페이지
│   ├── api/
│   │   ├── analyze-food-photo/   # AI 식품 사진 분석
│   │   ├── generate-routine/     # AI 루틴 생성
│   │   └── search-foods/         # 식품 검색
│   ├── auth/
│   │   ├── callback/             # OAuth 콜백
│   │   └── signout/              # 로그아웃
│   ├── admin/                    # 관리자 패널
│   ├── body/                     # 신체 데이터
│   ├── dashboard/                # 통계 대시보드
│   ├── diet/
│   │   ├── page.tsx              # 식단 메인
│   │   └── add/                  # 음식 추가
│   ├── fasting/                  # 간헐적 단식
│   ├── login/                    # 로그인
│   ├── my/                       # 마이 페이지
│   ├── onboarding/               # 온보딩
│   ├── routine/                  # AI 루틴
│   ├── settings/                 # 설정
│   ├── suggestions/              # 건의사항
│   ├── workout/
│   │   ├── new/                  # 운동 기록
│   │   └── [id]/                 # 운동 상세
│   ├── globals.css
│   ├── layout.tsx                # 루트 레이아웃
│   └── page.tsx                  # 홈
├── components/
│   ├── dashboard/                # 차트 컴포넌트
│   ├── diet/                     # 식단 컴포넌트
│   ├── home/                     # 홈 컴포넌트
│   ├── providers/                # Context Providers
│   ├── ui/                       # 공통 UI 컴포넌트
│   └── workout/                  # 운동 컴포넌트
├── lib/
│   ├── hooks/                    # 커스텀 훅
│   ├── supabase/                 # Supabase 클라이언트
│   └── utils/                   # 유틸리티 함수
└── middleware.ts                 # 인증 미들웨어
```

---

## 3. 인증 아키텍처

### 3.1 인증 흐름

```
사용자 → /login
  → Supabase signInWithOAuth (Google)
  → Google OAuth 동의
  → /auth/callback?code=xxx
  → exchangeCodeForSession()
  → user_profiles 존재 확인
    ├─ 없음 → /onboarding
    └─ 있음 → /
```

### 3.2 미들웨어 보호 (middleware.ts)

```typescript
// 공개 경로: /login, /auth/*
// 나머지 모든 경로: 세션 필요
// 미인증 → /login 리다이렉트
// 인증 + /login 접근 → / 리다이렉트
```

### 3.3 Supabase 클라이언트 구분

| 환경 | 파일 | 함수 | 용도 |
|------|------|------|------|
| 서버 컴포넌트 | `lib/supabase/server.ts` | `createServerClient` | SSR 데이터 페칭 |
| 클라이언트 컴포넌트 | `lib/supabase/client.ts` | `createBrowserClient` | 브라우저 상호작용 |
| API Route | `lib/supabase/server.ts` | `createServerClient` | 서버 사이드 작업 |

**주의**: `@supabase/ssr` 패키지 사용. `auth-helpers-nextjs`는 deprecated.

---

## 4. 데이터베이스 스키마

### 4.1 테이블 목록 (13개)

#### user_profiles
```sql
id              uuid PRIMARY KEY (= auth.users.id)
goal            text  -- 'diet' | 'muscle' | 'endurance' | 'maintain'
gender          text  -- 'male' | 'female'
age             int
height          float
weight          float
activity_level  text  -- 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
equipment       text[]
workout_days    int
dietary_restrictions text[]
calorie_goal    int
protein_goal    int
carb_goal       int
fat_goal        int
is_admin        boolean
created_at      timestamptz
updated_at      timestamptz
```

#### workouts
```sql
id          uuid PRIMARY KEY
user_id     uuid REFERENCES auth.users
started_at  timestamptz
ended_at    timestamptz
duration    int  -- seconds
notes       text
created_at  timestamptz
```

#### exercises (마스터 DB)
```sql
id          uuid PRIMARY KEY
name        text
muscle_group text  -- 'chest' | 'back' | 'shoulder' | 'legs' | 'arms' | 'core'
equipment   text  -- 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight'
brand       text  -- 머신 브랜드 (nullable)
is_custom   boolean
created_by  uuid  -- 직접 추가한 종목
```

#### workout_exercises
```sql
id          uuid PRIMARY KEY
workout_id  uuid REFERENCES workouts
exercise_id uuid REFERENCES exercises
order_index int
```

#### sets
```sql
id                  uuid PRIMARY KEY
workout_exercise_id uuid REFERENCES workout_exercises
set_number          int
weight              float  -- kg
reps                int
rest_seconds        int
one_rm              float  -- 자동 계산
set_type            text  -- 'normal' | 'warmup' | 'dropset'
completed           boolean
created_at          timestamptz
```

#### foods (마스터 DB)
```sql
id          uuid PRIMARY KEY
name        text
brand       text
calories    float  -- per 100g
protein     float
carbs       float
fat         float
serving_size float
source      text  -- 'local' | 'api' | 'ai'
```

#### meals
```sql
id          uuid PRIMARY KEY
user_id     uuid REFERENCES auth.users
meal_type   text  -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
logged_at   date
created_at  timestamptz
```

#### meal_items
```sql
id          uuid PRIMARY KEY
meal_id     uuid REFERENCES meals
food_id     uuid REFERENCES foods (nullable)
name        text  -- 직접 입력 시
amount      float  -- grams
calories    float
protein     float
carbs       float
fat         float
```

#### meal_templates / meal_template_items
```sql
-- 식사 템플릿 (자주 먹는 식사 저장)
meal_templates:       id, user_id, name, meal_type
meal_template_items:  id, template_id, food_id, name, amount, calories, protein, carbs, fat
```

#### body_stats
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users
weight          float
body_fat        float  -- %
muscle_mass     float
photo_url       text   -- Supabase Storage
recorded_at     date
```

#### ai_routines
```sql
id          uuid PRIMARY KEY
user_id     uuid REFERENCES auth.users
routine     jsonb  -- AI 생성 루틴 전체
is_active   boolean
created_at  timestamptz
```

#### suggestions
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users
title           text
content         text
status          text  -- 'pending' | 'reviewing' | 'resolved'
admin_reply     text
created_at      timestamptz
```

### 4.2 RLS 정책

모든 테이블에 RLS 활성화. 핵심 패턴:

```sql
-- 직접 user_id 비교
CREATE POLICY "user_own" ON meals
  FOR ALL USING (auth.uid() = user_id);

-- 서브쿼리 간접 검증 (workout_exercises, sets)
CREATE POLICY "user_own" ON sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = sets.workout_exercise_id
        AND w.user_id = auth.uid()
    )
  );

-- exercises: 공개 읽기 + 본인 커스텀 쓰기
CREATE POLICY "read_all" ON exercises FOR SELECT USING (true);
CREATE POLICY "insert_own" ON exercises FOR INSERT WITH CHECK (created_by = auth.uid());
```

---

## 5. AI 클라이언트 아키텍처

### 5.1 하이브리드 AI (ai-client.ts)

```
요청
  │
  ├─ generateText() / analyzeImageWithText()
  │
  ├─ 1차: Anthropic Claude Sonnet
  │     성공 → 결과 반환
  │     실패 (크레딧 부족, 오류) ↓
  │
  └─ 2차: Google Gemini 2.5 Flash
        성공 → 결과 반환
        실패 → 에러 throw
```

### 5.2 사용 가능 모델 (2026-04 확인)

| 공급사 | 모델 ID | 용도 |
|--------|---------|------|
| Anthropic | `claude-sonnet-4-20250514` | 텍스트 + 비전 |
| Google | `gemini-2.5-flash` | 텍스트 + 비전 |

**주의**: Gemini 1.5/2.0 계열은 이 API 키에서 404 반환. 반드시 2.5 이상 사용.

### 5.3 AI 응답 파싱

Claude/Gemini 응답에서 JSON 추출:
```typescript
const match = text.match(/\{[\s\S]*\}/);
const json = JSON.parse(match[0]);
```
마크다운 펜스(```json ... ```) 방어 목적.

---

## 6. 주요 비즈니스 로직

### 6.1 TDEE 계산 (tdee.ts)

**공식: Mifflin-St Jeor**
```
BMR (남성) = 10W + 6.25H - 5A + 5
BMR (여성) = 10W + 6.25H - 5A - 161

TDEE = BMR × 활동계수
  sedentary:   × 1.2
  light:       × 1.375
  moderate:    × 1.55
  active:      × 1.725
  very_active: × 1.9
```

**목표별 칼로리 조정**
```
diet:       TDEE - 400
muscle:     TDEE + 250
maintain:   TDEE
endurance:  TDEE + 100
```

### 6.2 탄수화물 사이클링

```typescript
// 당일 운동 기록 존재 여부로 운동일/휴식일 판단
const isWorkoutDay = todayWorkouts.length > 0;
const carbMultiplier = isWorkoutDay ? 1.3 : 0.7;
const adjustedCarbGoal = Math.round(profile.carb_goal * carbMultiplier);
```

### 6.3 1RM 계산 (1rm.ts)

Stone 공식:
```
1RM = weight × (1 + reps / 30)
```

### 6.4 운동 타이머 복원

페이지 이탈 후 복귀 시 타이머 상태 유지:
```typescript
// localStorage에 저장
{ timerStartAt: Date.now(), duration: elapsed }

// 복귀 시 계산
const elapsed = (Date.now() - timerStartAt) + duration;
```

### 6.5 식품 검색 우선순위

```
1. Supabase foods 테이블 (로컬 DB)
2. 정부 식품안전나라 API (data.go.kr)
   └─ 결과 자동 캐싱 → foods 테이블
3. AI 추정 (DB + API 모두 없을 때)
   └─ 결과 자동 캐싱 → foods 테이블
```

---

## 7. API 라우트 명세

### POST /api/analyze-food-photo

```
Request:  multipart/form-data { image: File }
Response: {
  name: string,
  amount: number,      // grams
  calories: number,
  protein: number,
  carbs: number,
  fat: number
}

처리 순서:
1. AI 이미지 분석 → 식품명 추출
2. 로컬 DB 검색
3. 정부 API 검색
4. AI 영양 추정 (없을 때)
```

### GET /api/search-foods

```
Request:  ?q=검색어
Response: Array<{
  id: string,
  name: string,
  brand?: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  serving_size: number
}>
```

### POST /api/generate-routine

```
Request: {
  profile: {
    goal, gender, age, height, weight,
    activity_level, equipment, workout_days,
    dietary_restrictions
  }
}
Response: {
  summary: {
    tdee: number,
    calorie_goal: number,
    protein_goal: number,
    carb_goal: number,
    fat_goal: number,
    description: string
  },
  schedule: {
    [day: string]: {
      focus: string,
      exercises: Array<{ name, sets, reps, rest }>
    }
  },
  rest_days: string[]
}
```

---

## 8. 환경변수

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | O | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | O | Supabase 익명 키 |
| `ANTHROPIC_API_KEY` | 권장 | Claude API 키 |
| `GEMINI_API_KEY` | 권장 | Gemini API 키 (폴백) |
| `FOOD_SAFETY_API_KEY` | 선택 | 식품안전나라 API 키 |

**Vercel 배포 시 주의**: `.env.local`과 별개로 Vercel 대시보드에서 직접 설정 필요.

---

## 9. 디자인 시스템

### 색상 토큰

```css
--bg-primary:   #0f0f0f   /* 배경 */
--bg-secondary: #1a1a1a   /* 카드 */
--bg-tertiary:  #242424   /* 입력창 */
--accent:       #C8FF00   /* 라임 — 버튼, 강조 */
--danger:       #FF4B4B
--success:      #00D67C
--border:       #2a2a2a
--text-primary: #f0f0f0
--text-muted:   #888888
```

### 레이아웃

- 최대 너비: **430px**, 중앙 정렬
- 하단 네비게이션: 5탭 (홈 / 통계 / 식단 / 신체 / 마이)
- 폰트: **Pretendard Variable**

### 애니메이션 컨벤션

- 세트 완료 체크: `scale 1 → 1.2 → 1` (0.2s)
- 페이지 전환: 슬라이드 / 페이드 (Framer Motion)

---

## 10. 알려진 이슈 & 주의사항

| 이슈 | 원인 | 해결책 |
|------|------|--------|
| Gemini 1.5/2.0 404 | API 키 제한 | `gemini-2.5-flash` 고정 사용 |
| Claude 크레딧 소진 시 AI 실패 | 폴백 누락 | ai-client.ts 폴백 로직 확인 |
| 운동 완료 후 시작 화면 플래시 | 상태 초기화 타이밍 | `redirecting` 플래그 사용 |
| 식품안전나라 API 키 만료 | 외부 API | data.go.kr 재신청 필요 |
| MCP 툴 서브에이전트 차단 | 권한 정책 | 메인 세션에서만 MCP 호출 |

자세한 에러 로그 및 해결 이력은 `CLAUDE.md` 참고.
