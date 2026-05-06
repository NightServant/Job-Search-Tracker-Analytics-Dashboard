import { createClient } from 'npm:@supabase/supabase-js@2'
import { mergeSecurityHeaders } from '../_shared/edgeHeaders.ts'
import { createRequestId, emitMonitoringEvent, buildInvocationEvent, buildCompletionEvent, buildErrorEvent, getRequestIdentity } from '../_shared/edgeMonitoring.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...mergeSecurityHeaders(corsHeaders),
      'Content-Type': 'application/json',
    },
  })
}

// Compute analytics by querying Supabase directly
async function computeTimeInStage(supabase: any, userId: string) {
  const { data: statusHistory, error } = await supabase
    .from('job_status_history')
    .select('*')
    .eq('user_id', userId)
    .order('changed_at', { ascending: true })

  if (error || !statusHistory) return null

  const stageMetrics = new Map<string, number[]>()

  for (const change of statusHistory) {
    const fromTime = new Date(change.changed_at)
    const nextChange = statusHistory.find(
      (h: any) => h.job_id === change.job_id && h.from_status === change.to_status && new Date(h.changed_at) > fromTime
    )
    const toTime = nextChange ? new Date(nextChange.changed_at) : new Date()
    const daysInStatus = (toTime.getTime() - fromTime.getTime()) / (1000 * 60 * 60 * 24)

    if (!stageMetrics.has(change.to_status)) stageMetrics.set(change.to_status, [])
    stageMetrics.get(change.to_status)!.push(daysInStatus)
  }

  const metrics = []
  for (const [status, durations] of stageMetrics.entries()) {
    if (durations.length === 0) continue
    durations.sort((a, b) => a - b)
    const avgDays = durations.reduce((a, b) => a + b, 0) / durations.length
    const medianDays = durations[Math.floor(durations.length / 2)] ?? 0
    metrics.push({
      status,
      avgDays: Math.round(avgDays * 10) / 10,
      medianDays: Math.round(medianDays * 10) / 10,
      minDays: Math.round(Math.min(...durations) * 10) / 10,
      maxDays: Math.round(Math.max(...durations) * 10) / 10,
      count: durations.length,
    })
  }
  return metrics
}

async function computeConversionFunnel(supabase: any, userId: string) {
  const { data: jobs, error } = await supabase.from('jobs').select('id, status').eq('user_id', userId)
  if (error || !jobs) return null

  const jobList = jobs
  const totalJobs = jobList.length
  const stageCounts = {
    applied: jobList.filter((j: any) => j.status !== 'wishlist').length,
    interviewing: jobList.filter((j: any) => j.status === 'interviewing').length,
    offer: jobList.filter((j: any) => j.status === 'offer').length,
  }

  return [
    { stage: 'Applied', count: stageCounts.applied, percentage: totalJobs > 0 ? (stageCounts.applied / totalJobs) * 100 : 0, avgDaysToStage: 0 },
    { stage: 'Interviewing', count: stageCounts.interviewing, percentage: totalJobs > 0 ? (stageCounts.interviewing / totalJobs) * 100 : 0, avgDaysToStage: 0 },
    { stage: 'Offer', count: stageCounts.offer, percentage: totalJobs > 0 ? (stageCounts.offer / totalJobs) * 100 : 0, avgDaysToStage: 0 },
  ]
}

async function computeSourceConversionTrends(supabase: any, userId: string) {
  const { data: jobs, error } = await supabase.from('jobs').select('id, source, status, created_at').eq('user_id', userId)
  if (error || !jobs) return null

  const trendMap = new Map<string, Map<string, any>>()
  for (const job of jobs) {
    const source = job.source || 'Direct'
    const month = new Date(job.created_at).toISOString().slice(0, 7)
    if (!trendMap.has(source)) trendMap.set(source, new Map())
    const sourceMap = trendMap.get(source)!
    if (!sourceMap.has(month)) sourceMap.set(month, { applied: 0, interviewing: 0, offer: 0, rejected: 0, total: 0 })
    const monthData = sourceMap.get(month)!
    monthData.total += 1
    if (job.status === 'applied') monthData.applied += 1
    else if (job.status === 'interviewing') monthData.interviewing += 1
    else if (job.status === 'offer') monthData.offer += 1
    else if (job.status === 'rejected') monthData.rejected += 1
  }

  const trends = []
  for (const [source, monthMap] of trendMap.entries()) {
    for (const [month, data] of monthMap.entries()) {
      trends.push({
        source,
        month,
        applied: data.applied,
        interviewing: data.interviewing,
        offer: data.offer,
        rejected: data.rejected,
        conversionRate: data.total > 0 ? (data.offer / data.total) * 100 : 0,
      })
    }
  }
  trends.sort((a, b) => a.month.localeCompare(b.month))
  return trends
}

async function computeCohortAnalysis(supabase: any, userId: string) {
  const { data: jobs, error } = await supabase.from('jobs').select('id, status, created_at, date_applied').eq('user_id', userId)
  if (error || !jobs) return null

  const cohortMap = new Map<string, any>()
  for (const job of jobs) {
    const appliedDate = job.date_applied ? new Date(job.date_applied) : new Date(job.created_at)
    const cohort = appliedDate.toISOString().slice(0, 7)
    if (!cohortMap.has(cohort)) cohortMap.set(cohort, { applied: 0, interviewing: 0, offered: 0, rejected: 0, timeToOffers: [] })
    const cohortData = cohortMap.get(cohort)!
    cohortData.applied += 1
    if (job.status === 'interviewing') cohortData.interviewing += 1
    else if (job.status === 'offer') {
      cohortData.offered += 1
      const daysToOffer = (new Date().getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24)
      cohortData.timeToOffers.push(daysToOffer)
    } else if (job.status === 'rejected') cohortData.rejected += 1
  }

  const analysis = []
  for (const [cohort, data] of cohortMap.entries()) {
    const avgTimeToOffer = data.timeToOffers.length > 0 ? Math.round((data.timeToOffers.reduce((a: number, b: number) => a + b, 0) / data.timeToOffers.length) * 10) / 10 : null
    analysis.push({
      cohort,
      jobsApplied: data.applied,
      jobsInterviewing: data.interviewing,
      jobsOffered: data.offered,
      jobsRejected: data.rejected,
      conversionRate: data.applied > 0 ? (data.offered / data.applied) * 100 : 0,
      avgTimeToOffer,
    })
  }
  analysis.sort((a, b) => b.cohort.localeCompare(a.cohort))
  return analysis
}

async function computeConversionMetrics(supabase: any, userId: string) {
  const { data: jobs, error } = await supabase.from('jobs').select('id, status, source').eq('user_id', userId)
  if (error || !jobs) return null

  const jobList = jobs
  const offeredJobs = jobList.filter((j: any) => j.status === 'offer')
  const conversionBySource: Record<string, number> = {}
  for (const job of jobList) {
    const source = job.source || 'Direct'
    if (!conversionBySource[source]) conversionBySource[source] = 0
    if (job.status === 'offer') conversionBySource[source] += 1
  }

  return {
    totalJobs: jobList.length,
    timeToFirstInterview: null,
    timeToOffer: null,
    conversionRate: jobList.length > 0 ? (offeredJobs.length / jobList.length) * 100 : 0,
    conversionBySource,
  }
}

Deno.serve(async (req: Request) => {
  const requestId = createRequestId('analytics-cache-proxy')
  const start = Date.now()
  const callerKey = getRequestIdentity(req)

  emitMonitoringEvent(buildInvocationEvent({ functionName: 'analytics-cache-proxy', requestId, callerKey }))

  if (req.method === 'OPTIONS') return new Response('ok', { headers: mergeSecurityHeaders(corsHeaders) })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) return jsonResponse({ error: 'Supabase not configured' }, 500)

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: authError } = await supabase.auth.getUser()
    if (authError || !userData?.user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const payload = await req.json().catch(() => ({}))
    const metric = typeof payload.metric === 'string' ? payload.metric : ''
    const skipCache = payload.skipCache === true
    if (!metric) return jsonResponse({ error: 'Missing metric name' }, 400)

    // Try to get cached data (unless skipCache is true)
    if (!skipCache) {
      const { data: cached, error } = await supabase
        .from('analytics_cache')
        .select('payload, updated_at')
        .eq('user_id', userData.user.id)
        .eq('metric_name', metric)
        .maybeSingle()

      if (error) {
        emitMonitoringEvent(buildErrorEvent({ functionName: 'analytics-cache-proxy', requestId, status: 500, latencyMs: Date.now() - start, callerKey, message: 'Cache lookup error', extra: { error: error.message } }))
        return jsonResponse({ error: 'DB error' }, 500)
      }

      if (cached?.payload) {
        // Cache hit
        emitMonitoringEvent(buildCompletionEvent({ functionName: 'analytics-cache-proxy', requestId, status: 200, latencyMs: Date.now() - start, callerKey, message: 'Cache hit', extra: { metric } }))
        return jsonResponse({ cached: true, payload: cached.payload, updated_at: cached.updated_at }, 200)
      }
    }

    // Cache miss or skipCache: compute on-demand
    let computedPayload: unknown = null
    if (metric === 'timeInStage') {
      computedPayload = await computeTimeInStage(supabase, userData.user.id)
    } else if (metric === 'conversionFunnel') {
      computedPayload = await computeConversionFunnel(supabase, userData.user.id)
    } else if (metric === 'sourceConversionTrends') {
      computedPayload = await computeSourceConversionTrends(supabase, userData.user.id)
    } else if (metric === 'cohortAnalysis') {
      computedPayload = await computeCohortAnalysis(supabase, userData.user.id)
    } else if (metric === 'conversionMetrics') {
      computedPayload = await computeConversionMetrics(supabase, userData.user.id)
    } else {
      return jsonResponse({ error: 'Unknown metric' }, 400)
    }

    if (!computedPayload) {
      emitMonitoringEvent(buildErrorEvent({ functionName: 'analytics-cache-proxy', requestId, status: 500, latencyMs: Date.now() - start, callerKey, message: 'Compute failed', extra: { metric } }))
      return jsonResponse({ error: 'Failed to compute metric' }, 500)
    }

    // Upsert into cache
    const { error: upsertError } = await supabase.rpc('upsert_analytics_cache', {
      p_user: userData.user.id,
      p_metric: metric,
      p_payload: computedPayload,
    })

    if (upsertError) {
      console.warn(`[${requestId}] Cache upsert failed: ${upsertError.message}`)
      // Don't fail the response; still return computed payload
    }

    emitMonitoringEvent(buildCompletionEvent({ functionName: 'analytics-cache-proxy', requestId, status: 200, latencyMs: Date.now() - start, callerKey, message: 'Computed and cached', extra: { metric } }))

    return jsonResponse(
      { cached: false, payload: computedPayload, updated_at: new Date().toISOString() },
      200
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    emitMonitoringEvent(buildErrorEvent({ functionName: 'analytics-cache-proxy', requestId, status: 500, latencyMs: Date.now() - start, callerKey, message: 'Unhandled error', extra: { error: msg } }))
    return jsonResponse({ error: msg }, 500)
  }
})
