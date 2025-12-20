import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

/**
 * Escapes special characters in CSV fields
 */
function escapeCSVField(field: string | null | undefined): string {
  if (field === null || field === undefined) {
    return ''
  }

  const stringValue = String(field)

  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * GET /api/markets/[keyword]/[location]/export
 * Exports all leads for a market as CSV
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

    if (jobsError || !jobs || jobs.length === 0) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      )
    }

    const jobIds = jobs.map((job: any) => job.id)

    // Fetch all leads for all jobs in this market
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })

    if (leadsError) {
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads found for this market' },
        { status: 404 }
      )
    }

    // Define CSV headers
    const headers = [
      'Business Name',
      'Address',
      'Phone',
      'Website',
      'Email',
      'Rating',
      'Reviews',
      'Category',
      'Date Scraped',
    ]

    // Create CSV rows
    const rows = (leads as any[]).map((lead) => {
      const email = lead.email ? lead.email.toLowerCase() : ''
      const rating = lead.rating ? Number(lead.rating).toString() : ''
      const reviews = lead.review_count ? String(lead.review_count) : ''
      const dateScrapped = new Date().toISOString().split('T')[0]

      return [
        escapeCSVField(lead.business_name),
        escapeCSVField(lead.address),
        escapeCSVField(lead.phone),
        escapeCSVField(lead.website),
        escapeCSVField(email),
        escapeCSVField(rating),
        escapeCSVField(reviews),
        escapeCSVField(lead.category),
        escapeCSVField(dateScrapped),
      ].join(',')
    })

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n')

    // Generate filename
    const date = new Date().toISOString().split('T')[0]
    const cleanKeyword = keywordSlug
    const cleanLocation = locationSlug
    const filename = `market_${cleanKeyword}_${cleanLocation}_${date}.csv`

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Unexpected error exporting market:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
