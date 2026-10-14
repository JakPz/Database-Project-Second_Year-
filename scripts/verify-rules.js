
'use strict';

const db = require('../src/config/db');

// ============================================================
// FAMS ACADEMY VERIFICATION
// MySQL 8+
// ============================================================

const TARGET = {
  players: 120,
  coaches: 8,
  classes: 12,
  ageGroups: 4,
  sessionsPerWeek: 36,
  sessionsPerClass: 3
};

const WEEK_START = '2026-10-12';
const WEEK_END = '2026-10-18';

const results = [];

// ============================================================
// HELPERS
// ============================================================

async function query(sql, params = []) {
  return db.query(sql, params);
}

async function scalar(sql, params = []) {
  const rows = await query(sql, params);

  if (!rows.length) {
    throw new Error('Query returned no rows');
  }

  return Number(Object.values(rows[0])[0]);
}

function check(name, actual, expected) {
  const passed = actual === expected;

  results.push({
    name,
    actual,
    expected,
    passed
  });

  console.log(
    `${passed ? 'PASS' : 'FAIL'} | ${name}`
  );

  console.log(
    `       Actual: ${actual} | Expected: ${expected}`
  );

  return passed;
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

// ============================================================
// 1. ACADEMY DATA COUNTS
// ============================================================

async function verifyCounts() {
  section('1. ACADEMY DATA COUNTS');

  check(
    'Players',
    await scalar('SELECT COUNT(*) FROM player'),
    TARGET.players
  );

  check(
    'Coaches',
    await scalar('SELECT COUNT(*) FROM coach'),
    TARGET.coaches
  );

  check(
    'Classes',
    await scalar('SELECT COUNT(*) FROM class'),
    TARGET.classes
  );

  check(
    'Age Groups',
    await scalar('SELECT COUNT(*) FROM age_group'),
    TARGET.ageGroups
  );

  check(
    'Training Sessions in Sample Week',
    await scalar(
      `SELECT COUNT(*)
       FROM training_session
       WHERE session_date BETWEEN ? AND ?`,
      [WEEK_START, WEEK_END]
    ),
    TARGET.sessionsPerWeek
  );

  check(
    'Classes With Exactly 3 Sessions',
    await scalar(
      `SELECT COUNT(*)
       FROM (
         SELECT c.class_id
         FROM class c
         LEFT JOIN training_session ts
           ON ts.class_id = c.class_id
          AND ts.session_date BETWEEN ? AND ?
         GROUP BY c.class_id
         HAVING COUNT(ts.session_id) = ?
       ) AS x`,
      [
        WEEK_START,
        WEEK_END,
        TARGET.sessionsPerClass
      ]
    ),
    TARGET.classes
  );
}

// ============================================================
// 2. BR4: POSITION SPECIALIZATION
// ============================================================

async function verifyPositionSpecialization() {
  section('2. BR4 - POSITION SPECIALIZATION');

  check(
    'Invalid Position Subtypes',
    await scalar(
      `SELECT COUNT(*)
       FROM \`position\` p
       LEFT JOIN goalkeeper g
         ON g.position_id = p.position_id
       LEFT JOIN outfield_player o
         ON o.position_id = p.position_id
       WHERE
         (
           p.position_type = 'Goalkeeper'
           AND (
             g.position_id IS NULL
             OR o.position_id IS NOT NULL
           )
         )
         OR
         (
           p.position_type = 'Outfield'
           AND (
             o.position_id IS NULL
             OR g.position_id IS NOT NULL
           )
         )`
    ),
    0
  );
}

// ============================================================
// 3. BR6: DATE OF BIRTH
// ============================================================

async function verifyDateOfBirth() {
  section('3. BR6 - DATE OF BIRTH');

  check(
    'Invalid Player Birth Dates',
    await scalar(
      `SELECT COUNT(*)
       FROM player
       WHERE date_of_birth < '1900-01-01'
          OR date_of_birth > CURDATE()`
    ),
    0
  );
}

// ============================================================
// 4. BR12: GUARDIAN REQUIRED
// ============================================================

async function verifyGuardians() {
  section('4. BR12 - GUARDIAN REQUIRED');

  check(
    'Registered Players Without Guardians',
    await scalar(
      `SELECT COUNT(*)
       FROM registration r
       WHERE NOT EXISTS (
         SELECT 1
         FROM parent_player pp
         WHERE pp.player_id = r.player_id
       )`
    ),
    0
  );
}

// ============================================================
// 5. BR13: PRIMARY GUARDIAN
// ============================================================

async function verifyPrimaryGuardian() {
  section('5. BR13 - PRIMARY GUARDIAN');

  check(
    'Players With Multiple Primary Guardians',
    await scalar(
      `SELECT COUNT(*)
       FROM (
         SELECT player_id
         FROM parent_player
         WHERE is_primary = TRUE
         GROUP BY player_id
         HAVING COUNT(*) > 1
       ) AS x`
    ),
    0
  );
}

// ============================================================
// 6. BR15: UNIQUE REGISTRATION
// ============================================================

async function verifyRegistrations() {
  section('6. BR15 - UNIQUE REGISTRATION');

  check(
    'Duplicate Player-Class Registrations',
    await scalar(
      `SELECT COUNT(*)
       FROM (
         SELECT player_id, class_id
         FROM registration
         GROUP BY player_id, class_id
         HAVING COUNT(*) > 1
       ) AS x`
    ),
    0
  );
}

// ============================================================
// 7. BR16: AGE ELIGIBILITY
// ============================================================

async function verifyAgeEligibility() {
  section('7. BR16 - AGE ELIGIBILITY');

  check(
    'Age-Ineligible Registrations',
    await scalar(
      `SELECT COUNT(*)
       FROM registration r
       JOIN player p
         ON p.player_id = r.player_id
       JOIN class c
         ON c.class_id = r.class_id
       JOIN age_group ag
         ON ag.age_group_id = c.age_group_id
       WHERE
         r.registration_date < p.date_of_birth
         OR TIMESTAMPDIFF(
           YEAR,
           p.date_of_birth,
           r.registration_date
         ) NOT BETWEEN ag.min_age AND ag.max_age`
    ),
    0
  );
}

// ============================================================
// 8. BR19: UNIQUE ATTENDANCE
// ============================================================

async function verifyUniqueAttendance() {
  section('8. BR19 - UNIQUE ATTENDANCE');

  check(
    'Duplicate Player-Session Attendance',
    await scalar(
      `SELECT COUNT(*)
       FROM (
         SELECT player_id, session_id
         FROM attendance
         GROUP BY player_id, session_id
         HAVING COUNT(*) > 1
       ) AS x`
    ),
    0
  );
}

// ============================================================
// 9. BR20: ATTENDANCE REQUIRES REGISTRATION
// ============================================================

async function verifyAttendanceRegistration() {
  section('9. BR20 - ATTENDANCE REGISTRATION');

  check(
    'Attendance Without Valid Registration',
    await scalar(
      `SELECT COUNT(*)
       FROM attendance a
       JOIN training_session ts
         ON ts.session_id = a.session_id
       WHERE NOT EXISTS (
         SELECT 1
         FROM registration r
         WHERE r.player_id = a.player_id
           AND r.class_id = ts.class_id
           AND r.status IN ('Active', 'Completed')
       )`
    ),
    0
  );
}

// ============================================================
// 10. BR23: AGE GROUP HISTORY
// ============================================================

async function verifyAgeGroupHistory() {
  section('10. BR23 - AGE GROUP HISTORY');

  check(
    'Invalid Age Group History Dates',
    await scalar(
      `SELECT COUNT(*)
       FROM player_age_group_history
       WHERE end_date < start_date`
    ),
    0
  );
}

// ============================================================
// 11. BR24: CLASS CAPACITY
// ============================================================

async function verifyClassCapacity() {
  section('11. BR24 - CLASS CAPACITY');

  check(
    'Classes Exceeding Capacity',
    await scalar(
      `SELECT COUNT(*)
       FROM (
         SELECT
           c.class_id,
           c.capacity,
           COUNT(r.registration_id) AS enrolled
         FROM class c
         LEFT JOIN registration r
           ON r.class_id = c.class_id
          AND r.status = 'Active'
         GROUP BY c.class_id, c.capacity
         HAVING enrolled > c.capacity
       ) AS x`
    ),
    0
  );
}

// ============================================================
// 12. TRIGGER INSTALLATION
// ============================================================

async function verifyTriggers() {
  section('12. BUSINESS RULE TRIGGERS');

  const requiredTriggers = [
    'trg_goalkeeper_type_insert',
    'trg_goalkeeper_type_update',
    'trg_outfield_type_insert',
    'trg_outfield_type_update',
    'trg_position_type_update',
    'trg_player_dob_insert',
    'trg_player_dob_update',
    'trg_registration_age_insert',
    'trg_registration_age_update',
    'trg_attendance_registered_insert',
    'trg_attendance_registered_update'
  ];

  const triggerRows = await query(
    `SELECT TRIGGER_NAME
     FROM information_schema.TRIGGERS
     WHERE TRIGGER_SCHEMA = DATABASE()`
  );

  const installed = new Set(
    triggerRows.map(row => row.TRIGGER_NAME)
  );

  const missing = requiredTriggers.filter(
    name => !installed.has(name)
  );

  check(
    'Missing Required Triggers',
    missing.length,
    0
  );

  if (missing.length > 0) {
    console.log('\nMissing triggers:');

    for (const name of missing) {
      console.log(`  - ${name}`);
    }
  }
}

// ============================================================
// 13. ADDITIONAL DATA QUALITY CHECKS
// ============================================================

async function verifyAdditionalQuality() {
  section('13. ADDITIONAL DATA QUALITY');

  check(
    'Classes Without Coaches',
    await scalar(
      `SELECT COUNT(*)
       FROM class c
       LEFT JOIN coach co
         ON co.coach_id = c.coach_id
       WHERE co.coach_id IS NULL`
    ),
    0
  );

  check(
    'Classes Without Training Programs',
    await scalar(
      `SELECT COUNT(*)
       FROM class c
       LEFT JOIN training_program tp
         ON tp.program_id = c.program_id
       WHERE tp.program_id IS NULL`
    ),
    0
  );

  check(
    'Players Without Age Groups',
    await scalar(
      `SELECT COUNT(*)
       FROM player p
       LEFT JOIN age_group ag
         ON ag.age_group_id = p.age_group_id
       WHERE ag.age_group_id IS NULL`
    ),
    0
  );

  check(
    'Players Without Positions',
    await scalar(
      `SELECT COUNT(*)
       FROM player p
       LEFT JOIN \`position\` pos
         ON pos.position_id = p.position_id
       WHERE pos.position_id IS NULL`
    ),
    0
  );

  check(
    'Sessions With Invalid Time Ranges',
    await scalar(
      `SELECT COUNT(*)
       FROM training_session
       WHERE end_time <= start_time`
    ),
    0
  );

  check(
    'Age Groups With Invalid Age Ranges',
    await scalar(
      `SELECT COUNT(*)
       FROM age_group
       WHERE min_age < 0
          OR max_age <= min_age`
    ),
    0
  );

  check(
    'Classes With Invalid Capacity',
    await scalar(
      `SELECT COUNT(*)
       FROM class
       WHERE capacity <= 0`
    ),
    0
  );
}

// ============================================================
// 14. VERIFICATION SUMMARY
// ============================================================

function printSummary() {
  section('VERIFICATION SUMMARY');

  const passed = results.filter(
    result => result.passed
  ).length;

  const failed = results.length - passed;

  console.log(`Total Checks : ${results.length}`);
  console.log(`Passed       : ${passed}`);
  console.log(`Failed       : ${failed}`);

  if (failed === 0) {
    console.log('\nALL DATA CHECKS PASSED');
    console.log('FAMS demo data matches the expected targets.');
  } else {
    console.log('\nSOME DATA CHECKS FAILED');

    console.log('\nFailed checks:');

    for (const result of results.filter(
      item => !item.passed
    )) {
      console.log(
        `- ${result.name}: ` +
        `Actual=${result.actual}, ` +
        `Expected=${result.expected}`
      );
    }

    process.exitCode = 1;
  }

  console.log('\nIMPORTANT:');
  console.log(
    'This script checks stored data and installed triggers.'
  );
  console.log(
    'It does not prove that all 26 business rules are enforced.'
  );
  console.log(
    'Negative tests, route tests, and concurrency tests'
  );
  console.log(
    'are still required for full verification.'
  );
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  try {
    section('FAMS ACADEMY VERIFICATION');

    console.log(
      `Sample Week: ${WEEK_START} to ${WEEK_END}`
    );

    await verifyCounts();
    await verifyPositionSpecialization();
    await verifyDateOfBirth();
    await verifyGuardians();
    await verifyPrimaryGuardian();
    await verifyRegistrations();
    await verifyAgeEligibility();
    await verifyUniqueAttendance();
    await verifyAttendanceRegistration();
    await verifyAgeGroupHistory();
    await verifyClassCapacity();
    await verifyTriggers();
    await verifyAdditionalQuality();

    printSummary();

  } catch (error) {
    console.error('\nVERIFICATION ERROR');
    console.error(error.message);

    process.exitCode = 1;

  } finally {
    await db.pool.end();
  }
}

main();
