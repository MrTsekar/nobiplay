-- Migration: Phase 1 Security Improvements
-- Date: December 21, 2025
-- Description: Add session expiration, daily limits, and performance indexes

-- 1. Add session expiration fields to trivia_sessions
ALTER TABLE trivia_sessions 
  ADD COLUMN expires_at TIMESTAMP,
  ADD COLUMN max_duration_seconds INTEGER DEFAULT 600;

-- Update existing sessions to have expiration (10 minutes from created_at)
UPDATE trivia_sessions 
SET expires_at = created_at + INTERVAL '10 minutes',
    max_duration_seconds = 600
WHERE expires_at IS NULL;

-- 2. Add daily limit tracking to wallets
ALTER TABLE wallets
  ADD COLUMN daily_coins_earned DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN daily_sessions_played INTEGER DEFAULT 0,
  ADD COLUMN last_limit_reset TIMESTAMP;

-- Initialize last_limit_reset for existing users
UPDATE wallets 
SET last_limit_reset = NOW()
WHERE last_limit_reset IS NULL;

-- 3. Create composite indexes for trivia_sessions (PERFORMANCE)
CREATE INDEX IF NOT EXISTS idx_trivia_session_user_status_completed 
  ON trivia_sessions(user_id, status, completed_at);

CREATE INDEX IF NOT EXISTS idx_trivia_session_tournament_status 
  ON trivia_sessions(tournament_id, status) 
  WHERE tournament_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trivia_session_user_created 
  ON trivia_sessions(user_id, created_at DESC);

-- 4. Create indexes for wallets (PERFORMANCE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_user_id 
  ON wallets(user_id);

-- 5. Create composite indexes for transactions (PERFORMANCE)
CREATE INDEX IF NOT EXISTS idx_transaction_wallet_status_created 
  ON transactions(wallet_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_wallet_type 
  ON transactions(wallet_id, type);

CREATE INDEX IF NOT EXISTS idx_transaction_status 
  ON transactions(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_reference 
  ON transactions(reference);

-- 6. Create index for trivia_session_answers (PERFORMANCE)
CREATE INDEX IF NOT EXISTS idx_trivia_answer_session 
  ON trivia_session_answers(session_id);

-- 7. Create index for users table (AUTH PERFORMANCE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_phone 
  ON users(phone);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_referral_code 
  ON users(referral_code);

CREATE INDEX IF NOT EXISTS idx_user_email 
  ON users(email) 
  WHERE email IS NOT NULL;

-- 8. Add check constraints for validation
ALTER TABLE trivia_sessions
  ADD CONSTRAINT chk_max_duration_positive 
    CHECK (max_duration_seconds > 0 AND max_duration_seconds <= 7200);

ALTER TABLE wallets
  ADD CONSTRAINT chk_daily_limits_positive 
    CHECK (daily_coins_earned >= 0 AND daily_sessions_played >= 0);

-- 9. Create function to auto-reset daily limits (Optional - runs daily)
CREATE OR REPLACE FUNCTION reset_daily_wallet_limits()
RETURNS void AS $$
BEGIN
  UPDATE wallets
  SET 
    daily_coins_earned = 0,
    daily_sessions_played = 0,
    last_limit_reset = NOW()
  WHERE 
    last_limit_reset IS NULL 
    OR DATE(last_limit_reset) < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily reset (requires pg_cron extension or external scheduler)
-- SELECT cron.schedule('reset-daily-limits', '0 0 * * *', 'SELECT reset_daily_wallet_limits()');

-- Rollback instructions (if needed):
-- ALTER TABLE trivia_sessions DROP COLUMN expires_at, DROP COLUMN max_duration_seconds;
-- ALTER TABLE wallets DROP COLUMN daily_coins_earned, DROP COLUMN daily_sessions_played, DROP COLUMN last_limit_reset;
-- DROP INDEX IF EXISTS idx_trivia_session_user_status_completed;
-- DROP INDEX IF EXISTS idx_trivia_session_tournament_status;
-- DROP INDEX IF EXISTS idx_trivia_session_user_created;
-- DROP INDEX IF EXISTS idx_wallet_user_id;
-- DROP INDEX IF EXISTS idx_transaction_wallet_status_created;
-- DROP INDEX IF EXISTS idx_transaction_wallet_type;
-- DROP INDEX IF EXISTS idx_transaction_status;
-- DROP INDEX IF EXISTS idx_transaction_reference;
-- DROP INDEX IF EXISTS idx_trivia_answer_session;
-- DROP INDEX IF EXISTS idx_user_phone;
-- DROP INDEX IF EXISTS idx_user_referral_code;
-- DROP INDEX IF EXISTS idx_user_email;
-- DROP FUNCTION IF EXISTS reset_daily_wallet_limits();
