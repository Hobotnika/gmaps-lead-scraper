import { searchForDecisionMakers } from './googleSearch'

export interface Contact {
  fullName: string
  firstName: string
  lastName: string
  title?: string
  source?: 'google_search'
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
 * Finds contacts using Google search only
 * Team page scraping was disabled (extracted navigation text instead of actual contacts)
 * @param websiteUrl - Business website URL (not used, kept for API compatibility)
 * @param businessName - Business name for Google search
 * @param location - Business location (optional)
 * @returns Array of contacts from Google search
 */
export async function findAllContacts(
  websiteUrl: string | null,
  businessName: string,
  location?: string
): Promise<Contact[]> {
  // Only use Google search (team scraper was extracting navigation text)
  const googleResults = await searchForDecisionMakers(businessName, location)

  console.log(`Found ${googleResults.length} contacts from Google search`)

  return googleResults.slice(0, 15)
}
