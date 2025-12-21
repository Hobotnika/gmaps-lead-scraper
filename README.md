# Google Maps Lead Scraper

A custom lead generation tool built with Next.js 14 that scrapes Google Maps business data and finds emails. Perfect for sales teams, marketers, and business developers looking to build targeted lead lists.

## Features

- **Smart Scraping:** Extract Google Maps business listings based on search queries and locations
- **Comprehensive Data:** Get business name, address, phone, website, ratings, reviews, and category
- **Email Discovery:** Automatically find emails from business websites in a single scrape
- **Dual-Source Contact Discovery:** Find key contacts via Google search + Firecrawl team pages
- **Clean Markdown Extraction:** Firecrawl returns clean content, no navigation garbage
- **JavaScript Site Support:** Handles modern JavaScript-heavy websites properly
- **Smart Name Validation:** 20,000+ international name database filters out garbage text
- **International Support:** Italian, Spanish, French, German, Portuguese, Arabic, and more
- **Zero API Costs:** Local-only name validation, no external API calls, fast O(1) lookups
- **Duplicate Detection:** Intelligent deduplication prevents the same business from being saved twice
- **Job History:** View and manage all past scrapes with detailed statistics
- **CSV Export:** Download leads as CSV with decision makers for easy import into CRM tools
- **Job-Based Scraping:** Track scraping status and processing time
- **Modern UI:** Clean, responsive interface built with shadcn/ui and Tailwind CSS
- **Type-Safe:** Fully typed with TypeScript for better developer experience

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Scraping:** Apify API
- **Google Search:** Serper API
- **Team Page Scraping:** Firecrawl (clean markdown extraction)

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account and project ([Create one here](https://supabase.com))
- An Apify account and API token ([Sign up here](https://apify.com))
- A Serper account for Google search ([Sign up here](https://serper.dev/signup) - 2,500 free searches/month)
- A Firecrawl account for team page scraping ([Sign up here](https://firecrawl.dev) - 500 free scrapes/month)

## Getting Started

### 1. Clone and Install Dependencies

```bash
cd gmaps-lead-scraper
npm install
```

### 2. Set Up Environment Variables

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

Then fill in your actual values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Apify API Token
APIFY_API_TOKEN=your-apify-api-token

# Serper API Key (for Google search to find decision makers)
SERPER_API_KEY=your-serper-api-key

# Firecrawl API Key (for clean team page scraping)
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
```

**Finding your Supabase credentials:**
1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy the Project URL and anon/public key
4. For the service role key, scroll down to "Service Role" section

**Finding your Serper API key:**
1. Sign up for a free Serper account at [serper.dev/signup](https://serper.dev/signup)
2. You'll get 2,500 free Google searches per month
3. Go to your Serper dashboard
4. Navigate to "API Key" section
5. Copy your API key

**Note:** Serper is essential for finding decision makers via Google search. The system uses 3 searches per business to maximize contact discovery.

### 3. Set Up the Database

#### Initial Schema Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/schema.sql`
4. Paste and run the SQL to create tables, indexes, and policies

#### Run Database Migrations

After setting up the initial schema, run these migrations in order:

**1. Deduplication Migration**

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/add_place_id_unique.sql`
4. Paste and run the SQL to add deduplication fields

This migration adds:
- `place_id` field to uniquely identify businesses
- `last_updated` timestamp for tracking changes
- Unique constraint to prevent duplicate leads
- Auto-update trigger for timestamp

**2. Contacts Table Migration**

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/add_contacts_table.sql`
4. Paste and run the SQL to create the contacts table

This migration adds:
- `contacts` table for storing decision makers
- `contacts_found` counter on leads table
- Automatic contact count updates via trigger

**3. Contact Source Tracking Migration**

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/add_contact_source.sql`
4. Paste and run the SQL to add source tracking

This migration adds:
- `source` field to track where contact was found (team_page or google_search)
- Index for faster filtering by source

Alternatively, you can use the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
gmaps-lead-scraper/
├── app/                # Next.js App Router pages and layouts
├── components/         # React components
├── lib/               # Utility functions and configurations
│   └── supabase.ts   # Supabase client utilities
├── types/            # TypeScript type definitions
│   └── database.ts   # Database schema types
├── supabase/         # Database schema and migrations
│   └── schema.sql    # Initial database schema
├── public/           # Static assets
└── ...config files
```

## Database Schema

### scrape_jobs
Stores scraping job information and status.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| search_query | TEXT | The search term (e.g., "restaurants") |
| location | TEXT | Location to search (e.g., "New York, NY") |
| max_results | INTEGER | Maximum number of results to scrape |
| status | TEXT | Job status: pending, running, completed, failed |
| created_at | TIMESTAMP | Job creation time |
| completed_at | TIMESTAMP | Job completion time |
| error_message | TEXT | Error details if job failed |

### leads
Stores scraped business information with deduplication.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| job_id | UUID | References scrape_jobs.id |
| business_name | TEXT | Business name |
| address | TEXT | Business address |
| phone | TEXT | Phone number |
| website | TEXT | Website URL |
| rating | DECIMAL | Google Maps rating (0-5) |
| review_count | INTEGER | Number of reviews |
| category | TEXT | Business category |
| email | TEXT | Discovered email address |
| email_found_at | TIMESTAMP | When email was found |
| place_id | TEXT | Google Maps place ID (unique) |
| last_updated | TIMESTAMP | Last update timestamp |
| contacts_found | INTEGER | Number of decision makers found |
| created_at | TIMESTAMP | Record creation time |

**Note:** The `place_id` field has a unique constraint to prevent duplicate businesses. When the same business is scraped again, the existing record is updated instead of creating a duplicate.

### contacts
Stores decision maker contact information for each lead.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| lead_id | UUID | References leads.id |
| full_name | TEXT | Contact's full name |
| title | TEXT | Job title (CEO, Founder, etc.) |
| email | TEXT | Contact's email address |
| email_status | TEXT | Validation status: valid, invalid, catch-all, unknown, pending |
| source | TEXT | Where contact was found: google_search or firecrawl |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update timestamp |

**Note:** Decision makers are discovered through dual-source discovery: Google search (Serper API) and team page scraping (Firecrawl API). Firecrawl returns clean markdown content, eliminating navigation garbage issues.

## Usage

### Basic Lead Scraping

1. Enter a search term (e.g., "coffee shops", "restaurants", "plumbers")
2. Enter a location (e.g., "New York, NY", "San Francisco")
3. Choose max results (10-100)
4. Click "Search" and wait for results
5. Generic emails (info@, hello@, contact@) are automatically extracted

### Finding Decision Makers

After running a scrape:

1. Click "Find Decision Makers" button above the results table
2. The system uses dual-source discovery to find decision makers:

   **Source 1: Google Search (via Serper)**
   - Searches Google for "founders of [Business]", "[Business] CEO", etc.
   - Finds decision makers even for businesses without websites
   - Works with businesses in any location worldwide

   **Source 2: Firecrawl Team Pages**
   - Scrapes /about, /team, /leadership pages with clean markdown
   - Handles JavaScript-heavy sites properly
   - No navigation garbage (unlike traditional scrapers)
   - Extracts names and titles from clean content

3. For each contact found:
   - Strict name validation using 20,000+ international name database
   - Filters out garbage text like "was very helpful" or "Detail Name"
   - Accepts real names: "Saverio Castellaneta", "Jean Dupont", "Klaus Schmidt"
   - Generates 8 email variations (firstname@, first.last@, jsmith@, etc.)
   - Saves first email variation with status 'pending'
   - Deduplicates across both sources
   - Maximum 15 contacts per business

4. View decision makers in the "Decision Makers" column
   - Source indicators: [Google] or [Firecrawl]
   - Higher discovery rate (60% → 80%+) with dual sources

5. Export to CSV to get all data including decision makers

**Name Validation:**
- **20,000+ International Name Database:** Comprehensive list from NameDatabases repository
- **Italian Names:** Saverio, Fulvio, Alfonso, Luca, Marco, Giovanni, Francesco, etc.
- **Spanish Names:** Javier, Raul, Sergio, Pablo, Miguel, etc.
- **French Names:** Pierre, Jean, Antoine, François, Jacques, etc.
- **German Names:** Klaus, Hans, Otto, Wolfgang, Helmut, etc.
- **Arabic Names:** Ahmed, Hassan, Fatima, Omar, Khalil, etc.
- **Zero API Costs:** Local JSON file, no external API calls, works offline
- **Fast O(1) Lookups:** Using JavaScript Set for instant validation
- **Filters garbage:** Rejects "was very helpful", "We are hiring General", "Detail Name"
- **Accepts real names:** "Saverio Castellaneta", "John Smith", "Wei Chen", "Jean Dupont"
- **Requirements:** 2-4 words, properly capitalized, last name 2+ characters

**Serper Credits:**
- Free tier: 2,500 Google searches/month
- 3 searches per business (founders, CEO, managers)
- Significantly increases contact discovery rate
- Can process ~833 businesses per month on free tier

**Firecrawl Credits:**
- Free tier: 500 scrapes/month
- Tries up to 8 team page URLs per business
- Most URLs fail fast (404, no content), typically 2-3 successful scrapes per business
- Real usage: ~200-250 businesses per month on free tier
- Clean markdown extraction, no navigation text
- Handles JavaScript-heavy modern websites

### CSV Export

Click "Export to CSV" to download your leads with:
- Business information (name, address, phone, website)
- Generic email (if found)
- Decision makers with titles and validated emails
- Ratings and review counts
- Date scraped

Format: `leads_{keyword}_{location}_{date}.csv`

## Development

### Adding UI Components

This project uses shadcn/ui. To add new components:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add table
```

### Type Safety

All database operations are fully typed using TypeScript. The types are defined in `types/database.ts` and match the Supabase schema.

### Supabase Client Usage

```typescript
// Client Component
import { createClient } from '@/lib/supabase'
const supabase = createClient()

// Server Component
import { createServerComponentClient } from '@/lib/supabase'
const supabase = await createServerComponentClient()

// Server Action / Route Handler
import { createServerActionClient } from '@/lib/supabase'
const supabase = await createServerActionClient()

// Admin operations (use with caution)
import { createAdminClient } from '@/lib/supabase'
const supabase = createAdminClient()
```

## Deployment

### Vercel Deployment (Recommended)

#### Pre-Deployment Checklist

✅ **Verify Local Build Works**
```bash
npm run build
npm start
# Test at http://localhost:3000
```

✅ **Database Migration Applied**
- Initial schema: `supabase/schema.sql`
- Deduplication migration: `supabase/add_place_id_unique.sql`

✅ **Environment Variables Ready**
- All secrets prepared (Supabase keys, Apify token)
- NEVER commit `.env.local` to git

#### Step-by-Step Deployment

**1. Push to GitHub**
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

**2. Import Project to Vercel**
- Go to [vercel.com/new](https://vercel.com/new)
- Click "Import Git Repository"
- Select your `gmaps-lead-scraper` repository
- Click "Import"

**3. Configure Environment Variables**

In the Vercel dashboard, add these environment variables:

| Variable | Where to Find | Example |
|----------|---------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → Project API keys → anon/public | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → Project API keys → service_role | `eyJhbGciOi...` |
| `APIFY_API_TOKEN` | Apify Dashboard → Settings → Integrations | `apify_api_...` |
| `SERPER_API_KEY` | Serper Dashboard → API Key | `your-api-key...` |
| `FIRECRAWL_API_KEY` | Firecrawl Dashboard → API Key | `fc-...` |

**How to add in Vercel:**
1. Go to your project in Vercel
2. Click "Settings" → "Environment Variables"
3. Add each variable:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `your-actual-value`
   - Environment: Select "Production", "Preview", and "Development"
4. Click "Save"
5. Repeat for all 6 variables

**4. Deploy**
- Click "Deploy" button
- Wait for build to complete (~2-3 minutes)
- Visit your deployment URL

**5. Post-Deployment Verification**

✅ **Test Core Features:**
1. Visit your deployed URL
2. Run a test scrape: "Coffee Shops" in "New York" (10 results)
3. Verify results appear in table
4. Check emails are extracted
5. Export to CSV
6. Navigate to `/history` - verify job appears
7. View job detail page
8. Run same search again - verify duplicate detection

✅ **Check Logs:**
- Vercel Dashboard → Your Project → Deployments → Click latest → "Functions" tab
- Look for: "Inserted X new leads, updated Y existing leads"

#### Troubleshooting

**Build Fails:**
- Check Vercel build logs
- Verify all environment variables are set correctly
- Ensure Node.js version is compatible (18+)

**Database Connection Errors:**
- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Ensure RLS policies allow access

**Apify Errors:**
- Verify API token is valid
- Check Apify account has credits
- Review Apify actor availability

**No Results Showing:**
- Check browser console for errors
- Verify API routes are working: `/api/scrape`, `/api/jobs`
- Check Supabase tables have data

#### Production Best Practices

**Security:**
- ✅ Never commit `.env.local` or secrets
- ✅ Use Supabase RLS policies
- ✅ Rotate service role key if exposed
- ✅ Monitor Apify usage/costs

**Performance:**
- ✅ Monitor Vercel function execution times
- ✅ Check Supabase query performance
- ✅ Consider caching for frequently accessed jobs

**Monitoring:**
- ✅ Set up Vercel Analytics
- ✅ Monitor Supabase usage
- ✅ Track Apify credits

### Other Platforms

For platforms other than Vercel:
- Ensure Node.js 18+ support
- Set all 6 environment variables
- Configure build command: `npm run build`
- Configure start command: `npm start`
- Ensure PostgreSQL database (Supabase) is accessible

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
