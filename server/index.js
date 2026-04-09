import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readdirSync, existsSync, mkdirSync } from 'fs'
import { invoiceDB, companyDB, serviceDB, initializeDatabase } from './db.js'
import { generatePDF, generateExcel, generateReportExcel } from './export.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Ensure public/logos directory exists
const logosDir = join(__dirname, 'public', 'logos')
if (!existsSync(logosDir)) {
  mkdirSync(logosDir, { recursive: true })
}

const app = express()
const PORT = 9999

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, 'public', 'logos'))
  },
  filename: (req, file, cb) => {
    cb(null, 'company-logo' + getFileExtension(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

function getFileExtension(filename) {
  return filename.substring(filename.lastIndexOf('.'))
}

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

// Initialize database on startup
let dbReady = false

async function startServer() {
  try {
    await initializeDatabase()
    dbReady = true
    console.log('✓ Database initialized')
    seedDatabase()

    app.listen(PORT, () => {
      console.log(`\n✓ Invoice API Server`)
      console.log(`  Running on http://localhost:${PORT}`)
      console.log(`  API: http://localhost:${PORT}/api/invoices\n`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Middleware to check if database is ready
app.use((req, res, next) => {
  if (!dbReady) {
    return res.status(503).json({ error: 'Database not ready' })
  }
  next()
})

// Seed database with initial data
function seedDatabase() {
  const existingCompanies = companyDB.getAll()
  if (existingCompanies.length === 0) {
    companyDB.create({
      id: 'company-1',
      name: 'AEROMAXRR TEC',
      gstn: '29CKVPR3997N1ZJ',
      address: '#39, Ground Floor, Ramaiah Layout, 2nd Cross, Rajagopalanagar Main Road, Landmark: Sri Maruthi Theatre, Peeny 2nd Stage, Bengaluru, Karnataka, Pincode - 560058.',
      email: 'aeromaxrrtec@gmail.com',
      bankName: 'HDFC BANK',
      bankBranch: 'T DASARAHALLI',
      accountNo: '50200067666292',
      ifscCode: 'HDFC0001040'
    })
    companyDB.create({
      id: 'company-2',
      name: 'Aerostar Technologies',
      gstn: '29ACBFA5366Q1ZR',
      address: 'Peenya Industrial Area, Bengaluru, Karnataka',
      email: 'info@aerostar.com',
      bankName: '',
      bankBranch: '',
      accountNo: '',
      ifscCode: ''
    })
    console.log('✓ Database seeded with sample companies')
  }

  const existingInvoices = invoiceDB.getAll()
  if (existingInvoices.length === 0) {
    const sampleInvoice = {
      id: '1707001200000',
      number: '25-26/AM/INV-006',
      clientName: 'Aerostar Technologies',
      clientAddress: '#1,4th Cross, Doddanna Indl., Peenya 2nd Stage, BENGALURU, PinCode - 560091',
      clientGSTN: '29ACBFA5366Q1ZR',
      dcNumber: '25-26/AM/DC-007',
      poNumber: '21',
      goodsService: 'Service',
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      dueDate: '2026-03-04',
      status: 'Sent',
      notes: 'Tax Invoice - AEROMAXRR TEC Manufacturing Services',
      createdAt: '2026-02-02T10:00:00.000Z',
      lineItems: [
        { id: '1', description: '90*X50*X40 R10 D2 DIE', hsnCode: '9988', qty: 10, rate: 1710.00, amount: 17100.00 },
        { id: '2', description: 'AXR-073-SIZE MILLING', hsnCode: '9988', qty: 130, rate: 25.00, amount: 3250.00 },
        { id: '3', description: '104-5000324/235 TOP & BOTTOM-300 SET OP-10,PO30', hsnCode: '9988', qty: 300, rate: 282.00, amount: 84600.00 },
        { id: '4', description: 'AWTI-GYD-5-1-011', hsnCode: '9988', qty: 4, rate: 1700.00, amount: 6800.00 },
        { id: '5', description: '4501510604 FC GB FLAT', hsnCode: '9988', qty: 2, rate: 2670.00, amount: 5340.00 },
        { id: '6', description: 'AWTI-OLW-8-0-023', hsnCode: '9988', qty: 8, rate: 800.00, amount: 6400.00 },
        { id: '7', description: 'AWTI-BPH-8-015', hsnCode: '9988', qty: 1, rate: 1612.00, amount: 1612.00 },
        { id: '8', description: 'AWTI-OLW-8-0-022', hsnCode: '9988', qty: 1, rate: 2070.00, amount: 2070.00 },
        { id: '9', description: 'AWTI-OLW-8-0-021', hsnCode: '9988', qty: 1, rate: 2480.00, amount: 2480.00 },
        { id: '10', description: 'KEY -956A3204P05', hsnCode: '9988', qty: 8, rate: 3170.00, amount: 25360.00 }
      ]
    }

    invoiceDB.create(sampleInvoice)
    console.log('✓ Database seeded with sample invoice')
  }
}

// Routes

// --- COMPANIES API ---

app.get('/api/companies', (req, res) => {
  try {
    const companies = companyDB.getAll()
    res.json(companies)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/companies', (req, res) => {
  try {
    const { name, address } = req.body
    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' })
    }
    const created = companyDB.create(req.body)
    res.status(201).json(created)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/companies/:id', (req, res) => {
  try {
    const company = companyDB.getById(req.params.id)
    if (!company) {
      return res.status(404).json({ error: 'Company not found' })
    }
    const updated = companyDB.update(req.params.id, req.body)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/companies/:id', (req, res) => {
  try {
    const company = companyDB.getById(req.params.id)
    if (!company) {
      return res.status(404).json({ error: 'Company not found' })
    }
    companyDB.delete(req.params.id)
    res.json({ message: 'Company deleted', id: req.params.id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// --- SERVICE MASTER API ---

app.get('/api/services', (req, res) => {
  try {
    const services = serviceDB.getAll()
    res.json(services)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/services', (req, res) => {
  try {
    const created = serviceDB.create(req.body)
    res.status(201).json(created)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/services/:id', (req, res) => {
  try {
    const updated = serviceDB.update(req.params.id, req.body)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/services/:id', (req, res) => {
  try {
    serviceDB.delete(req.params.id)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// --- INVOICES API ---

// GET all invoices
app.get('/api/invoices', (req, res) => {
  try {
    const invoices = invoiceDB.getAll()
    res.json(invoices)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET single invoice
app.get('/api/invoices/:id', (req, res) => {
  try {
    const invoice = invoiceDB.getById(req.params.id)
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }
    res.json(invoice)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE invoice
app.post('/api/invoices', (req, res) => {
  try {
    const { number, clientName, clientAddress, clientGSTN, dcNumber, poNumber, goodsService, cgstRate, sgstRate, igstRate, dueDate, status = 'Draft', notes = '', lineItems = [], roundOff = 0, companyName = '', companyAddress = '', companyGSTN = '', companyEmail = '' } = req.body

    if (!number || !clientName || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const invoice = {
      id: Date.now().toString(),
      number,
      clientName,
      clientAddress: clientAddress || '',
      clientGSTN: clientGSTN || '',
      dcNumber: dcNumber || '',
      poNumber: poNumber || '',
      goodsService: goodsService || 'Service',
      cgstRate: cgstRate || 9,
      sgstRate: sgstRate || 9,
      igstRate: igstRate || 18,
      dueDate,
      status,
      notes,
      createdAt: new Date().toISOString(),
      lineItems,
      roundOff: typeof roundOff === 'number' ? roundOff : parseFloat(roundOff) || 0,
      companyName: companyName || '',
      companyAddress: companyAddress || '',
      companyGSTN: companyGSTN || '',
      companyEmail: companyEmail || ''
    }

    const created = invoiceDB.create(invoice)
    res.status(201).json(created)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE invoice
app.put('/api/invoices/:id', (req, res) => {
  try {
    const invoice = invoiceDB.getById(req.params.id)
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Ensure roundOff is a number if present
    const updateData = { ...req.body }
    if (updateData.roundOff !== undefined) {
      updateData.roundOff = typeof updateData.roundOff === 'number' ? updateData.roundOff : parseFloat(updateData.roundOff) || 0
    }
    // Ensure company fields are present
    updateData.companyName = updateData.companyName || ''
    updateData.companyAddress = updateData.companyAddress || ''
    updateData.companyGSTN = updateData.companyGSTN || ''
    updateData.companyEmail = updateData.companyEmail || ''
    const updated = invoiceDB.update(req.params.id, updateData)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// UPDATE invoice status
app.patch('/api/invoices/:id/status', (req, res) => {
  try {
    const { status } = req.body
    if (!status) {
      return res.status(400).json({ error: 'Status is required' })
    }

    const invoice = invoiceDB.getById(req.params.id)
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const updated = invoiceDB.updateStatus(req.params.id, status)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE invoice
app.delete('/api/invoices/:id', (req, res) => {
  try {
    const invoice = invoiceDB.getById(req.params.id)
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    invoiceDB.delete(req.params.id)
    res.json({ message: 'Invoice deleted', id: req.params.id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// EXPORT invoice as PDF
app.get('/api/invoices/:id/export/pdf', async (req, res) => {
  try {
    const invoice = invoiceDB.getById(req.params.id)
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const pdfBuffer = await generatePDF(invoice)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.number}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// EXPORT invoice as Excel
app.get('/api/invoices/:id/export/excel', async (req, res) => {
  try {
    const invoice = invoiceDB.getById(req.params.id)
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const excelBuffer = await generateExcel(invoice)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.number}.xlsx"`)
    res.send(excelBuffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// EXPORT all invoices as Excel Report
app.get('/api/invoices/export/report', async (req, res) => {
  try {
    const invoices = invoiceDB.getAll()
    const excelBuffer = await generateReportExcel(invoices)
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="Invoice-Report.xlsx"')
    res.send(excelBuffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Invoice API is running' })
})

// UPLOAD logo
app.post('/api/logo/upload', upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    res.json({ 
      message: 'Logo uploaded successfully',
      logoUrl: `/logos/company-logo${getFileExtension(req.file.originalname)}`
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET logo
app.get('/api/logo', (req, res) => {
  try {
    const logoPath = join(__dirname, 'public', 'logos')
    
    // Check if logo exists (company-logo.*)
    const files = readdirSync(logoPath)
    const logoFile = files.find(f => f.startsWith('company-logo'))
    
    if (!logoFile) {
      return res.status(404).json({ error: 'No logo found' })
    }
    
    res.json({ logoUrl: `/logos/${logoFile}` })
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'No logo found' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// Serve static files from the React frontend
app.use(express.static(join(__dirname, '..', 'frontend', 'dist')))

// Catch-all route to serve the React index.html
app.get('*', (req, res) => {
  // Check if the request is not for an API route
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(__dirname, '..', 'frontend', 'dist', 'index.html'))
  }
})

// Start the server
startServer()
