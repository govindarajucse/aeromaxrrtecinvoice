# Migration Scripts for aeromaxrrtecinvoicedb

This folder contains database-specific initialization scripts for the same logical schema used by the application tables:

- users
- invoices
- line_items
- companies
- service_masters

## Why multiple scripts

A single SQL file is not fully portable across PostgreSQL, MySQL, SQLite, and SQL Server because each engine differs in:

- idempotent DDL syntax
- data type names
- identifier quoting rules
- index and transaction behavior

To keep migrations reliable across all major engines, use the script that matches your database.

## Available scripts

- PostgreSQL: postgresql/001_init_aeromaxrrtecinvoicedb.sql
- MySQL (InnoDB): mysql/001_init_aeromaxrrtecinvoicedb.sql
- SQLite: sqlite/001_init_aeromaxrrtecinvoicedb.sql
- SQL Server: sqlserver/001_init_aeromaxrrtecinvoicedb.sql

## Run examples

PostgreSQL:

psql "$DATABASE_URL" -f server/migrations/postgresql/001_init_aeromaxrrtecinvoicedb.sql

MySQL:

mysql -u your_user -p your_database < server/migrations/mysql/001_init_aeromaxrrtecinvoicedb.sql

SQLite:

sqlite3 aeromaxrrtecinvoicedb.sqlite < server/migrations/sqlite/001_init_aeromaxrrtecinvoicedb.sql

SQL Server:

sqlcmd -S your_server -d your_database -i server/migrations/sqlserver/001_init_aeromaxrrtecinvoicedb.sql

## Notes

- Scripts are idempotent (safe to run repeatedly).
- IDs are application-generated string keys (not auto-incrementing).
- Date/time fields are stored as text to stay compatible with current app behavior.
- For the current Node server implementation, PostgreSQL is the active runtime backend.
