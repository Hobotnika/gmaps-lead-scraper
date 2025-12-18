-- Add source field to contacts table to track where contact was found
-- Run this migration after add_contacts_table.sql

-- Add source column with default value
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'team_page' CHECK (source IN ('team_page', 'google_search'));

-- Add index for faster filtering by source
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);

-- Update existing contacts to have 'team_page' as source
UPDATE contacts SET source = 'team_page' WHERE source IS NULL;

-- Make source NOT NULL after setting defaults
ALTER TABLE contacts ALTER COLUMN source SET NOT NULL;
