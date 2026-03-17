-- Migration: Add indexes for performance, constraints for data integrity,
--           and auto-updated timestamps for conflict detection.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. INDEXES — speed up the most common queries (user_id lookups)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_user_id      ON tasks      (user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id     ON habits     (user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id  ON inventory  (user_id);
CREATE INDEX IF NOT EXISTS idx_boss_battles_user_id ON boss_battles (user_id);

-- Compound index for common task queries (user + completion status)
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks (user_id, completed);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. CHECK CONSTRAINTS — prevent invalid data
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_level_positive') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_level_positive CHECK (level >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_xp_non_negative') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_xp_non_negative CHECK (xp >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_hp_non_negative') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_hp_non_negative CHECK (hp >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_gold_non_negative') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_gold_non_negative CHECK (gold >= 0);
  END IF;

  -- Tasks
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_xp_reward_positive') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_xp_reward_positive CHECK (xp_reward > 0);
  END IF;

  -- Habits
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_streak_non_negative') THEN
    ALTER TABLE habits ADD CONSTRAINT habits_streak_non_negative CHECK (streak >= 0);
  END IF;

  -- Inventory
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_quantity_positive') THEN
    ALTER TABLE inventory ADD CONSTRAINT inventory_quantity_positive CHECK (quantity >= 1);
  END IF;

  -- Boss Battles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boss_hp_non_negative') THEN
    ALTER TABLE boss_battles ADD CONSTRAINT boss_hp_non_negative CHECK (hp >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boss_max_hp_positive') THEN
    ALTER TABLE boss_battles ADD CONSTRAINT boss_max_hp_positive CHECK (max_hp > 0);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. UPDATED_AT TRIGGER — auto-set updated_at on row changes
--    Used for per-table conflict detection in multi-device sync.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles already has updated_at; just add the trigger
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add updated_at column + trigger to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add updated_at column + trigger to habits
ALTER TABLE habits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_habits_updated_at ON habits;
CREATE TRIGGER trg_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
