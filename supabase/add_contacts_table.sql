-- Migration: Add contacts table for decision-maker emails
-- Purpose: Store individual contacts (decision makers) for each lead
-- Run this in Supabase SQL Editor after add_place_id_unique.sql

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  email_status TEXT CHECK (email_status IN ('valid', 'invalid', 'catch-all', 'unknown', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email_status ON contacts(email_status);

-- Add contacts_found counter to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contacts_found INTEGER DEFAULT 0;

-- Update contacts_found when contacts are added/removed
CREATE OR REPLACE FUNCTION update_contacts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE leads SET contacts_found = contacts_found + 1 WHERE id = NEW.lead_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE leads SET contacts_found = contacts_found - 1 WHERE id = OLD.lead_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update contacts_found
DROP TRIGGER IF EXISTS update_contacts_count_trigger ON contacts;
CREATE TRIGGER update_contacts_count_trigger
  AFTER INSERT OR DELETE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_count();

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'contacts'
ORDER BY ordinal_position;

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name = 'contacts_found';
