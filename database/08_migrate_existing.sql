-- Existing databases ONLY. Back up database before executing.
-- Run checks in 07_preflight_checks.sql first; resolve any returned rows.
USE fams;
SET @old_check = (SELECT tc.CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS tc WHERE tc.TABLE_SCHEMA=DATABASE() AND tc.TABLE_NAME='age_group' AND tc.CONSTRAINT_TYPE='CHECK' AND tc.CONSTRAINT_NAME <> 'chk_age_range_strict' LIMIT 1);
SET @drop_stmt = IF(@old_check IS NULL, 'SELECT 1', CONCAT('ALTER TABLE age_group DROP CHECK `',REPLACE(@old_check,'`','``'),'`'));
PREPARE stmt FROM @drop_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE age_group ADD CONSTRAINT chk_age_range_strict CHECK (min_age >= 0 AND min_age < max_age);
ALTER TABLE player_age_group_history MODIFY COLUMN end_date DATE NULL;
ALTER TABLE parent_player ADD COLUMN primary_player_id INT GENERATED ALWAYS AS (CASE WHEN is_primary=1 THEN player_id ELSE NULL END) STORED;
ALTER TABLE parent_player ADD UNIQUE KEY uq_one_primary_parent (primary_player_id);
-- Then run 06_business_rule_triggers.sql.
