# Apex Youth Football Academy
## FAMS Models Directory

The Football Academy Management System (FAMS) is developed using Node.js, Express.js, EJS, and MySQL.

## Purpose

This directory is reserved for database model and data-access modules.

In the current project structure, much of the SQL query logic is implemented within Express route modules in:

`src/routes/`

The MySQL database connection is configured in:

`src/config/db.js`

## Database Access

The application uses MySQL queries to manage academy records, including:

- Players
- Parents and guardians
- Coaches
- Age groups
- Football positions
- Training programs
- Classes
- Training sessions
- Registrations
- Attendance
- Player age-group history

## Database Integrity

Database operations should respect the schema's primary keys, foreign keys, UNIQUE constraints, CHECK constraints, and applicable validation rules.

Complex operations, including registration and attendance recording, may require additional application-level checks.

## Future Improvements

The project can be refactored to separate:

- Routes — HTTP request handling.
- Services — Business logic and validation.
- Models — Database queries and persistence.

Separating these responsibilities may improve code organization, testing, and maintainability.

## Development Notes

When modifying database operations, review the corresponding SQL schema, route handlers, authorization logic, and automated tests.

This directory does not need to contain a model file for every database table unless the application architecture requires it.

## Project Information

**Academy:** Apex Youth Football Academy  
**System:** Football Academy Management System (FAMS)