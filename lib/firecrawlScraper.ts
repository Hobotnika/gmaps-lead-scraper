import FirecrawlApp from '@mendable/firecrawl-js';
import { isValidName } from './googleSearch';

interface ScrapedContact {
  fullName: string;
  title: string;
}

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY
});

const TEAM_PATHS = [
  '/about',
  '/team',
  '/about-us',
  '/our-team',
  '/leadership',
  '/people',
  '/meet-the-team',
  '/founders'
];

export async function scrapeTeamPagesWithFirecrawl(
  websiteUrl: string
): Promise<ScrapedContact[]> {
  const contacts: ScrapedContact[] = [];
  const baseUrl = websiteUrl.replace(/\/$/, ''); // Remove trailing slash

  console.log(`\nScraping team pages with Firecrawl for: ${baseUrl}`);

  for (const path of TEAM_PATHS) {
    const url = `${baseUrl}${path}`;

    try {
      console.log(`Trying: ${url}`);

      // Scrape with Firecrawl
      const result = await firecrawl.scrape(url, {
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 10000
      });

      if (!result.markdown) {
        console.log(`Failed to scrape ${url}: No content returned`);
        continue;
      }

      // Extract contacts from clean markdown
      const pageContacts = extractContactsFromMarkdown(result.markdown);

      if (pageContacts.length > 0) {
        console.log(`Found ${pageContacts.length} contacts on ${path}`);
        contacts.push(...pageContacts);
      }

      // Stop after finding contacts on one page
      if (contacts.length >= 5) {
        break;
      }

    } catch (error: any) {
      console.log(`Failed to scrape ${url}: ${error.message}`);
      continue;
    }
  }

  return deduplicateContacts(contacts);
}

function extractContactsFromMarkdown(markdown: string): ScrapedContact[] {
  const contacts: ScrapedContact[] = [];

  // Patterns to match names and titles in markdown
  const patterns = [
    // "**John Smith** - CEO"
    /\*\*([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})\*\*\s*[-–—]\s*([A-Z][a-z]+(?: [A-Z][a-z]+)*)/g,

    // "John Smith, CEO"
    /([A-Z][a-z]+(?: [A-Z][a-z]+){1,3}),\s*([A-Z][a-z]+(?: [A-Z][a-z]+)*)/g,

    // "CEO: John Smith"
    /([A-Z][a-z]+(?: [A-Z][a-z]+)*):\s*([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})/g,

    // "Founded by John Smith"
    /founded by ([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})/gi,

    // "John Smith is the CEO"
    /([A-Z][a-z]+(?: [A-Z][a-z]+){1,3}) is the (CEO|Founder|Co-Founder|President|Director|Manager)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(markdown)) !== null) {
      let fullName: string;
      let title: string;

      if (pattern.source.includes('founded by')) {
        fullName = match[1];
        title = 'Founder';
      } else if (pattern.source.includes('is the')) {
        fullName = match[1];
        title = match[2];
      } else if (pattern.source.includes('CEO:')) {
        title = match[1];
        fullName = match[2];
      } else {
        fullName = match[1];
        title = match[2];
      }

      // Validate name using existing validation
      if (isValidName(fullName)) {
        contacts.push({
          fullName: fullName.trim(),
          title: title.trim()
        });
      }
    }
  }

  return contacts;
}

function deduplicateContacts(contacts: ScrapedContact[]): ScrapedContact[] {
  const seen = new Set<string>();
  const unique: ScrapedContact[] = [];

  for (const contact of contacts) {
    const key = contact.fullName.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(contact);
    }
  }

  return unique.slice(0, 10); // Max 10 per website
}
