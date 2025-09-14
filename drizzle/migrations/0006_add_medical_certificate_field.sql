-- Add medical certificate file ID field to holidays table
ALTER TABLE holidays
ADD COLUMN IF NOT EXISTS medical_certificate_file_id TEXT;