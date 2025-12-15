import { NextRequest, NextResponse } from 'next/server'
import { ApifyClient } from 'apify-client'
import { createAdminClient } from '@/lib/supabase'
import type { SearchFormData, ApifyPlace } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: SearchFormData = await request.json()
    const { keyword, location, maxResults } = body

    // Validate input
    if (!keyword || keyword.length < 2) {
      return NextResponse.json(
        { error: 'Keyword must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (!location || location.length < 2) {
      return NextResponse.json(
        { error: 'Location must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (!maxResults || maxResults < 10 || maxResults > 500) {
      return NextResponse.json(
        { error: 'Max results must be between 10 and 500' },
        { status: 400 }
      )
    }

    // Check for Apify API token
    if (!process.env.APIFY_API_TOKEN) {
      console.error('APIFY_API_TOKEN is not set in environment variables')
      return NextResponse.json(
        { error: 'Apify API token is not configured' },
        { status: 500 }
      )
    }

    console.log('Starting scrape job:', { keyword, location, maxResults })

    // Initialize Supabase admin client
    const supabase = createAdminClient()

    // Create scrape job in database
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        search_query: keyword,
        location,
        max_results: maxResults,
        status: 'pending',
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('Failed to create job in database:', jobError)
      return NextResponse.json(
        { error: 'Failed to create scrape job' },
        { status: 500 }
      )
    }

    console.log('Job created in database:', job.id)

    // Update job status to running
    await supabase
      .from('scrape_jobs')
      .update({ status: 'running' })
      .eq('id', job.id)

    // Initialize Apify client
    const client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    })

    console.log('Starting Apify actor run...')

    try {
      // Run the Apify actor
      const run = await client.actor('compass/google-maps-scraper').call({
        searchStringsArray: [keyword],
        locationQuery: location,
        maxCrawledPlacesPerSearch: maxResults,
        language: 'en',
      })

      console.log('Apify run completed:', run.id)
      console.log('Run status:', run.status)

      // Get dataset items (results)
      const { items } = await client.dataset(run.defaultDatasetId).listItems()

      console.log(`Retrieved ${items.length} items from Apify`)

      if (items.length === 0) {
        // No results found, but mark job as completed
        await supabase
          .from('scrape_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        return NextResponse.json({
          jobId: job.id,
          status: 'completed',
          totalLeads: 0,
          leadsWithWebsites: 0,
          leadsWithEmails: 0,
        })
      }

      // Process and save leads
      const leadsToInsert = items.map((place: ApifyPlace) => ({
        job_id: job.id,
        business_name: place.title || 'Unknown Business',
        address: place.address || null,
        phone: place.phone || null,
        website: place.website || null,
        rating: place.totalScore || null,
        review_count: place.reviewsCount || null,
        category: place.categoryName || null,
        email: null, // Will be filled by email discovery later
      }))

      console.log(`Inserting ${leadsToInsert.length} leads into database...`)

      const { data: insertedLeads, error: leadsError } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select()

      if (leadsError) {
        console.error('Failed to insert leads:', leadsError)
        throw new Error('Failed to save leads to database')
      }

      console.log(`Successfully inserted ${insertedLeads?.length || 0} leads`)

      // Calculate stats
      const totalLeads = insertedLeads?.length || 0
      const leadsWithWebsites = insertedLeads?.filter((lead) => lead.website).length || 0
      const leadsWithEmails = insertedLeads?.filter((lead) => lead.email).length || 0

      // Update job status to completed
      await supabase
        .from('scrape_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      console.log('Job completed successfully:', {
        jobId: job.id,
        totalLeads,
        leadsWithWebsites,
        leadsWithEmails,
      })

      return NextResponse.json({
        jobId: job.id,
        status: 'completed',
        totalLeads,
        leadsWithWebsites,
        leadsWithEmails,
      })
    } catch (apifyError) {
      // Apify API call failed
      console.error('Apify API error:', apifyError)

      const errorMessage =
        apifyError instanceof Error ? apifyError.message : 'Unknown Apify error'

      // Update job status to failed
      await supabase
        .from('scrape_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      return NextResponse.json(
        {
          error: 'Failed to scrape Google Maps data',
          details: errorMessage,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unexpected error in scrape API:', error)

    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
