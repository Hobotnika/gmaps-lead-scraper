import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { findAllContacts, generateEmails, extractDomain } from '@/lib/contactDiscovery'

interface MarketContactDiscoveryResponse {
  success: boolean
  totalContactsFound: number
  jobsProcessed: number
  totalLeadsProcessed: number
  firecrawlCreditsExhausted?: boolean
  errors?: string[]
}

/**
 * POST /api/markets/[keyword]/[location]/find-contacts
 * Finds decision-maker contacts for ALL leads in a market (across all scrapes)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ keyword: string; location: string }> }
) {
  try {
    const { keyword: keywordSlug, location: locationSlug } = await context.params

    // Decode slugs back to original strings
    const keyword = decodeURIComponent(keywordSlug).replace(/-/g, ' ')
    const location = decodeURIComponent(locationSlug).replace(/-/g, ' ')

    console.log(`Starting contact discovery for market: ${keyword} in ${location}`)

    const supabase = createAdminClient()

    // Fetch all completed jobs matching this market
    const { data: jobs, error: jobsError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('status', 'completed')
      .ilike('search_query', keyword)
      .ilike('location', location)
      .order('created_at', { ascending: false })

    if (jobsError || !jobs || jobs.length === 0) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      )
    }

    const jobsData = jobs as any[]
    console.log(`Found ${jobsData.length} jobs to process`)

    let totalContactsFound = 0
    let totalLeadsProcessed = 0
    let jobsProcessed = 0
    let firecrawlCreditsExhausted = false
    const errors: string[] = []

    // Process each job sequentially
    for (const job of jobsData) {
      try {
        console.log(`\n=== Processing job ${jobsProcessed + 1}/${jobsData.length}: ${job.id} ===`)

        // Get all leads for this job
        const { data: leads, error: leadsError } = await (supabase
          .from('leads') as any)
          .select('*')
          .eq('job_id', job.id)

        if (leadsError) {
          console.error(`Failed to fetch leads for job ${job.id}:`, leadsError)
          errors.push(`Failed to fetch leads for job ${job.id}`)
          continue
        }

        const leadsData = leads as any[]

        if (!leadsData || leadsData.length === 0) {
          console.log(`No leads found for job ${job.id}`)
          jobsProcessed++
          continue
        }

        console.log(`Found ${leadsData.length} leads to process in job ${job.id}`)

        // Process each lead in this job
        for (const lead of leadsData) {
          try {
            console.log(`Processing lead: ${lead.business_name}`)

            // Check if this lead already has contacts
            const { count: existingContacts } = await supabase
              .from('contacts')
              .select('*', { count: 'exact', head: true })
              .eq('lead_id', lead.id)

            if (existingContacts && existingContacts > 0) {
              console.log(`Lead ${lead.business_name} already has ${existingContacts} contacts, skipping`)
              continue
            }

            // Find contacts from both team pages and Google search
            const result = await findAllContacts(lead)

            // Track if Firecrawl credits were exhausted
            if (result.firecrawlCreditsExhausted) {
              firecrawlCreditsExhausted = true
            }

            if (result.contacts.length === 0) {
              console.log(`No contacts found for ${lead.business_name}`)
              continue
            }

            console.log(`Found ${result.contacts.length} contacts from Google search`)

            const domain = lead.website ? extractDomain(lead.website) : lead.business_name.toLowerCase().replace(/\s+/g, '') + '.com'

            // Process each contact
            for (const contact of result.contacts) {
              // Generate email variations
              const emailVariations = generateEmails(
                contact.firstName,
                contact.lastName,
                domain
              )

              const email = emailVariations[0] || null

              // Save contact to database
              const { error: insertError } = await (supabase
                .from('contacts') as any)
                .insert({
                  lead_id: lead.id,
                  full_name: contact.fullName,
                  title: contact.title || null,
                  email: email,
                  email_status: 'pending',
                  source: contact.source || 'google_search',
                })

              if (insertError) {
                console.error(`Failed to save contact: ${contact.fullName}`, insertError)
                errors.push(`Failed to save ${contact.fullName}`)
              } else {
                totalContactsFound++
                console.log(`Saved contact: ${contact.fullName}`)
              }

              // Small delay between contacts
              await new Promise(resolve => setTimeout(resolve, 500))
            }

            totalLeadsProcessed++

            // Delay between leads
            await new Promise(resolve => setTimeout(resolve, 1000))

          } catch (error) {
            console.error(`Error processing lead ${lead.business_name}:`, error)
            errors.push(`Failed to process ${lead.business_name}`)
          }
        }

        jobsProcessed++

        // Delay between jobs (2 seconds to avoid rate limits)
        if (jobsProcessed < jobsData.length) {
          console.log(`Waiting 2 seconds before next job...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error)
        errors.push(`Failed to process job ${job.id}`)
      }
    }

    console.log(`\nMarket contact discovery completed:`)
    console.log(`- Total contacts found: ${totalContactsFound}`)
    console.log(`- Jobs processed: ${jobsProcessed}`)
    console.log(`- Leads processed: ${totalLeadsProcessed}`)
    console.log(`- Firecrawl credits exhausted: ${firecrawlCreditsExhausted}`)

    return NextResponse.json<MarketContactDiscoveryResponse>({
      success: true,
      totalContactsFound,
      jobsProcessed,
      totalLeadsProcessed,
      firecrawlCreditsExhausted,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    console.error('Unexpected error in market contact discovery:', error)
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
