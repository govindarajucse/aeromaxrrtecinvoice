import React, { useState, useEffect } from 'react'
import CompanyForm from './CompanyForm'
import { formatINR } from '../App'

function InvoiceForm({ invoice, token, onSubmit, onCancel }) {
  // Helper to always provide a string value for inputs
  const safe = v => v === undefined || v === null ? '' : v
  const [companies, setCompanies] = useState([])
  const [services, setServices] = useState([])
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('')
  const [formData, setFormData] = useState({
    number: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    clientName: '',
    clientAddress: '',
    clientGSTN: '',
    dcNumber: '',
    poNumber: '',
    goodsService: 'Service',
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 0,
    roundOff: 0,
    lineItems: [],
    dueDate: '',
    status: 'Draft',
    notes: '',
    companyName: '',
    companyAddress: '',
    companyGSTN: '',
    companyEmail: '',
    bankName: '',
    bankBranch: '',
    accountNo: '',
    ifscCode: ''
  })

  const [newLineItem, setNewLineItem] = useState({
    description: '',
    hsnCode: '',
    qty: '',
    rate: ''
  })

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCompanies(data)
      }
    } catch (err) {
      console.error('Error fetching companies:', err)
    }
  }

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setServices(data)
      }
    } catch (err) {
      console.error('Error fetching services:', err)
    }
  }

  useEffect(() => {
    fetchCompanies()
    fetchServices()
  }, [])

  useEffect(() => {
    if (invoice && companies.length > 0) {
      // Try to match company by name from companies state
      const matchedCompany = companies.find(c => c.name === invoice.companyName)
      setSelectedCompany(matchedCompany ? matchedCompany.name : '')
      setFormData({
        ...invoice,
        lineItems: invoice.lineItems || []
      })
    } else if (invoice) {
      setFormData({
        ...invoice,
        lineItems: invoice.lineItems || []
      });
      setSelectedCompany(invoice.companyName || '');
    }
  }, [invoice, companies])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCompanySelect = (e) => {
    const selected = e.target.value
    setSelectedCompany(selected)
    const company = companies.find(c => c.name === selected)
    if (company) {
      setFormData(prev => ({
        ...prev,
        companyName: company.name,
        companyGSTN: company.gstn,
        companyAddress: company.address,
        companyEmail: company.email || '',
        bankName: company.bankName || '',
        bankBranch: company.bankBranch || '',
        accountNo: company.accountNo || '',
        ifscCode: company.ifscCode || ''
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        companyName: '',
        companyGSTN: '',
        companyAddress: '',
        companyEmail: '',
        bankName: '',
        bankBranch: '',
        accountNo: '',
        ifscCode: ''
      }))
    }
  }

  const handleCompanySave = async (company) => {
    try {
      const existing = companies.find(c => c.name === company.name)
      const method = existing ? 'PUT' : 'POST'
      const url = existing
        ? `/api/companies/${existing.id}`
        : '/api/companies'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(company)
      })
      if (!response.ok) throw new Error('Failed to save company')

      await fetchCompanies()
      setShowCompanyForm(false)

      setFormData(prev => ({
        ...prev,
        companyName: company.name,
        companyGSTN: company.gstn,
        companyAddress: company.address,
        companyEmail: company.email || '',
        bankName: company.bankName || '',
        bankBranch: company.bankBranch || '',
        accountNo: company.accountNo || '',
        ifscCode: company.ifscCode || ''
      }))
      setSelectedCompany(company.name)
    } catch (err) {
      alert('Error saving company: ' + err.message)
    }
  }

  const handleLineItemChange = (e) => {
    const { name, value } = e.target
    setNewLineItem(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const addLineItem = () => {
    if (!newLineItem.description || !newLineItem.qty || !newLineItem.rate) {
      alert('Please fill in description, quantity, and rate')
      return
    }

    const amount = parseFloat(newLineItem.qty) * parseFloat(newLineItem.rate)
    const lineItem = {
      id: Date.now().toString(),
      description: newLineItem.description,
      hsnCode: newLineItem.hsnCode || '9988',
      qty: parseFloat(newLineItem.qty),
      rate: parseFloat(newLineItem.rate),
      amount: amount
    }

    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, lineItem]
    }))

    setNewLineItem({
      description: '',
      hsnCode: '',
      qty: '',
      rate: ''
    })
  }

  const removeLineItem = (id) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id)
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.number || !formData.invoiceDate || !formData.clientName || !formData.dueDate || !formData.companyName || !formData.companyAddress) {
      alert('Please fill in invoice number, invoice date, client name, due date, company name, and company address')
      return
    }
    if (formData.lineItems.length === 0) {
      alert('Please add at least one line item')
      return
    }
    onSubmit(formData)
  }

  const subTotal = formData.lineItems.reduce((sum, item) => sum + item.amount, 0)
  const cgstAmount = (subTotal * formData.cgstRate) / 100
  const sgstAmount = (subTotal * formData.sgstRate) / 100
  const totalTax = cgstAmount + sgstAmount
  const grandTotal = subTotal + totalTax + (parseFloat(formData.roundOff) || 0)

  return (
    <div className="form-overlay">
      <div className="form-container form-container-large" style={{ position: 'relative' }}>
        <button
          type="button"
          aria-label="Close"
          onClick={onCancel}
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
        <h2>{invoice ? 'Edit Invoice' : 'New Invoice'}</h2>
        <form onSubmit={handleSubmit}>
          <fieldset style={{ border: '1px solid #ccc', marginBottom: 16, padding: 12 }}>
            <legend>Our Company Details</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="companyDropdown">Select Company</label>
                <select
                  id="companyDropdown"
                  value={safe(selectedCompany)}
                  onChange={handleCompanySelect}
                  required
                >
                  <option value="">-- Select --</option>
                  {companies.filter(c => c.type === 'Own').map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                  <option value="__new">Add New</option>
                </select>
              </div>
              <div className="form-group">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCompanyForm(true)}>
                  Manage Companies
                </button>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="clientSelect">Select Existing Client (Optional)</label>
                <select
                  id="clientSelect"
                  className="client-select"
                  onChange={(e) => {
                    const client = companies.find(c => c.name === e.target.value)
                    if (client) {
                      setFormData(prev => ({
                        ...prev,
                        clientName: client.name,
                        clientAddress: client.address,
                        clientGSTN: client.gstn
                      }))
                    }
                  }}
                >
                  <option value="">-- Choose Client --</option>
                  {companies.filter(c => c.type === 'Client').map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="clientName">Client Name *</label>
                <input type="text" id="clientName" name="clientName" value={safe(formData.clientName)} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="companyName">Company Name *</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={safe(formData.companyName)}
                  onChange={handleChange}
                  placeholder="Your Company Name"
                  required
                  readOnly={!!selectedCompany && selectedCompany !== '__new'}
                />
              </div>
              <div className="form-group">
                <label htmlFor="companyGSTN">Company GSTN</label>
                <input
                  type="text"
                  id="companyGSTN"
                  name="companyGSTN"
                  value={safe(formData.companyGSTN)}
                  onChange={handleChange}
                  placeholder="Your GSTN"
                  readOnly={!!selectedCompany && selectedCompany !== '__new'}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="companyAddress">Company Address *</label>
                <textarea
                  id="companyAddress"
                  name="companyAddress"
                  value={safe(formData.companyAddress)}
                  onChange={handleChange}
                  placeholder="Your Company Address"
                  rows="2"
                  required
                  readOnly={!!selectedCompany && selectedCompany !== '__new'}
                />
              </div>
              <div className="form-group">
                <label htmlFor="companyEmail">Company Email</label>
                <input
                  type="email"
                  id="companyEmail"
                  name="companyEmail"
                  value={safe(formData.companyEmail)}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  readOnly={!!selectedCompany && selectedCompany !== '__new'}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bankName">Bank Name</label>
                <input
                  type="text"
                  id="bankName"
                  name="bankName"
                  value={safe(formData.bankName)}
                  onChange={handleChange}
                  placeholder="Bank Name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="bankBranch">Branch</label>
                <input
                  type="text"
                  id="bankBranch"
                  name="bankBranch"
                  value={safe(formData.bankBranch)}
                  onChange={handleChange}
                  placeholder="Branch"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="accountNo">Account No</label>
                <input
                  type="text"
                  id="accountNo"
                  name="accountNo"
                  value={safe(formData.accountNo)}
                  onChange={handleChange}
                  placeholder="Account Number"
                />
              </div>
              <div className="form-group">
                <label htmlFor="ifscCode">IFSC Code</label>
                <input
                  type="text"
                  id="ifscCode"
                  name="ifscCode"
                  value={safe(formData.ifscCode)}
                  onChange={handleChange}
                  placeholder="IFSC Code"
                />
              </div>
            </div>
          </fieldset>
          {showCompanyForm && (
            <CompanyForm
              companies={companies}
              onSave={handleCompanySave}
              onDelete={async (id) => {
                await fetch(`/api/companies/${id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                await fetchCompanies();
              }}
              onClose={() => setShowCompanyForm(false)}
            />
          )}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="number">Invoice Number *</label>
              <input
                type="text"
                id="number"
                name="number"
                value={safe(formData.number)}
                onChange={handleChange}
                placeholder="INV-001"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="invoiceDate">Invoice Date *</label>
              <input
                type="date"
                id="invoiceDate"
                name="invoiceDate"
                value={safe(formData.invoiceDate)}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dueDate">Due Date *</label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={safe(formData.dueDate)}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dcNumber">Your DC No</label>
              <input
                type="text"
                id="dcNumber"
                name="dcNumber"
                value={safe(formData.dcNumber)}
                onChange={handleChange}
                placeholder="25-26/AM/DC-007"
              />
            </div>

            <div className="form-group">
              <label htmlFor="poNumber">PO No *</label>
              <input
                type="text"
                id="poNumber"
                name="poNumber"
                value={safe(formData.poNumber)}
                onChange={handleChange}
                placeholder="21"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="goodsService">Service Category</label>
              <select
                id="goodsService"
                name="goodsService"
                value={safe(formData.goodsService)}
                onChange={handleChange}
              >
                <option value="">-- Choose Category --</option>
                {services.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clientCompany">Client Company *</label>
            <select
              id="clientCompany"
              name="clientCompany"
              value={safe(formData.clientName)}
              onChange={e => {
                const selected = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  clientName: selected,
                  clientAddress: (companies.find(c => c.name === selected)?.address) || '',
                  clientGSTN: (companies.find(c => c.name === selected)?.gstn) || ''
                }));
              }}
              required
            >
              <option value="">-- Select --</option>
              {companies.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
              <option value="Other">Other / Add new company</option>
            </select>
          </div>

          {formData.clientName === 'Other' && (
            <div className="form-group">
              <label htmlFor="clientName">Client Name *</label>
              <input
                type="text"
                id="clientName"
                name="clientName"
                value={safe(formData.clientName)}
                onChange={handleChange}
                placeholder="Client Name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="clientAddress">Bill To Address</label>
            <textarea
              id="clientAddress"
              name="clientAddress"
              value={safe(formData.clientAddress)}
              onChange={handleChange}
              placeholder="Company Address"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label htmlFor="clientGSTN">Bill To GSTIN</label>
            <input
              type="text"
              id="clientGSTN"
              name="clientGSTN"
              value={safe(formData.clientGSTN)}
              onChange={handleChange}
              placeholder="29ACBFA5366Q1ZR"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cgstRate">CGST Rate (%)</label>
              <input
                type="number"
                id="cgstRate"
                name="cgstRate"
                value={safe(formData.cgstRate)}
                onChange={handleChange}
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="sgstRate">SGST Rate (%)</label>
              <input
                type="number"
                id="sgstRate"
                name="sgstRate"
                value={safe(formData.sgstRate)}
                onChange={handleChange}
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="igstRate">IGST Rate (%)</label>
              <input
                type="number"
                id="igstRate"
                name="igstRate"
                value={safe(formData.igstRate)}
                onChange={handleChange}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <h3>Line Items</h3>
          <div className="line-items-section">
            <div className="line-item-form">
              <div className="form-group small">
                <label>Description *</label>
                <input
                  type="text"
                  name="description"
                  value={safe(newLineItem.description)}
                  onChange={handleLineItemChange}
                  placeholder="Item description"
                />
              </div>

              <div className="form-group small">
                <label>HSN Code</label>
                <input
                  type="text"
                  name="hsnCode"
                  value={safe(newLineItem.hsnCode)}
                  onChange={handleLineItemChange}
                  placeholder="9988"
                />
              </div>

              <div className="form-group small">
                <label>Qty *</label>
                <input
                  type="number"
                  name="qty"
                  value={safe(newLineItem.qty)}
                  onChange={handleLineItemChange}
                  step="0.01"
                  min="0"
                  placeholder="0"
                />
              </div>

              <div className="form-group small">
                <label>Rate (₹) *</label>
                <input
                  type="number"
                  name="rate"
                  value={safe(newLineItem.rate)}
                  onChange={handleLineItemChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={addLineItem}
              >
                Add Item
              </button>
            </div>

            {formData.lineItems.length > 0 && (
              <div className="line-items-table">
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>HSN Code</th>
                      <th>Qty</th>
                      <th>Rate (₹)</th>
                      <th>Amount (₹)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.hsnCode}</td>
                        <td>{item.qty}</td>
                        <td>{item.rate.toFixed(2)}</td>
                        <td>{item.amount.toFixed(2)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-icon-small btn-delete"
                            onClick={() => removeLineItem(item.id)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="tax-summary">
              <div className="summary-row">
                <span>Sub Total:</span>
                <span>{formatINR(subTotal)}</span>
              </div>
              <div className="summary-row">
                <span>CGST @ {formData.cgstRate}%:</span>
                <span>{formatINR(cgstAmount)}</span>
              </div>
              <div className="summary-row">
                <span>SGST @ {formData.sgstRate}%:</span>
                <span>{formatINR(sgstAmount)}</span>
              </div>
              <div className="summary-row">
                <span>Round Off:</span>
                <span>{formatINR(parseFloat(formData.roundOff) || 0)}</span>
              </div>
              <div className="summary-row total">
                <span>GRAND TOTAL:</span>
                <span>{formatINR(grandTotal)}</span>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="roundOff">Round Off</label>
              <input
                type="number"
                id="roundOff"
                name="roundOff"
                value={safe(formData.roundOff)}
                onChange={handleChange}
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={safe(formData.status)}
              onChange={handleChange}
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={safe(formData.notes)}
              onChange={handleChange}
              placeholder="Additional notes (optional)"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {invoice ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InvoiceForm
