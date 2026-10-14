# Apex Youth Football Academy — FAMS
## Getting Started Guide

This guide explains how to install and run the Football Academy Management System (FAMS) using Node.js, Express.js, EJS, and MySQL.

## Step 1: Prepare the Project

Extract the project ZIP file and open the folder containing `package.json`.

Install the required packages:

```bash
npm install
```

## Step 2: Configure MySQL

Make sure MySQL is running.

Open MySQL Workbench and verify that the database server is accessible.

Create the `.env` configuration file:

```bash
cp .env.example .env
```

Configure the MySQL username, password, database name, and session secret.

Generate a strong session secret:

```bash
openssl rand -hex 32
```

Do not publish `.env` or commit it to a public repository.

## Step 3: Initialize the Database

For a new database, execute these SQL files in MySQL Workbench:

1. `database/01_schema.sql`
2. `database/02_seed.sql`
3. `database/04_auth.sql`
4. `database/05_features.sql`

The database stores academy information such as players, guardians, coaches, classes, registrations, attendance, and user accounts.

If the database already contains data, create a backup before applying additional SQL scripts.

## Step 4: Create an Administrator

Run:

```bash
node scripts/create-user.js admin1 Admin 0 'REPLACE_WITH_A_STRONG_PASSWORD'
```

Replace the example password with a strong password.

For local demonstration accounts, refer to `README_DEMO_LOGIN.md`.

## Step 5: Verify the System

Run:

```bash
npm run test:db
npm run verify:rules
npm test
```

Review any errors and resolve database or application issues before demonstrating the system.

## Step 6: Start the Application

Run:

```bash
npm start
```

Open the application:

`http://localhost:3000/login`

Sign in using an account created during setup.

## User Roles

**Admin:** Manages academy information, classes, registrations, attendance, and accounts.

**Coach:** Views assigned classes and sessions, records attendance, and submits age-group recommendations.

**Parent:** Views information related to linked children.

**Management:** Reviews dashboards and academy reports.

## Troubleshooting

### Cannot Connect to MySQL

Check that the MySQL service is running and that `.env` contains the correct connection settings.

### Missing Database Tables

Verify that the SQL schema and required supporting scripts have been executed against the correct database.

### Login Failed

Verify that the user account exists and that its password is correct.

Coach and Parent accounts may require valid linked coach or parent records.

### Application Does Not Start

Check the terminal output, installed dependencies, environment variables, and configured port.

## Important Notes

FAMS is designed for Apex Youth Football Academy as an SE212 coursework project.

Database constraints and application validation should be tested together.

The system is intended for local academic demonstration and requires additional security measures before public deployment.