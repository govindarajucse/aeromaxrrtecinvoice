import React, { useState, useEffect } from 'react'
import InvoiceList from './components/InvoiceList'
import InvoiceForm from './components/InvoiceForm'
import CompanyForm from './components/CompanyForm'
import ServiceForm from './components/ServiceForm'

const API_URL = 'http://localhost:9999/api'

export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}

function App() {
  const [invoices, setInvoices] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [logoUrl, setLogoUrl] = useState(null)
  const [showLogoUpload, setShowLogoUpload] = useState(false)
  const [companies, setCompanies] = useState([])
  const [showCompaniesModal, setShowCompaniesModal] = useState(false)
  const [services, setServices] = useState([])
  const [showServicesModal, setShowServicesModal] = useState(false)

  // Load invoices, logo, companies and services from API on mount
  useEffect(() => {
    fetchInvoices()
    fetchLogo()
    fetchCompanies()
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_URL}/services`)
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
      const response = await fetch(url, {
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
      const response = await fetch(`${API_URL}/services/${id}`, { method: 'DELETE' })
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
      const response = await fetch(`${API_URL}/companies`)
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
      const response = await fetch(url, {
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
      const response = await fetch(`${API_URL}/companies/${id}`, { method: 'DELETE' })
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
      const response = await fetch(`${API_URL}/logo`)
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
      const response = await fetch(`${API_URL}/invoices`)
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
      const response = await fetch(`${API_URL}/invoices`, {
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
      const response = await fetch(`${API_URL}/invoices/${updatedInvoice.id}`, {
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
      const response = await fetch(`${API_URL}/invoices/${id}`, {
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
      const response = await fetch(`${API_URL}/invoices/${id}/status`, {
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
      const response = await fetch(`${API_URL}/logo/upload`, {
        method: 'POST',
        body: formData
      })
      if (!response.ok) throw new Error('Failed to upload logo')
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
      const response = await fetch(`${API_URL}/invoices/export/report`)
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          {logoUrl ? (
            <img src={logoUrl} alt="Company Logo" className="company-logo" />
          ) : (
            <div className="logo-placeholder">📋</div>
          )}
          <h1>{companies.length > 0 ? `${companies[0].name} ` : ''}</h1>
          <div className="header-actions" style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowServicesModal(true)}
              title="Manage Services"
            >
              🛠️ Manage Services
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowCompaniesModal(true)}
              title="Manage Companies"
            >
              🏢 Manage Companies
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleDownloadReport}
              title="Download Excel Report"
            >
              📊 Download Report
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowLogoUpload(!showLogoUpload)}
              title={logoUrl ? "Change logo" : "Upload logo"}
            >
              {logoUrl ? '📁 Change Logo' : '📁 Upload Logo'}
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setEditingInvoice(null)
                setShowForm(true)
              }}
            >
              ➕ New Invoice
            </button>
          </div>
        </div>

        {showLogoUpload && (
          <div className="logo-upload-container" style={{ position: 'relative' }}>
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

        {loading && <div className="loading-spinner">Loading invoices...</div>}

        {showForm && (
          <InvoiceForm
            invoice={editingInvoice}
            onSubmit={editingInvoice ? handleUpdateInvoice : handleAddInvoice}
            onCancel={handleCloseForm}
          />
        )}

        {!loading && (
          <InvoiceList
            invoices={invoices}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onStatusChange={handleUpdateStatus}
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
  )
}

export default App
