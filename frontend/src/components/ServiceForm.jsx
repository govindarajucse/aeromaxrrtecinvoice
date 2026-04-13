import React, { useState, useEffect } from 'react'

function ServiceForm({ services = [], onSave, onDelete, onClose }) {
  const [serviceList, setServiceList] = useState(services)
  const initialForm = { name: '', hsnCode: '', rate: 0, unit: '', taxRate: 18, description: '' }
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    setServiceList(services)
  }, [services])

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSelect = e => {
    if (e.target.value === '__new') {
      setForm(initialForm)
      return
    }
    const selected = serviceList.find(s => s.name === e.target.value)
    if (selected) setForm(selected)
    else setForm(initialForm)
  }

  const handleSubmit = e => {
    e.preventDefault()
    if (!form.name) {
      alert('Service name is required')
      return
    }
    if (onSave) onSave(form)
  }

  const handleDelete = () => {
    if (!form.id) {
        alert('Please select an existing service to delete')
        return
    }
    if (window.confirm(`Are you sure you want to delete "${form.name}"?`)) {
      if (onDelete) onDelete(form.id)
      setForm(initialForm)
    }
  }

  return (
    <div className="form-overlay">
      <div className="form-container" style={{ position: 'relative', maxWidth: '450px' }}>
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
        <h2>Manage HSN Services</h2>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
          Define the types of services you provide.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="serviceSelect">Select Service to Edit</label>
            <select id="serviceSelect" value={form.id ? form.name : ''} onChange={handleSelect}>
              <option value="">-- Add New Service --</option>
              {serviceList.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
              <option value="__new">+ Add New Service</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="name">Service Name / Category *</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              required 
              placeholder="e.g. Technical Support, Consultancy" 
            />
          </div>

          <div className="form-group">
            <label htmlFor="hsnCode">HSN/SAC Code</label>
            <input 
              type="text" 
              id="hsnCode" 
              name="hsnCode" 
              value={form.hsnCode} 
              onChange={handleChange} 
              placeholder="e.g. 998311"
            />
          </div>

          <div className="form-group">
            <label htmlFor="taxRate">Default Tax Rate (%)</label>
            <select
              id="taxRate"
              name="taxRate"
              value={form.taxRate}
              onChange={handleChange}
            >
              <option value="0">0% - Exempt</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea 
              id="description" 
              name="description" 
              value={form.description} 
              onChange={handleChange} 
              rows="2" 
              placeholder="Briefly describe the service..."
            />
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            {form.id && (
              <button type="button" className="btn btn-secondary" onClick={handleDelete} style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}>
                Delete
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ marginLeft: 'auto' }}>
              {form.id ? 'Update Service' : 'Save Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ServiceForm
