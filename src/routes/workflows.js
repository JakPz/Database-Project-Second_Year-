
'use strict';

const express = require('express');
const db = require('../config/db');
const router = express.Router();

const run = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);

const render = (res, view, title, activePage, more = {}) =>
  res.render(view, { title, activePage, ...more });

const num = x => Number.parseInt(x, 10);

async function choices() {
  const [
    groups,
    positions,
    parents,
    players,
    classes,
    sessions
  ] = await Promise.all([
    db.query(
      'SELECT age_group_id id, group_name label FROM age_group'
    ),
    db.query(
      'SELECT position_id id, position_name label FROM `position`'
    ),
    db.query(
      "SELECT parent_id id, CONCAT(first_name,' ',last_name) label FROM parent"
    ),
    db.query(
      "SELECT player_id id, CONCAT(first_name,' ',last_name) label FROM player"
    ),
    db.query(
      'SELECT class_id id, class_name label, age_group_id FROM class'
    ),
    db.query(`
      SELECT
        s.session_id id,
        CONCAT(c.class_name,' · ',s.session_date,' ',s.start_time) label,
        s.class_id
      FROM training_session s
      JOIN class c ON c.class_id = s.class_id
    `)
  ]);

  return { groups, positions, parents, players, classes, sessions };
}

// ============================================================
// PLAYERS
// ============================================================

router.get('/players', run(async (req, res) => {
  const q = (req.query.q || '').slice(0, 100);

  const rows = await db.query(`
    SELECT
      p.*,
      ag.group_name,
      pos.position_name,
      (
        SELECT COUNT(*)
        FROM parent_player pp
        WHERE pp.player_id = p.player_id
      ) guardians
    FROM player p
    JOIN age_group ag
      ON ag.age_group_id = p.age_group_id
    JOIN \`position\` pos
      ON pos.position_id = p.position_id
    WHERE CONCAT(p.first_name,' ',p.last_name) LIKE ?
    ORDER BY p.player_id DESC
  `, ['%' + q + '%']);

  render(res, 'players/list', 'Players', 'players', {
    rows,
    q
  });
}));

router.get('/players/new', run(async (req, res) => {
  render(res, 'players/form', 'New player', 'players', {
    record: {},
    opts: await choices(),
    error: null
  });
}));

router.get('/players/:id/edit', run(async (req, res) => {
  const rows = await db.query(
    'SELECT * FROM player WHERE player_id=?',
    [req.params.id]
  );

  if (!rows.length) return res.sendStatus(404);

  const guardians = await db.query(`
    SELECT
      pp.*,
      CONCAT(pa.first_name," ",pa.last_name) parent_name
    FROM parent_player pp
    JOIN parent pa
      ON pa.parent_id = pp.parent_id
    WHERE pp.player_id=?
  `, [req.params.id]);

  render(res, 'players/form', 'Edit player', 'players', {
    record: rows[0],
    opts: await choices(),
    guardians,
    error: null
  });
}));

async function savePlayer(req, res, edit) {
  const b = req.body;

  try {
    if (
      !b.first_name?.trim() ||
      !b.last_name?.trim() ||
      !b.date_of_birth ||
      !b.age_group_id ||
      !b.position_id
    ) {
      throw Error('Complete all required player fields');
    }

    if (
      new Date(b.date_of_birth) > new Date() ||
      b.date_of_birth < '1900-01-01'
    ) {
      throw Error('Invalid date of birth');
    }

    if (
      !edit &&
      !b.parent_id &&
      !b.guardian_first_name?.trim()
    ) {
      throw Error('A new player must have at least one guardian');
    }

    const ag = await db.query(
      'SELECT min_age,max_age FROM age_group WHERE age_group_id=?',
      [b.age_group_id]
    );

    if (!ag.length) throw Error('Invalid age group');

    const born = new Date(b.date_of_birth + 'T00:00:00');
    const today = new Date();

    let age = today.getFullYear() - born.getFullYear();

    if (
      today.getMonth() < born.getMonth() ||
      (
        today.getMonth() === born.getMonth() &&
        today.getDate() < born.getDate()
      )
    ) {
      age--;
    }

    if (age < ag[0].min_age || age > ag[0].max_age) {
      throw Error('Player age does not match the chosen age group');
    }

    const id = await db.withTransaction(async conn => {
      let playerId = edit ? num(req.params.id) : null;

      if (edit) {
        const [[old]] = await conn.execute(
          'SELECT age_group_id FROM player WHERE player_id=? FOR UPDATE',
          [playerId]
        );

        if (!old) throw Error('Player not found');

        if (old.age_group_id !== num(b.age_group_id)) {
          throw Error(
            'Use the Age Group Recommendations workflow to change a player age group'
          );
        }

        const [[invalidEnrollment]] = await conn.execute(`
          SELECT r.registration_id
          FROM registration r
          JOIN class c
            ON c.class_id = r.class_id
          JOIN age_group ag
            ON ag.age_group_id = c.age_group_id
          WHERE r.player_id = ?
            AND TIMESTAMPDIFF(
              YEAR, ?, r.registration_date
            ) NOT BETWEEN ag.min_age AND ag.max_age
          LIMIT 1
        `, [playerId, b.date_of_birth]);

        if (invalidEnrollment) {
          throw Error(
            'This birth date conflicts with the player registration history'
          );
        }

        await conn.execute(`
          UPDATE player
          SET
            first_name=?,
            last_name=?,
            date_of_birth=?,
            position_id=?
          WHERE player_id=?
        `, [
          b.first_name,
          b.last_name,
          b.date_of_birth,
          num(b.position_id),
          playerId
        ]);

      } else {
        const [r] = await conn.execute(`
          INSERT INTO player(
            first_name,
            last_name,
            date_of_birth,
            age_group_id,
            position_id
          )
          VALUES(?,?,?,?,?)
        `, [
          b.first_name,
          b.last_name,
          b.date_of_birth,
          num(b.age_group_id),
          num(b.position_id)
        ]);

        playerId = r.insertId;
      }

      let parentId = b.parent_id ? num(b.parent_id) : null;

      if (b.guardian_first_name?.trim()) {
        if (
          !b.guardian_last_name?.trim() ||
          !b.guardian_phone?.trim()
        ) {
          throw Error('Guardian surname and phone are required');
        }

        const [r] = await conn.execute(`
          INSERT INTO parent(
            first_name,
            last_name,
            phone,
            email
          )
          VALUES(?,?,?,?)
        `, [
          b.guardian_first_name,
          b.guardian_last_name,
          b.guardian_phone,
          b.guardian_email || null
        ]);

        parentId = r.insertId;
      }

      if (parentId) {
        await conn.execute(
          'UPDATE parent_player SET is_primary=0 WHERE player_id=?',
          [playerId]
        );

        await conn.execute(`
          INSERT INTO parent_player(
            parent_id,
            player_id,
            relationship,
            is_primary
          )
          VALUES(?,?,?,?)
          ON DUPLICATE KEY UPDATE
            relationship=VALUES(relationship),
            is_primary=VALUES(is_primary)
        `, [
          parentId,
          playerId,
          b.relationship || 'Guardian',
          1
        ]);
      }

      return playerId;
    });

    res.redirect('/players/' + id + '/edit');

  } catch (e) {
    res.status(400).render('players/form', {
      title: edit ? 'Edit player' : 'New player',
      activePage: 'players',
      record: {
        ...b,
        player_id: edit ? req.params.id : null
      },
      opts: await choices(),
      guardians: [],
      error: e.message
    });
  }
}

router.post('/players', run((req, res) =>
  savePlayer(req, res, false)
));

router.post('/players/:id/update', run((req, res) =>
  savePlayer(req, res, true)
));

router.post('/players/:id/delete', run(async (req, res) => {
  await db.query(
    'DELETE FROM player WHERE player_id=?',
    [req.params.id]
  );

  res.redirect('/players');
}));

router.post('/players/:id/history', run(async (req, res) => {
  const b = req.body;

  await db.query(`
    INSERT INTO player_age_group_history(
      player_id,
      age_group_id,
      start_date,
      end_date
    )
    VALUES(?,?,?,?)
  `, [
    req.params.id,
    b.age_group_id,
    b.start_date,
    b.end_date
  ]);

  res.redirect('/players/' + req.params.id + '/edit');
}));

// ============================================================
// REGISTRATIONS
// ============================================================

router.get('/registrations', run(async (req, res) => {
  const rows = await db.query(`
    SELECT
      r.*,
      CONCAT(p.first_name,' ',p.last_name) player_name,
      c.class_name
    FROM registration r
    JOIN player p
      ON p.player_id = r.player_id
    JOIN class c
      ON c.class_id = r.class_id
    ORDER BY r.registration_id DESC
  `);

  render(res, 'registrations/index',
    'Registrations', 'registrations', {
      rows,
      opts: await choices(),
      error: req.query.error || null
    }
  );
}));

router.post('/registrations', run(async (req, res) => {
  try {
    const { player_id, class_id } = req.body;
    const status = req.body.status || 'Active';

    if (![
      'Active',
      'Pending',
      'Cancelled',
      'Completed'
    ].includes(status)) {
      throw Error('Invalid registration status');
    }

    await db.withTransaction(async conn => {
      const [[p]] = await conn.execute(
        'SELECT age_group_id FROM player WHERE player_id=?',
        [player_id]
      );

      const [[c]] = await conn.execute(`
        SELECT age_group_id,capacity
        FROM class
        WHERE class_id=?
        FOR UPDATE
      `, [class_id]);

      if (!p || !c) {
        throw Error('Choose a valid player and class');
      }

      if (p.age_group_id !== c.age_group_id) {
        throw Error(
          'Player and class must be in the same age group'
        );
      }

      const [[n]] = await conn.execute(`
        SELECT COUNT(*) n
        FROM registration
        WHERE class_id=?
          AND status='Active'
      `, [class_id]);

      if (status === 'Active' && n.n >= c.capacity) {
        throw Error('Class is full');
      }

      await conn.execute(`
        INSERT INTO registration(
          player_id,
          class_id,
          registration_date,
          status
        )
        VALUES(?,?,CURDATE(),?)
      `, [
        player_id,
        class_id,
        status
      ]);
    });

    res.redirect('/registrations');

  } catch (e) {
    res.redirect(
      '/registrations?error=' + encodeURIComponent(e.message)
    );
  }
}));

router.post('/registrations/:id/update', run(async (req, res) => {
  try {
    const id = num(req.params.id);
    const status = req.body.status;

    if (!Number.isInteger(id) || id < 1) {
      throw Error('Invalid registration ID');
    }

    if (![
      'Active',
      'Pending',
      'Cancelled',
      'Completed'
    ].includes(status)) {
      throw Error('Invalid registration status');
    }

    await db.withTransaction(async conn => {
      const [[registration]] = await conn.execute(`
        SELECT class_id
        FROM registration
        WHERE registration_id=?
      `, [id]);

      if (!registration) {
        throw Error('Registration not found');
      }

      // Lock the class row to serialize capacity checks.
      const [[cls]] = await conn.execute(`
        SELECT capacity
        FROM class
        WHERE class_id=?
        FOR UPDATE
      `, [registration.class_id]);

      if (!cls) throw Error('Class not found');

      const [[current]] = await conn.execute(`
        SELECT status
        FROM registration
        WHERE registration_id=?
        FOR UPDATE
      `, [id]);

      if (!current) {
        throw Error('Registration not found');
      }

      if (
        status === 'Active' &&
        current.status !== 'Active'
      ) {
        const [[count]] = await conn.execute(`
          SELECT COUNT(*) AS enrolled
          FROM registration
          WHERE class_id=?
            AND status='Active'
        `, [registration.class_id]);

        if (count.enrolled >= cls.capacity) {
          throw Error('Class is full');
        }
      }

      await conn.execute(`
        UPDATE registration
        SET status=?
        WHERE registration_id=?
      `, [status, id]);
    });

    res.redirect('/registrations');

  } catch (e) {
    res.redirect(
      '/registrations?error=' + encodeURIComponent(e.message)
    );
  }
}));

router.post('/registrations/:id/delete', run(async (req, res) => {
  await db.query(
    'DELETE FROM registration WHERE registration_id=?',
    [req.params.id]
  );

  res.redirect('/registrations');
}));

// ============================================================
// ATTENDANCE
// ============================================================

router.get('/attendance', run(async (req, res) => {
  const opts = await choices();

  if (req.session.user.role === 'Coach') {
    opts.sessions = await db.query(`
      SELECT
        s.session_id id,
        CONCAT(c.class_name,' - ',s.session_date) label,
        s.class_id
      FROM training_session s
      JOIN class c
        ON c.class_id = s.class_id
      WHERE c.coach_id=?
    `, [req.session.user.coachId]);
  }

  const sessionId =
    req.query.session_id || opts.sessions[0]?.id;

  let students = [];

  if (
    sessionId &&
    req.session.user.role === 'Coach' &&
    !opts.sessions.some(
      s => String(s.id) === String(sessionId)
    )
  ) {
    return res.sendStatus(403);
  }

  if (sessionId) {
    students = await db.query(`
      SELECT
        p.player_id,
        CONCAT(p.first_name,' ',p.last_name) player_name,
        a.status
      FROM training_session s
      JOIN registration r
        ON r.class_id = s.class_id
       AND r.status IN ('Active','Completed')
      JOIN player p
        ON p.player_id = r.player_id
      LEFT JOIN attendance a
        ON a.session_id = s.session_id
       AND a.player_id = p.player_id
      WHERE s.session_id=?
      ORDER BY p.last_name,p.first_name
    `, [sessionId]);
  }

  render(res, 'attendance/index',
    'Attendance', 'attendance', {
      opts,
      sessionId,
      students,
      error: req.query.error || null
    }
  );
}));

router.post('/attendance', run(async (req, res) => {
  const sid = req.body.session_id;

  try {
    if (req.session.user.role === 'Coach') {
      const allowed = await db.query(`
        SELECT s.session_id
        FROM training_session s
        JOIN class c
          ON c.class_id = s.class_id
        WHERE s.session_id=?
          AND c.coach_id=?
      `, [
        sid,
        req.session.user.coachId
      ]);

      if (!allowed.length) {
        return res.sendStatus(403);
      }
    }

    const ids = [].concat(req.body.player_id || []);
    const statuses = [].concat(req.body.status || []);

    await db.withTransaction(async conn => {
      for (let i = 0; i < ids.length; i++) {
        if (![
          'Present',
          'Absent',
          'Late',
          'Excused'
        ].includes(statuses[i])) {
          throw Error('Invalid attendance status');
        }

        const [[valid]] = await conn.execute(`
          SELECT COUNT(*) n
          FROM training_session s
          JOIN registration r
            ON r.class_id = s.class_id
           AND r.player_id=?
           AND r.status IN ('Active','Completed')
          WHERE s.session_id=?
        `, [
          ids[i],
          sid
        ]);

        if (!valid.n) {
          throw Error(
            'Player is not actively registered for this session'
          );
        }

        await conn.execute(`
          INSERT INTO attendance(
            player_id,
            session_id,
            status
          )
          VALUES(?,?,?)
          ON DUPLICATE KEY UPDATE
            status=VALUES(status)
        `, [
          ids[i],
          sid,
          statuses[i]
        ]);
      }
    });

    res.redirect('/attendance?session_id=' + sid);

  } catch (e) {
    res.redirect(
      '/attendance?session_id=' + sid +
      '&error=' + encodeURIComponent(e.message)
    );
  }
}));

module.exports = router;
