import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import type { Lead, LeadStats } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    console.log('Fetching job details for:', jobId)

    // Initialize Supabase admin client
    const supabase = createAdminClient()

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('Job not found:', jobError)
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    console.log('Job found:', job.id, 'Status:', job.status)

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

    console.log(`Retrieved ${leads?.length || 0} leads`)

    // Format leads to match frontend Lead interface
    const formattedLeads: Lead[] =
      leads?.map((lead) => ({
        id: lead.id,
        businessName: lead.business_name,
        address: lead.address,
        phone: lead.phone,
        website: lead.website,
        email: lead.email,
        rating: lead.rating,
        reviewCount: lead.review_count,
        category: lead.category,
      })) || []

    // Calculate stats
    const stats: LeadStats = {
      totalLeads: formattedLeads.length,
      leadsWithWebsites: formattedLeads.filter((lead) => lead.website).length,
      leadsWithEmails: formattedLeads.filter((lead) => lead.email).length,
    }

    return NextResponse.json({
      job: {
        id: job.id,
        search_query: job.search_query,
        location: job.location,
        max_results: job.max_results,
        status: job.status,
        created_at: job.created_at,
        completed_at: job.completed_at,
        error_message: job.error_message,
      },
      leads: formattedLeads,
      stats,
    })
  } catch (error) {
    console.error('Unexpected error in jobs API:', error)

    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
