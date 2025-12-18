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
      } as any)
      .select()
      .single()

    if (jobError || !job) {
      console.error('Failed to create job in database:', jobError)
      return NextResponse.json(
        { error: 'Failed to create scrape job' },
        { status: 500 }
      )
    }

    const jobData = job as any
    console.log('Job created in database:', jobData.id)

    // Update job status to running
    await (supabase
      .from('scrape_jobs') as any)
      .update({ status: 'running' })
      .eq('id', jobData.id)

    // Initialize Apify client
    const client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    })

    console.log('Starting Apify actor run...')
    console.log('Using email-extracting actor: lukaskrivka/google-maps-with-contact-details')

    try {
      // Run the Apify actor
      const run = await client.actor('lukaskrivka/google-maps-with-contact-details').call({
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
        await (supabase
          .from('scrape_jobs') as any)
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobData.id)

        return NextResponse.json({
          jobId: jobData.id,
          status: 'completed',
          totalLeads: 0,
          leadsWithWebsites: 0,
          leadsWithEmails: 0,
        })
      }

      // Process and save leads with duplicate detection
      console.log(`Processing ${items.length} places with duplicate detection...`)

      let insertedCount = 0
      let updatedCount = 0
      const allLeads: any[] = []

      const placesData = items as unknown as ApifyPlace[]
      for (const place of placesData) {
        const placeId = place.placeId || null
        const email = place.emails?.[0] || null
        const phone = place.phones?.[0] || place.phoneUnformatted || place.phone || null
        const website = place.website || null
        const category = place.categories?.[0] || place.categoryName || null

        const leadData = {
          business_name: place.title || 'Unknown Business',
          address: place.address || null,
          phone,
          website,
          rating: place.totalScore || null,
          review_count: place.reviewsCount || null,
          category,
          email,
          email_found_at: email ? new Date().toISOString() : null,
          place_id: placeId,
        }

        // Check if lead already exists by place_id
        if (placeId) {
          const { data: existingLead } = await (supabase
            .from('leads') as any)
            .select('*')
            .eq('place_id', placeId)
            .single()

          if (existingLead) {
            // Update existing lead, keeping best data
            const { data: updatedLead, error: updateError } = await (supabase
              .from('leads') as any)
              .update({
                business_name: leadData.business_name,
                address: leadData.address || existingLead.address,
                phone: phone || existingLead.phone,
                website: website || existingLead.website,
                email: email || existingLead.email,
                email_found_at: email ? new Date().toISOString() : existingLead.email_found_at,
                rating: leadData.rating,
                review_count: leadData.review_count,
                category: category || existingLead.category,
                last_updated: new Date().toISOString(),
              })
              .eq('id', existingLead.id)
              .select()
              .single()

            if (updateError) {
              console.error('Failed to update lead:', updateError)
            } else {
              updatedCount++
              allLeads.push(updatedLead)
            }
            continue
          }
        }

        // Insert new lead
        const { data: newLead, error: insertError } = await (supabase
          .from('leads') as any)
          .insert({
            ...leadData,
            job_id: jobData.id,
          })
          .select()
          .single()

        if (insertError) {
          console.error('Failed to insert lead:', insertError)
        } else {
          insertedCount++
          allLeads.push(newLead)
        }
      }

      console.log(`Inserted ${insertedCount} new leads, updated ${updatedCount} existing leads`)

      // Calculate stats
      const totalLeads = allLeads.length
      const leadsWithWebsites = allLeads.filter((lead) => lead.website).length
      const leadsWithEmails = allLeads.filter((lead) => lead.email).length

      // Update job status to completed
      await (supabase
        .from('scrape_jobs') as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobData.id)

      console.log('Job completed successfully:', {
        jobId: jobData.id,
        totalLeads,
        insertedCount,
        updatedCount,
        leadsWithWebsites,
        leadsWithEmails,
      })

      return NextResponse.json({
        jobId: jobData.id,
        status: 'completed',
        totalLeads,
        insertedCount,
        updatedCount,
        leadsWithWebsites,
        leadsWithEmails,
      })
    } catch (apifyError) {
      // Apify API call failed
      console.error('Apify API error:', apifyError)

      const errorMessage =
        apifyError instanceof Error ? apifyError.message : 'Unknown Apify error'

      // Update job status to failed
      await (supabase
        .from('scrape_jobs') as any)
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobData.id)

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
