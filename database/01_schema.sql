
-- ============================================================
-- FOOTBALL ACADEMY MANAGEMENT SYSTEM (FAMS)
-- FILE: 01_schema.sql
-- MySQL 8+
--
-- Safe schema initialization:
-- - Creates database if missing
-- - Creates tables if missing
-- - Does not delete existing data
-- ============================================================

CREATE DATABASE IF NOT EXISTS fams
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE fams;

SET NAMES utf8mb4;


-- ============================================================
-- 1. AGE GROUP
-- ============================================================

CREATE TABLE IF NOT EXISTS age_group (
    age_group_id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(60) NOT NULL UNIQUE,
    min_age INT NOT NULL,
    max_age INT NOT NULL,

    CHECK (
        min_age >= 0
        AND max_age > min_age
    )
);


-- ============================================================
-- 2. COACH
-- ============================================================

CREATE TABLE IF NOT EXISTS coach (
    coach_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    specialization VARCHAR(120)
);


-- ============================================================
-- 3. POSITION
-- ============================================================

CREATE TABLE IF NOT EXISTS `position` (
    position_id INT AUTO_INCREMENT PRIMARY KEY,
    position_name VARCHAR(80) NOT NULL UNIQUE,
    position_type ENUM(
        'Goalkeeper',
        'Outfield'
    ) NOT NULL
);


-- ============================================================
-- 4. GOALKEEPER
-- ============================================================

CREATE TABLE IF NOT EXISTS goalkeeper (
    position_id INT PRIMARY KEY,
    goalkeeper_style VARCHAR(120),

    FOREIGN KEY (position_id)
        REFERENCES `position`(position_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 5. OUTFIELD PLAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS outfield_player (
    position_id INT PRIMARY KEY,
    field_zone VARCHAR(100),

    FOREIGN KEY (position_id)
        REFERENCES `position`(position_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 6. TRAINING PROGRAM
-- ============================================================

CREATE TABLE IF NOT EXISTS training_program (
    program_id INT AUTO_INCREMENT PRIMARY KEY,
    program_name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    duration_weeks INT NOT NULL DEFAULT 1,

    CHECK (duration_weeks > 0)
);


-- ============================================================
-- 7. PARENT
-- ============================================================

CREATE TABLE IF NOT EXISTS parent (
    parent_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150)
);


-- ============================================================
-- 8. PLAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS player (
    player_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    date_of_birth DATE NOT NULL,
    age_group_id INT NOT NULL,
    position_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (age_group_id)
        REFERENCES age_group(age_group_id),

    FOREIGN KEY (position_id)
        REFERENCES `position`(position_id),

    CHECK (date_of_birth >= '1900-01-01')
);


-- ============================================================
-- 9. PARENT PLAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS parent_player (
    parent_id INT NOT NULL,
    player_id INT NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    primary_player_id INT GENERATED ALWAYS AS (CASE WHEN is_primary = 1 THEN player_id ELSE NULL END) STORED,
    UNIQUE KEY uq_one_primary_parent (primary_player_id),

    PRIMARY KEY (parent_id, player_id),

    FOREIGN KEY (parent_id)
        REFERENCES parent(parent_id)
        ON DELETE RESTRICT,

    FOREIGN KEY (player_id)
        REFERENCES player(player_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 10. CLASS
-- ============================================================

CREATE TABLE IF NOT EXISTS class (
    class_id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(120) NOT NULL,
    coach_id INT NOT NULL,
    program_id INT NOT NULL,
    age_group_id INT NOT NULL,
    capacity INT NOT NULL DEFAULT 30,

    FOREIGN KEY (coach_id)
        REFERENCES coach(coach_id),

    FOREIGN KEY (program_id)
        REFERENCES training_program(program_id),

    FOREIGN KEY (age_group_id)
        REFERENCES age_group(age_group_id),

    CHECK (capacity > 0)
);


-- ============================================================
-- 11. TRAINING SESSION
-- ============================================================

CREATE TABLE IF NOT EXISTS training_session (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(150),

    FOREIGN KEY (class_id)
        REFERENCES class(class_id)
        ON DELETE CASCADE,

    CHECK (end_time > start_time)
);


-- ============================================================
-- 12. REGISTRATION
-- ============================================================

CREATE TABLE IF NOT EXISTS registration (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    class_id INT NOT NULL,
    registration_date DATE NOT NULL,
    status ENUM(
        'Active',
        'Pending',
        'Cancelled',
        'Completed'
    ) NOT NULL DEFAULT 'Active',

    UNIQUE KEY uq_registration (
        player_id,
        class_id
    ),

    FOREIGN KEY (player_id)
        REFERENCES player(player_id)
        ON DELETE CASCADE,

    FOREIGN KEY (class_id)
        REFERENCES class(class_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 13. ATTENDANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    session_id INT NOT NULL,
    status ENUM(
        'Present',
        'Absent',
        'Late',
        'Excused'
    ) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_attendance (
        player_id,
        session_id
    ),

    FOREIGN KEY (player_id)
        REFERENCES player(player_id)
        ON DELETE CASCADE,

    FOREIGN KEY (session_id)
        REFERENCES training_session(session_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 14. PLAYER AGE GROUP HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS player_age_group_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    age_group_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,

    FOREIGN KEY (player_id)
        REFERENCES player(player_id)
        ON DELETE CASCADE,

    FOREIGN KEY (age_group_id)
        REFERENCES age_group(age_group_id),

    CHECK (end_date >= start_date)
);


-- ============================================================
-- VERIFY ALL TABLES
-- ============================================================

SHOW TABLES;

SELECT
    COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'fams'
  AND table_type = 'BASE TABLE';


-- ============================================================
-- END OF 01_schema.sql
-- ============================================================
