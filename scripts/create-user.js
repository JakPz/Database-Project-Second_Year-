'use strict';

require('dotenv').config({ quiet: true });

const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

// Configuration

const VALID_ROLES = [
  'Admin',
  'Coach',
  'Parent',
  'Management'
];

const MIN_PASSWORD_LENGTH = 12;
const BCRYPT_ROUNDS = 12;

// Validate command-line arguments
function validateInput(username, role, linkId, password) {
  if (!username || !VALID_ROLES.includes(role) || !password) {
    throw new Error(
      'Usage: node scripts/create-user.js ' +
      'USERNAME Admin|Coach|Parent|Management ' +
      'LINK_ID_OR_0 PASSWORD'
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }

  const requiresLink = role === 'Coach' || role === 'Parent';

  if (requiresLink) {
    const id = Number(linkId);

    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      !/^[1-9]\d*$/.test(String(linkId))
    ) {
      throw new Error(
        `${role} requires a valid existing ID.`
      );
    }

    return id;
  }

  if (linkId !== '0') {
    throw new Error(
      `${role} must use 0 as LINK_ID_OR_0.`
    );
  }

  return null;
}

// ========================================
// Create user
// ========================================

async function createUser() {
  const [
    ,
    ,
    username,
    role,
    linkId,
    password
  ] = process.argv;

  const normalizedUsername = username?.trim();

  const linkedId = validateInput(
    normalizedUsername,
    role,
    linkId,
    password
  );

  // Check for duplicate username
  const [existingUsers] = await db.query(
    'SELECT user_id FROM app_user WHERE username = ? LIMIT 1',
    [normalizedUsername]
  );

  if (existingUsers.length > 0) {
    throw new Error(
      `Username "${normalizedUsername}" already exists.`
    );
  }

  // Verify Coach / Parent link exists
  if (role === 'Coach' || role === 'Parent') {
    const table = role === 'Coach' ? 'coach' : 'parent';
    const column = role === 'Coach' ? 'coach_id' : 'parent_id';

    const [linkedRecords] = await db.query(
      `SELECT ${column} FROM ${table} WHERE ${column} = ? LIMIT 1`,
      [linkedId]
    );

    if (linkedRecords.length === 0) {
      throw new Error(
        `${role} with ID ${linkedId} does not exist.`
      );
    }
  }

  // Hash password before saving
  const passwordHash = await bcrypt.hash(
    password,
    BCRYPT_ROUNDS
  );

  const coachId = role === 'Coach' ? linkedId : null;
  const parentId = role === 'Parent' ? linkedId : null;

  // Insert user account
  const [result] = await db.query(
    `INSERT INTO app_user
      (username, password_hash, role, coach_id, parent_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      normalizedUsername,
      passwordHash,
      role,
      coachId,
      parentId
    ]
  );

  console.log('================================');
  console.log('User created successfully!');
  console.log('================================');
  console.log('User ID :', result.insertId);
  console.log('Username:', normalizedUsername);
  console.log('Role    :', role);
  console.log('Link ID :', linkedId ?? '-');
  console.log('================================');
}

async function main() {
  try {
    await createUser();
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('Error: Username already exists.');
    } else {
      console.error('Error:', error.message);
    }

    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
}

main();
