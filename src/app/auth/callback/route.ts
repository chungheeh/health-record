import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const supabase = await createClient()

  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code)

  if (sessionError || !sessionData.user) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const userId = sessionData.user.id

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  if (profile) {
    return NextResponse.redirect(`${origin}/`)
  }

  return NextResponse.redirect(`${origin}/onboarding`)
}
