-- Migration 004: Single JSONB state table
--
-- Replaces the multi-table sync approach (profiles, tasks, habits, inventory,
-- boss_battles) with a single row per user containing the full Zustand state
-- as JSONB. This dramatically simplifies the sync layer: 1 upsert to save,
-- 1 select to load, no field mapping, no deletion tracking.
--
-- The old tables are NOT dropped — they remain for any direct SQL queries or
-- future use, but the client sync code no longer reads/writes them.

CREATE TABLE IF NOT EXISTS user_state (
    user_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    state    JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own state"
    ON user_state FOR ALL
    USING (auth.uid() = user_id);

-- Auto-create a row when a new user signs up (alongside the existing
-- handle_new_user trigger that creates profiles).
CREATE OR REPLACE FUNCTION public.handle_new_user_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_state (user_id, state)
    VALUES (NEW.id, '{}')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_state'
    ) THEN
        CREATE TRIGGER on_auth_user_created_state
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION handle_new_user_state();
    END IF;
END;
$$;
