# Apex Youth Football Academy
## FAMS Authentication and Authorization Setup

The Football Academy Management System (FAMS) uses authentication and role-based authorization to protect academy information.

Authentication accounts are stored in the `app_user` table.

## Supported Roles

| Role | Linked Record | Access |
|---|---|---|
| Admin | None required | Academy administration |
| Coach | Coach record | Assigned classes, sessions, and attendance |
| Parent | Parent record | Linked children's information |
| Management | None required | Academy dashboards and reports |

Players are managed as academy records and are not a separate application login role.

## Authentication Database

The `app_user` table supports user authentication.

Its documented attributes include:

- `user_id`
- `username`
- `password_hash`
- `role`
- `coach_id`
- `parent_id`
- `created_at`

The exact column definitions and constraints are maintained in the SQL schema.

## Database Setup

Before changing an existing database, create a backup:

```bash
mysqldump -u root -p fams > fams_backup.sql
```

For a fresh database, initialize the core schema and supporting authentication tables.

Run:

`database/04_auth.sql`

The age-group recommendation feature uses the supporting SQL file:

`database/05_features.sql`

## Environment Configuration

Create `.env` from `.env.example`.

Configure database credentials and a secure session secret.

Generate a random secret:

```bash
openssl rand -hex 32
```

Do not store real credentials in source code or public documentation.

## Create User Accounts

Install dependencies:

```bash
npm install
```

### Administrator

```bash
node scripts/create-user.js admin1 Admin 0 'REPLACE_WITH_A_STRONG_PASSWORD'
```

### Coach

```bash
node scripts/create-user.js coach1 Coach 1 'REPLACE_WITH_A_STRONG_PASSWORD'
```

### Parent

```bash
node scripts/create-user.js parent1 Parent 1 'REPLACE_WITH_A_STRONG_PASSWORD'
```

### Management

```bash
node scripts/create-user.js manager1 Management 0 'REPLACE_WITH_A_STRONG_PASSWORD'
```

Replace example passwords with strong, unique passwords.

For Coach and Parent accounts, replace the example ID with an existing `coach_id` or `parent_id` from the database.

## Authentication Workflow

1. A user opens the login page.
2. The user submits a username and password.
3. The application looks up the corresponding account.
4. The submitted password is checked against the stored password hash.
5. A session is established after successful authentication.
6. Protected routes check the authenticated user's role.
7. Record-specific operations must also verify ownership or assignment.

## Authorization

Authorization is enforced through application routes and middleware.

Important checks include:

- Restricting administrative functions to authorized roles.
- Restricting coaches to their permitted classes and sessions.
- Restricting parents to records associated with their children.
- Restricting management features to authorized users.
- Preventing unauthenticated access to protected pages.

Hiding a menu item is not sufficient authorization. Permissions must also be checked on the server.

## Testing

Run:

```bash
npm test
npm run test:db
npm run verify:rules
```

Manual tests should verify:

- Valid and invalid login attempts.
- Access to protected routes.
- Role-specific permissions.
- Coach assignment restrictions.
- Parent-child record restrictions.
- Logout and session behavior.

## Security Considerations

FAMS uses Express sessions and password hashing.

As an academic application, it requires additional hardening before public deployment, including:

- HTTPS
- Secure session storage
- Appropriate cookie security settings
- Strong credential management
- Additional security and authorization tests
- Production configuration review

## Age-Group Recommendations

The `age_group_recommendation` table supports recommendations concerning player age-group assignments.

Its complete workflow and authorization requirements should be verified against the implemented application routes and database schema.

## Project Information

**Academy:** Apex Youth Football Academy  
**System:** Football Academy Management System (FAMS)  
**Course:** SE212 Database Design and Database System