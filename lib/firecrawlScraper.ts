import FirecrawlApp from '@mendable/firecrawl-js';
import { isValidName } from './googleSearch';

interface ScrapedContact {
  fullName: string;
  title: string;
}

export interface FirecrawlResult {
  contacts: ScrapedContact[];
  creditsExhausted: boolean;
}

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY
});

const TEAM_PATHS = [
  '/about',
  '/team',
  '/our-team'
];

export async function scrapeTeamPagesWithFirecrawl(
  websiteUrl: string
): Promise<FirecrawlResult> {
  const contacts: ScrapedContact[] = [];
  const baseUrl = websiteUrl.replace(/\/$/, ''); // Remove trailing slash

  console.log(`\nScraping team pages with Firecrawl for: ${baseUrl}`);

  // Check Firecrawl credits before scraping
  try {
    const response = await fetch('https://api.firecrawl.dev/v0/account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`Firecrawl balance check failed with status ${response.status} (non-blocking)`);
      // Skip balance check, continue scraping
    } else {
      const account = await response.json();
      console.log(`🔥 Firecrawl credits remaining: ${account.credits || 'unknown'}`);

      if (account.credits !== undefined && account.credits < 10) {
        console.warn('⚠️  WARNING: Firecrawl credits low! Less than 10 remaining.');
      }

      if (account.credits === 0) {
        console.error('❌ FIRECRAWL CREDITS EXHAUSTED - Skipping team page scraping this month');
        return { contacts: [], creditsExhausted: true };
      }
    }
  } catch (error: any) {
    console.log('Firecrawl balance check error (non-blocking):', error.message);
    // Continue anyway - don't block on balance check failure
  }

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
        // Add delay before next request to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 6000));
        continue;
      }

      // Extract contacts from clean markdown
      const pageContacts = extractContactsFromMarkdown(result.markdown);

      if (pageContacts.length > 0) {
        console.log(`Found ${pageContacts.length} contacts on ${path}`);
        contacts.push(...pageContacts);
        // Stop immediately after finding contacts to save credits
        console.log(`Found contacts, stopping to save Firecrawl credits`);
        break;
      }

      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 6000));

    } catch (error: any) {
      console.log(`Failed to scrape ${url}: ${error.message}`);

      // Handle rate limit errors gracefully
      if (error.message && error.message.includes('Rate limit exceeded')) {
        console.log(`Rate limit hit, skipping remaining URLs to avoid hanging`);
        break;
      }

      // Handle timeout errors
      if (error.message && error.message.includes('timed out')) {
        console.log(`Timeout on ${url}, trying next URL`);
        await new Promise(resolve => setTimeout(resolve, 6000));
        continue;
      }

      // Add delay before next request even on error
      await new Promise(resolve => setTimeout(resolve, 6000));
      continue;
    }
  }

  return { contacts: deduplicateContacts(contacts), creditsExhausted: false };
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
