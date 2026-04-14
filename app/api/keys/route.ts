import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Generate a new API key
export async function POST(request: Request) {
  try {
    const { label } = await request.json()

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch {}
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate the raw key
    const rawKey = `prova_${crypto.randomUUID().replace(/-/g, '')}`

    // Hash the key for storage (SHA-256)
    const encoder = new TextEncoder()
    const data = encoder.encode(rawKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Use service role to insert (bypasses RLS)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: keyData, error: dbError } = await serviceSupabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_hash: keyHash,
        label: label || 'Unnamed key',
      })
      .select('id, label, created_at')
      .single()

    if (dbError) {
      console.error('Error creating API key:', dbError)
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }

    // Return the raw key ONCE — it will never be retrievable again
    return NextResponse.json({
      key: keyData,
      raw_key: rawKey, // Only returned on creation
    })

  } catch (error) {
    console.error('API key creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Revoke an API key (set is_active = false)
export async function PATCH(request: Request) {
  try {
    const { keyId } = await request.json()

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch {}
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role to update (bypasses RLS)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify the key belongs to the user before revoking
    const { data: keyData, error: fetchError } = await serviceSupabase
      .from('api_keys')
      .select('user_id')
      .eq('id', keyId)
      .single()

    if (fetchError || !keyData || keyData.user_id !== user.id) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    // Revoke: set is_active = false (does not delete)
    const { error: dbError } = await serviceSupabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)

    if (dbError) {
      console.error('Error revoking API key:', dbError)
      return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API key revocation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
