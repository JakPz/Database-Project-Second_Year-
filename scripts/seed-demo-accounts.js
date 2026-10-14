'use strict';
// LOCAL DEVELOPMENT ONLY. Creates four predictable login accounts without
// storing plaintext passwords in MySQL. Never run on a public deployment.
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD || 'FamsDemo2026!';
const USERS = [
  { username: 'admin1', role: 'Admin' },
  { username: 'coach1', role: 'Coach', table: 'coach', key: 'coach_id', link: 'coach_id' },
  { username: 'parent1', role: 'Parent', table: 'parent', key: 'parent_id', link: 'parent_id' },
  { username: 'manager1', role: 'Management' }
];

async function main() {
  if (process.env.NODE_ENV === 'production') throw Error('Demo accounts are disabled in production');
  if (DEMO_PASSWORD.length < 12) throw Error('DEMO_ACCOUNT_PASSWORD must contain at least 12 characters');
  const tables = await db.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='app_user'");
  if (!Number(tables[0].n)) throw Error('First run database/04_auth.sql in MySQL Workbench');
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const user of USERS) {
    let linkedId = null;
    if (user.table) {
      // Table and key names come only from the fixed, trusted USERS array.
      const rows = await db.query(`SELECT ${user.key} AS id FROM ${user.table} ORDER BY ${user.key} LIMIT 1`);
      if (!rows.length) {
        console.log(`SKIP ${user.username}: no ${user.table} row exists yet`);
        continue;
      }
      linkedId = rows[0].id;
    }
    const existing = await db.query('SELECT user_id FROM app_user WHERE username=?', [user.username]);
    if (existing.length) {
      console.log(`KEEP ${user.username}: existing account/password not changed`);
      continue;
    }
    await db.query('INSERT INTO app_user(username,password_hash,role,coach_id,parent_id) VALUES(?,?,?,?,?)', [
      user.username, hash, user.role,
      user.role === 'Coach' ? linkedId : null,
      user.role === 'Parent' ? linkedId : null
    ]);
    console.log(`CREATED ${user.username} (${user.role})`);
  }
  console.log('Demo accounts ready. Use DEMO_ACCOUNT_PASSWORD from your private .env (or the documented local-only default).');
  console.log('Change all demo passwords before sharing or deploying the app.');
}
main().catch(e => { console.error('ERROR:', e.message); process.exitCode = 1; }).finally(() => db.pool.end());
