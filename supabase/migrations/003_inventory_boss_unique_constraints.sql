-- Migration: Add unique constraints to inventory and boss_battles
-- so that upsert (ON CONFLICT) can replace the fragile delete-then-insert pattern.

-- Inventory: one row per (user, item_id) pair
-- First deduplicate any existing rows, keeping the one with the highest quantity.
DELETE FROM inventory a
  USING inventory b
  WHERE a.user_id = b.user_id
    AND a.item_id = b.item_id
    AND a.id < b.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_user_item_unique'
  ) THEN
    ALTER TABLE inventory
      ADD CONSTRAINT inventory_user_item_unique UNIQUE (user_id, item_id);
  END IF;
END $$;

-- Boss battles: one row per (user, boss_id) pair
DELETE FROM boss_battles a
  USING boss_battles b
  WHERE a.user_id = b.user_id
    AND a.boss_id = b.boss_id
    AND a.id < b.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'boss_battles_user_boss_unique'
  ) THEN
    ALTER TABLE boss_battles
      ADD CONSTRAINT boss_battles_user_boss_unique UNIQUE (user_id, boss_id);
  END IF;
END $$;
