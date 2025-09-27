-- OTP Verification Table for VoteGuard
-- This table stores OTP codes for email and phone verification

CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('email', 'phone')) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_otp_email_type (email, type),
    INDEX idx_otp_expires (expires_at),
    INDEX idx_otp_verified (verified)
);

-- Clean up expired OTPs automatically (optional cleanup job)
-- This can be run periodically to remove old OTP records
-- DELETE FROM otp_verifications WHERE expires_at < NOW() - INTERVAL '1 day';