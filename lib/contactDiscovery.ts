import { searchForDecisionMakers } from './googleSearch'
import { scrapeTeamPagesWithFirecrawl } from './firecrawlScraper'
import type { Lead } from '@/types'

export interface Contact {
  fullName: string
  firstName: string
  lastName: string
  title?: string
  source?: 'google_search' | 'firecrawl'
}

export interface ContactDiscoveryResult {
  contacts: Contact[]
  firecrawlCreditsExhausted: boolean
}

/**
 * Generates email variations for a contact
 * @param firstName - First name
 * @param lastName - Last name
 * @param domain - Email domain
 * @returns Array of possible email addresses
 */
export function generateEmails(firstName: string, lastName: string, domain: string): string[] {
  const first = firstName.toLowerCase()
  const last = lastName.toLowerCase()
  const firstInitial = first.charAt(0)
  const lastInitial = last.charAt(0)

  // Remove www. and http(s):// from domain
  let cleanDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '') // Remove any path
    .trim()

  const emails = [
    `${first}@${cleanDomain}`,                    // john@company.com
    `${last}@${cleanDomain}`,                     // smith@company.com
    `${first}.${last}@${cleanDomain}`,            // john.smith@company.com
    `${first}${last}@${cleanDomain}`,             // johnsmith@company.com
    `${firstInitial}${last}@${cleanDomain}`,      // jsmith@company.com
    `${first}${lastInitial}@${cleanDomain}`,      // johns@company.com
    `${firstInitial}.${last}@${cleanDomain}`,     // j.smith@company.com
    `${first}_${last}@${cleanDomain}`,            // john_smith@company.com
  ]

  // Remove duplicates and return
  return [...new Set(emails)]
}

/**
 * Extracts domain from website URL
 */
export function extractDomain(websiteUrl: string): string {
  return websiteUrl
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .trim()
}

/**
 * Finds contacts using dual-source discovery: Google search + Firecrawl team pages
 * @param lead - Lead object with business info (database format with snake_case)
 * @returns Object with contacts array and Firecrawl credit status
 */
export async function findAllContacts(lead: any): Promise<ContactDiscoveryResult> {
  const allContacts: Contact[] = []
  let firecrawlCreditsExhausted = false

  // Source 1: Google Search
  console.log(`\n=== Searching Google for: ${lead.business_name} ===`)
  const googleResults = await searchForDecisionMakers(
    lead.business_name,
    lead.address
  )
  allContacts.push(...googleResults.map(c => ({ ...c, source: 'google_search' as const })))
  console.log(`Found ${googleResults.length} contacts from Google search`)

  // Source 2: Firecrawl Team Pages
  if (lead.website && lead.website !== 'Not found') {
    console.log(`\n=== Scraping team pages for: ${lead.business_name} ===`)
    const firecrawlResult = await scrapeTeamPagesWithFirecrawl(lead.website)

    // Track if Firecrawl credits were exhausted
    if (firecrawlResult.creditsExhausted) {
      firecrawlCreditsExhausted = true
    }

    allContacts.push(...firecrawlResult.contacts.map(c => ({
      fullName: c.fullName,
      firstName: c.fullName.split(' ')[0],
      lastName: c.fullName.split(' ').slice(-1)[0],
      title: c.title,
      source: 'firecrawl' as const
    })))
    console.log(`Found ${firecrawlResult.contacts.length} contacts from Firecrawl`)
  }

  // Deduplicate by name (case-insensitive)
  const uniqueContacts = deduplicateByName(allContacts)

  console.log(`\nTotal unique contacts: ${uniqueContacts.length}`)
  console.log(`Sources: ${uniqueContacts.filter(c => c.source === 'google_search').length} Google, ${uniqueContacts.filter(c => c.source === 'firecrawl').length} Firecrawl`)

  return {
    contacts: uniqueContacts.slice(0, 15),
    firecrawlCreditsExhausted
  }
}

function deduplicateByName(contacts: Contact[]): Contact[] {
  const seen = new Map<string, Contact>()

  for (const contact of contacts) {
    const key = contact.fullName.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, contact)
    } else {
      // Prefer google_search source if duplicate
      const existing = seen.get(key)!
      if (contact.source === 'google_search' && existing.source !== 'google_search') {
        seen.set(key, contact)
      }
    }
  }

  return Array.from(seen.values())
}
