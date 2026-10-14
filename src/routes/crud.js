
'use strict';

const express = require('express');
const db = require('../config/db');

const router = express.Router();

// ============================================================
// CRUD DEFINITIONS
// ============================================================

const defs = {
  coaches: {
    table: 'coach',
    pk: 'coach_id',
    fields: [
      'first_name',
      'last_name',
      'email',
      'phone',
      'specialization'
    ],
    required: ['first_name', 'last_name']
  },

  parents: {
    table: 'parent',
    pk: 'parent_id',
    fields: [
      'first_name',
      'last_name',
      'phone',
      'email'
    ],
    required: ['first_name', 'last_name', 'phone']
  },

  'age-groups': {
    table: 'age_group',
    pk: 'age_group_id',
    fields: [
      'group_name',
      'min_age',
      'max_age'
    ],
    required: ['group_name', 'min_age', 'max_age']
  },

  positions: {
    table: 'position',
    pk: 'position_id',
    fields: ['position_name', 'position_type'],
    required: ['position_name', 'position_type']
  },

  programs: {
    table: 'training_program',
    pk: 'program_id',
    fields: [
      'program_name',
      'description',
      'duration_weeks'
    ],
    required: ['program_name', 'duration_weeks']
  },

  classes: {
    table: 'class',
    pk: 'class_id',
    fields: [
      'class_name',
      'coach_id',
      'program_id',
      'age_group_id',
      'capacity'
    ],
    required: [
      'class_name',
      'coach_id',
      'program_id',
      'age_group_id',
      'capacity'
    ]
  },

  sessions: {
    table: 'training_session',
    pk: 'session_id',
    fields: [
      'class_id',
      'session_date',
      'start_time',
      'end_time',
      'location'
    ],
    required: [
      'class_id',
      'session_date',
      'start_time',
      'end_time'
    ]
  }
};

// ============================================================
// LOOKUP DEFINITIONS
// ============================================================

const lookups = {
  coach_id: [
    'coach',
    'coach_id',
    "CONCAT(first_name,' ',last_name)"
  ],

  program_id: [
    'training_program',
    'program_id',
    'program_name'
  ],

  age_group_id: [
    'age_group',
    'age_group_id',
    'group_name'
  ],

  class_id: [
    'class',
    'class_id',
    'class_name'
  ],

  position_id: [
    'position',
    'position_id',
    'position_name'
  ]
};

// ============================================================
// HELPERS
// ============================================================

async function options(fields) {
  const result = {};

  for (const field of fields) {
    if (!lookups[field]) continue;

    const [table, id, label] = lookups[field];

    result[field] = await db.query(
      `SELECT ${id} AS id, ${label} AS label
       FROM \`${table}\`
       ORDER BY label`
    );
  }

  return result;
}

function validateRequired(definition, body) {
  for (const field of definition.required) {
    if (!String(body[field] ?? '').trim()) {
      throw new Error('Please complete all required fields');
    }
  }
}

function validatePosition(body) {
  if (!['Goalkeeper', 'Outfield'].includes(body.position_type)) {
    throw new Error('Invalid position type');
  }
}

function getValues(definition, body) {
  return definition.fields.map(field => {
    const value = body[field];
    return value === undefined || value === '' ? null : value;
  });
}

function columns(definition) {
  return definition.fields
    .map(field => `\`${field}\``)
    .join(',');
}

function placeholders(definition) {
  return definition.fields.map(() => '?').join(',');
}

function assignments(definition) {
  return definition.fields
    .map(field => `\`${field}\`=?`)
    .join(',');
}

async function createPosition(body) {
  await db.withTransaction(async conn => {
    const [result] = await conn.execute(
      `INSERT INTO \`position\`
       (position_name, position_type)
       VALUES (?, ?)`,
      [body.position_name, body.position_type]
    );

    const positionId = result.insertId;

    if (body.position_type === 'Goalkeeper') {
      await conn.execute(
        'INSERT INTO goalkeeper (position_id) VALUES (?)',
        [positionId]
      );
    } else {
      await conn.execute(
        'INSERT INTO outfield_player (position_id) VALUES (?)',
        [positionId]
      );
    }
  });
}

async function updatePosition(id, body) {
  await db.withTransaction(async conn => {
    const [rows] = await conn.execute(
      `SELECT position_id, position_type
       FROM \`position\`
       WHERE position_id = ?
       FOR UPDATE`,
      [id]
    );

    if (!rows.length) {
      throw new Error('Position not found');
    }

    // Remove the existing subtype before changing the type.
    await conn.execute(
      'DELETE FROM goalkeeper WHERE position_id = ?',
      [id]
    );

    await conn.execute(
      'DELETE FROM outfield_player WHERE position_id = ?',
      [id]
    );

    await conn.execute(
      `UPDATE \`position\`
       SET position_name = ?, position_type = ?
       WHERE position_id = ?`,
      [
        body.position_name,
        body.position_type,
        id
      ]
    );

    // Recreate exactly one matching subtype.
    if (body.position_type === 'Goalkeeper') {
      await conn.execute(
        'INSERT INTO goalkeeper (position_id) VALUES (?)',
        [id]
      );
    } else {
      await conn.execute(
        'INSERT INTO outfield_player (position_id) VALUES (?)',
        [id]
      );
    }
  });
}

// ============================================================
// REGISTER CRUD ROUTES
// ============================================================

for (const [slug, definition] of Object.entries(defs)) {
  const base = '/' + slug;
  const table = `\`${definition.table}\``;
  const pk = `\`${definition.pk}\``;

  // ----------------------------------------------------------
  // GET: LIST
  // ----------------------------------------------------------

  router.get(base, async (req, res, next) => {
    try {
      const q = String(req.query.q || '')
        .trim()
        .slice(0, 100);

      const searchFields = definition.fields
        .map(field => `\`${field}\``)
        .join(',');

      const where = q
        ? ` WHERE CONCAT_WS(' ', ${searchFields}) LIKE ?`
        : '';

      const rows = await db.query(
        `SELECT *
         FROM ${table}
         ${where}
         ORDER BY ${pk} DESC
         LIMIT 300`,
        q ? [`%${q}%`] : []
      );

      res.render('crud/list', {
        title: slug,
        activePage: slug,
        slug,
        def: definition,
        rows,
        q
      });
    } catch (error) {
      next(error);
    }
  });

  // ----------------------------------------------------------
  // GET: CREATE FORM
  // ----------------------------------------------------------

  router.get(base + '/new', async (req, res, next) => {
    try {
      res.render('crud/form', {
        title: 'New ' + slug,
        activePage: slug,
        slug,
        def: definition,
        record: {},
        options: await options(definition.fields),
        error: null
      });
    } catch (error) {
      next(error);
    }
  });

  // ----------------------------------------------------------
  // GET: EDIT FORM
  // ----------------------------------------------------------

  router.get(base + '/:id/edit', async (req, res, next) => {
    try {
      const rows = await db.query(
        `SELECT *
         FROM ${table}
         WHERE ${pk} = ?`,
        [req.params.id]
      );

      if (!rows.length) {
        return res.sendStatus(404);
      }

      res.render('crud/form', {
        title: 'Edit ' + slug,
        activePage: slug,
        slug,
        def: definition,
        record: rows[0],
        options: await options(definition.fields),
        error: null
      });
    } catch (error) {
      next(error);
    }
  });

  // ----------------------------------------------------------
  // POST: CREATE
  // ----------------------------------------------------------

  router.post(base, async (req, res, next) => {
    try {
      validateRequired(definition, req.body);

      if (slug === 'positions') {
        validatePosition(req.body);
        await createPosition(req.body);
      } else {
        await db.query(
          `INSERT INTO ${table}
           (${columns(definition)})
           VALUES (${placeholders(definition)})`,
          getValues(definition, req.body)
        );
      }

      res.redirect(base);
    } catch (error) {
      try {
        res.status(400).render('crud/form', {
          title: 'New ' + slug,
          activePage: slug,
          slug,
          def: definition,
          record: req.body,
          options: await options(definition.fields),
          error: error.message
        });
      } catch (renderError) {
        next(renderError);
      }
    }
  });

  // ----------------------------------------------------------
  // POST: UPDATE
  // ----------------------------------------------------------

  router.post(base + '/:id/update', async (req, res, next) => {
    try {
      validateRequired(definition, req.body);

      if (slug === 'positions') {
        validatePosition(req.body);
        await updatePosition(req.params.id, req.body);
      } else {
        await db.query(
          `UPDATE ${table}
           SET ${assignments(definition)}
           WHERE ${pk} = ?`,
          [
            ...getValues(definition, req.body),
            req.params.id
          ]
        );
      }

      res.redirect(base);
    } catch (error) {
      try {
        res.status(400).render('crud/form', {
          title: 'Edit ' + slug,
          activePage: slug,
          slug,
          def: definition,
          record: {
            ...req.body,
            [definition.pk]: req.params.id
          },
          options: await options(definition.fields),
          error: error.message
        });
      } catch (renderError) {
        next(renderError);
      }
    }
  });

  // ----------------------------------------------------------
  // POST: DELETE
  // ----------------------------------------------------------

  router.post(base + '/:id/delete', async (req, res, next) => {
    try {
      await db.query(
        `DELETE FROM ${table}
         WHERE ${pk} = ?`,
        [req.params.id]
      );

      res.redirect(base);
    } catch (error) {
      next(error);
    }
  });
}

module.exports = router;