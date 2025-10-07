-- SIMPLIFIED REGISTRATION SCHEMA UPDATE
-- Makes all advanced security fields OPTIONAL (nullable)
-- This allows basic registration with just email, password, name, and role

-- Update users table to make advanced fields optional
-- (If columns don't exist yet, this will be handled by existing schema)

-- Make phone_number optional if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='phone_number'
    ) THEN
        ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;
    END IF;
END $$;

-- Make aadhaar_number optional if it exists  
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='aadhaar_number'
    ) THEN
        ALTER TABLE users ALTER COLUMN aadhaar_number DROP NOT NULL;
    END IF;
END $$;

-- Make college_id optional if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='college_id'
    ) THEN
        ALTER TABLE users ALTER COLUMN college_id DROP NOT NULL;
    END IF;
END $$;

-- Make institute_name optional if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='institute_name'
    ) THEN
        ALTER TABLE users ALTER COLUMN institute_name DROP NOT NULL;
    END IF;
END $$;

-- Make security_questions optional if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='security_questions'
    ) THEN
        ALTER TABLE users ALTER COLUMN security_questions DROP NOT NULL;
    END IF;
END $$;

-- Make fingerprint_data optional if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='fingerprint_data'
    ) THEN
        ALTER TABLE users ALTER COLUMN fingerprint_data DROP NOT NULL;
    END IF;
END $$;

-- Make email_verified default to false if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='email_verified'
    ) THEN
        ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;
    END IF;
END $$;

-- Make phone_verified default to false if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='phone_verified'
    ) THEN
        ALTER TABLE users ALTER COLUMN phone_verified SET DEFAULT false;
    END IF;
END $$;

-- Comment explaining the simplified registration
COMMENT ON TABLE users IS 'User table - Simplified registration: Only email, password, first_name, last_name, and role are required. All other fields are optional for future enhanced security features.';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
