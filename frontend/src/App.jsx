import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import InvoiceList from './components/InvoiceList'
import InvoiceForm from './components/InvoiceForm'
import CompanyForm from './components/CompanyForm'
import ServiceForm from './components/ServiceForm'
import LoginForm from './components/LoginForm'
import Dashboard from './pages/Dashboard'

const API_URL = '/api'

export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}

export function validateGSTIN(gstin) {
  if (!gstin) return true
  // GSTIN format: 15 characters, pattern: 2 digits + 13 characters
  const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return gstinPattern.test(gstin)
}

export function generateQRCodeData(invoice) {
  // Generate QR code data for GST compliance
  const qrData = {
    gstin: invoice.companyGSTN,
    invoiceNumber: invoice.number,
    invoiceDate: invoice.invoiceDate,
    invoiceValue: invoice.totalAmount,
    hsnCode: invoice.lineItems?.[0]?.hsnCode || '',
    taxAmount: invoice.totalTax
  }
  return JSON.stringify(qrData)
}

export function generateInvoiceNumber(lastInvoiceNumber, invoiceDate) {
  // Generate invoice number with financial year (FY: April-March)
  const date = new Date(invoiceDate)
  const year = date.getFullYear()
  const month = date.getMonth()
  
  // Financial year: April to March
  const fyStart = month >= 3 ? year : year - 1
  const fyEnd = month >= 3 ? year + 1 : year
  const fyCode = `${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`
  
  // Extract last sequence number from previous invoice
  let sequence = 1
  if (lastInvoiceNumber) {
    const match = lastInvoiceNumber.match(/INV\/\d{2}-\d{2}\/(\d+)/)
    if (match) {
      const lastSequence = parseInt(match[1])
      sequence = lastSequence + 1
    }
  }
  
  // Ensure sequence is at least 1 and pad to 4 digits
  sequence = Math.max(1, sequence)
  const paddedSequence = sequence.toString().padStart(4, '0')
  
  return `INV/${fyCode}/${paddedSequence}`
}

export function generateDCNumber(lastDCNumber, invoiceDate) {
  // Generate DC number with financial year (FY: April-March)
  const date = new Date(invoiceDate)
  const year = date.getFullYear()
  const month = date.getMonth()
  
  // Financial year: April to March
  const fyStart = month >= 3 ? year : year - 1
  const fyEnd = month >= 3 ? year + 1 : year
  const fyCode = `${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`
  
  // Extract last sequence number from previous DC
  let sequence = 1
  if (lastDCNumber) {
    const match = lastDCNumber.match(/DC\/\d{2}-\d{2}\/(\d+)/)
    if (match) {
      const lastSequence = parseInt(match[1])
      sequence = lastSequence + 1
    }
  }
  
  // Ensure sequence is at least 1 and pad to 4 digits
  sequence = Math.max(1, sequence)
  const paddedSequence = sequence.toString().padStart(4, '0')
  
  return `DC/${fyCode}/${paddedSequence}`
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('auth_token'))
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('auth_user')))
  const [invoices, setInvoices] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [logoUrl, setLogoUrl] = useState(null)
  const [showLogoUpload, setShowLogoUpload] = useState(false)
  const [showLogoMenu, setShowLogoMenu] = useState(false)
  const [logoPosition, setLogoPosition] = useState({ top: 0, left: 0 })
  const logoContainerRef = React.useRef(null)
  const [showCompaniesModal, setShowCompaniesModal] = useState(false)
  const [services, setServices] = useState([])
  const [showServicesModal, setShowServicesModal] = useState(false)

  // Helper for authenticated requests
  const authFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
    
    const response = await fetch(url, { ...options, headers })
    
    if (response.status === 401 || response.status === 403) {
      handleLogout()
      throw new Error('Session expired. Please log in again.')
    }
    
    return response
  }

  // Load data on mount or when token changes
  useEffect(() => {
    if (token) {
      fetchInvoices()
      fetchLogo()
      fetchCompanies()
      fetchServices()
    }
  }, [token])

  // Calculate logo position for menu
  useEffect(() => {
    if (showLogoMenu && logoContainerRef.current) {
      const rect = logoContainerRef.current.getBoundingClientRect()
      setLogoPosition({
        top: rect.bottom + 8,
        left: rect.left
      })
    }
  }, [showLogoMenu])

  const handleLogin = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('auth_user', JSON.stringify(newUser))
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  const fetchServices = async () => {
    try {
      const response = await authFetch(`${API_URL}/services`)
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (err) {
      console.error('Error fetching services:', err)
    }
  }

  const handleServiceSave = async (service) => {
    try {
      const method = service.id ? 'PUT' : 'POST'
      const url = service.id ? `${API_URL}/services/${service.id}` : `${API_URL}/services`
      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service)
      })
      if (!response.ok) throw new Error('Failed to save service')
      await fetchServices()
      setShowServicesModal(false)
      alert('Service saved successfully!')
    } catch (err) {
      alert('Error saving service: ' + err.message)
    }
  }

  const handleServiceDelete = async (id) => {
    try {
      const response = await authFetch(`${API_URL}/services/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete service')
      await fetchServices()
      setShowServicesModal(false)
      alert('Service deleted successfully!')
    } catch (err) {
      alert('Error deleting service: ' + err.message)
    }
  }

  const fetchCompanies = async () => {
    try {
      const response = await authFetch(`${API_URL}/companies`)
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
      }
    } catch (err) {
      console.error('Error fetching companies:', err)
    }
  }

  const handleCompanySave = async (company) => {
    try {
      const method = company.id ? 'PUT' : 'POST'
      const url = company.id ? `${API_URL}/companies/${company.id}` : `${API_URL}/companies`
      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      })
      if (!response.ok) throw new Error('Failed to save company')
      await fetchCompanies()
      setShowCompaniesModal(false)
      alert('Company saved successfully!')
    } catch (err) {
      alert('Error saving company: ' + err.message)
    }
  }

  const handleCompanyDelete = async (id) => {
    try {
      const response = await authFetch(`${API_URL}/companies/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete company')
      await fetchCompanies()
      setShowCompaniesModal(false)
      alert('Company deleted successfully!')
    } catch (err) {
      alert('Error deleting company: ' + err.message)
    }
  }

  const fetchLogo = async () => {
    try {
      const response = await authFetch(`${API_URL}/logo`)
      if (response.ok) {
        const data = await response.json()
        setLogoUrl(data.logoUrl || null)
      }
    } catch (err) {
      console.error('Error fetching logo:', err)
      setLogoUrl(null)
    }
  }

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await authFetch(`${API_URL}/invoices`)
      if (!response.ok) throw new Error('Failed to fetch invoices')
      const data = await response.json()
      setInvoices(data)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddInvoice = async (invoice) => {
    try {
      const response = await authFetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      })
      if (!response.ok) throw new Error('Failed to create invoice')
      await fetchInvoices()
      setShowForm(false)
    } catch (err) {
      setError(err.message)
      alert('Error creating invoice: ' + err.message)
    }
  }

  const handleUpdateInvoice = async (updatedInvoice) => {
    try {
      const response = await authFetch(`${API_URL}/invoices/${updatedInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInvoice)
      })
      if (!response.ok) throw new Error('Failed to update invoice')
      await fetchInvoices()
      setEditingInvoice(null)
      setShowForm(false)
    } catch (err) {
      setError(err.message)
      alert('Error updating invoice: ' + err.message)
    }
  }

  const handleDeleteInvoice = async (id) => {
    try {
      const response = await authFetch(`${API_URL}/invoices/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete invoice')
      await fetchInvoices()
    } catch (err) {
      setError(err.message)
      alert('Error deleting invoice: ' + err.message)
    }
  }

  const handleUpdateStatus = async (id, status) => {
    try {
      const response = await authFetch(`${API_URL}/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!response.ok) throw new Error('Failed to update status')
      await fetchInvoices()
    } catch (err) {
      setError(err.message)
      alert('Error updating status: ' + err.message)
    }
  }

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingInvoice(null)
  }

  const handleLogoUpload = async (file) => {
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const response = await authFetch(`${API_URL}/logo/upload`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        let errorMsg = 'Failed to upload logo'
        try {
          const errorData = await response.json()
          errorMsg = errorData.error || errorMsg
        } catch (e) {
          errorMsg = response.statusText || errorMsg
        }
        throw new Error(errorMsg)
      }

      const data = await response.json()
      setLogoUrl(data.logoUrl)
      setShowLogoUpload(false)
      alert('Logo uploaded successfully!')
    } catch (err) {
      alert('Error uploading logo: ' + err.message)
    }
  }

  const handleDownloadReport = async () => {
    try {
      const response = await authFetch(`${API_URL}/invoices/export/report`)
      if (!response.ok) throw new Error('Failed to download report')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice-Report-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Error downloading report: ' + err.message)
    }
  }

  if (!token) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <Router>
      <div className="app">
        <div className="app-content">
          <header className="app-header">
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative', overflow: 'visible' }} ref={logoContainerRef}>
              <div 
                className="logo-container"
                onClick={() => setShowLogoMenu(!showLogoMenu)}
                style={{ cursor: 'pointer' }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Company Logo" className="company-logo" />
                ) : (
                  <div className="logo-placeholder">📋</div>
                )}
              </div>
              {showLogoMenu && createPortal(
                <div className="logo-menu" style={{
                  position: 'fixed',
                  top: logoPosition.top,
                  left: logoPosition.left,
                  zIndex: 10000
                }}>
                  <button
                    className="logo-menu-option"
                    onClick={() => {
                      setShowLogoMenu(false)
                      setShowLogoUpload(true)
                    }}
                  >
                    📁 Change Logo
                  </button>
                  {logoUrl && (
                    <button
                      className="logo-menu-option"
                      onClick={async () => {
                        setShowLogoMenu(false)
                        try {
                          await authFetch(`${API_URL}/logo`, { method: 'DELETE' })
                          setLogoUrl(null)
                          alert('Logo removed successfully!')
                        } catch (err) {
                          alert('Error removing logo: ' + err.message)
                        }
                      }}
                    >
                      🗑️ Remove Logo
                    </button>
                  )}
                </div>,
                document.body
              )}
            </div>
            <div>
              <h1>{'Invoice App'}</h1>
            </div>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowServicesModal(true)}
              title="Manage HSN Codes"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              🛠️ HSN
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleDownloadReport}
              title="Download Excel Report"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              📊 Report
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setEditingInvoice(null)
                setShowForm(true)
              }}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              ➕ New Invoice
            </button>
            <button 
              className="btn btn-secondary user-badge-btn"
              onClick={handleLogout}
              title="Click to logout"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              👤 {user?.username}
            </button>
          </div>
        </div>

        {showLogoUpload && (
          <div className="logo-upload-container" style={{ position: 'relative', paddingRight: '80px' }}>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowLogoUpload(false)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'transparent',
                border: 'none',
                fontSize: 22,
                cursor: 'pointer',
                color: '#888',
                zIndex: 10
              }}
            >
              ×
            </button>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleLogoUpload(e.target.files[0])
                }
              }}
            />
            <button onClick={() => setShowLogoUpload(false)}>Cancel</button>
          </div>
        )}
      </header>

      <main className="app-main">
        {error && (
          <div className="error-message">
            ⚠️ {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {loading && <div className="loading-spinner">Loading dashboard layer...</div>}

        {!loading && (
          <Routes>
            <Route path="/" element={
              <Dashboard
                token={token}
                invoices={invoices}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                onStatusChange={handleUpdateStatus}
              />
            } />
            <Route path="*" element={
              <Dashboard
                token={token}
                invoices={invoices}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                onStatusChange={handleUpdateStatus}
              />
            } />
          </Routes>
        )}

        {showForm && (
          <InvoiceForm
            invoice={editingInvoice}
            token={token}
            onSubmit={editingInvoice ? handleUpdateInvoice : handleAddInvoice}
            onCancel={handleCloseForm}
          />
        )}
      </main>

      {showCompaniesModal && (
        <CompanyForm 
          companies={companies}
          onSave={handleCompanySave}
          onDelete={handleCompanyDelete}
          onClose={() => setShowCompaniesModal(false)}
        />
      )}

      {showServicesModal && (
        <ServiceForm 
          services={services}
          onSave={handleServiceSave}
          onDelete={handleServiceDelete}
          onClose={() => setShowServicesModal(false)}
        />
      )}
        </div>
      </div>
    </Router>
  )
}

export default App
