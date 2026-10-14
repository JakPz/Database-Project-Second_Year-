
'use strict';

const db = require('../src/config/db');

const TARGET = {
  players: 120,
  coaches: 8,
  classes: 12,
  ageGroups: 4,
  sessionsPerWeek: 36
};

const WEEK_START = '2026-10-12';
const WEEK_END = '2026-10-18';

async function rows(conn, sql, params = []) {
  const [result] = await conn.execute(sql, params);
  return result;
}

async function total(conn, table) {
  const result = await rows(
    conn,
    `SELECT COUNT(*) AS n FROM \`${table}\``
  );
  return Number(result[0].n);
}

function datePlusDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateYearsAgo(age) {
  const today = new Date();
  return `${today.getFullYear() - age}-01-01`;
}

// ============================================================
// AGE GROUPS
// ============================================================

async function seedAgeGroups(conn) {
  const definitions = [
    ['U8', 5, 8],
    ['U12', 9, 12],
    ['U16', 13, 16],
    ['U19', 17, 19]
  ];

  for (const [name, min, max] of definitions) {
    const found = await rows(
      conn,
      'SELECT age_group_id FROM age_group WHERE group_name = ?',
      [name]
    );

    if (!found.length) {
      await conn.execute(
        `INSERT INTO age_group
         (group_name, min_age, max_age)
         VALUES (?, ?, ?)`,
        [name, min, max]
      );
    }
  }

  const groups = await rows(
    conn,
    'SELECT * FROM age_group ORDER BY min_age'
  );

  if (groups.length !== TARGET.ageGroups) {
    throw new Error(
      `Expected 4 age groups, found ${groups.length}`
    );
  }

  return groups;
}

// ============================================================
// POSITIONS
// ============================================================

async function seedPositions(conn) {
  const definitions = [
    ['Goalkeeper', 'Goalkeeper'],
    ['Defender', 'Outfield'],
    ['Midfielder', 'Outfield'],
    ['Forward', 'Outfield']
  ];

  for (const [name, type] of definitions) {
    const found = await rows(
      conn,
      'SELECT * FROM `position` WHERE position_name = ?',
      [name]
    );

    let positionId;

    if (!found.length) {
      const [result] = await conn.execute(
        `INSERT INTO \`position\`
         (position_name, position_type)
         VALUES (?, ?)`,
        [name, type]
      );

      positionId = result.insertId;
    } else {
      positionId = found[0].position_id;

      if (found[0].position_type !== type) {
        throw new Error(
          `Position type mismatch: ${name}`
        );
      }
    }

    if (type === 'Goalkeeper') {
      await conn.execute(
        `INSERT IGNORE INTO goalkeeper (position_id)
         VALUES (?)`,
        [positionId]
      );
    } else {
      await conn.execute(
        `INSERT IGNORE INTO outfield_player (position_id)
         VALUES (?)`,
        [positionId]
      );
    }
  }

  return rows(
    conn,
    `SELECT position_id, position_type
     FROM \`position\`
     ORDER BY position_id`
  );
}

// ============================================================
// COACHES
// ============================================================

async function seedCoaches(conn) {
  let current = await total(conn, 'coach');

  if (current > TARGET.coaches) {
    throw new Error(
      `Coaches exceed target: ${current}`
    );
  }

  let serial = 1;

  while (current < TARGET.coaches) {
    const email =
      `fams.demo.coach${serial}@example.test`;

    const found = await rows(
      conn,
      'SELECT coach_id FROM coach WHERE email = ?',
      [email]
    );

    if (!found.length) {
      await conn.execute(
        `INSERT INTO coach
         (first_name, last_name, email, phone, specialization)
         VALUES (?, ?, ?, ?, ?)`,
        [
          `DemoCoach${serial}`,
          'Academy',
          email,
          `081${String(serial).padStart(7, '0')}`,
          [
            'Goalkeeping',
            'Defending',
            'Passing',
            'Attacking'
          ][(serial - 1) % 4]
        ]
      );

      current++;
    }

    serial++;

    if (serial > 1000) {
      throw new Error('Unable to seed coaches');
    }
  }

  return rows(
    conn,
    'SELECT coach_id FROM coach ORDER BY coach_id'
  );
}

// ============================================================
// TRAINING PROGRAMS
// ============================================================

async function seedPrograms(conn) {
  let programs = await rows(
    conn,
    `SELECT program_id
     FROM training_program
     ORDER BY program_id`
  );

  if (!programs.length) {
    await conn.execute(
      `INSERT INTO training_program
       (program_name, description, duration_weeks)
       VALUES (?, ?, ?)`,
      [
        'Football Fundamentals',
        'Youth football skills and development',
        12
      ]
    );

    programs = await rows(
      conn,
      `SELECT program_id
       FROM training_program
       ORDER BY program_id`
    );
  }

  return programs;
}

// ============================================================
// CLASSES
// ============================================================

async function seedClasses(conn, groups, coaches, programs) {
  let classes = await rows(
    conn,
    'SELECT * FROM class ORDER BY class_id'
  );

  if (classes.length > TARGET.classes) {
    throw new Error(
      `Classes exceed target: ${classes.length}`
    );
  }

  let serial = 1;

  while (classes.length < TARGET.classes) {
    const group =
      groups[(serial - 1) % groups.length];

    const coach =
      coaches[(serial - 1) % coaches.length];

    const program =
      programs[(serial - 1) % programs.length];

    const name =
      `Demo Academy Class ${String(serial).padStart(2, '0')}`;

    const found = await rows(
      conn,
      'SELECT class_id FROM class WHERE class_name = ?',
      [name]
    );

    if (!found.length) {
      await conn.execute(
        `INSERT INTO class
         (class_name, coach_id, program_id, age_group_id, capacity)
         VALUES (?, ?, ?, ?, ?)`,
        [
          name,
          coach.coach_id,
          program.program_id,
          group.age_group_id,
          30
        ]
      );
    }

    classes = await rows(
      conn,
      'SELECT * FROM class ORDER BY class_id'
    );

    serial++;

    if (serial > 1000) {
      throw new Error('Unable to seed classes');
    }
  }

  for (const group of groups) {
    const exists = classes.some(
      cls =>
        Number(cls.age_group_id) ===
        Number(group.age_group_id)
    );

    if (!exists) {
      throw new Error(
        `No class available for ${group.group_name}`
      );
    }
  }

  return classes;
}

// ============================================================
// PLAYERS AND GUARDIANS
// ============================================================

async function seedPlayers(conn, groups, positions, classes) {
  let current = await total(conn, 'player');

  if (current > TARGET.players) {
    throw new Error(
      `Players exceed target: ${current}`
    );
  }

  while (current < TARGET.players) {
    const groupCounts = [];

    for (const group of groups) {
      const result = await rows(
        conn,
        `SELECT COUNT(*) AS n
         FROM player
         WHERE age_group_id = ?`,
        [group.age_group_id]
      );

      groupCounts.push({
        group,
        count: Number(result[0].n)
      });
    }

    groupCounts.sort(
      (a, b) => a.count - b.count
    );

    const group = groupCounts[0].group;

    const position =
      positions[current % positions.length];

    const age = Math.floor(
      (Number(group.min_age) +
       Number(group.max_age)) / 2
    );

    const serial = current + 1;

    const [playerResult] = await conn.execute(
      `INSERT INTO player
       (first_name, last_name, date_of_birth, age_group_id, position_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        `DemoPlayer${String(serial).padStart(3, '0')}`,
        'Academy',
        dateYearsAgo(age),
        group.age_group_id,
        position.position_id
      ]
    );

    const [parentResult] = await conn.execute(
      `INSERT INTO parent
       (first_name, last_name, phone, email)
       VALUES (?, ?, ?, ?)`,
      [
        `DemoGuardian${String(serial).padStart(3, '0')}`,
        'Academy',
        `089${String(serial).padStart(7, '0')}`,
        `fams.demo.guardian${serial}@example.test`
      ]
    );

    await conn.execute(
      `INSERT INTO parent_player
       (parent_id, player_id, relationship, is_primary)
       VALUES (?, ?, ?, ?)`,
      [
        parentResult.insertId,
        playerResult.insertId,
        'Guardian',
        true
      ]
    );

    const eligible = classes.filter(
      cls =>
        Number(cls.age_group_id) ===
        Number(group.age_group_id)
    );

    let assigned = false;

    for (const cls of eligible) {
      const result = await rows(
        conn,
        `SELECT COUNT(*) AS n
         FROM registration
         WHERE class_id = ?
           AND status = 'Active'`,
        [cls.class_id]
      );

      const enrolled = Number(result[0].n);

      if (enrolled >= Number(cls.capacity)) {
        continue;
      }

      await conn.execute(
        `INSERT INTO registration
         (player_id, class_id, registration_date, status)
         VALUES (?, ?, CURDATE(), 'Active')`,
        [
          playerResult.insertId,
          cls.class_id
        ]
      );

      assigned = true;
      break;
    }

    if (!assigned) {
      throw new Error(
        `No class capacity for ${group.group_name}`
      );
    }

    current++;
  }
}

// ============================================================
// TRAINING SESSIONS
// ============================================================

async function seedSessions(conn, classes) {
  const existing = await rows(
    conn,
    `SELECT session_id
     FROM training_session
     WHERE session_date BETWEEN ? AND ?`,
    [WEEK_START, WEEK_END]
  );

  if (existing.length > TARGET.sessionsPerWeek) {
    throw new Error(
      `More than 36 sessions already exist in sample week`
    );
  }

  for (const cls of classes) {
    const existingForClass = await rows(
      conn,
      `SELECT session_id
       FROM training_session
       WHERE class_id = ?
         AND session_date BETWEEN ? AND ?`,
      [
        cls.class_id,
        WEEK_START,
        WEEK_END
      ]
    );

    if (existingForClass.length > 3) {
      throw new Error(
        `Class ${cls.class_id} already has more than 3 sessions`
      );
    }

    const classIndex = classes.findIndex(
      c =>
        Number(c.class_id) ===
        Number(cls.class_id)
    );

    for (
      let slot = existingForClass.length;
      slot < 3;
      slot++
    ) {
      const day = [0, 2, 4][slot];

      const hour =
        9 + (classIndex % 4) * 2;

      const date =
        datePlusDays(WEEK_START, day);

      const startTime =
        `${String(hour).padStart(2, '0')}:00:00`;

      const endTime =
        `${String(hour + 1).padStart(2, '0')}:30:00`;

      await conn.execute(
        `INSERT INTO training_session
         (class_id, session_date, start_time, end_time, location)
         VALUES (?, ?, ?, ?, ?)`,
        [
          cls.class_id,
          date,
          startTime,
          endTime,
          `Academy Field ${Math.floor(classIndex / 4) + 1}`
        ]
      );
    }
  }

  const result = await rows(
    conn,
    `SELECT COUNT(*) AS n
     FROM training_session
     WHERE session_date BETWEEN ? AND ?`,
    [WEEK_START, WEEK_END]
  );

  if (
    Number(result[0].n) !==
    TARGET.sessionsPerWeek
  ) {
    throw new Error(
      `Expected 36 sessions, found ${result[0].n}`
    );
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  try {
    console.log('Starting FAMS demo data seed...');

    await db.withTransaction(async conn => {
      const groups =
        await seedAgeGroups(conn);

      const positions =
        await seedPositions(conn);

      const coaches =
        await seedCoaches(conn);

      const programs =
        await seedPrograms(conn);

      const classes =
        await seedClasses(
          conn,
          groups,
          coaches,
          programs
        );

      await seedPlayers(
        conn,
        groups,
        positions,
        classes
      );

      await seedSessions(
        conn,
        classes
      );

      for (const [table, expected] of [
        ['player', TARGET.players],
        ['coach', TARGET.coaches],
        ['class', TARGET.classes],
        ['age_group', TARGET.ageGroups]
      ]) {
        const actual =
          await total(conn, table);

        if (actual !== expected) {
          throw new Error(
            `${table}: expected ${expected}, found ${actual}`
          );
        }
      }
    });

    console.log('');
    console.log('FAMS DEMO DATA CREATED SUCCESSFULLY');
    console.log('Players: 120');
    console.log('Coaches: 8');
    console.log('Classes: 12');
    console.log('Age Groups: 4');
    console.log('Training Sessions: 36');
    console.log(`Sample Week: ${WEEK_START} to ${WEEK_END}`);

  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
}

main();
