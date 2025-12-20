import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { Market } from '@/types'

/**
 * GET /api/markets
 * Fetches markets (grouped scrapes by keyword + location)
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    // Fetch all completed jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (jobsError) {
      console.error('Failed to fetch jobs:', jobsError)
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json([])
    }

    // Group jobs by search_query + location
    const marketMap = new Map<string, {
      keyword: string
      location: string
      jobIds: string[]
      latestScrape: string
    }>()

    jobs.forEach((job: any) => {
      const key = `${job.search_query}||${job.location}`

      if (!marketMap.has(key)) {
        marketMap.set(key, {
          keyword: job.search_query,
          location: job.location,
          jobIds: [],
          latestScrape: job.created_at,
        })
      }

      const market = marketMap.get(key)!
      market.jobIds.push(job.id)

      // Update latest scrape if this job is newer
      if (new Date(job.created_at) > new Date(market.latestScrape)) {
        market.latestScrape = job.created_at
      }
    })

    // Calculate stats for each market
    const markets: Market[] = await Promise.all(
      Array.from(marketMap.values()).map(async (market) => {
        // Count total leads across all jobs in this market
        const { count: totalLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .in('job_id', market.jobIds)

        // Count leads with emails
        const { count: totalEmails } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .in('job_id', market.jobIds)
          .not('email', 'is', null)

        const emailRate = totalLeads && totalLeads > 0
          ? Math.round((totalEmails || 0) / totalLeads * 100)
          : 0

        return {
          keyword: market.keyword,
          location: market.location,
          scrapeCount: market.jobIds.length,
          totalLeads: totalLeads || 0,
          totalEmails: totalEmails || 0,
          emailRate,
          latestScrape: market.latestScrape,
          jobIds: market.jobIds,
        }
      })
    )

    // Sort by latest scrape date (newest first)
    markets.sort((a, b) =>
      new Date(b.latestScrape).getTime() - new Date(a.latestScrape).getTime()
    )

    return NextResponse.json(markets)
  } catch (error) {
    console.error('Unexpected error fetching markets:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
