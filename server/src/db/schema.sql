-- WordArena Database Schema
-- Run this in your Supabase SQL editor to set up the tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    elo INTEGER DEFAULT 1200 NOT NULL,
    wins INTEGER DEFAULT 0 NOT NULL,
    losses INTEGER DEFAULT 0 NOT NULL,
    games_played INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_elo ON users(elo DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Matches table with JSONB replay_log
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    loser_id UUID REFERENCES users(id) ON DELETE SET NULL,
    winner_elo_before INTEGER NOT NULL,
    winner_elo_after INTEGER NOT NULL,
    loser_elo_before INTEGER NOT NULL,
    loser_elo_after INTEGER NOT NULL,
    target_word VARCHAR(5) NOT NULL,
    replay_log JSONB DEFAULT '[]'::jsonb,
    duration_ms INTEGER,
    is_bot_match BOOLEAN DEFAULT false,
    bot_difficulty VARCHAR(20),
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for match queries
CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_loser ON matches(loser_id);
CREATE INDEX IF NOT EXISTS idx_matches_played_at ON matches(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_is_bot ON matches(is_bot_match);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample indexes for common queries
-- Get user's recent matches
CREATE INDEX IF NOT EXISTS idx_matches_user_recent 
ON matches(winner_id, played_at DESC) 
INCLUDE (loser_id, target_word, duration_ms);

-- Get match by either player
CREATE INDEX IF NOT EXISTS idx_matches_either_player
ON matches(played_at DESC)
WHERE winner_id IS NOT NULL OR loser_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE users IS 'Player accounts with ELO ratings and statistics';
COMMENT ON TABLE matches IS 'Match history with full replay data stored as JSONB';
COMMENT ON COLUMN matches.replay_log IS 'JSONB array containing all guesses and events from the match';
COMMENT ON COLUMN matches.is_bot_match IS 'True if opponent was an AI bot';
COMMENT ON COLUMN matches.bot_difficulty IS 'Bot difficulty level: easy, medium, hard, impossible';


