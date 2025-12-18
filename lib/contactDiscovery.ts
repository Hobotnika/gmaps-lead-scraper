import axios from 'axios'
import * as cheerio from 'cheerio'
import { searchForDecisionMakers, type GoogleSearchContact } from './googleSearch'

export interface Contact {
  fullName: string
  firstName: string
  lastName: string
  title?: string
  source?: 'team_page' | 'google_search'
}

/**
 * Scrapes team/about pages to find contacts
 * @param websiteUrl - Base website URL
 * @returns Array of contacts found
 */
export async function scrapeTeamPage(websiteUrl: string): Promise<Contact[]> {
  const contacts: Contact[] = []

  // Common team page paths to try
  const teamPaths = [
    '/team',
    '/about',
    '/about-us',
    '/our-team',
    '/leadership',
    '/founders',
    '/people',
    '/contact',
  ]

  // Normalize website URL
  let baseUrl = websiteUrl.trim()
  if (!baseUrl.startsWith('http')) {
    baseUrl = 'https://' + baseUrl
  }
  // Remove trailing slash
  baseUrl = baseUrl.replace(/\/+$/, '')

  console.log(`Scraping team pages for: ${baseUrl}`)

  for (const path of teamPaths) {
    try {
      const url = baseUrl + path
      console.log(`Trying: ${url}`)

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      const foundContacts = extractContacts(response.data)

      if (foundContacts.length > 0) {
        console.log(`Found ${foundContacts.length} contacts on ${path}`)
        contacts.push(...foundContacts)

        // Stop after finding contacts on first successful page
        if (contacts.length >= 5) {
          break
        }
      }

      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      // Silently continue to next path
      console.log(`Failed to scrape ${baseUrl}${path}:`, (error as Error).message)
    }
  }

  // Deduplicate contacts by name
  const uniqueContacts = contacts.filter((contact, index, self) =>
    index === self.findIndex(c => c.fullName.toLowerCase() === contact.fullName.toLowerCase())
  )

  console.log(`Total unique contacts found: ${uniqueContacts.length}`)

  // Add source field to all contacts
  const contactsWithSource = uniqueContacts.map(contact => ({
    ...contact,
    source: 'team_page' as const,
  }))

  return contactsWithSource.slice(0, 10) // Limit to 10 contacts per company
}

/**
 * Extracts contact names and titles from HTML
 * @param html - HTML content to parse
 * @returns Array of contacts
 */
export function extractContacts(html: string): Contact[] {
  const contacts: Contact[] = []
  const $ = cheerio.load(html)

  // Common title patterns (case-insensitive)
  const titlePatterns = [
    'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CIO', 'CPO',
    'Founder', 'Co-Founder', 'President', 'VP', 'Vice President',
    'Director', 'Manager', 'Head of', 'Chief', 'Partner',
    'Owner', 'Principal', 'Lead', 'Senior'
  ]

  // Try to find structured team member elements
  const selectors = [
    '.team-member',
    '.member',
    '.person',
    '.staff',
    '.employee',
    '[class*="team"]',
    '[class*="member"]',
    '[class*="person"]'
  ]

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const $el = $(element)
      const text = $el.text()

      // Try to find name and title within element
      const nameMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g)

      if (nameMatch) {
        nameMatch.forEach(fullName => {
          const contact = parseNameAndTitle(fullName, text, titlePatterns)
          if (contact) {
            contacts.push(contact)
          }
        })
      }
    })
  }

  // If structured approach didn't work, try regex patterns on full text
  if (contacts.length === 0) {
    const bodyText = $('body').text()

    // Pattern: "Name, Title" or "Title - Name"
    const patterns = [
      /([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+(CEO|CTO|CFO|COO|CMO|Founder|Co-Founder|President|Director|Manager|Owner)/gi,
      /(CEO|CTO|CFO|COO|CMO|Founder|Co-Founder|President|Director|Manager|Owner)[:\s-]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    ]

    for (const pattern of patterns) {
      const matches = bodyText.matchAll(pattern)
      for (const match of matches) {
        const fullName = match[1] || match[2]
        const title = match[2] || match[1]

        if (fullName && title && fullName.split(' ').length >= 2) {
          const names = parseFullName(fullName)
          if (names) {
            contacts.push({
              fullName: names.fullName,
              firstName: names.firstName,
              lastName: names.lastName,
              title: title.trim(),
            })
          }
        }
      }
    }
  }

  return contacts
}

/**
 * Parses name and title from text
 */
function parseNameAndTitle(fullName: string, context: string, titlePatterns: string[]): Contact | null {
  const names = parseFullName(fullName)
  if (!names) return null

  // Look for title in surrounding context
  let title: string | undefined = undefined
  for (const pattern of titlePatterns) {
    const regex = new RegExp(pattern, 'i')
    if (regex.test(context)) {
      const match = context.match(regex)
      if (match) {
        title = match[0]
        break
      }
    }
  }

  return {
    fullName: names.fullName,
    firstName: names.firstName,
    lastName: names.lastName,
    title,
  }
}

/**
 * Parses full name into first and last name
 */
function parseFullName(fullName: string): { fullName: string; firstName: string; lastName: string } | null {
  const parts = fullName.trim().split(/\s+/)

  if (parts.length < 2) return null

  return {
    fullName: fullName.trim(),
    firstName: parts[0],
    lastName: parts[parts.length - 1],
  }
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
 * Finds contacts using both team page scraping and Google search
 * @param websiteUrl - Business website URL
 * @param businessName - Business name for Google search
 * @param location - Business location (optional)
 * @returns Combined array of contacts from both sources
 */
export async function findAllContacts(
  websiteUrl: string | null,
  businessName: string,
  location?: string
): Promise<Contact[]> {
  const allContacts: Contact[] = []

  // 1. Scrape team pages (if website is available)
  if (websiteUrl) {
    try {
      const teamPageContacts = await scrapeTeamPage(websiteUrl)
      allContacts.push(...teamPageContacts)
      console.log(`Found ${teamPageContacts.length} contacts from team page`)
    } catch (error) {
      console.error('Error scraping team page:', (error as Error).message)
    }
  }

  // 2. Search Google for decision makers
  try {
    const googleContacts = await searchForDecisionMakers(businessName, location)
    allContacts.push(...googleContacts)
    console.log(`Found ${googleContacts.length} contacts from Google search`)
  } catch (error) {
    console.error('Error searching Google:', (error as Error).message)
  }

  // 3. Deduplicate contacts by name (case-insensitive)
  // Prioritize team page results over Google results
  const seenNames = new Set<string>()
  const uniqueContacts: Contact[] = []

  // First, add all team page contacts
  for (const contact of allContacts) {
    const nameLower = contact.fullName.toLowerCase()
    if (contact.source === 'team_page' && !seenNames.has(nameLower)) {
      seenNames.add(nameLower)
      uniqueContacts.push(contact)
    }
  }

  // Then, add Google contacts that don't duplicate team page contacts
  for (const contact of allContacts) {
    const nameLower = contact.fullName.toLowerCase()
    if (contact.source === 'google_search' && !seenNames.has(nameLower)) {
      seenNames.add(nameLower)
      uniqueContacts.push(contact)
    }
  }

  console.log(`Total unique contacts after deduplication: ${uniqueContacts.length}`)

  // Limit to top 15 contacts per business (increased from 10 to accommodate both sources)
  return uniqueContacts.slice(0, 15)
}
