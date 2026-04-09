import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readdirSync, existsSync, mkdirSync } from 'fs'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { invoiceDB, companyDB, serviceDB, userDB, initializeDatabase } from './db.js'
import { generatePDF, generateExcel, generateReportExcel } from './export.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const JWT_SECRET = process.env.JWT_SECRET || 'aeromaxrr-secret-key-2026'

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' })
    }
    req.user = user
    next()
  })
}

// Ensure public/logos directory exists
const logosDir = join(__dirname, 'public', 'logos')
if (!existsSync(logosDir)) {
  mkdirSync(logosDir, { recursive: true })
}

// Resilient Static Path Detection for Render
function getStaticPath() {
  const cwd = process.cwd();
  const paths = [
    join(cwd, 'frontend', 'dist'),              // Root layout
    join(cwd, '..', 'frontend', 'dist'),        // Sub-folder layout (Render Root Dir: server)
    join(cwd, 'dist'),                          // Monolithic build
    join(__dirname, '..', 'frontend', 'dist'),  // ESM path resolution
    '/opt/render/project/src/frontend/dist'     // Explicit Render environment
  ];

  console.log('🔍 Searching for frontend in:');
  paths.forEach(p => console.log(`   - ${p}`));

  for (const p of paths) {
    const indexPath = join(p, 'index.html');
    if (existsSync(indexPath)) {
      console.log(`✅ Found index.html at: ${p}`);
      return p;
    }
  }

  console.warn('❌ index.html not found in any standard location.');
  return paths[0];
}

const staticPath = getStaticPath();

console.log(`✓ Static files path: ${staticPath}`)
console.log(`✓ index.html exists: ${existsSync(join(staticPath, 'index.html'))}`)

const app = express()
const PORT = process.env.PORT || 9999

let dbReady = false

async function seedUser() {
  try {
    const users = userDB.getAll()
    if (users.length === 0) {
      console.log('--- Initial Setup: Seeding Default User ---')
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash('adminpassword', salt)
      userDB.create({
        id: 'admin',
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      })
      console.log('✓ Default admin user created')
      console.log('  Username: admin')
      console.log('  Password: adminpassword')
      console.log('-------------------------------------------')
    }
  } catch (error) {
    console.error('Error seeding user:', error)
  }
}

async function startServer() {
  try {
    await initializeDatabase()
    dbReady = true
    console.log('✓ Database initialized')

    // Seed default admin user if none exists
    await seedUser()

    app.listen(PORT, () => {
      console.log(`\n✓ Invoice API Server`)
      console.log(`  Listening on port: ${PORT}`)
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}\n`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

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

// --- HYPER-VERBOSE LOGGING FOR RENDER DEBUGGING ---
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  if (req.path.startsWith('/api')) {
    console.log(`   > API Call detected. Payload keys: ${Object.keys(req.body || {}).join(', ') || 'none'}`);
  }
  next();
});

// Middleware to check if database is ready
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && !dbReady) {
    console.error(`❌ API blocked: Database not ready for ${req.path}`);
    return res.status(503).json({ error: 'Database not ready' });
  }
  next();
});

// --- API ROUTES START HERE ---
// (The rest of the file defines the actual routes)


// --- DEBUG ENDPOINT (Temporary) ---
app.get('/api/debug-files', (req, res) => {
  try {
    const cwd = process.cwd();
    const rootFiles = readdirSync(cwd);
    let frontendFiles = [];
    let distFiles = [];

    if (rootFiles.includes('frontend')) {
      frontendFiles = readdirSync(join(cwd, 'frontend'));
      if (frontendFiles.includes('dist')) {
        distFiles = readdirSync(join(cwd, 'frontend', 'dist'));
      }
    }

    res.json({
      cwd,
      __dirname,
      rootFiles,
      frontendFiles,
      distFiles,
      staticPath,
      indexExists: existsSync(join(staticPath, 'index.html'))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
      igstRate: 0,
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

// --- AUTH API ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    const existingUser = userDB.findByUsername(username)
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = userDB.create({
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      role: 'admin'
    })

    res.status(201).json({ message: 'User registered successfully', username: user.username })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const user = userDB.findByUsername(username)

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const payload = { id: user.id, username: user.username, role: user.role }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' })

    res.json({ token, user: { username: user.username, role: user.role } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// --- COMPANIES API ---

app.get('/api/companies', authenticateToken, (req, res) => {
  try {
    const companies = companyDB.getAll()
    res.json(companies)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/companies', authenticateToken, (req, res) => {
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

app.put('/api/companies/:id', authenticateToken, (req, res) => {
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

app.delete('/api/companies/:id', authenticateToken, (req, res) => {
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

app.get('/api/services', authenticateToken, (req, res) => {
  try {
    const services = serviceDB.getAll()
    res.json(services)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/services', authenticateToken, (req, res) => {
  try {
    const created = serviceDB.create(req.body)
    res.status(201).json(created)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/services/:id', authenticateToken, (req, res) => {
  try {
    const updated = serviceDB.update(req.params.id, req.body)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/services/:id', authenticateToken, (req, res) => {
  try {
    serviceDB.delete(req.params.id)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// --- INVOICES API ---

// GET all invoices
app.get('/api/invoices', authenticateToken, (req, res) => {
  try {
    const invoices = invoiceDB.getAll()
    res.json(invoices)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET single invoice
app.get('/api/invoices/:id', authenticateToken, (req, res) => {
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
app.post('/api/invoices', authenticateToken, (req, res) => {
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
      igstRate: igstRate || 0,
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
app.put('/api/invoices/:id', authenticateToken, (req, res) => {
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
app.patch('/api/invoices/:id/status', authenticateToken, (req, res) => {
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
app.delete('/api/invoices/:id', authenticateToken, (req, res) => {
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
app.get('/api/invoices/:id/export/pdf', authenticateToken, async (req, res) => {
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
app.get('/api/invoices/:id/export/excel', authenticateToken, async (req, res) => {
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
app.get('/api/invoices/export/report', authenticateToken, async (req, res) => {
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
app.post('/api/logo/upload', authenticateToken, (req, res) => {
  upload.single('logo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer Error:', err)
      return res.status(400).json({ error: `Upload error: ${err.message}` })
    } else if (err) {
      console.error('Unknown Upload Error:', err)
      return res.status(500).json({ error: `Server error: ${err.message}` })
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }
      console.log('✓ Logo uploaded successfully:', req.file.filename)
      res.json({
        message: 'Logo uploaded successfully',
        logoUrl: `/logos/company-logo${getFileExtension(req.file.originalname)}`
      })
    } catch (error) {
      console.error('Logo process error:', error)
      res.status(500).json({ error: error.message })
    }
  })
})

// GET logo
app.get('/api/logo', authenticateToken, (req, res) => {
  try {
    const logoFiles = readdirSync(logosDir)
    const logoFile = logoFiles.find(f => f.startsWith('company-logo'))

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

// API 404 Handler (Avoid serving HTML for missing API routes)
app.use('/api/*', (req, res, next) => {
  if (req.accepts('json')) {
    res.status(404).json({ error: 'API route not found' })
  } else {
    next()
  }
})

// Serve static files from the React frontend
app.use(express.static(staticPath))

// Catch-all route to serve the React index.html
app.get('*', (req, res) => {
  // Check if the request is not for an API route
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(staticPath, 'index.html'))
  }
})

// Start the server
startServer()
