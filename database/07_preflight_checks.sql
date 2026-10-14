-- ============================================================
-- APEX YOUTH FOOTBALL ACADEMY
-- Football Academy Management System (FAMS)
-- Database Preflight Checks
-- Purpose:
-- Detect data inconsistencies before final submission.
--
-- Expected result:
-- Each validation query should return 0 rows when no
-- violations of the checked rule are found.
--
-- This script is READ-ONLY.
-- It does not INSERT, UPDATE, or DELETE any data.
-- ============================================================

USE fams;


-- ============================================================
-- CHECK 1: Invalid Age Group Ranges
-- Business Rule:
-- Each age group must have a valid age range.
--
-- Expected: 0 rows
-- ============================================================

SELECT
    age_group_id,
    group_name,
    min_age,
    max_age
FROM age_group
WHERE min_age IS NULL
   OR max_age IS NULL
   OR min_age >= max_age;


-- ============================================================
-- CHECK 2: Players Without Guardians
-- Business Rule:
-- Every player must have at least one guardian.
--
-- Expected: 0 rows
-- ============================================================

SELECT
    p.player_id,
    p.first_name,
    p.last_name
FROM player p
LEFT JOIN parent_player pp
    ON pp.player_id = p.player_id
WHERE pp.player_id IS NULL;


-- ============================================================
-- CHECK 3: Multiple Primary Guardians
-- Business Rule:
-- A player must not have more than one primary guardian.
--
-- Expected: 0 rows
-- ============================================================

SELECT
    player_id,
    COUNT(*) AS primary_guardian_count
FROM parent_player
WHERE is_primary = 1
GROUP BY player_id
HAVING COUNT(*) > 1;


-- ============================================================
-- CHECK 4: Active Enrollment Exceeds Class Capacity
-- Business Rule:
-- The number of active registrations must not exceed
-- the maximum capacity of a training class.
--
-- Expected: 0 rows
-- ============================================================

SELECT
    c.class_id,
    c.class_name,
    c.capacity,
    COUNT(r.registration_id) AS active_players
FROM class c
LEFT JOIN registration r
    ON r.class_id = c.class_id
   AND r.status = 'Active'
GROUP BY
    c.class_id,
    c.class_name,
    c.capacity
HAVING COUNT(r.registration_id) > c.capacity;


-- ============================================================
-- CHECK 5: Attendance Without Valid Registration
-- Business Rule:
-- Attendance must belong to a player registered in
-- the class associated with the training session.
--
-- Accepted registration statuses:
-- Active, Completed
--
-- Expected: 0 rows
-- ============================================================

SELECT
    a.attendance_id,
    a.player_id,
    a.session_id,
    s.class_id
FROM attendance a
JOIN training_session s
    ON s.session_id = a.session_id
LEFT JOIN registration r
    ON r.player_id = a.player_id
   AND r.class_id = s.class_id
   AND r.status IN ('Active', 'Completed')
WHERE r.registration_id IS NULL;


-- ============================================================
-- CHECK 6: Registration Outside Class Age Range
-- Business Rule:
-- A player's age at the registration date must match
-- the class age-group requirements.
--
-- Expected: 0 rows
-- ============================================================

SELECT
    r.registration_id,
    p.player_id,
    p.first_name,
    p.last_name,
    c.class_name,
    ag.group_name,
    ag.min_age,
    ag.max_age,
    TIMESTAMPDIFF(
        YEAR,
        p.date_of_birth,
        r.registration_date
    ) AS age_at_registration
FROM registration r
JOIN player p
    ON p.player_id = r.player_id
JOIN class c
    ON c.class_id = r.class_id
JOIN age_group ag
    ON ag.age_group_id = c.age_group_id
WHERE TIMESTAMPDIFF(
    YEAR,
    p.date_of_birth,
    r.registration_date
) NOT BETWEEN ag.min_age AND ag.max_age;


-- ============================================================
-- CHECK 7: Duplicate Player Registrations
-- Business Rule:
-- A player must not be registered more than once
-- for the same class.
--
-- Expected: 0 rows
-- ============================================================

SELECT
    player_id,
    class_id,
    COUNT(*) AS registration_count
FROM registration
GROUP BY
    player_id,
    class_id
HAVING COUNT(*) > 1;


-- ============================================================
-- CHECK 8: Duplicate Attendance Records
-- Business Rule:
-- A player must have no more than one attendance
-- record per training session.
--
-- Expected: 0 rows
-- ============================================================

SELECT
    player_id,
    session_id,
    COUNT(*) AS attendance_count
FROM attendance
GROUP BY
    player_id,
    session_id
HAVING COUNT(*) > 1;


-- ============================================================
-- CHECK 9: Invalid Attendance Status
-- Business Rule:
-- Attendance must use an accepted status.
--
-- Expected: 0 rows
-- ============================================================

SELECT
    attendance_id,
    player_id,
    session_id,
    status
FROM attendance
WHERE status IS NULL
   OR status NOT IN (
       'Present',
       'Absent',
       'Late',
       'Excused'
   );


-- ============================================================
-- CHECK 10: Players With Invalid Current Age Groups
-- Business Rule:
-- A player's current age should match the assigned
-- age group, based on the current date.
--
-- Expected: 0 rows under a strict age-range policy.
-- Historical assignments may require manual review.
-- ============================================================

SELECT
    p.player_id,
    p.first_name,
    p.last_name,
    ag.group_name,
    ag.min_age,
    ag.max_age,
    TIMESTAMPDIFF(
        YEAR,
        p.date_of_birth,
        CURDATE()
    ) AS current_age
FROM player p
JOIN age_group ag
    ON ag.age_group_id = p.age_group_id
WHERE TIMESTAMPDIFF(
    YEAR,
    p.date_of_birth,
    CURDATE()
) NOT BETWEEN ag.min_age AND ag.max_age;