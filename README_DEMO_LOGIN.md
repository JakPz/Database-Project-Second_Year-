# FAMS — Four local demo logins

The project includes predefined usernames in `scripts/seed-demo-accounts.js`.

1. Configure `.env` with MySQL credentials and a 32+ character `SESSION_SECRET`.
2. Ensure the original `fams` schema exists. Run `database/04_auth.sql` once in MySQL Workbench.
3. Install dependencies: `npm install`
4. Create accounts: `npm run seed:accounts`
5. Start server: `npm start`

| Role | Username | Local demo password |
|---|---|---|
| Admin | admin1 | FamsDemo2026! |
| Coach | coach1 | FamsDemo2026! |
| Parent | parent1 | FamsDemo2026! |
| Management | manager1 | FamsDemo2026! |

Password may be overridden via `DEMO_ACCOUNT_PASSWORD` in `.env`. Passwords are bcrypt-hashed in MySQL. Existing accounts are **not** overwritten. Coach and Parent use the first existing `coach` and `parent` record respectively; if none exists, that account is skipped. This script is blocked when `NODE_ENV=production`. Demo credentials are for local development only.
