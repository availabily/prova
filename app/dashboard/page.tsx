/**
 * app/dashboard/page.tsx — Screen 3: Dashboard
 *
 * Auth-gated. Shows usage, certificate history, API key management.
 * Server component fetching real data from Supabase.
 */

import { getClient } from '@/lib/supabase'
import DashboardClient from './DashboardClient'

// ── Types ────────────────────────────────────────────────────────────────

interface CertSummary {
  id: string
  created_at: string
  verdict: 'VALID' | 'INVALID'
  confidence_score: number
  failure: { type: string } | null
}

interface UsageStats {
  total: number
  valid: number
  invalid: number
  monthly_limit: number
  plan: string
}

// ── Data fetching ────────────────────────────────────────────────────────

async function getUserCertificates(supabase: any, userId: string, page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit
  
  const { data, error, count } = await supabase
    .from('certificates')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return { certificates: data || [], total: count || 0 }
}

async function getUserUsage(supabase: any, userId: string): Promise<UsageStats> {
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const { data: usageData, error: usageError } = await supabase
    .from('usage')
    .select('verdict')
    .eq('user_id', userId)
    .gte('created_at', currentMonth.toISOString())

  if (usageError) throw usageError

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single()

  if (userError) throw userError

  const total = usageData?.length || 0
  const valid = usageData?.filter((u: any) => u.verdict === 'VALID').length || 0
  const invalid = usageData?.filter((u: any) => u.verdict === 'INVALID').length || 0
  
  const monthlyLimit = userData.plan === 'free' ? 500 : userData.plan === 'team' ? 5000 : 20000

  return {
    total,
    valid,
    invalid,
    monthly_limit: monthlyLimit,
    plan: userData.plan
  }
}

// ── Page ─────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = getClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Fetch data
  const [{ certificates, total }, stats] = await Promise.all([
    getUserCertificates(supabase, user.id),
    getUserUsage(supabase, user.id)
  ])

  return <DashboardClient certificates={certificates} stats={stats} total={total} />
}
