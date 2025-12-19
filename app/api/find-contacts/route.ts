import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { findAllContacts, generateEmails, extractDomain } from '@/lib/contactDiscovery'
import type { ContactDiscoveryResponse } from '@/types'

/**
 * POST /api/find-contacts
 * Finds decision-maker contacts for leads in a job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    console.log(`Starting contact discovery for job: ${jobId}`)

    const supabase = createAdminClient()

    // Get all leads for this job (Google search works even without websites)
    const { data: leads, error: leadsError } = await (supabase
      .from('leads') as any)
      .select('*')
      .eq('job_id', jobId)

    if (leadsError) {
      console.error('Failed to fetch leads:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    const leadsData = leads as any[]

    if (!leadsData || leadsData.length === 0) {
      return NextResponse.json<ContactDiscoveryResponse>({
        success: true,
        contactsFound: 0,
        emailsValidated: 0,
        quotaRemaining: null,
        leadsProcessed: 0,
      })
    }

    console.log(`Found ${leadsData.length} leads to process`)

    let totalContactsFound = 0
    let leadsProcessed = 0
    const errors: string[] = []

    // Process each lead
    for (const lead of leadsData) {
      try {
        console.log(`\n=== Processing lead: ${lead.business_name} ===`)

        // Find contacts from both team pages and Google search
        const contacts = await findAllContacts(
          lead.website,
          lead.business_name,
          lead.address
        )

        if (contacts.length === 0) {
          console.log(`No contacts found for ${lead.business_name}`)
          continue
        }

        // Count sources
        const teamPageCount = contacts.filter(c => c.source === 'team_page').length
        const googleCount = contacts.filter(c => c.source === 'google_search').length
        console.log(`Found ${contacts.length} total contacts: ${teamPageCount} from team page, ${googleCount} from Google`)

        const domain = lead.website ? extractDomain(lead.website) : lead.business_name.toLowerCase().replace(/\s+/g, '') + '.com'

        // Process each contact
        for (const contact of contacts) {
          // Generate email variations
          const emailVariations = generateEmails(
            contact.firstName,
            contact.lastName,
            domain
          )

          console.log(`Generated ${emailVariations.length} email variations for ${contact.fullName}`)

          // Pick first email variation (no validation)
          const email = emailVariations[0] || null

          // Save contact to database with pending status
          const { error: insertError } = await (supabase
            .from('contacts') as any)
            .insert({
              lead_id: lead.id,
              full_name: contact.fullName,
              title: contact.title || null,
              email: email,
              email_status: 'pending',
              source: contact.source || 'team_page',
            })

          if (insertError) {
            console.error(`Failed to save contact: ${contact.fullName}`, insertError)
            errors.push(`Failed to save ${contact.fullName}`)
          } else {
            totalContactsFound++
            console.log(`Saved contact: ${contact.fullName} with email: ${email}`)
          }

          // Small delay between contacts
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        leadsProcessed++

        // Delay between leads
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.error(`Error processing lead ${lead.business_name}:`, error)
        errors.push(`Failed to process ${lead.business_name}`)
      }
    }

    console.log(`Contact discovery completed:`)
    console.log(`- Contacts found: ${totalContactsFound}`)
    console.log(`- Leads processed: ${leadsProcessed}`)

    return NextResponse.json<ContactDiscoveryResponse>({
      success: true,
      contactsFound: totalContactsFound,
      emailsValidated: 0,
      quotaRemaining: null,
      leadsProcessed,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    console.error('Unexpected error in contact discovery:', error)
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
