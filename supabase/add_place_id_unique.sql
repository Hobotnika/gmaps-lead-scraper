-- Migration: Add deduplication fields to leads table
-- Purpose: Prevent duplicate leads and track updates
-- Run this in Supabase SQL Editor

-- Add last_updated column if it doesn't exist
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add place_id column if it doesn't exist (should already exist from initial schema)
-- This column stores the unique Google Maps place ID
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS place_id TEXT;

-- Create unique index on place_id to prevent duplicates
-- Using WHERE place_id IS NOT NULL allows NULL values (some places might not have IDs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_place_id
ON leads(place_id)
WHERE place_id IS NOT NULL;

-- Create function to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_lead_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on updates
DROP TRIGGER IF EXISTS update_lead_timestamp ON leads;
CREATE TRIGGER update_lead_timestamp
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_updated_at();

-- Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name IN ('place_id', 'last_updated');

-- Show indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'leads'
AND indexname LIKE '%place_id%';
