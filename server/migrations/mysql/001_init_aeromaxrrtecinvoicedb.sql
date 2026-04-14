START TRANSACTION;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(40) DEFAULT 'admin'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(64) PRIMARY KEY,
  number VARCHAR(120) NOT NULL UNIQUE,
  clientName TEXT NOT NULL,
  clientAddress TEXT DEFAULT '',
  clientGSTN VARCHAR(32) DEFAULT '',
  clientState VARCHAR(120) DEFAULT '',
  dcNumber VARCHAR(120) DEFAULT '',
  poNumber VARCHAR(120) DEFAULT '',
  goodsService VARCHAR(200) DEFAULT '',
  cgstRate DECIMAL(8,2) DEFAULT 9,
  sgstRate DECIMAL(8,2) DEFAULT 9,
  igstRate DECIMAL(8,2) DEFAULT 0,
  dueDate VARCHAR(40) NOT NULL,
  invoiceDate VARCHAR(40) DEFAULT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Draft',
  notes TEXT DEFAULT '',
  createdAt VARCHAR(40) NOT NULL,
  updatedAt VARCHAR(40) NOT NULL,
  companyName TEXT DEFAULT '',
  companyAddress TEXT DEFAULT '',
  companyGSTN VARCHAR(32) DEFAULT '',
  companyState VARCHAR(120) DEFAULT '',
  companyEmail VARCHAR(255) DEFAULT '',
  roundOff DECIMAL(12,2) DEFAULT 0,
  bankName VARCHAR(255) DEFAULT '',
  bankBranch VARCHAR(255) DEFAULT '',
  accountNo VARCHAR(80) DEFAULT '',
  ifscCode VARCHAR(40) DEFAULT ''
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS line_items (
  id VARCHAR(64) PRIMARY KEY,
  invoiceId VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  hsnCode VARCHAR(40) DEFAULT '',
  qty DECIMAL(12,2) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  CONSTRAINT fk_line_items_invoice
    FOREIGN KEY (invoiceId)
    REFERENCES invoices (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(40) DEFAULT 'Client',
  gstn VARCHAR(32) DEFAULT '',
  address TEXT DEFAULT '',
  state VARCHAR(120) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  bankName VARCHAR(255) DEFAULT '',
  bankBranch VARCHAR(255) DEFAULT '',
  accountNo VARCHAR(80) DEFAULT '',
  ifscCode VARCHAR(40) DEFAULT ''
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_masters (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  hsnCode VARCHAR(40) DEFAULT '',
  description TEXT DEFAULT '',
  taxRate DECIMAL(8,2) DEFAULT 18
) ENGINE=InnoDB;

SET @idx_exists := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_invoices_createdat'
);
SET @ddl := IF(@idx_exists = 0, 'CREATE INDEX idx_invoices_createdat ON invoices (createdAt)', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_invoices_status'
);
SET @ddl := IF(@idx_exists = 0, 'CREATE INDEX idx_invoices_status ON invoices (status)', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'line_items' AND index_name = 'idx_line_items_invoiceid'
);
SET @ddl := IF(@idx_exists = 0, 'CREATE INDEX idx_line_items_invoiceid ON line_items (invoiceId)', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'companies' AND index_name = 'idx_companies_name'
);
SET @ddl := IF(@idx_exists = 0, 'CREATE INDEX idx_companies_name ON companies (name)', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'service_masters' AND index_name = 'idx_service_masters_name'
);
SET @ddl := IF(@idx_exists = 0, 'CREATE INDEX idx_service_masters_name ON service_masters (name)', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

COMMIT;
