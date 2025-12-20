import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

/**
 * GET /api/markets/[keyword]/[location]
 * Fetches a specific market with all its leads across all scrapes
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ keyword: string; location: string }> }
) {
  try {
    const { keyword: keywordSlug, location: locationSlug } = await context.params

    // Decode slugs back to original strings
    const keyword = decodeURIComponent(keywordSlug).replace(/-/g, ' ')
    const location = decodeURIComponent(locationSlug).replace(/-/g, ' ')

    const supabase = createAdminClient()

    // Fetch all completed jobs matching this market
    const { data: jobs, error: jobsError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('status', 'completed')
      .ilike('search_query', keyword)
      .ilike('location', location)
      .order('created_at', { ascending: false })

    if (jobsError) {
      console.error('Failed to fetch jobs:', jobsError)
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      )
    }

    const jobsData = jobs as any[]
    const jobIds = jobsData.map((job) => job.id)

    // Fetch all leads for all jobs in this market
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })

    if (leadsError) {
      console.error('Failed to fetch leads:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    // Transform database format to API format and fetch contacts for each lead
    const leadsData = leads as any[]
    const transformedLeads = await Promise.all(
      (leadsData || []).map(async (lead: any) => {
        // Fetch contacts for this lead
        const { data: contacts } = await supabase
          .from('contacts')
          .select('*')
          .eq('lead_id', lead.id)

        return {
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
          contacts: (contacts || []).map((contact: any) => ({
            id: contact.id,
            leadId: contact.lead_id,
            fullName: contact.full_name,
            title: contact.title,
            email: contact.email,
            emailStatus: contact.email_status,
            source: contact.source,
            createdAt: contact.created_at,
          })),
        }
      })
    )

    // Calculate stats
    const totalLeads = transformedLeads.length
    const leadsWithWebsites = transformedLeads.filter((lead) => lead.website).length
    const leadsWithEmails = transformedLeads.filter((lead) => lead.email).length
    const leadsWithContacts = transformedLeads.filter((lead) => lead.contacts && lead.contacts.length > 0).length

    // Get latest scrape date
    const latestScrape = jobsData[0].created_at

    return NextResponse.json({
      market: {
        keyword: jobsData[0].search_query,
        location: jobsData[0].location,
        scrapeCount: jobsData.length,
        latestScrape,
        jobIds,
      },
      jobs: jobsData.map((job) => ({
        id: job.id,
        search_query: job.search_query,
        location: job.location,
        max_results: job.max_results,
        status: job.status,
        created_at: job.created_at,
        completed_at: job.completed_at,
        error_message: job.error_message,
      })),
      leads: transformedLeads,
      stats: {
        totalLeads,
        leadsWithWebsites,
        leadsWithEmails,
        leadsWithContacts,
      },
    })
  } catch (error) {
    console.error('Unexpected error fetching market:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
