-- Migration: Add extra_state JSONB, full habit & boss battle columns
-- Run this against your Supabase database (SQL Editor or CLI)

-- 1. Profiles: add extra_state JSONB for all fields not in dedicated tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_state JSONB DEFAULT '{}';

-- 2. Habits: add missing columns
ALTER TABLE habits ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other';
ALTER TABLE habits ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 15;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- 3. Boss Battles: add missing columns
ALTER TABLE boss_battles ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE boss_battles ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium';
ALTER TABLE boss_battles ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 100;
ALTER TABLE boss_battles ADD COLUMN IF NOT EXISTS gold_reward INTEGER DEFAULT 50;
ALTER TABLE boss_battles ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE boss_battles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
