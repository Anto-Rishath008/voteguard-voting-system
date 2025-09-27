-- Create password_reset_tokens table for secure password reset functionality
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraint
    CONSTRAINT fk_password_reset_user_id 
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_password_reset_token (token),
    INDEX idx_password_reset_user_id (user_id),
    INDEX idx_password_reset_expires_at (expires_at),
    INDEX idx_password_reset_used (used)
);

-- Add some useful comments
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens with expiration and usage tracking';
COMMENT ON COLUMN password_reset_tokens.token IS 'Unique reset token generated with crypto.randomBytes()';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (typically 1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Whether the token has been used to reset password';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used';

-- Clean up expired tokens periodically (you might want to set up a cron job for this)
-- DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP;