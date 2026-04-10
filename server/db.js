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
        description TEXT DEFAULT ''
      )
    `)

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
        id, number, clientName, clientAddress, clientGSTN, dcNumber, poNumber,
        goodsService, cgstRate, sgstRate, igstRate, dueDate, invoiceDate, status,
        notes, createdAt, lineItems, companyName, companyAddress, companyGSTN,
        companyEmail, roundOff, bankName, bankBranch, accountNo, ifscCode
      } = invoice

      await pool.query(
        `INSERT INTO invoices (
          id, number, "clientName", "clientAddress", "clientGSTN", "dcNumber", "poNumber",
          "goodsService", "cgstRate", "sgstRate", "igstRate", "dueDate", "invoiceDate", status,
          notes, "createdAt", "updatedAt", "companyName", "companyAddress", "companyGSTN",
          "companyEmail", "roundOff", "bankName", "bankBranch", "accountNo", "ifscCode"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
        )`,
        [
          id, number, clientName, clientAddress || '', clientGSTN || '', dcNumber || '', poNumber || '',
          goodsService || '', cgstRate ?? 9, sgstRate ?? 9, igstRate ?? 0, dueDate,
          invoiceDate || null, status || 'Draft', notes || '', createdAt, createdAt,
          companyName || '', companyAddress || '', companyGSTN || '', companyEmail || '',
          typeof roundOff === 'number' ? roundOff : 0,
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
        number, clientName, clientAddress, clientGSTN, dcNumber, poNumber,
        goodsService, cgstRate, sgstRate, igstRate, dueDate, invoiceDate, status,
        notes, lineItems, companyName, companyAddress, companyGSTN, companyEmail,
        roundOff, bankName, bankBranch, accountNo, ifscCode
      } = invoice
      const updatedAt = new Date().toISOString()

      await pool.query(
        `UPDATE invoices SET
          number=$1, "clientName"=$2, "clientAddress"=$3, "clientGSTN"=$4, "dcNumber"=$5,
          "poNumber"=$6, "goodsService"=$7, "cgstRate"=$8, "sgstRate"=$9, "igstRate"=$10,
          "dueDate"=$11, "invoiceDate"=$12, status=$13, notes=$14, "updatedAt"=$15,
          "companyName"=$16, "companyAddress"=$17, "companyGSTN"=$18, "companyEmail"=$19,
          "roundOff"=$20, "bankName"=$21, "bankBranch"=$22, "accountNo"=$23, "ifscCode"=$24
        WHERE id=$25`,
        [
          number, clientName, clientAddress || '', clientGSTN || '', dcNumber || '',
          poNumber || '', goodsService || '', cgstRate ?? 9, sgstRate ?? 9, igstRate ?? 0,
          dueDate, invoiceDate || null, status, notes || '', updatedAt,
          companyName || '', companyAddress || '', companyGSTN || '', companyEmail || '',
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
      const { id, name, type, gstn, address, email, bankName, bankBranch, accountNo, ifscCode } = company
      const newId = id || Date.now().toString()
      await pool.query(
        `INSERT INTO companies (id, name, type, gstn, address, email, "bankName", "bankBranch", "accountNo", "ifscCode")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [newId, name, type || 'Client', gstn || '', address || '', email || '',
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
      const { name, type, gstn, address, email, bankName, bankBranch, accountNo, ifscCode } = company
      await pool.query(
        `UPDATE companies SET name=$1, type=$2, gstn=$3, address=$4, email=$5,
         "bankName"=$6, "bankBranch"=$7, "accountNo"=$8, "ifscCode"=$9 WHERE id=$10`,
        [name, type || 'Client', gstn || '', address || '', email || '',
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
      const { id, name, hsnCode, description } = service
      const newId = id || Date.now().toString()
      await pool.query(
        'INSERT INTO service_masters (id, name, "hsnCode", description) VALUES ($1,$2,$3,$4)',
        [newId, name, hsnCode || '', description || '']
      )
      return await this.getById(newId)
    } catch (error) {
      console.error('Error in create service:', error)
      throw error
    }
  },

  async update(id, service) {
    try {
      const { name, hsnCode, description } = service
      await pool.query(
        'UPDATE service_masters SET name=$1, "hsnCode"=$2, description=$3 WHERE id=$4',
        [name, hsnCode || '', description || '', id]
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
