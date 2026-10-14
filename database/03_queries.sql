-- ============================================================
-- FOOTBALL ACADEMY MANAGEMENT SYSTEM (FAMS)
-- 03_queries.sql
-- 10 Business Reports
-- MySQL 8+
-- ============================================================

USE fams;

SET NAMES utf8mb4;


-- ============================================================
-- REPORT 1
-- Business Question:
-- How many players are in each age group?
-- ============================================================

SELECT
    ag.group_name AS age_group,
    COUNT(p.player_id) AS players
FROM age_group AS ag
LEFT JOIN player AS p
    ON p.age_group_id = ag.age_group_id
GROUP BY
    ag.age_group_id,
    ag.group_name
ORDER BY
    ag.min_age;


-- ============================================================
-- REPORT 2
-- Business Question:
-- How many players play in each football position?
-- ============================================================

SELECT
    pos.position_name,
    COUNT(p.player_id) AS players
FROM `position` AS pos
LEFT JOIN player AS p
    ON p.position_id = pos.position_id
GROUP BY
    pos.position_id,
    pos.position_name
ORDER BY
    pos.position_id;


-- ============================================================
-- REPORT 3
-- Business Question:
-- How many registrations does each class have?
-- ============================================================

SELECT
    c.class_name,
    COUNT(r.registration_id) AS registrations
FROM class AS c
LEFT JOIN registration AS r
    ON r.class_id = c.class_id
GROUP BY
    c.class_id,
    c.class_name
ORDER BY
    registrations DESC;


-- ============================================================
-- REPORT 4
-- Business Question:
-- What is the attendance percentage for each class?
--
-- Present and Late count as attended.
-- Absent and Excused do not count as attended.
-- Classes without attendance records return NULL.
-- ============================================================

SELECT
    c.class_name,
    ROUND(
        100.0 * SUM(
            CASE
                WHEN a.status IN ('Present', 'Late')
                THEN 1
                ELSE 0
            END
        ) / NULLIF(COUNT(a.attendance_id), 0),
        1
    ) AS attendance_pct
FROM class AS c
LEFT JOIN training_session AS s
    ON s.class_id = c.class_id
LEFT JOIN attendance AS a
    ON a.session_id = s.session_id
GROUP BY
    c.class_id,
    c.class_name
ORDER BY
    c.class_name;


-- ============================================================
-- REPORT 5
-- Business Question:
-- What is the attendance percentage for each player?
--
-- Present and Late count as attended.
-- Players without attendance records return NULL.
-- ============================================================

SELECT
    p.player_id,
    CONCAT(
        p.first_name,
        ' ',
        p.last_name
    ) AS player,
    ROUND(
        100.0 * SUM(
            CASE
                WHEN a.status IN ('Present', 'Late')
                THEN 1
                ELSE 0
            END
        ) / NULLIF(COUNT(a.attendance_id), 0),
        1
    ) AS attendance_pct
FROM player AS p
LEFT JOIN attendance AS a
    ON a.player_id = p.player_id
GROUP BY
    p.player_id,
    p.first_name,
    p.last_name
ORDER BY
    p.player_id;


-- ============================================================
-- REPORT 6
-- Business Question:
-- How many training sessions does each coach manage?
-- ============================================================

SELECT
    co.coach_id,
    CONCAT(
        co.first_name,
        ' ',
        co.last_name
    ) AS coach,
    COUNT(s.session_id) AS sessions
FROM coach AS co
LEFT JOIN class AS c
    ON c.coach_id = co.coach_id
LEFT JOIN training_session AS s
    ON s.class_id = c.class_id
GROUP BY
    co.coach_id,
    co.first_name,
    co.last_name
ORDER BY
    sessions DESC;


-- ============================================================
-- REPORT 7
-- Business Question:
-- What training sessions are scheduled from today onward?
-- ============================================================

SELECT
    s.session_date,
    s.start_time,
    c.class_name,
    s.location
FROM training_session AS s
JOIN class AS c
    ON c.class_id = s.class_id
WHERE
    s.session_date >= CURDATE()
ORDER BY
    s.session_date,
    s.start_time;


-- ============================================================
-- REPORT 8
-- Business Question:
-- Which players do not have any active registration?
-- ============================================================

SELECT
    p.player_id,
    p.first_name,
    p.last_name
FROM player AS p
WHERE NOT EXISTS (
    SELECT 1
    FROM registration AS r
    WHERE
        r.player_id = p.player_id
        AND r.status = 'Active'
)
ORDER BY
    p.player_id;


-- ============================================================
-- REPORT 9
-- Business Question:
-- How many registrations are there for each status?
-- ============================================================

SELECT
    status,
    COUNT(*) AS total
FROM registration
GROUP BY
    status
ORDER BY
    status;


-- ============================================================
-- REPORT 10
-- Business Question:
-- What is the age group history of each player?
-- ============================================================

SELECT
    p.first_name,
    p.last_name,
    ag.group_name,
    h.start_date,
    h.end_date
FROM player_age_group_history AS h
JOIN player AS p
    ON p.player_id = h.player_id
JOIN age_group AS ag
    ON ag.age_group_id = h.age_group_id
ORDER BY
    h.start_date DESC;


-- ============================================================
-- END OF 03_queries.sql
-- ============================================================