# W.E (Workout & Eat) — CLAUDE.md

## 프로젝트 한 줄 요약
번핏 + 팻시크릿을 모방한 운동/식단 기록 PWA.
**모토: "운동과 식단 — 운동은 먹는 것까지다"**
Next.js 14 (App Router) + Supabase + Claude API.

## 기술 스택
- Frontend: Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, Recharts
- Backend: Supabase (Auth + PostgreSQL + RLS) — 프로젝트 ID: `irfvzqrqnimhhfwetdgu`
- AI: Claude API (`claude-sonnet-4-20250514`) 우선, 크레딧 부족 시 **Gemini (`gemini-2.5-flash`) 자동 폴백**
  - 공통 유틸: `src/lib/utils/ai-client.ts` (`generateText`, `analyzeImageWithText`)
  - 환경변수: `ANTHROPIC_API_KEY` + `GEMINI_API_KEY` (둘 다 Vercel에 설정 완료)
  - **Gemini 사용 가능 모델 (2025-04 확인)**: `gemini-2.5-flash`, `gemini-2.5-flash-lite` — 1.5/2.0 계열은 이 키에서 404
- 차트: Recharts + react-calendar-heatmap
- 배포: Vercel

## 디자인 토큰
```
bg-primary:   #0f0f0f
bg-secondary: #1a1a1a  (카드)
bg-tertiary:  #242424  (입력창)
accent:       #C8FF00  (라임 — 버튼/강조)
danger:       #FF4B4B
success:      #00D67C
border:       #2a2a2a
text-primary: #f0f0f0
text-muted:   #888888
font: Pretendard Variable
max-width: 430px, 중앙 정렬, 하단 내비게이션
```

## 폴더 구조
```
src/
  app/
    api/generate-routine/route.ts   ← Claude API 루틴 생성
    (auth)/login/page.tsx
    auth/callback/route.ts
    onboarding/page.tsx
    workout/new/page.tsx
    workout/[id]/page.tsx
    diet/page.tsx
    diet/add/page.tsx
    routine/page.tsx
    dashboard/page.tsx
    body/page.tsx
    my/page.tsx
    settings/page.tsx
  components/
    workout/  (WorkoutTimer, RestTimer, SetInput, ExerciseCard)
    diet/     (MealCard, NutrientSummary)
    routine/  (RoutineCard, DaySchedule)
    dashboard/(HeatmapCalendar, VolumeChart)
    ui/       (Button, Card, BottomNav, PageLayout)
    providers/(AuthProvider)
  lib/
    supabase/ (client.ts, server.ts, types.ts)
    utils/    (1rm.ts, tdee.ts, nutrition.ts)
    hooks/    (useWorkoutSession.ts, useDietDay.ts, useDashboardData.ts)
```

## 코딩 컨벤션
- 모든 파일 TypeScript (.tsx / .ts)
- 컴포넌트: PascalCase (WorkoutTimer.tsx)
- 함수/변수: camelCase
- Supabase 쿼리: 반드시 `src/lib/supabase/` 안에서만 호출
- API Route: 항상 try-catch + 에러 응답 포함
- `@supabase/ssr` 사용 (auth-helpers-nextjs deprecated)
- 서버 컴포넌트: `createServerClient` / 클라이언트 컴포넌트: `createBrowserClient`

## 주요 패턴
- 휴식 타이머: `{ timerStartAt, duration }` localStorage 저장 → 페이지 복귀 시 복원
- Claude API 응답: regex `/\{[\s\S]*\}/`로 JSON 추출 후 parse (마크다운 펜스 방어)
- workout_exercises/sets RLS: EXISTS 서브쿼리로 user_id 간접 검증
- Framer Motion: 세트 완료 체크 scale 1→1.2→1 (0.2s)

## 개발 진행 상태
- [x] Phase 0: 레거시 이동 + Supabase 프로젝트 생성 (ID: irfvzqrqnimhhfwetdgu)
- [x] Phase 1: Next.js 스캐폴드 + PWA + Tailwind + Pretendard
- [x] Phase 2: Supabase DB 스키마 + RLS + 시드 (9개 테이블, 50개 운동 종목)
- [ ] Phase 3: Google 인증 + 온보딩
- [ ] Phase 4: 공통 UI + 유틸 함수
- [ ] Phase 5: AI 루틴 API + 루틴 페이지
- [ ] Phase 6: 운동 기록
- [ ] Phase 7: 식단 기록
- [ ] Phase 8: 대시보드
- [ ] Phase 9: 신체 데이터 + 마이
- [ ] Phase 10: Vercel 배포

---

## 🚨 에러 로그 (같은 실수 반복 방지)

### [2026-03-31] 서브에이전트 MCP 권한 차단
- **문제**: background agent로 Supabase `execute_sql` MCP 툴 실행 시 권한 거부됨
- **해결**: MCP 툴(Supabase, Vercel 등)은 반드시 **메인 세션에서 직접 호출** — 서브에이전트에 위임 불가
- **교훈**: 서브에이전트는 파일 작성/코드 생성에 사용, MCP 호출은 메인에서 처리

### [2026-03-31] @ducanh2912/next-pwa swcMinify 옵션 오류
- **문제**: `PluginOptions`에 `swcMinify` 속성이 존재하지 않음 → TS2353 에러
- **해결**: `next.config.ts`에서 `swcMinify: true` 라인 제거
- **교훈**: PWA 플러그인 옵션은 라이브러리 TS 타입을 먼저 확인할 것

### [2026-03-31] @supabase/ssr cookie 콜백 암묵적 any 타입
- **문제**: `setAll` 콜백 파라미터 `cookiesToSet`에 타입 미지정 → TS7006 에러
- **해결**: `import { type CookieOptions } from '@supabase/ssr'` 후 `{ name: string; value: string; options?: CookieOptions }[]` 명시
- **교훈**: @supabase/ssr의 cookie 콜백은 항상 `CookieOptions` import 후 명시적 타입 선언 필요

### [2026-03-31] create-next-app 기존 디렉토리 충돌
- **문제**: `npx create-next-app@14 .` 실행 시 기존 `.claude/`, `.env.local`, `legacy/` 폴더로 인해 충돌 오류 발생
- **해결**: create-next-app 대신 `package.json`, `tsconfig.json`, `next.config.ts` 등 설정 파일을 **수동으로 직접 작성** 후 `npm install` 실행
- **교훈**: 기존 파일이 있는 디렉토리에서는 create-next-app 사용 불가 → 수동 스캐폴딩

### [2026-04-01] Anthropic API 크레딧 부족 오류 (AI 루틴/사진 분석 실패)
- **문제**: Vercel 배포 환경에서 `{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low..."}}` 오류 발생
- **원인 1**: Vercel 환경변수에 `ANTHROPIC_API_KEY`가 미설정이거나, 설정된 키의 크레딧 소진
- **원인 2**: API 에러 메시지를 catch하지 않아 사용자에게 모호한 "분석 실패" 메시지만 노출
- **해결**:
  1. Vercel 대시보드 → Settings → Environment Variables → `ANTHROPIC_API_KEY` 재확인/재설정
  2. https://console.anthropic.com/settings/billing 에서 크레딧 충전
  3. API route에서 Anthropic 오류 응답을 파싱해 사용자에게 명확한 메시지 전달
  4. 크레딧 부족 시 "AI 기능을 사용하려면 크레딧이 필요합니다" 안내 문구 표시
- **교훈**:
  - Vercel 환경변수는 `.env.local`과 **별도**로 반드시 Vercel 대시보드에서 직접 설정해야 함
  - AI API 호출 전 `ANTHROPIC_API_KEY` 존재 여부를 미리 체크하고 없으면 500 대신 명확한 메시지 반환
  - Anthropic SDK의 `APIError` 타입으로 에러 세분화 처리 필요

### [2026-04-01] generate-routine API 응답 스키마 불일치
- **문제**: Claude API 응답 JSON 스키마(`weekly_schedule`, `macros`)와 루틴 페이지가 읽는 스키마(`schedule`, `summary`)가 달라 루틴이 표시 안 됨
- **해결**: API 프롬프트의 응답 형식을 페이지 타입 정의와 일치시킴 (`summary`, `schedule`, `rest_days`)
- **교훈**: AI 프롬프트의 JSON 스키마 예시와 프론트엔드 타입 정의를 항상 동기화할 것. 변경 시 둘 다 수정.

### [2026-04-01] settings 페이지 루틴 재생성 버튼 — profile 데이터 미전송
- **문제**: `handleRegenerate`가 `fetch('/api/generate-routine', { method: 'POST' })` 빈 body 전송 → API에서 `profile` 없어 즉시 400 반환
- **해결**: form 상태를 profile 객체로 변환해 body에 포함
- **교훈**: POST API 호출 시 항상 body 내용 확인. 특히 AI API는 입력 없이 호출 불가.

### [2026-04-02] Gemini 1.5 모델 404 — 이 API 키에서 사용 불가
- **문제**: `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`, `gemini-2.0-flash-001` 모두 `[404 Not Found] models/... is not found`
- **원인**: 이 Gemini API 키(`AIzaSy...`)는 최신 모델만 제공 — 1.5/2.0 계열 미지원
- **해결**: `GEMINI_TEXT_MODEL` = `gemini-2.5-flash`, `GEMINI_VISION_MODEL` = `gemini-2.5-flash` 로 변경 (`src/lib/utils/ai-client.ts`)
- **교훈**: Gemini 모델 변경 전 반드시 `node -e "..."` 로 직접 호출 테스트 후 CLAUDE.md 기록

### [2026-04-02] 식품안전나라 API 키 인증 실패
- **문제**: `https://openapi.foodsafetykorea.go.kr/api/{KEY}/I2790/...` 호출 시 `"인증키가 유효하지 않습니다"` 스크립트 반환
- **원인**: `.env.local`의 `FOOD_SAFETY_API_KEY=6f74b95bd3764ba1ba8d` 키가 만료/무효
- **해결 방법**: https://www.data.go.kr 에서 I2790 서비스 재신청 → 새 키 발급 → `.env.local` + Vercel 환경변수 업데이트
- **임시 대응**: 로컬 Supabase foods 테이블에 기본 식품 38개 직접 추가 (삶은 계란, 닭가슴살, 흰쌀밥 등)
- **교훈**: 외부 API 키는 정기적으로 유효성 검증 필요. 키 무효 시 `search-foods` route는 로컬 DB만 사용(graceful degradation)

### [2026-04-02] 운동 완료 후 시작 화면 플래시
- **문제**: `finishWorkout()` 호출 시 session 상태 초기화 → `isActive=false` → 운동 시작 화면이 2200ms 동안 표시된 후 완료 페이지 이동
- **해결**: `redirecting` 상태 추가 → `!isActive && !redirecting` 조건으로 시작 화면 렌더 차단
- **교훈**: 비동기 상태 초기화 후 router.push 전 화면 전환이 있는 경우 별도 `redirecting` flag 필요

---

## 🔧 개발 워크플로우 규칙

### 규칙 1: 에러 즉시 기록
오류 발생 시 이 파일의 "에러 로그" 섹션에 기록:
- 문제 상황
- 해결 방법
- 재발 방지 교훈

### 규칙 2: 워크트리 에이전트 병렬 작업
독립적인 작업(DB 설정 / 컴포넌트 작성 / 테스트 등)은 워크트리 에이전트를 통해 병렬 실행하여 개발 시간 단축.

### 규칙 3: 서브 에이전트 검증 분리
- **구현 에이전트**: 코드 작성
- **검증 에이전트**: 타입 체크, 빌드 확인, 로직 검증
실수를 줄이기 위해 구현과 검증을 별도 에이전트로 분리.
