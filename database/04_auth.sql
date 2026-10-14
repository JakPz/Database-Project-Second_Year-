-- ============================================================
-- FOOTBALL ACADEMY MANAGEMENT SYSTEM (FAMS)
-- 04_auth.sql
-- Authentication & Role Management
-- MySQL 8+
-- ============================================================

-- Select FAMS database
USE fams;

SET NAMES utf8mb4;


-- ============================================================
-- 15. APP USER
-- Authentication accounts for:
-- Admin, Coach, Parent, Management
-- ============================================================

CREATE TABLE IF NOT EXISTS app_user (

    user_id INT AUTO_INCREMENT PRIMARY KEY,

    username VARCHAR(80) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    role ENUM(
        'Admin',
        'Coach',
        'Parent',
        'Management'
    ) NOT NULL,

    coach_id INT NULL UNIQUE,

    parent_id INT NULL UNIQUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_app_user_coach
        FOREIGN KEY (coach_id)
        REFERENCES coach(coach_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_app_user_parent
        FOREIGN KEY (parent_id)
        REFERENCES parent(parent_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_app_user_role
        CHECK (
            (
                role = 'Coach'
                AND coach_id IS NOT NULL
                AND parent_id IS NULL
            )
            OR
            (
                role = 'Parent'
                AND parent_id IS NOT NULL
                AND coach_id IS NULL
            )
            OR
            (
                role IN ('Admin', 'Management')
                AND coach_id IS NULL
                AND parent_id IS NULL
            )
        )
);


-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check whether app_user exists
SHOW TABLES LIKE 'app_user';

-- Display table structure
DESCRIBE app_user;

-- Check all authentication accounts
SELECT
    user_id,
    username,
    role,
    coach_id,
    parent_id,
    created_at
FROM app_user
ORDER BY user_id;


-- ============================================================
-- END OF 04_auth.sql
-- ============================================================