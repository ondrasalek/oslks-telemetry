ALTER TABLE websites
ADD COLUMN share_config JSONB DEFAULT '{}'::jsonb;
