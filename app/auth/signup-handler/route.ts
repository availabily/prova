import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const res = NextResponse.json({ message: 'Processing...' })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = request.headers.get('cookie')
            if (!cookie) return undefined
            const match = cookie.split('; ').find(c => c.startsWith(`${name}=`))
            return match?.split('=')[1]
          },
          set(name: string, value: string, options: any) {
            res.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            res.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Create the user in Supabase Auth
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (user) {
      // Use service role to bypass RLS and insert the user profile
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { error: dbError } = await serviceSupabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
        })

      if (dbError) {
        console.error('Error inserting user:', dbError)
      }
    }

    return NextResponse.json({
      message: 'Signup successful',
      user: user ? { id: user.id, email: user.email } : null
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
