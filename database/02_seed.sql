-- ============================================================
-- FOOTBALL ACADEMY MANAGEMENT SYSTEM (FAMS)
-- 02_seed.sql
-- Initial Sample Data
-- MySQL 8+
-- ============================================================

USE fams;

SET NAMES utf8mb4;


-- ============================================================
-- 1. AGE GROUP
-- ============================================================

INSERT INTO age_group (
    group_name,
    min_age,
    max_age
)
VALUES
    ('U8', 5, 8),
    ('U12', 9, 12),
    ('U16', 13, 16),
    ('U19', 17, 19);


-- ============================================================
-- 2. POSITION
-- ============================================================

INSERT INTO `position` (
    position_name,
    position_type
)
VALUES
    ('Goalkeeper', 'Goalkeeper'),
    ('Defender', 'Outfield'),
    ('Midfielder', 'Outfield'),
    ('Forward', 'Outfield');


-- ============================================================
-- 3. GOALKEEPER
-- ============================================================

INSERT INTO goalkeeper (
    position_id,
    goalkeeper_style
)
VALUES
    (1, 'Shot stopper');


-- ============================================================
-- 4. OUTFIELD PLAYER
-- ============================================================

INSERT INTO outfield_player (
    position_id,
    field_zone
)
VALUES
    (2, 'Defence'),
    (3, 'Midfield'),
    (4, 'Attack');


-- ============================================================
-- 5. COACH
-- ============================================================

INSERT INTO coach (
    first_name,
    last_name,
    email,
    phone,
    specialization
)
VALUES
    (
        'Somchai',
        'Trainer',
        'coach1@example.test',
        '0810000001',
        'Youth development'
    ),
    (
        'Anan',
        'Coach',
        'coach2@example.test',
        '0810000002',
        'Technical training'
    );


-- ============================================================
-- 6. TRAINING PROGRAM
-- ============================================================

INSERT INTO training_program (
    program_name,
    description,
    duration_weeks
)
VALUES
    (
        'Football Fundamentals',
        'Core technical skills',
        12
    ),
    (
        'Advanced Development',
        'Team play and match tactics',
        16
    );


-- ============================================================
-- 7. PARENT
-- ============================================================

INSERT INTO parent (
    first_name,
    last_name,
    phone,
    email
)
VALUES
    (
        'Narin',
        'Guardian',
        '0890000001',
        'parent1@example.test'
    ),
    (
        'Mali',
        'Guardian',
        '0890000002',
        'parent2@example.test'
    );


-- ============================================================
-- 8. PLAYER
-- ============================================================

INSERT INTO player (
    first_name,
    last_name,
    date_of_birth,
    age_group_id,
    position_id
)
VALUES
    (
        'Krit',
        'Youth',
        '2015-04-12',
        2,
        3
    ),
    (
        'Pong',
        'Youth',
        '2012-08-09',
        3,
        1
    );


-- ============================================================
-- 9. PARENT PLAYER
-- ============================================================

INSERT INTO parent_player (
    parent_id,
    player_id,
    relationship,
    is_primary
)
VALUES
    (
        1,
        1,
        'Father',
        TRUE
    ),
    (
        2,
        2,
        'Mother',
        TRUE
    );


-- ============================================================
-- 10. CLASS
-- ============================================================

INSERT INTO class (
    class_name,
    coach_id,
    program_id,
    age_group_id,
    capacity
)
VALUES
    (
        'U12 Fundamentals',
        1,
        1,
        2,
        20
    ),
    (
        'U16 Advanced',
        2,
        2,
        3,
        25
    );


-- ============================================================
-- 11. TRAINING SESSION
-- ============================================================

INSERT INTO training_session (
    class_id,
    session_date,
    start_time,
    end_time,
    location
)
VALUES
    (
        1,
        '2026-10-12',
        '16:00:00',
        '18:00:00',
        'Field A'
    ),
    (
        2,
        '2026-10-13',
        '16:00:00',
        '18:00:00',
        'Field B'
    );


-- ============================================================
-- 12. REGISTRATION
-- ============================================================

INSERT INTO registration (
    player_id,
    class_id,
    registration_date,
    status
)
VALUES
    (
        1,
        1,
        '2026-10-01',
        'Active'
    ),
    (
        2,
        2,
        '2026-10-01',
        'Active'
    );


-- ============================================================
-- 13. ATTENDANCE
-- ============================================================

INSERT INTO attendance (
    player_id,
    session_id,
    status
)
VALUES
    (
        1,
        1,
        'Present'
    ),
    (
        2,
        2,
        'Late'
    );


-- ============================================================
-- 14. PLAYER AGE GROUP HISTORY
-- ============================================================

INSERT INTO player_age_group_history (
    player_id,
    age_group_id,
    start_date,
    end_date
)
VALUES
    (
        1,
        2,
        '2026-01-01',
        '2026-12-31'
    ),
    (
        2,
        3,
        '2026-01-01',
        '2026-12-31'
    );


-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'age_group' AS table_name, COUNT(*) AS total_rows
FROM age_group

UNION ALL

SELECT 'position', COUNT(*)
FROM `position`

UNION ALL

SELECT 'goalkeeper', COUNT(*)
FROM goalkeeper

UNION ALL

SELECT 'outfield_player', COUNT(*)
FROM outfield_player

UNION ALL

SELECT 'coach', COUNT(*)
FROM coach

UNION ALL

SELECT 'training_program', COUNT(*)
FROM training_program

UNION ALL

SELECT 'parent', COUNT(*)
FROM parent

UNION ALL

SELECT 'player', COUNT(*)
FROM player

UNION ALL

SELECT 'parent_player', COUNT(*)
FROM parent_player

UNION ALL

SELECT 'class', COUNT(*)
FROM class

UNION ALL

SELECT 'training_session', COUNT(*)
FROM training_session

UNION ALL

SELECT 'registration', COUNT(*)
FROM registration

UNION ALL

SELECT 'attendance', COUNT(*)
FROM attendance

UNION ALL

SELECT 'player_age_group_history', COUNT(*)
FROM player_age_group_history;


-- ============================================================
-- END OF 02_seed.sql
-- ============================================================