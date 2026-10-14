# Apex Youth Football Academy
## Football Academy Management System (FAMS)

FAMS is a web-based Football Academy Management System developed for **Apex Youth Football Academy** as part of the SE212 Database Design and Database System term project.

The application uses Node.js, Express.js, EJS, and MySQL 8+ to manage academy records, including players, guardians, coaches, age groups, positions, training programs, classes, training sessions, registrations, and attendance.

## Main Features

- Player and guardian management
- Coach and training program management
- Football position and age-group management
- Training class and session scheduling
- Player registration and enrollment
- Attendance recording and reporting
- Player age-group history
- Age-group recommendations
- Authentication and role-based authorization
- SQL reports and management dashboards

## User Roles

The application supports four roles:

| Role | Responsibilities |
|---|---|
| Admin | Manage academy records, users, classes, registrations, and attendance |
| Coach | View assigned classes, record attendance, and submit age-group recommendations |
| Parent | View linked children's information, schedules, and attendance |
| Management | Review academy dashboards and management reports |

Access to restricted information must be checked by the application server.

## Database Design

The database consists of **14 core relations and 2 supporting relations**.

### Core Relations

1. `age_group`
2. `coach`
3. `position`
4. `goalkeeper`
5. `outfield_player`
6. `training_program`
7. `parent`
8. `player`
9. `parent_player`
10. `class`
11. `training_session`
12. `registration`
13. `attendance`
14. `player_age_group_history`

### Supporting Relations

- `app_user` — Stores authentication accounts and user roles.
- `age_group_recommendation` — Stores recommendations concerning player age-group assignments.

The database uses primary keys, foreign keys, UNIQUE constraints, CHECK constraints, and application-level validation to support data integrity.

## Business Rules

Important rules include:

- Each player belongs to one current age group.
- Each player has one assigned primary position.
- A player may have multiple guardians.
- A player may have at most one primary guardian.
- A player cannot register twice for the same class.
- Class enrollment must not exceed the available capacity.
- Players must meet the age-group requirements of their classes.
- Attendance records must correspond to valid registrations.
- A player can have only one attendance record per training session.
- Only authorized users may access or modify restricted academy information.

Some business rules require application-level validation or database triggers. Their enforcement should be verified against the actual implementation.

## Technology Stack

| Component | Technology |
|---|---|
| Database | MySQL 8+ |
| Backend runtime | Node.js |
| Web framework | Express.js |
| Template engine | EJS |
| Database driver | mysql2 |
| Authentication | express-session, bcryptjs |
| Validation | express-validator |
| Frontend | HTML, CSS, JavaScript |
| Development tools | VS Code, MySQL Workbench |
| Version control | Git and GitHub |

## Installation

### Requirements

- Node.js 18 or newer
- npm
- MySQL 8 or newer
- MySQL Workbench or another MySQL client

### 1. Install Dependencies

Open the project directory and run:

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env` from the example:

```bash
cp .env.example .env
```

Configure the MySQL credentials, database name, and session secret.

Generate a session secret:

```bash
openssl rand -hex 32
```

### 3. Set Up the Database

For a new database, run the SQL scripts in this order:

1. `database/01_schema.sql`
2. `database/02_seed.sql`
3. `database/04_auth.sql`
4. `database/05_features.sql`

For an existing database, back up the data and review the scripts before applying changes.

### 4. Create an Administrator

```bash
node scripts/create-user.js admin1 Admin 0 'REPLACE_WITH_A_STRONG_PASSWORD'
```

### 5. Start the Application

```bash
npm start
```

Open:

`http://localhost:3000/login`

## Testing

Available verification commands include:

```bash
npm run test:db
npm run verify:rules
npm test
```

These commands help verify database connectivity, selected business rules, and application behavior.

Automated tests should be supplemented with manual testing of authentication, authorization, registration, and attendance workflows.

## Project Structure

- `database/` — SQL schema, seed data, and supporting database scripts.
- `src/routes/` — Application routes and database operations.
- `src/config/` — Database configuration.
- `src/middleware/` — Authentication and authorization.
- `src/views/` — EJS templates.
- `public/` — CSS and frontend assets.
- `scripts/` — Setup, seeding, and verification scripts.
- `tests/` — Automated tests.
- `docs/` — Supporting project documentation.

## Limitations

FAMS is developed as a university coursework project for local demonstration.

The application should not be considered production-ready without additional security testing, secure session storage, HTTPS, and deployment hardening.

The SE212 Final Report provides further documentation covering business rules, EER design, normalization, relational mapping, DDL/DML, database architecture, and user interfaces.

## Project Information

**Academy:** Apex Youth Football Academy  
**System:** Football Academy Management System (FAMS)  
**Course:** SE212 Database Design and Database System  
**Project Type:** Term Project Final Report