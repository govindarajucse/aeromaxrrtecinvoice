import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'invoices.db')

let db = null

// Initialize database
export async function initializeDatabase() {
  const SQL = await initSqlJs()

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const data = fs.readFileSync(dbPath)
    db = new SQL.Database(data)
  } else {
    db = new SQL.Database()
  }

  // Create invoices table with company fields
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      number TEXT UNIQUE NOT NULL,
      clientName TEXT NOT NULL,
      clientAddress TEXT,
      clientGSTN TEXT,
      dcNumber TEXT,
      poNumber TEXT,
      goodsService TEXT,
      cgstRate REAL DEFAULT 9,
      sgstRate REAL DEFAULT 9,
      igstRate REAL DEFAULT 0,
      dueDate TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      companyName TEXT,
      companyAddress TEXT,
      companyGSTN TEXT,
      companyEmail TEXT,
      roundOff REAL DEFAULT 0,
      bankName TEXT,
      bankBranch TEXT,
      accountNo TEXT,
      ifscCode TEXT
    )
  `)

  // Ensure missing invoice columns are added when upgrading existing database
  const existingColumns = db.exec("PRAGMA table_info(invoices)")[0]?.values.map(col => col[1]) || []
  const requiredColumns = [
    { name: 'dcNumber', type: 'TEXT' },
    { name: 'poNumber', type: 'TEXT' },
    { name: 'goodsService', type: 'TEXT' },
    { name: 'companyName', type: 'TEXT' },
    { name: 'companyAddress', type: 'TEXT' },
    { name: 'companyGSTN', type: 'TEXT' },
    { name: 'companyEmail', type: 'TEXT' },
    { name: 'roundOff', type: 'REAL' },
    { name: 'bankName', type: 'TEXT' },
    { name: 'bankBranch', type: 'TEXT' },
    { name: 'accountNo', type: 'TEXT' },
    { name: 'ifscCode', type: 'TEXT' }
  ]
  requiredColumns.forEach(({ name, type }) => {
    if (!existingColumns.includes(name)) {
      db.run(`ALTER TABLE invoices ADD COLUMN ${name} ${type}`)
    }
  })

  // Create line items table
  db.run(`
    CREATE TABLE IF NOT EXISTS lineItems (
      id TEXT PRIMARY KEY,
      invoiceId TEXT NOT NULL,
      description TEXT NOT NULL,
      hsnCode TEXT,
      qty REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `)

  // Create companies table
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'Client',
      gstn TEXT,
      address TEXT,
      email TEXT,
      bankName TEXT,
      bankBranch TEXT,
      accountNo TEXT,
      ifscCode TEXT
    )
  `)

  // Ensure missing company columns are added
  const companyColumns = db.exec("PRAGMA table_info(companies)")[0]?.values.map(col => col[1]) || []
  if (!companyColumns.includes('type')) {
    db.run(`ALTER TABLE companies ADD COLUMN type TEXT DEFAULT 'Client'`)
  }

  // Create service masters table
  db.run(`
    CREATE TABLE IF NOT EXISTS service_masters (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      hsnCode TEXT,
      description TEXT
    )
  `)

  // Create users table for authentication
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin'
    )
  `)

  saveDatabase()
  return db
}

// Save database to file
function saveDatabase() {
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

// User operations
export const userDB = {
  findByUsername(username) {
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE username = ?')
      stmt.bind([username])
      if (stmt.step()) {
        const user = stmt.getAsObject()
        stmt.free()
        return user
      }
      stmt.free()
      return null
    } catch (error) {
      console.error('Error in findByUsername:', error)
      return null
    }
  },

  getAll() {
    try {
      const results = []
      const stmt = db.prepare('SELECT * FROM users')
      while (stmt.step()) {
        results.push(stmt.getAsObject())
      }
      stmt.free()
      return results
    } catch (error) {
      console.error('Error in getAll users:', error)
      return []
    }
  },

  create(user) {
    try {
      const { id, username, password, role } = user
      const stmt = db.prepare(`
        INSERT INTO users (id, username, password, role)
        VALUES (?, ?, ?, ?)
      `)
      stmt.bind([id || Date.now().toString(), username, password, role || 'admin'])
      stmt.step()
      stmt.free()
      saveDatabase()
      return { id, username, role }
    } catch (error) {
      console.error('Error in create user:', error)
      throw error
    }
  }
}

// Line Items operations
export const lineItemDB = {
  getByInvoiceId(invoiceId) {
    try {
      const results = []
      const stmt = db.prepare('SELECT * FROM lineItems WHERE invoiceId = ? ORDER BY rowid ASC')
      stmt.bind([invoiceId])
      while (stmt.step()) {
        results.push(stmt.getAsObject())
      }
      stmt.free()
      return results
    } catch (error) {
      console.error('Error in getByInvoiceId:', error)
      return []
    }
  },

  create(lineItem) {
    try {
      const { id, invoiceId, description, hsnCode, qty, rate, amount } = lineItem
      const stmt = db.prepare(`
        INSERT INTO lineItems (id, invoiceId, description, hsnCode, qty, rate, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.bind([id, invoiceId, description, hsnCode, qty, rate, amount])
      stmt.step()
      stmt.free()
      saveDatabase()
      return lineItem
    } catch (error) {
      console.error('Error in create:', error)
      throw error
    }
  },

  deleteByInvoiceId(invoiceId) {
    try {
      const stmt = db.prepare('DELETE FROM lineItems WHERE invoiceId = ?')
      stmt.bind([invoiceId])
      stmt.step()
      stmt.free()
      saveDatabase()
      return true
    } catch (error) {
      console.error('Error in deleteByInvoiceId:', error)
      throw error
    }
  }
}

// Invoice operations
export const invoiceDB = {
  getAll() {
    try {
      const results = []
      const stmt = db.prepare('SELECT * FROM invoices ORDER BY createdAt DESC')
      while (stmt.step()) {
        const invoice = stmt.getAsObject()
        invoice.lineItems = lineItemDB.getByInvoiceId(invoice.id)
        results.push(invoice)
      }
      stmt.free()
      return results
    } catch (error) {
      console.error('Error in getAll:', error)
      return []
    }
  },

  getById(id) {
    try {
      const stmt = db.prepare('SELECT * FROM invoices WHERE id = ?')
      stmt.bind([id])
      if (stmt.step()) {
        const invoice = stmt.getAsObject()
        stmt.free()
        invoice.lineItems = lineItemDB.getByInvoiceId(id)
        return invoice
      }
      stmt.free()
      return null
    } catch (error) {
      console.error('Error in getById:', error)
      return null
    }
  },

  create(invoice) {
    try {
      const { id, number, clientName, clientAddress, clientGSTN, dcNumber, poNumber, goodsService, cgstRate, sgstRate, igstRate, dueDate, status, notes, createdAt, lineItems, companyName, companyAddress, companyGSTN, companyEmail, roundOff, bankName, bankBranch, accountNo, ifscCode } = invoice
      const stmt = db.prepare(`
        INSERT INTO invoices (id, number, clientName, clientAddress, clientGSTN, dcNumber, poNumber, goodsService, cgstRate, sgstRate, igstRate, dueDate, status, notes, createdAt, updatedAt, companyName, companyAddress, companyGSTN, companyEmail, roundOff, bankName, bankBranch, accountNo, ifscCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.bind([
        id, number, clientName, clientAddress || '', clientGSTN || '', dcNumber || '', poNumber || '', goodsService || '',
        cgstRate || 9, sgstRate || 9, igstRate || 0, dueDate, status, notes, createdAt, createdAt,
        companyName || '', companyAddress || '', companyGSTN || '', companyEmail || '', typeof roundOff === 'number' ? roundOff : 0,
        bankName || '', bankBranch || '', accountNo || '', ifscCode || ''
      ])
      stmt.step()
      stmt.free()

      // Add line items
      if (lineItems && lineItems.length > 0) {
        lineItems.forEach(item => {
          lineItemDB.create({ ...item, invoiceId: id })
        })
      }

      saveDatabase()
      return this.getById(id)
    } catch (error) {
      console.error('Error in create:', error)
      throw error
    }
  },

  update(id, invoice) {
    try {
      const { number, clientName, clientAddress, clientGSTN, dcNumber, poNumber, goodsService, cgstRate, sgstRate, igstRate, dueDate, status, notes, lineItems, companyName, companyAddress, companyGSTN, companyEmail, roundOff, bankName, bankBranch, accountNo, ifscCode } = invoice
      const updatedAt = new Date().toISOString()
      const stmt = db.prepare(`
        UPDATE invoices
        SET number = ?, clientName = ?, clientAddress = ?, clientGSTN = ?, dcNumber = ?, poNumber = ?, goodsService = ?, cgstRate = ?, sgstRate = ?, igstRate = ?, dueDate = ?, status = ?, notes = ?, updatedAt = ?, companyName = ?, companyAddress = ?, companyGSTN = ?, companyEmail = ?, roundOff = ?, bankName = ?, bankBranch = ?, accountNo = ?, ifscCode = ?
        WHERE id = ?
      `)
      stmt.bind([
        number, clientName, clientAddress || '', clientGSTN || '', dcNumber || '', poNumber || '', goodsService || '',
        cgstRate || 9, sgstRate || 9, igstRate || 0, dueDate, status, notes, updatedAt,
        companyName || '', companyAddress || '', companyGSTN || '', companyEmail || '', typeof roundOff === 'number' ? roundOff : 0,
        bankName || '', bankBranch || '', accountNo || '', ifscCode || '', id
      ])
      stmt.step()
      stmt.free()

      // Update line items
      lineItemDB.deleteByInvoiceId(id)
      if (lineItems && lineItems.length > 0) {
        lineItems.forEach(item => {
          lineItemDB.create({ ...item, invoiceId: id })
        })
      }

      saveDatabase()
      return this.getById(id)
    } catch (error) {
      console.error('Error in update:', error)
      throw error
    }
  },

  delete(id) {
    try {
      lineItemDB.deleteByInvoiceId(id)
      const stmt = db.prepare('DELETE FROM invoices WHERE id = ?')
      stmt.bind([id])
      stmt.step()
      stmt.free()
      saveDatabase()
      return true
    } catch (error) {
      console.error('Error in delete:', error)
      throw error
    }
  },

  updateStatus(id, status) {
    try {
      const updatedAt = new Date().toISOString()
      const stmt = db.prepare('UPDATE invoices SET status = ?, updatedAt = ? WHERE id = ?')
      stmt.bind([status, updatedAt, id])
      stmt.step()
      stmt.free()
      saveDatabase()
      return this.getById(id)
    } catch (error) {
      console.error('Error in updateStatus:', error)
      throw error
    }
  }
}

// Company operations
export const companyDB = {
  getAll() {
    try {
      const results = []
      const stmt = db.prepare('SELECT * FROM companies ORDER BY name ASC')
      while (stmt.step()) {
        results.push(stmt.getAsObject())
      }
      stmt.free()
      return results
    } catch (error) {
      console.error('Error in getAll companies:', error)
      return []
    }
  },

  getById(id) {
    try {
      const stmt = db.prepare('SELECT * FROM companies WHERE id = ?')
      stmt.bind([id])
      if (stmt.step()) {
        const company = stmt.getAsObject()
        stmt.free()
        return company
      }
      stmt.free()
      return null
    } catch (error) {
      console.error('Error in getById company:', error)
      return null
    }
  },

  create(company) {
    try {
      const { id, name, type, gstn, address, email, bankName, bankBranch, accountNo, ifscCode } = company
      const stmt = db.prepare(`
        INSERT INTO companies (id, name, type, gstn, address, email, bankName, bankBranch, accountNo, ifscCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.bind([
        id || Date.now().toString(),
        name,
        type || 'Client',
        gstn || '',
        address || '',
        email || '',
        bankName || '',
        bankBranch || '',
        accountNo || '',
        ifscCode || ''
      ])
      stmt.step()
      stmt.free()
      saveDatabase()
      return this.getById(id)
    } catch (error) {
      console.error('Error in create company:', error)
      throw error
    }
  },

  update(id, company) {
    try {
      const { name, type, gstn, address, email, bankName, bankBranch, accountNo, ifscCode } = company
      const stmt = db.prepare(`
        UPDATE companies
        SET name = ?, type = ?, gstn = ?, address = ?, email = ?, bankName = ?, bankBranch = ?, accountNo = ?, ifscCode = ?
        WHERE id = ?
      `)
      stmt.bind([
        name,
        type || 'Client',
        gstn || '',
        address || '',
        email || '',
        bankName || '',
        bankBranch || '',
        accountNo || '',
        ifscCode || '',
        id
      ])
      stmt.step()
      stmt.free()
      saveDatabase()
      return this.getById(id)
    } catch (error) {
      console.error('Error in update company:', error)
      throw error
    }
  },

  delete(id) {
    try {
      const stmt = db.prepare('DELETE FROM companies WHERE id = ?')
      stmt.bind([id])
      stmt.step()
      stmt.free()
      saveDatabase()
      return true
    } catch (error) {
      console.error('Error in delete company:', error)
      throw error
    }
  }
}

// Service Master operations
export const serviceDB = {
  getAll() {
    try {
      const results = []
      const stmt = db.prepare('SELECT * FROM service_masters ORDER BY name ASC')
      while (stmt.step()) {
        results.push(stmt.getAsObject())
      }
      stmt.free()
      return results
    } catch (error) {
      console.error('Error in getAll services:', error)
      return []
    }
  },

  getById(id) {
    try {
      const stmt = db.prepare('SELECT * FROM service_masters WHERE id = ?')
      stmt.bind([id])
      if (stmt.step()) {
        const service = stmt.getAsObject()
        stmt.free()
        return service
      }
      stmt.free()
      return null
    } catch (error) {
      console.error('Error in getById service:', error)
      return null
    }
  },

  create(service) {
    try {
      const { id, name, hsnCode, description } = service
      const stmt = db.prepare(`
        INSERT INTO service_masters (id, name, hsnCode, description)
        VALUES (?, ?, ?, ?)
      `)
      stmt.bind([
        id || Date.now().toString(),
        name,
        hsnCode || '',
        description || ''
      ])
      stmt.step()
      stmt.free()
      saveDatabase()
      return this.getById(id)
    } catch (error) {
      console.error('Error in create service:', error)
      throw error
    }
  },

  update(id, service) {
    try {
      const { name, hsnCode, description } = service
      const stmt = db.prepare(`
        UPDATE service_masters
        SET name = ?, hsnCode = ?, description = ?
        WHERE id = ?
      `)
      stmt.bind([
        name,
        hsnCode || '',
        description || '',
        id
      ])
      stmt.step()
      stmt.free()
      saveDatabase()
      return this.getById(id)
    } catch (error) {
      console.error('Error in update service:', error)
      throw error
    }
  },

  delete(id) {
    try {
      const stmt = db.prepare('DELETE FROM service_masters WHERE id = ?')
      stmt.bind([id])
      stmt.step()
      stmt.free()
      saveDatabase()
      return true
    } catch (error) {
      console.error('Error in delete service:', error)
      throw error
    }
  }
}

export default db
