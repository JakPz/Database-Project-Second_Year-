
'use strict';

// ============================================================
// FAMS - DYNAMIC ACADEMY VERIFICATION
// MySQL 8+ / Node.js
//
// Displays actual database counts without fixed limits.
// Checks data integrity and important business rules.
// Does not INSERT, UPDATE, or DELETE any records.
// ============================================================

const db = require('../src/config/db');

const results = [];

// Demo reference only - NOT system limits.
const DEMO_REFERENCE = {
  players: 120,
  coaches: 8,
  classes: 12,
  ageGroups: 4,
  sessionsPerWeek: 36
};

// ============================================================
// DATABASE HELPERS
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

function section(title) {
  console.log('\n' + '='.repeat(65));
  console.log(title);
  console.log('='.repeat(65));
}

function check(name, actual, expected = 0) {
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

  if (!passed) {
    console.log(
      `       Actual: ${actual} | Expected: ${expected}`
    );
  }

  return passed;
}

function displayCount(name, actual, reference = null) {
  const demoText =
    reference === null
      ? ''
      : ` | Initial demo: ${reference}`;

  console.log(
    `${name.padEnd(24)} : ${actual}${demoText}`
  );
}

// ============================================================
// 1. DATABASE CONNECTION
// ============================================================

async function verifyConnection() {
  section('1. DATABASE CONNECTION');

  const rows = await query(
    `SELECT
       DATABASE() AS database_name,
       VERSION() AS mysql_version,
       NOW() AS server_time`
  );

  const info = rows[0];

  console.log('Database      :', info.database_name);
  console.log('MySQL Version :', info.mysql_version);
  console.log('Server Time   :', info.server_time);
}

// ============================================================
// 2. DYNAMIC ACADEMY COUNTS
// ============================================================

async function verifyCounts() {
  section('2. CURRENT ACADEMY DATA');

  const players = await scalar(
    'SELECT COUNT(*) FROM player'
  );

  const coaches = await scalar(
    'SELECT COUNT(*) FROM coach'
  );

  const classes = await scalar(
    'SELECT COUNT(*) FROM class'
  );

  const ageGroups = await scalar(
    'SELECT COUNT(*) FROM age_group'
  );

  const programs = await scalar(
    'SELECT COUNT(*) FROM training_program'
  );

  const positions = await scalar(
    'SELECT COUNT(*) FROM `position`'
  );

  const guardians = await scalar(
    'SELECT COUNT(*) FROM parent'
  );

  const registrations = await scalar(
    'SELECT COUNT(*) FROM registration'
  );

  const totalSessions = await scalar(
    'SELECT COUNT(*) FROM training_session'
  );

  const attendance = await scalar(
    'SELECT COUNT(*) FROM attendance'
  );

  displayCount(
    'Players',
    players,
    DEMO_REFERENCE.players
  );

  displayCount(
    'Coaches',
    coaches,
    DEMO_REFERENCE.coaches
  );

  displayCount(
    'Classes',
    classes,
    DEMO_REFERENCE.classes
  );

  displayCount(
    'Age Groups',
    ageGroups,
    DEMO_REFERENCE.ageGroups
  );

  displayCount('Training Programs', programs);
  displayCount('Positions', positions);
  displayCount('Guardians', guardians);
  displayCount('Registrations', registrations);
  displayCount('Total Sessions', totalSessions);
  displayCount('Attendance Records', attendance);

  console.log('\nNote: These counts can increase or decrease.');
  console.log('Demo reference values are not maximum limits.');
}

// ============================================================
// 3. DYNAMIC WEEKLY TRAINING SESSIONS
// ============================================================

async function verifyWeeklySessions() {
  section('3. WEEKLY TRAINING SESSIONS');

  const weekly = await query(
    `SELECT
       DATE_SUB(
         CURDATE(),
         INTERVAL WEEKDAY(CURDATE()) DAY
       ) AS week_start,

       DATE_ADD(
         DATE_SUB(
           CURDATE(),
           INTERVAL WEEKDAY(CURDATE()) DAY
         ),
         INTERVAL 6 DAY
       ) AS week_end,

       COUNT(ts.session_id) AS total_sessions

     FROM (
       SELECT 1
     ) AS anchor

     LEFT JOIN training_session ts
       ON ts.session_date BETWEEN
         DATE_SUB(
           CURDATE(),
           INTERVAL WEEKDAY(CURDATE()) DAY
         )
         AND
         DATE_ADD(
           DATE_SUB(
             CURDATE(),
             INTERVAL WEEKDAY(CURDATE()) DAY
           ),
           INTERVAL 6 DAY
         )`
  );

  const current = weekly[0];

  console.log('Current Week Start :', current.week_start);
  console.log('Current Week End   :', current.week_end);
  console.log(
    'Sessions This Week :',
    Number(current.total_sessions)
  );

  console.log(
    'Initial Demo Reference :',
    DEMO_REFERENCE.sessionsPerWeek
  );

  const byClass = await query(
    `SELECT
       c.class_id,
       c.class_name,
       COUNT(ts.session_id) AS session_count

     FROM class c

     LEFT JOIN training_session ts
       ON ts.class_id = c.class_id
      AND ts.session_date BETWEEN
        DATE_SUB(
          CURDATE(),
          INTERVAL WEEKDAY(CURDATE()) DAY
        )
        AND
        DATE_ADD(
          DATE_SUB(
            CURDATE(),
            INTERVAL WEEKDAY(CURDATE()) DAY
          ),
          INTERVAL 6 DAY
        )

     GROUP BY c.class_id, c.class_name
     ORDER BY c.class_id`
  );

  console.log('\nSessions By Class:');

  for (const cls of byClass) {
    console.log(
      `  ${cls.class_name}: ${cls.session_count}`
    );
  }

  // Weekly counts are informational.
  // They are not required to equal 36.
}

// ============================================================
// 4. BR4 - POSITION SPECIALIZATION
// ============================================================

async function verifyPositions() {
  section('4. BR4 - POSITION SPECIALIZATION');

  const invalid = await scalar(
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
  );

  check('Invalid Position Subtypes', invalid);
}

// ============================================================
// 5. BR5 - AGE GROUP RANGES
// ============================================================

async function verifyAgeGroups() {
  section('5. BR5 - AGE GROUP RANGES');

  const invalid = await scalar(
    `SELECT COUNT(*)
     FROM age_group
     WHERE min_age < 0
        OR max_age <= min_age`
  );

  check('Invalid Age Group Ranges', invalid);
}

// ============================================================
// 6. BR6 - DATE OF BIRTH
// ============================================================

async function verifyBirthDates() {
  section('6. BR6 - DATE OF BIRTH');

  const invalid = await scalar(
    `SELECT COUNT(*)
     FROM player
     WHERE date_of_birth < '1900-01-01'
        OR date_of_birth > CURDATE()`
  );

  check('Invalid Player Birth Dates', invalid);
}

// ============================================================
// 7. BR10 - TRAINING SESSION TIME
// ============================================================

async function verifySessionTimes() {
  section('7. BR10 - TRAINING SESSION TIME');

  const invalid = await scalar(
    `SELECT COUNT(*)
     FROM training_session
     WHERE end_time <= start_time`
  );

  check('Invalid Training Session Times', invalid);
}

// ============================================================
// 8. BR12 - GUARDIAN REQUIRED
// ============================================================

async function verifyGuardians() {
  section('8. BR12 - GUARDIAN REQUIRED');

  const invalid = await scalar(
    `SELECT COUNT(*)
     FROM registration r
     WHERE NOT EXISTS (
       SELECT 1
       FROM parent_player pp
       WHERE pp.player_id = r.player_id
     )`
  );

  check('Registrations Without Guardian', invalid);
}

// ============================================================
// 9. BR13 - PRIMARY GUARDIAN
// ============================================================

async function verifyPrimaryGuardian() {
  section('9. BR13 - PRIMARY GUARDIAN');

  const invalid = await scalar(
    `SELECT COUNT(*)
     FROM (
       SELECT player_id
       FROM parent_player
       WHERE is_primary = TRUE
       GROUP BY player_id
       HAVING COUNT(*) > 1
     ) AS x`
  );

  check('Multiple Primary Guardians', invalid);
}

// ============================================================
// 10. BR15 - UNIQUE REGISTRATION
// ============================================================

async function verifyUniqueRegistration() {
  section('10. BR15 - UNIQUE REGISTRATION');

  const invalid = await scalar(
    `SELECT COUNT(*)
     FROM (
       SELECT player_id, class_id
       FROM registration
       GROUP BY player_id, class_id
       HAVING COUNT(*) > 1
     ) AS x`
  );

  check('Duplicate Player-Class Registration', invalid);
}

// ============================================================
// 11. BR16 - AGE ELIGIBILITY
// ============================================================

async function verifyAgeEligibility() {
  section('11. BR16 - AGE ELIGIBILITY');

  const invalid = await scalar(
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
       OR
       TIMESTAMPDIFF(
         YEAR,
         p.date_of_birth,
         r.registration_date
       ) NOT BETWEEN ag.min_age AND ag.max_age`
  );

  check('Age-Ineligible Registrations', invalid);
}

// ============================================================
// 12. BR19 - UNIQUE ATTENDANCE
// ============================================================

async function verifyUniqueAttendance() {
  section('12. BR19 - UNIQUE ATTENDANCE');

  const invalid = await scalar(
    `SELECT COUNT(*)
     FROM (
       SELECT player_id, session_id
       FROM attendance
       GROUP BY player_id, session_id
       HAVING COUNT(*) > 1
     ) AS x`
  );

  check('Duplicate Attendance Records', invalid);
}

// ============================================================
// 13. BR20 - ATTENDANCE REGISTRATION
// ============================================================

async function verifyAttendanceRegistration() {
  section('13. BR20 - ATTENDANCE REGISTRATION');

  const invalid = await scalar(
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
  );

  check('Attendance Without Registration', invalid);
}

// ============================================================
// 14. BR23 - AGE GROUP HISTORY
// ============================================================

async function verifyAgeGroupHistory() {
  section('14. BR23 - AGE GROUP HISTORY');

  const invalid = await scalar(
    `SELECT COUNT(*)
     FROM player_age_group_history
     WHERE end_date < start_date`
  );

  check('Invalid Age Group History Dates', invalid);
}

// ============================================================
// 15. BR24 - CLASS CAPACITY
// ============================================================

async function verifyCapacity() {
  section('15. BR24 - CLASS CAPACITY');

  const invalid = await scalar(
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
  );

  check('Classes Exceeding Capacity', invalid);
}

// ============================================================
// 16. FOREIGN KEY RELATIONSHIPS
// ============================================================

async function verifyRelationships() {
  section('16. RELATIONSHIP INTEGRITY');

  check(
    'Players Without Age Group',
    await scalar(
      `SELECT COUNT(*)
       FROM player p
       LEFT JOIN age_group ag
         ON ag.age_group_id = p.age_group_id
       WHERE ag.age_group_id IS NULL`
    )
  );

  check(
    'Players Without Position',
    await scalar(
      `SELECT COUNT(*)
       FROM player p
       LEFT JOIN \`position\` pos
         ON pos.position_id = p.position_id
       WHERE pos.position_id IS NULL`
    )
  );

  check(
    'Classes Without Coach',
    await scalar(
      `SELECT COUNT(*)
       FROM class c
       LEFT JOIN coach co
         ON co.coach_id = c.coach_id
       WHERE co.coach_id IS NULL`
    )
  );

  check(
    'Classes Without Program',
    await scalar(
      `SELECT COUNT(*)
       FROM class c
       LEFT JOIN training_program tp
         ON tp.program_id = c.program_id
       WHERE tp.program_id IS NULL`
    )
  );

  check(
    'Sessions Without Class',
    await scalar(
      `SELECT COUNT(*)
       FROM training_session ts
       LEFT JOIN class c
         ON c.class_id = ts.class_id
       WHERE c.class_id IS NULL`
    )
  );
}

// ============================================================
// 17. TRIGGER INSTALLATION
// ============================================================

async function verifyTriggers() {
  section('17. BUSINESS RULE TRIGGERS');

  const required = [
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

  const installedRows = await query(
    `SELECT TRIGGER_NAME
     FROM information_schema.TRIGGERS
     WHERE TRIGGER_SCHEMA = DATABASE()`
  );

  const installed = new Set(
    installedRows.map(row => row.TRIGGER_NAME)
  );

  const missing = required.filter(
    name => !installed.has(name)
  );

  check('Missing Required Triggers', missing.length);

  if (missing.length > 0) {
    console.log('\nMissing Triggers:');

    for (const name of missing) {
      console.log(`  - ${name}`);
    }
  }
}

// ============================================================
// 18. SUMMARY
// ============================================================

function printSummary() {
  section('FAMS VERIFICATION SUMMARY');

  const passed = results.filter(
    result => result.passed
  ).length;

  const failed = results.length - passed;

  console.log(`Total Checks : ${results.length}`);
  console.log(`Passed       : ${passed}`);
  console.log(`Failed       : ${failed}`);

  if (failed === 0) {
    console.log('\nALL DATA INTEGRITY CHECKS PASSED');
  } else {
    console.log('\nDATA INTEGRITY ISSUES FOUND');

    console.log('\nFailed Checks:');

    for (const item of results.filter(
      result => !result.passed
    )) {
      console.log(
        `- ${item.name}: actual=${item.actual}, expected=${item.expected}`
      );
    }

    process.exitCode = 1;
  }

  console.log('\nVerification Notes:');
  console.log('- Counts are dynamic, not fixed limits.');
  console.log('- Demo values are reference data only.');
  console.log('- This script does not modify database records.');
  console.log('- Negative tests and concurrency tests are separate.');
  console.log('- Passing does not prove all 26 business rules.');
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  try {
    section('FAMS DYNAMIC DATABASE VERIFICATION');

    await verifyConnection();
    await verifyCounts();
    await verifyWeeklySessions();

    await verifyPositions();
    await verifyAgeGroups();
    await verifyBirthDates();
    await verifySessionTimes();
    await verifyGuardians();
    await verifyPrimaryGuardian();
    await verifyUniqueRegistration();
    await verifyAgeEligibility();
    await verifyUniqueAttendance();
    await verifyAttendanceRegistration();
    await verifyAgeGroupHistory();
    await verifyCapacity();
    await verifyRelationships();
    await verifyTriggers();

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
