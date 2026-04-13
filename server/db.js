import pg from 'pg'

const { Pool } = pg

let pool = null

// Initialize database - creates all tables
export async function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set. Please add it to your environment.')
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  // Test connection
  const client = await pool.connect()

  try {
    console.log('✓ Connected to PostgreSQL')

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin'
      )
    `)

    // Invoices table
    await client.query(`
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
      )
    `)

    // Line items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS line_items (
        id TEXT PRIMARY KEY,
        "invoiceId" TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        "hsnCode" TEXT DEFAULT '',
        qty REAL NOT NULL,
        rate REAL NOT NULL,
        amount REAL NOT NULL
      )
    `)

    // Companies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        type TEXT DEFAULT 'Client',
        gstn TEXT DEFAULT '',
        address TEXT DEFAULT '',
        state TEXT DEFAULT '',
        email TEXT DEFAULT '',
        "bankName" TEXT DEFAULT '',
        "bankBranch" TEXT DEFAULT '',
        "accountNo" TEXT DEFAULT '',
        "ifscCode" TEXT DEFAULT ''
      )
    `)

    // Service masters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_masters (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        "hsnCode" TEXT DEFAULT '',
        description TEXT DEFAULT '',
        taxRate REAL DEFAULT 18
      )
    `)

    // Add new columns to existing tables (migration)
    try {
      await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "clientState" TEXT DEFAULT ''`)
      await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "companyState" TEXT DEFAULT ''`)
      await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS state TEXT DEFAULT ''`)
      await client.query(`ALTER TABLE service_masters ADD COLUMN IF NOT EXISTS taxRate REAL DEFAULT 18`)
      console.log('✓ Database migration completed')
    } catch (error) {
      console.log('✓ Migration columns already exist or error:', error.message)
    }

    console.log('✓ All PostgreSQL tables ready')
  } finally {
    client.release()
  }

  return pool
}

// --- User Operations ---
export const userDB = {
  async findByUsername(username) {
    try {
      const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username])
      return rows[0] || null
    } catch (error) {
      console.error('Error in findByUsername:', error)
      return null
    }
  },

  async getAll() {
    try {
      const { rows } = await pool.query('SELECT * FROM users')
      return rows
    } catch (error) {
      console.error('Error in getAll users:', error)
      return []
    }
  },

  async create(user) {
    try {
      const { id, username, password, role } = user
      const { rows } = await pool.query(
        'INSERT INTO users (id, username, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
        [id || Date.now().toString(), username, password, role || 'admin']
      )
      return rows[0]
    } catch (error) {
      console.error('Error in create user:', error)
      throw error
    }
  }
}

// --- Line Item Operations (internal) ---
const lineItemDB = {
  async getByInvoiceId(invoiceId) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM line_items WHERE "invoiceId" = $1 ORDER BY id ASC',
        [invoiceId]
      )
      return rows
    } catch (error) {
      console.error('Error in getByInvoiceId:', error)
      return []
    }
  },

  async create(lineItem) {
    try {
      const { id, invoiceId, description, hsnCode, qty, rate, amount } = lineItem
      await pool.query(
        'INSERT INTO line_items (id, "invoiceId", description, "hsnCode", qty, rate, amount) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id, invoiceId, description, hsnCode || '', qty, rate, amount]
      )
      return lineItem
    } catch (error) {
      console.error('Error in create line item:', error)
      throw error
    }
  },

  async deleteByInvoiceId(invoiceId) {
    try {
      await pool.query('DELETE FROM line_items WHERE "invoiceId" = $1', [invoiceId])
      return true
    } catch (error) {
      console.error('Error in deleteByInvoiceId:', error)
      throw error
    }
  }
}

// --- Invoice Operations ---
export const invoiceDB = {
  async getAll() {
    try {
      const { rows } = await pool.query('SELECT * FROM invoices ORDER BY "createdAt" DESC')
      for (const invoice of rows) {
        invoice.lineItems = await lineItemDB.getByInvoiceId(invoice.id)
      }
      return rows
    } catch (error) {
      console.error('Error in getAll invoices:', error)
      return []
    }
  },

  async getById(id) {
    try {
      const { rows } = await pool.query('SELECT * FROM invoices WHERE id = $1', [id])
      if (!rows[0]) return null
      rows[0].lineItems = await lineItemDB.getByInvoiceId(id)
      return rows[0]
    } catch (error) {
      console.error('Error in getById invoice:', error)
      return null
    }
  },

  async create(invoice) {
    try {
      const {
        id, number, clientName, clientAddress, clientGSTN, clientState, dcNumber, poNumber,
        goodsService, cgstRate, sgstRate, igstRate, dueDate, invoiceDate, status,
        notes, createdAt, lineItems, companyName, companyAddress, companyGSTN, companyState,
        companyEmail, roundOff, bankName, bankBranch, accountNo, ifscCode
      } = invoice

      await pool.query(
        `INSERT INTO invoices (
          id, number, "clientName", "clientAddress", "clientGSTN", "clientState", "dcNumber", "poNumber",
          "goodsService", "cgstRate", "sgstRate", "igstRate", "dueDate", "invoiceDate", status,
          notes, "createdAt", "updatedAt", "companyName", "companyAddress", "companyGSTN", "companyState",
          "companyEmail", "roundOff", "bankName", "bankBranch", "accountNo", "ifscCode"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
        )`,
        [
          id, number, clientName, clientAddress || '', clientGSTN || '', clientState || '', dcNumber || '', poNumber || '',
          goodsService || '', cgstRate ?? 9, sgstRate ?? 9, igstRate ?? 0, dueDate,
          invoiceDate || null, status || 'Draft', notes || '', createdAt, createdAt,
          companyName || '', companyAddress || '', companyGSTN || '', companyState || '',
          companyEmail || '', typeof roundOff === 'number' ? roundOff : 0,
          bankName || '', bankBranch || '', accountNo || '', ifscCode || ''
        ]
      )

      if (lineItems && lineItems.length > 0) {
        for (const item of lineItems) {
          await lineItemDB.create({ ...item, invoiceId: id })
        }
      }

      return await this.getById(id)
    } catch (error) {
      console.error('Error in create invoice:', error)
      throw error
    }
  },

  async update(id, invoice) {
    try {
      const {
        number, clientName, clientAddress, clientGSTN, clientState, dcNumber, poNumber,
        goodsService, cgstRate, sgstRate, igstRate, dueDate, invoiceDate, status,
        notes, lineItems, companyName, companyAddress, companyGSTN, companyState, companyEmail,
        roundOff, bankName, bankBranch, accountNo, ifscCode
      } = invoice
      const updatedAt = new Date().toISOString()

      await pool.query(
        `UPDATE invoices SET
          number=$1, "clientName"=$2, "clientAddress"=$3, "clientGSTN"=$4, "clientState"=$5, "dcNumber"=$6,
          "poNumber"=$7, "goodsService"=$8, "cgstRate"=$9, "sgstRate"=$10, "igstRate"=$11,
          "dueDate"=$12, "invoiceDate"=$13, status=$14, notes=$15, "updatedAt"=$16,
          "companyName"=$17, "companyAddress"=$18, "companyGSTN"=$19, "companyState"=$20, "companyEmail"=$21,
          "roundOff"=$22, "bankName"=$23, "bankBranch"=$24, "accountNo"=$25, "ifscCode"=$26
        WHERE id=$27`,
        [
          number, clientName, clientAddress || '', clientGSTN || '', clientState || '', dcNumber || '',
          poNumber || '', goodsService || '', cgstRate ?? 9, sgstRate ?? 9, igstRate ?? 0,
          dueDate, invoiceDate || null, status, notes || '', updatedAt,
          companyName || '', companyAddress || '', companyGSTN || '', companyState || '', companyEmail || '',
          typeof roundOff === 'number' ? roundOff : 0,
          bankName || '', bankBranch || '', accountNo || '', ifscCode || '', id
        ]
      )

      await lineItemDB.deleteByInvoiceId(id)
      if (lineItems && lineItems.length > 0) {
        for (const item of lineItems) {
          await lineItemDB.create({ ...item, invoiceId: id })
        }
      }

      return await this.getById(id)
    } catch (error) {
      console.error('Error in update invoice:', error)
      throw error
    }
  },

  async delete(id) {
    try {
      await lineItemDB.deleteByInvoiceId(id)
      await pool.query('DELETE FROM invoices WHERE id = $1', [id])
      return true
    } catch (error) {
      console.error('Error in delete invoice:', error)
      throw error
    }
  },

  async updateStatus(id, status) {
    try {
      const updatedAt = new Date().toISOString()
      await pool.query(
        'UPDATE invoices SET status=$1, "updatedAt"=$2 WHERE id=$3',
        [status, updatedAt, id]
      )
      return await this.getById(id)
    } catch (error) {
      console.error('Error in updateStatus:', error)
      throw error
    }
  }
}

// --- Company Operations ---
export const companyDB = {
  async getAll() {
    try {
      const { rows } = await pool.query('SELECT * FROM companies ORDER BY name ASC')
      return rows
    } catch (error) {
      console.error('Error in getAll companies:', error)
      return []
    }
  },

  async getById(id) {
    try {
      const { rows } = await pool.query('SELECT * FROM companies WHERE id = $1', [id])
      return rows[0] || null
    } catch (error) {
      console.error('Error in getById company:', error)
      return null
    }
  },

  async create(company) {
    try {
      const { id, name, type, gstn, address, state, email, bankName, bankBranch, accountNo, ifscCode } = company
      const newId = id || Date.now().toString()
      await pool.query(
        `INSERT INTO companies (id, name, type, gstn, address, state, email, "bankName", "bankBranch", "accountNo", "ifscCode")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [newId, name, type || 'Client', gstn || '', address || '', state || '', email || '',
         bankName || '', bankBranch || '', accountNo || '', ifscCode || '']
      )
      return await this.getById(newId)
    } catch (error) {
      console.error('Error in create company:', error)
      throw error
    }
  },

  async update(id, company) {
    try {
      const { name, type, gstn, address, state, email, bankName, bankBranch, accountNo, ifscCode } = company
      await pool.query(
        `UPDATE companies SET name=$1, type=$2, gstn=$3, address=$4, state=$5, email=$6,
         "bankName"=$7, "bankBranch"=$8, "accountNo"=$9, "ifscCode"=$10 WHERE id=$11`,
        [name, type || 'Client', gstn || '', address || '', state || '', email || '',
         bankName || '', bankBranch || '', accountNo || '', ifscCode || '', id]
      )
      return await this.getById(id)
    } catch (error) {
      console.error('Error in update company:', error)
      throw error
    }
  },

  async delete(id) {
    try {
      await pool.query('DELETE FROM companies WHERE id = $1', [id])
      return true
    } catch (error) {
      console.error('Error in delete company:', error)
      throw error
    }
  }
}

// --- Service Master Operations ---
export const serviceDB = {
  async getAll() {
    try {
      const { rows } = await pool.query('SELECT * FROM service_masters ORDER BY name ASC')
      return rows
    } catch (error) {
      console.error('Error in getAll services:', error)
      return []
    }
  },

  async getById(id) {
    try {
      const { rows } = await pool.query('SELECT * FROM service_masters WHERE id = $1', [id])
      return rows[0] || null
    } catch (error) {
      console.error('Error in getById service:', error)
      return null
    }
  },

  async create(service) {
    try {
      const { id, name, hsnCode, description, taxRate } = service
      const newId = id || Date.now().toString()
      await pool.query(
        'INSERT INTO service_masters (id, name, "hsnCode", description, taxRate) VALUES ($1,$2,$3,$4,$5)',
        [newId, name, hsnCode || '', description || '', taxRate ?? 18]
      )
      return await this.getById(newId)
    } catch (error) {
      console.error('Error in create service:', error)
      throw error
    }
  },

  async update(id, service) {
    try {
      const { name, hsnCode, description, taxRate } = service
      await pool.query(
        'UPDATE service_masters SET name=$1, "hsnCode"=$2, description=$3, taxRate=$4 WHERE id=$5',
        [name, hsnCode || '', description || '', taxRate ?? 18, id]
      )
      return await this.getById(id)
    } catch (error) {
      console.error('Error in update service:', error)
      throw error
    }
  },

  async delete(id) {
    try {
      await pool.query('DELETE FROM service_masters WHERE id = $1', [id])
      return true
    } catch (error) {
      console.error('Error in delete service:', error)
      throw error
    }
  }
}
