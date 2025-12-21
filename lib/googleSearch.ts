import axios from 'axios'
import firstNames from './firstNames.json'

const SERPER_API_URL = 'https://google.serper.dev/search'

// Convert to Set for O(1) lookups
const validFirstNames = new Set(firstNames)

export interface GoogleSearchContact {
  fullName: string
  firstName: string
  lastName: string
  title?: string
  source: 'google_search'
}

/**
 * Searches Google for decision makers of a business
 * @param businessName - Business name to search for
 * @param location - Business location (optional, for better context)
 * @returns Array of contacts found via Google search
 */
export async function searchForDecisionMakers(
  businessName: string,
  location?: string
): Promise<GoogleSearchContact[]> {
  const apiKey = process.env.SERPER_API_KEY

  if (!apiKey) {
    console.warn('SERPER_API_KEY not set, skipping Google search')
    return []
  }

  const contacts: GoogleSearchContact[] = []
  const locationContext = location ? ` ${location}` : ''

  // Define search queries to find decision makers
  const queries = [
    `who are the founders of ${businessName}${locationContext}`,
    `${businessName}${locationContext} CEO founder`,
    `${businessName}${locationContext} marketing manager operations manager`,
  ]

  console.log(`Searching Google for decision makers: ${businessName}`)

  for (const query of queries) {
    try {
      console.log(`Query: "${query}"`)

      const response = await axios.post(
        SERPER_API_URL,
        {
          q: query,
          num: 10, // Get top 10 results
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      )

      const results = response.data

      // Extract contacts from organic results
      if (results.organic) {
        for (const result of results.organic) {
          const snippet = result.snippet || ''
          const title = result.title || ''
          const text = `${title} ${snippet}`

          const foundContacts = extractContactsFromText(text, businessName)
          contacts.push(...foundContacts)
        }
      }

      // Extract from knowledge graph if available
      if (results.knowledgeGraph) {
        const kg = results.knowledgeGraph
        if (kg.description) {
          const foundContacts = extractContactsFromText(kg.description, businessName)
          contacts.push(...foundContacts)
        }
      }

      // Rate limiting: 1 second delay between searches
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error(`Failed to search Google for "${query}":`, (error as Error).message)
    }
  }

  // Deduplicate contacts by name
  const uniqueContacts = deduplicateContacts(contacts)

  // Limit to 5 contacts max per business
  const limitedContacts = uniqueContacts.slice(0, 5)

  console.log(`Found ${limitedContacts.length} unique contacts from Google for ${businessName}`)
  return limitedContacts
}

/**
 * Extracts contact names and titles from text using pattern matching
 * @param text - Text to extract contacts from
 * @param businessName - Business name for context
 * @returns Array of contacts found
 */
function extractContactsFromText(text: string, businessName: string): GoogleSearchContact[] {
  const contacts: GoogleSearchContact[] = []

  // Common title patterns
  const titles = [
    'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CIO', 'CPO',
    'Chief Executive Officer', 'Chief Technology Officer', 'Chief Financial Officer',
    'Founder', 'Co-Founder', 'Co-founder', 'President', 'Vice President', 'VP',
    'Director', 'Manager', 'Marketing Manager', 'Operations Manager',
    'Head of', 'Owner', 'Principal', 'Partner',
  ]

  // Pattern 1: "John Smith, CEO of Company" or "John Smith, CEO"
  const pattern1 = /([A-Z][a-z]+(?: [A-Z][a-z]+)+),?\s+(CEO|CTO|CFO|COO|CMO|CIO|CPO|Founder|Co-Founder|Co-founder|President|Director|Manager|Owner|Vice President|VP|Partner|Chief [A-Za-z]+ Officer)/gi
  let matches = text.matchAll(pattern1)
  for (const match of matches) {
    const fullName = match[1].trim()
    const title = match[2].trim()
    const parsed = parseFullName(fullName)
    if (parsed) {
      contacts.push({
        fullName: parsed.fullName,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        title,
        source: 'google_search',
      })
    }
  }

  // Pattern 2: "founded by John Smith and Jane Doe" or "started by John Smith"
  const pattern2 = /(?:founded|started|created|established|launched)\s+by\s+([A-Z][a-z]+(?: [A-Z][a-z]+)+(?:\s+and\s+[A-Z][a-z]+(?: [A-Z][a-z]+)+)?)/gi
  matches = text.matchAll(pattern2)
  for (const match of matches) {
    const namesText = match[1]
    // Split by "and" to get multiple names
    const names = namesText.split(/\s+and\s+/i)
    for (const name of names) {
      const parsed = parseFullName(name.trim())
      if (parsed) {
        contacts.push({
          fullName: parsed.fullName,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          title: 'Founder',
          source: 'google_search',
        })
      }
    }
  }

  // Pattern 3: "Title - Name" or "Title: Name"
  const pattern3 = /(CEO|CTO|CFO|COO|CMO|Founder|Co-Founder|Co-founder|President|Director|Manager|Owner)[:\s-]+([A-Z][a-z]+(?: [A-Z][a-z]+)+)/gi
  matches = text.matchAll(pattern3)
  for (const match of matches) {
    const title = match[1].trim()
    const fullName = match[2].trim()
    const parsed = parseFullName(fullName)
    if (parsed) {
      contacts.push({
        fullName: parsed.fullName,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        title,
        source: 'google_search',
      })
    }
  }

  // Pattern 4: "John Smith is the CEO" or "John Smith serves as CEO"
  const pattern4 = /([A-Z][a-z]+(?: [A-Z][a-z]+)+)\s+(?:is|serves as|works as)\s+(?:the\s+)?([A-Z][A-Za-z\s]+?)(?:\.|,|$|\s+(?:of|at|for))/gi
  matches = text.matchAll(pattern4)
  for (const match of matches) {
    const fullName = match[1].trim()
    const potentialTitle = match[2].trim()

    // Check if potential title is actually a title
    if (titles.some(t => potentialTitle.toLowerCase().includes(t.toLowerCase()))) {
      const parsed = parseFullName(fullName)
      if (parsed) {
        contacts.push({
          fullName: parsed.fullName,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          title: potentialTitle,
          source: 'google_search',
        })
      }
    }
  }

  return contacts
}

/**
 * Validates if a text string is a valid person name
 * Uses comprehensive first name database for validation
 */
export function isValidName(text: string): boolean {
  const words = text.trim().split(/\s+/)

  // Must be 2-4 words
  if (words.length < 2 || words.length > 4) {
    console.log(`Rejected: ${text} - wrong word count (${words.length})`)
    return false
  }

  // First word MUST be in valid names database
  const firstName = words[0]
  if (!validFirstNames.has(firstName)) {
    console.log(`Rejected: ${text} - "${firstName}" not in name database`)
    return false
  }

  // All words must start with capital letter
  if (!words.every(w => /^[A-Z]/.test(w))) {
    console.log(`Rejected: ${text} - not properly capitalized`)
    return false
  }

  // Last name should be at least 2 characters
  const lastName = words[words.length - 1]
  if (lastName.length < 2) {
    console.log(`Rejected: ${text} - last name too short (${lastName.length} chars)`)
    return false
  }

  console.log(`✓ Accepted: ${text}`)
  return true
}

/**
 * Parses full name into first and last name
 */
function parseFullName(fullName: string): { fullName: string; firstName: string; lastName: string } | null {
  const parts = fullName.trim().split(/\s+/)

  if (parts.length < 2) return null

  // Filter out common non-name words that might have been captured
  const filteredParts = parts.filter(part =>
    !['and', 'the', 'of', 'at', 'for', 'by'].includes(part.toLowerCase())
  )

  if (filteredParts.length < 2) return null

  const reconstructedName = filteredParts.join(' ')

  // Validate the name before returning
  if (!isValidName(reconstructedName)) return null

  return {
    fullName: reconstructedName,
    firstName: filteredParts[0],
    lastName: filteredParts[filteredParts.length - 1],
  }
}

/**
 * Deduplicates contacts by name (case-insensitive)
 */
function deduplicateContacts(contacts: GoogleSearchContact[]): GoogleSearchContact[] {
  const seen = new Set<string>()
  const unique: GoogleSearchContact[] = []

  for (const contact of contacts) {
    const key = contact.fullName.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(contact)
    }
  }

  return unique
}
