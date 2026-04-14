SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;
GO

IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id NVARCHAR(64) PRIMARY KEY,
    username NVARCHAR(120) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    role NVARCHAR(40) CONSTRAINT DF_users_role DEFAULT 'admin'
  );
END;
GO

IF OBJECT_ID('dbo.invoices', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.invoices (
    id NVARCHAR(64) PRIMARY KEY,
    number NVARCHAR(120) NOT NULL UNIQUE,
    clientName NVARCHAR(MAX) NOT NULL,
    clientAddress NVARCHAR(MAX) CONSTRAINT DF_invoices_clientAddress DEFAULT '',
    clientGSTN NVARCHAR(32) CONSTRAINT DF_invoices_clientGSTN DEFAULT '',
    clientState NVARCHAR(120) CONSTRAINT DF_invoices_clientState DEFAULT '',
    dcNumber NVARCHAR(120) CONSTRAINT DF_invoices_dcNumber DEFAULT '',
    poNumber NVARCHAR(120) CONSTRAINT DF_invoices_poNumber DEFAULT '',
    goodsService NVARCHAR(200) CONSTRAINT DF_invoices_goodsService DEFAULT '',
    cgstRate DECIMAL(8,2) CONSTRAINT DF_invoices_cgstRate DEFAULT 9,
    sgstRate DECIMAL(8,2) CONSTRAINT DF_invoices_sgstRate DEFAULT 9,
    igstRate DECIMAL(8,2) CONSTRAINT DF_invoices_igstRate DEFAULT 0,
    dueDate NVARCHAR(40) NOT NULL,
    invoiceDate NVARCHAR(40) NULL,
    status NVARCHAR(40) NOT NULL CONSTRAINT DF_invoices_status DEFAULT 'Draft',
    notes NVARCHAR(MAX) CONSTRAINT DF_invoices_notes DEFAULT '',
    createdAt NVARCHAR(40) NOT NULL,
    updatedAt NVARCHAR(40) NOT NULL,
    companyName NVARCHAR(MAX) CONSTRAINT DF_invoices_companyName DEFAULT '',
    companyAddress NVARCHAR(MAX) CONSTRAINT DF_invoices_companyAddress DEFAULT '',
    companyGSTN NVARCHAR(32) CONSTRAINT DF_invoices_companyGSTN DEFAULT '',
    companyState NVARCHAR(120) CONSTRAINT DF_invoices_companyState DEFAULT '',
    companyEmail NVARCHAR(255) CONSTRAINT DF_invoices_companyEmail DEFAULT '',
    roundOff DECIMAL(12,2) CONSTRAINT DF_invoices_roundOff DEFAULT 0,
    bankName NVARCHAR(255) CONSTRAINT DF_invoices_bankName DEFAULT '',
    bankBranch NVARCHAR(255) CONSTRAINT DF_invoices_bankBranch DEFAULT '',
    accountNo NVARCHAR(80) CONSTRAINT DF_invoices_accountNo DEFAULT '',
    ifscCode NVARCHAR(40) CONSTRAINT DF_invoices_ifscCode DEFAULT ''
  );
END;
GO

IF OBJECT_ID('dbo.line_items', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.line_items (
    id NVARCHAR(64) PRIMARY KEY,
    invoiceId NVARCHAR(64) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    hsnCode NVARCHAR(40) CONSTRAINT DF_line_items_hsnCode DEFAULT '',
    qty DECIMAL(12,2) NOT NULL,
    rate DECIMAL(12,2) NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    CONSTRAINT FK_line_items_invoice FOREIGN KEY (invoiceId)
      REFERENCES dbo.invoices(id)
      ON DELETE CASCADE
  );
END;
GO

IF OBJECT_ID('dbo.companies', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.companies (
    id NVARCHAR(64) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL UNIQUE,
    type NVARCHAR(40) CONSTRAINT DF_companies_type DEFAULT 'Client',
    gstn NVARCHAR(32) CONSTRAINT DF_companies_gstn DEFAULT '',
    address NVARCHAR(MAX) CONSTRAINT DF_companies_address DEFAULT '',
    state NVARCHAR(120) CONSTRAINT DF_companies_state DEFAULT '',
    email NVARCHAR(255) CONSTRAINT DF_companies_email DEFAULT '',
    bankName NVARCHAR(255) CONSTRAINT DF_companies_bankName DEFAULT '',
    bankBranch NVARCHAR(255) CONSTRAINT DF_companies_bankBranch DEFAULT '',
    accountNo NVARCHAR(80) CONSTRAINT DF_companies_accountNo DEFAULT '',
    ifscCode NVARCHAR(40) CONSTRAINT DF_companies_ifscCode DEFAULT ''
  );
END;
GO

IF OBJECT_ID('dbo.service_masters', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.service_masters (
    id NVARCHAR(64) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL UNIQUE,
    hsnCode NVARCHAR(40) CONSTRAINT DF_service_masters_hsnCode DEFAULT '',
    description NVARCHAR(MAX) CONSTRAINT DF_service_masters_description DEFAULT '',
    taxRate DECIMAL(8,2) CONSTRAINT DF_service_masters_taxRate DEFAULT 18
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_invoices_createdat' AND object_id = OBJECT_ID('dbo.invoices'))
  CREATE INDEX idx_invoices_createdat ON dbo.invoices (createdAt);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_invoices_status' AND object_id = OBJECT_ID('dbo.invoices'))
  CREATE INDEX idx_invoices_status ON dbo.invoices (status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_line_items_invoiceid' AND object_id = OBJECT_ID('dbo.line_items'))
  CREATE INDEX idx_line_items_invoiceid ON dbo.line_items (invoiceId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_companies_name' AND object_id = OBJECT_ID('dbo.companies'))
  CREATE INDEX idx_companies_name ON dbo.companies (name);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_service_masters_name' AND object_id = OBJECT_ID('dbo.service_masters'))
  CREATE INDEX idx_service_masters_name ON dbo.service_masters (name);
GO

COMMIT TRANSACTION;
GO
