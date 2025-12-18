import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

/**
 * GET /api/jobs/[jobId]
 * Fetches a specific job with all its leads
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params

    // Validate jobId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle()

    if (jobError || !job) {
      console.error('Job not found:', jobError)
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Type assertion for job to work around Supabase type inference issue
    const jobData = job as any

    console.log('Job found:', jobData.id, 'Status:', jobData.status)

    // Fetch all leads for this job
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (leadsError) {
      console.error('Failed to fetch leads:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    // Transform database format to API format
    const leadsData = leads as any[]
    const transformedLeads = (leadsData || []).map((lead: any) => ({
      id: lead.id,
      businessName: lead.business_name,
      address: lead.address,
      phone: lead.phone,
      website: lead.website,
      email: lead.email,
      rating: lead.rating,
      reviewCount: lead.review_count,
      category: lead.category,
      placeId: lead.place_id,
      lastUpdated: lead.last_updated,
    }))

    // Calculate stats
    const totalLeads = transformedLeads.length
    const leadsWithWebsites = transformedLeads.filter((lead) => lead.website).length
    const leadsWithEmails = transformedLeads.filter((lead) => lead.email).length

    return NextResponse.json({
      job: {
        id: jobData.id,
        search_query: jobData.search_query,
        location: jobData.location,
        max_results: jobData.max_results,
        status: jobData.status,
        created_at: jobData.created_at,
        completed_at: jobData.completed_at,
        error_message: jobData.error_message,
      },
      leads: transformedLeads,
      stats: {
        totalLeads,
        leadsWithWebsites,
        leadsWithEmails,
      },
    })
  } catch (error) {
    console.error('Unexpected error fetching job:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
