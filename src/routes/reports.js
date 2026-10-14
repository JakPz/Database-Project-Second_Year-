
'use strict';

const express = require('express');
const db = require('../config/db');
const router = express.Router();

const reports = {
  'Players by age group': `
    SELECT
      ag.group_name,
      COUNT(p.player_id) AS players
    FROM age_group ag
    LEFT JOIN player p
      ON p.age_group_id = ag.age_group_id
    GROUP BY ag.age_group_id, ag.group_name
  `,

  'Players by position': `
    SELECT
      pos.position_name,
      COUNT(p.player_id) AS players
    FROM \`position\` pos
    LEFT JOIN player p
      ON p.position_id = pos.position_id
    GROUP BY pos.position_id, pos.position_name
  `,

  'Registrations by class': `
    SELECT
      c.class_name,
      COUNT(r.registration_id) AS total_registrations,
      SUM(
        CASE WHEN r.status = 'Active'
          THEN 1 ELSE 0
        END
      ) AS active_enrollment
    FROM class c
    LEFT JOIN registration r
      ON r.class_id = c.class_id
    GROUP BY c.class_id, c.class_name
  `,

  'Attendance by class': `
    SELECT
      c.class_name,
      ROUND(
        100 * SUM(a.status IN ('Present', 'Late'))
        / NULLIF(COUNT(a.attendance_id), 0),
        1
      ) AS attendance_pct
    FROM class c
    LEFT JOIN training_session s
      ON s.class_id = c.class_id
    LEFT JOIN attendance a
      ON a.session_id = s.session_id
    GROUP BY c.class_id, c.class_name
  `,

  'Attendance by player': `
    SELECT
      p.player_id,
      CONCAT(p.first_name, ' ', p.last_name) AS player,
      ROUND(
        100 * SUM(a.status IN ('Present', 'Late'))
        / NULLIF(COUNT(a.attendance_id), 0),
        1
      ) AS attendance_pct
    FROM player p
    LEFT JOIN attendance a
      ON a.player_id = p.player_id
    GROUP BY p.player_id, p.first_name, p.last_name
  `,

  'Sessions by coach': `
    SELECT
      CONCAT(co.first_name, ' ', co.last_name) AS coach,
      COUNT(s.session_id) AS sessions
    FROM coach co
    LEFT JOIN class c
      ON c.coach_id = co.coach_id
    LEFT JOIN training_session s
      ON s.class_id = c.class_id
    GROUP BY co.coach_id, co.first_name, co.last_name
  `,

  'Upcoming sessions': `
    SELECT
      s.session_date,
      s.start_time,
      c.class_name,
      s.location
    FROM training_session s
    JOIN class c
      ON c.class_id = s.class_id
    WHERE s.session_date >= CURDATE()
    ORDER BY s.session_date, s.start_time
  `,

  'Players without active registration': `
    SELECT
      p.player_id,
      p.first_name,
      p.last_name
    FROM player p
    WHERE NOT EXISTS (
      SELECT 1
      FROM registration r
      WHERE r.player_id = p.player_id
        AND r.status = 'Active'
    )
  `,

  'Registration status summary': `
    SELECT
      status,
      COUNT(*) AS total
    FROM registration
    GROUP BY status
  `,

  'Age group history': `
    SELECT
      p.first_name,
      p.last_name,
      ag.group_name,
      h.start_date,
      h.end_date
    FROM player_age_group_history h
    JOIN player p
      ON p.player_id = h.player_id
    JOIN age_group ag
      ON ag.age_group_id = h.age_group_id
    ORDER BY h.start_date DESC
  `
};

router.get('/reports', async (req, res, next) => {
  try {
    const chosen = Object.hasOwn(reports, req.query.report)
      ? req.query.report
      : Object.keys(reports)[0];

    const rows = await db.query(reports[chosen]);

    res.render('reports/index', {
      title: 'Reports',
      activePage: 'reports',
      names: Object.keys(reports),
      chosen,
      rows,
      sql: reports[chosen]
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
