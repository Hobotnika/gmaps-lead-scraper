# Google Maps Lead Scraper

A custom lead generation tool built with Next.js 14 that scrapes Google Maps business data and finds emails. Perfect for sales teams, marketers, and business developers looking to build targeted lead lists.

## Features

- **Smart Scraping:** Extract Google Maps business listings based on search queries and locations
- **Comprehensive Data:** Get business name, address, phone, website, ratings, reviews, and category
- **Email Discovery:** Automatically find emails from business websites in a single scrape
- **Duplicate Detection:** Intelligent deduplication prevents the same business from being saved twice
- **Job History:** View and manage all past scrapes with detailed statistics
- **CSV Export:** Download leads as CSV for easy import into CRM tools
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

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account and project ([Create one here](https://supabase.com))
- An Apify account and API token ([Sign up here](https://apify.com))

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
```

**Finding your Supabase credentials:**
1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy the Project URL and anon/public key
4. For the service role key, scroll down to "Service Role" section

### 3. Set Up the Database

#### Initial Schema Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/schema.sql`
4. Paste and run the SQL to create tables, indexes, and policies

#### Run Deduplication Migration

After setting up the initial schema, run the deduplication migration to add unique constraints and tracking:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/add_place_id_unique.sql`
4. Paste and run the SQL to add deduplication fields

This migration adds:
- `place_id` field to uniquely identify businesses
- `last_updated` timestamp for tracking changes
- Unique constraint to prevent duplicate leads
- Auto-update trigger for timestamp

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
| created_at | TIMESTAMP | Record creation time |

**Note:** The `place_id` field has a unique constraint to prevent duplicate businesses. When the same business is scraped again, the existing record is updated instead of creating a duplicate.

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

**How to add in Vercel:**
1. Go to your project in Vercel
2. Click "Settings" → "Environment Variables"
3. Add each variable:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `your-actual-value`
   - Environment: Select "Production", "Preview", and "Development"
4. Click "Save"
5. Repeat for all 4 variables

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
- Set all 4 environment variables
- Configure build command: `npm run build`
- Configure start command: `npm start`
- Ensure PostgreSQL database (Supabase) is accessible

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
