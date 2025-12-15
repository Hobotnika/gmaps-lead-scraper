-- Google Maps Lead Scraper Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create scrape_jobs table
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_query TEXT NOT NULL,
  location TEXT NOT NULL,
  max_results INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  rating DECIMAL(2, 1),
  review_count INTEGER,
  category TEXT,
  email TEXT,
  email_found_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_job_id ON leads(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON scrape_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Add Row Level Security (RLS) policies
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication requirements)
-- For now, allowing all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON scrape_jobs
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON leads
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Optional: Create a view for jobs with lead counts
CREATE OR REPLACE VIEW jobs_with_stats AS
SELECT
  sj.*,
  COUNT(l.id) as total_leads,
  COUNT(l.email) as leads_with_email
FROM scrape_jobs sj
LEFT JOIN leads l ON sj.id = l.job_id
GROUP BY sj.id;
