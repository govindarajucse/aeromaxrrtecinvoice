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

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✓ Invoice API Server`)
      console.log(`  Listening on port: ${PORT} (0.0.0.0)`)
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
    cb(null, logosDir)
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

// Request Logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
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

// --- API ROUTES ---

// Simple Health Test
app.get('/api/test-server', (req, res) => {
  res.json({ status: 'success', message: 'Server is alive', date: new Date().toISOString() });
});

// Auth API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`[AUTH] Login attempt for: ${username}`);
    const user = userDB.findByUsername(username);

    if (!user) {
      console.warn(`[AUTH] User not found: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`[AUTH] Wrong password for: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = { id: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    console.log(`[AUTH] ✅ Login successful: ${username}`);
    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (error) {
    console.error(`[AUTH] ❌ Login error:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Required fields missing' });
    
    const existingUser = userDB.findByUsername(username);
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = userDB.create({ id: Date.now().toString(), username, password: hashedPassword, role: 'admin' });
    res.status(201).json({ message: 'User registered', username: user.username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Companies API
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
    if (!name || !address) return res.status(400).json({ error: 'Name and address are required' })
    const created = companyDB.create(req.body)
    res.status(201).json(created)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/companies/:id', authenticateToken, (req, res) => {
  try {
    const company = companyDB.getById(req.params.id)
    if (!company) return res.status(404).json({ error: 'Company not found' })
    const updated = companyDB.update(req.params.id, req.body)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/companies/:id', authenticateToken, (req, res) => {
  try {
    const company = companyDB.getById(req.params.id)
    if (!company) return res.status(404).json({ error: 'Company not found' })
    companyDB.delete(req.params.id)
    res.json({ message: 'Company deleted', id: req.params.id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Services API
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

// Invoices API
app.get('/api/invoices', authenticateToken, (req, res) => {
  try {
    const invoices = invoiceDB.getAll()
    res.json(invoices)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/invoices/:id', authenticateToken, (req, res) => {
  try {
    const invoice = invoiceDB.getById(req.params.id)
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
    res.json(invoice)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/invoices', authenticateToken, (req, res) => {
  try {
    const { number, clientName, dueDate } = req.body
    if (!number || !clientName || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const invoice = {
      ...req.body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      roundOff: parseFloat(req.body.roundOff) || 0
    }

    const created = invoiceDB.create(invoice)
    res.status(201).json(created)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/invoices/:id', authenticateToken, (req, res) => {
  try {
    const invoice = invoiceDB.getById(req.params.id)
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

    const updateData = {
      ...req.body,
      roundOff: parseFloat(req.body.roundOff) || 0
    }
    const updated = invoiceDB.update(req.params.id, updateData)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.patch('/api/invoices/:id/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body
    if (!status) return res.status(400).json({ error: 'Status is required' })
    const updated = invoiceDB.updateStatus(req.params.id, status)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/invoices/:id', authenticateToken, (req, res) => {
  try {
    invoiceDB.delete(req.params.id)
    res.json({ message: 'Invoice deleted', id: req.params.id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Export API
app.get('/api/invoices/:id/export/pdf', authenticateToken, async (req, res) => {
  try {
    const invoice = invoiceDB.getById(req.params.id)
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
    const pdfBuffer = await generatePDF(invoice)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.number}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/invoices/:id/export/excel', authenticateToken, async (req, res) => {
  try {
    const invoice = invoiceDB.getById(req.params.id)
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
    const excelBuffer = await generateExcel(invoice)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.number}.xlsx"`)
    res.send(excelBuffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

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

// Logo API
app.post('/api/logo/upload', authenticateToken, (req, res) => {
  upload.single('logo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: `Upload error: ${err.message}` })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    res.json({ message: 'Logo uploaded successfully', logoUrl: `/logos/${req.file.filename}` })
  })
})

app.get('/api/logo', authenticateToken, (req, res) => {
  try {
    const logoFiles = readdirSync(logosDir)
    const logoFile = logoFiles.find(f => f.startsWith('company-logo'))
    if (!logoFile) return res.status(404).json({ error: 'No logo found' })
    res.json({ logoUrl: `/logos/${logoFile}` })
  } catch (error) {
    res.status(404).json({ error: 'No logo found' })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Invoice API is running' })
})

// Global API 404 Handler (Avoid serving HTML for missing API routes)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API route not found',
    path: req.path,
    method: req.method
  })
})

// Error-handling middleware for API (Always returns JSON)
app.use('/api', (err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    type: 'API_ERROR'
  });
});

// Serve frontend static files
app.use(express.static(staticPath))

// Catch-all route for SPA (Avoid intercepting /api)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(staticPath, 'index.html'))
  }
})

startServer()
