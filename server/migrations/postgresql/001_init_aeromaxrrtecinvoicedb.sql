BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  "clientName" TEXT NOT NULL,
  "clientAddress" TEXT DEFAULT '',
  "clientGSTN" TEXT DEFAULT '',
  "clientState" TEXT DEFAULT '',
  "dcNumber" TEXT DEFAULT '',
  "poNumber" TEXT DEFAULT '',
  "goodsService" TEXT DEFAULT '',
  "cgstRate" REAL DEFAULT 9,
  "sgstRate" REAL DEFAULT 9,
  "igstRate" REAL DEFAULT 0,
  "dueDate" TEXT NOT NULL,
  "invoiceDate" TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  notes TEXT DEFAULT '',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "companyName" TEXT DEFAULT '',
  "companyAddress" TEXT DEFAULT '',
  "companyGSTN" TEXT DEFAULT '',
  "companyState" TEXT DEFAULT '',
  "companyEmail" TEXT DEFAULT '',
  "roundOff" REAL DEFAULT 0,
  "bankName" TEXT DEFAULT '',
  "bankBranch" TEXT DEFAULT '',
  "accountNo" TEXT DEFAULT '',
  "ifscCode" TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS line_items (
  id TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  description TEXT NOT NULL,
  "hsnCode" TEXT DEFAULT '',
  qty REAL NOT NULL,
  rate REAL NOT NULL,
  amount REAL NOT NULL,
  CONSTRAINT fk_line_items_invoice
    FOREIGN KEY ("invoiceId")
    REFERENCES invoices (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'Client',
  gstn TEXT DEFAULT '',
  address TEXT DEFAULT '',
  "state" TEXT DEFAULT '',
  email TEXT DEFAULT '',
  "bankName" TEXT DEFAULT '',
  "bankBranch" TEXT DEFAULT '',
  "accountNo" TEXT DEFAULT '',
  "ifscCode" TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS service_masters (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  "hsnCode" TEXT DEFAULT '',
  description TEXT DEFAULT '',
  "taxRate" REAL DEFAULT 18
);

CREATE INDEX IF NOT EXISTS idx_invoices_createdat ON invoices ("createdAt");
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_line_items_invoiceid ON line_items ("invoiceId");
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies (name);
CREATE INDEX IF NOT EXISTS idx_service_masters_name ON service_masters (name);

COMMIT;
