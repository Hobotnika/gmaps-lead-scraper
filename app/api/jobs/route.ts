import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

/**
 * GET /api/jobs
 * Fetches all scrape jobs with lead counts
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    // Fetch all jobs ordered by creation date (newest first)
    const { data: jobs, error: jobsError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (jobsError) {
      console.error('Failed to fetch jobs:', jobsError)
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }

    // Fetch lead counts for each job
    const jobsWithStats = await Promise.all(
      jobs.map(async (job) => {
        const { count: totalLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id)

        const { count: leadsWithEmails } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id)
          .not('email', 'is', null)

        return {
          ...job,
          totalLeads: totalLeads || 0,
          leadsWithEmails: leadsWithEmails || 0,
        }
      })
    )

    return NextResponse.json(jobsWithStats)
  } catch (error) {
    console.error('Unexpected error fetching jobs:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
