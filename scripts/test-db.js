'use strict';

// Run with: npm run test:db
const db = require('../src/config/db');

(async () => {
  const status = await db.checkConnection();
  if (status.connected) {
    console.log('OK  MySQL connection works');
    console.log(`    database : ${status.database}`);
    console.log(`    version  : ${status.version}`);
    console.log(`    tables   : ${status.tableCount} (the full schema has 14 after Phase 2)`);
  } else {
    console.error('FAIL  Cannot connect to MySQL');
    console.error(`    code   : ${status.code}`);
    console.error(`    reason : ${status.error}`);
    process.exitCode = 1;
  }
  await db.pool.end();
})();
