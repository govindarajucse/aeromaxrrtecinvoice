import React, { useState, useEffect } from 'react'

function CompanyForm({ companies = [], onSave, onDelete, onClose }) {
  const [companyList, setCompanyList] = useState(companies)
  const initialForm = { name: '', type: 'Client', gstn: '', address: '', email: '', bankName: '', bankBranch: '', accountNo: '', ifscCode: '' }
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    setCompanyList(companies)
  }, [companies])

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSelect = e => {
    if (e.target.value === '__new') {
      setForm(initialForm)
      return
    }
    const selected = companyList.find(c => c.name === e.target.value)
    if (selected) setForm(selected)
    else setForm(initialForm)
  }

  const handleSubmit = e => {
    e.preventDefault()
    if (!form.name || !form.address) {
      alert('Company name and address are required')
      return
    }
    if (onSave) onSave(form)
  }

  const handleDelete = () => {
    if (!form.id) {
        alert('Please select an existing company to delete')
        return
    }
    if (window.confirm(`Are you sure you want to delete "${form.name}"?`)) {
      if (onDelete) onDelete(form.id)
      setForm(initialForm)
    }
  }

  return (
    <div className="form-overlay">
      <div className="form-container" style={{ position: 'relative', maxWidth: '500px' }}>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
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
        <h2>Manage My Companies</h2>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
          Add or edit your business profiles here. These will be available in the invoice dropdown.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="companySelect">Select Company to Edit</label>
            <select id="companySelect" value={form.id ? form.name : ''} onChange={handleSelect}>
              <option value="">-- Start Fresh / Add New --</option>
              {companyList.map(c => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
              <option value="__new">+ Add New Company</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
                <label htmlFor="type">Company Type</label>
                <select id="type" name="type" value={form.type || 'Client'} onChange={handleChange}>
                    <option value="Client">Client / Customer</option>
                    <option value="Own">My Business (Own)</option>
                </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="name">Company Name *</label>
              <input type="text" id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="gstn">GSTN</label>
              <input type="text" id="gstn" name="gstn" value={form.gstn} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" value={form.email || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address *</label>
            <textarea id="address" name="address" value={form.address} onChange={handleChange} required rows="2" style={{ resize: 'vertical' }} />
          </div>

          <fieldset style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px', marginBottom: '15px' }}>
            <legend style={{ padding: '0 5px', fontSize: '0.9rem', fontWeight: 'bold' }}>Bank Details</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label htmlFor="bankName">Bank Name</label>
                <input type="text" id="bankName" name="bankName" value={form.bankName || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="bankBranch">Branch</label>
                <input type="text" id="bankBranch" name="bankBranch" value={form.bankBranch || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="accountNo">Account No</label>
                <input type="text" id="accountNo" name="accountNo" value={form.accountNo || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="ifscCode">IFSC Code</label>
                <input type="text" id="ifscCode" name="ifscCode" value={form.ifscCode || ''} onChange={handleChange} />
              </div>
            </div>
          </fieldset>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            {form.id && (
              <button type="button" className="btn btn-secondary" onClick={handleDelete} style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}>
                Delete
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ marginLeft: 'auto' }}>
              {form.id ? 'Update Company' : 'Save New Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CompanyForm

