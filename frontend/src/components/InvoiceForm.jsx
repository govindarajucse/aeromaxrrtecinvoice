import React, { useState, useEffect } from 'react'
import CompanyForm from './CompanyForm'
import { formatINR, validateGSTIN, generateInvoiceNumber, generateDCNumber } from '../App'

function InvoiceForm({ invoice, token, onSubmit, onCancel }) {
  // Helper to always provide a string value for inputs
  const safe = v => v === undefined || v === null ? '' : v
  const [companies, setCompanies] = useState([])
  const [services, setServices] = useState([])
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('')
  const [clientGstnError, setClientGstnError] = useState('')
  const [companyGstnError, setCompanyGstnError] = useState('')
  const [allInvoices, setAllInvoices] = useState([])
  const [formData, setFormData] = useState({
    number: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    clientName: '',
    clientAddress: '',
    clientGSTN: '',
    clientState: '',
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
    companyState: '',
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
    rate: '',
    taxRate: 18
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

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoices', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAllInvoices(data)
      }
    } catch (err) {
      console.error('Error fetching invoices:', err)
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
    fetchInvoices()
  }, [token])

  useEffect(() => {
    if (invoice && companies.length > 0) {
      // Try to match company by name from companies state
      const matchedCompany = companies.find(c => c.name === invoice.companyName)
      setSelectedCompany(matchedCompany ? matchedCompany.name : '')
      setFormData({
        ...invoice,
        lineItems: invoice.lineItems || [],
        clientState: invoice.clientState || '',
        companyState: invoice.companyState || ''
      })
    } else if (invoice) {
      setFormData({
        ...invoice,
        lineItems: invoice.lineItems || [],
        clientState: invoice.clientState || '',
        companyState: invoice.companyState || ''
      });
      setSelectedCompany(invoice.companyName || '');
    } else {
      // Auto-generate invoice number and DC number for new invoice
      // Find the last invoice with matching financial year pattern
      const invoiceDate = new Date().toISOString().split('T')[0]
      const date = new Date(invoiceDate)
      const year = date.getFullYear()
      const month = date.getMonth()
      const fyStart = month >= 3 ? year : year - 1
      const fyEnd = month >= 3 ? year + 1 : year
      const fyCode = `${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`
      
      // Filter invoices by current financial year and find max sequence
      const fyInvoices = allInvoices.filter(inv => inv.number && inv.number.includes(`INV/${fyCode}/`))
      const lastInvoice = fyInvoices.length > 0 
        ? fyInvoices.reduce((max, inv) => {
            const match = inv.number.match(/INV\/\d{2}-\d{2}\/(\d+)/)
            const seq = match ? parseInt(match[1]) : 0
            const maxMatch = max.number.match(/INV\/\d{2}-\d{2}\/(\d+)/)
            const maxSeq = maxMatch ? parseInt(maxMatch[1]) : 0
            return seq > maxSeq ? inv : max
          }, fyInvoices[0])
        : null
      
      // Same logic for DC numbers
      const fyDCs = allInvoices.filter(inv => inv.dcNumber && inv.dcNumber.includes(`DC/${fyCode}/`))
      const lastDC = fyDCs.length > 0
        ? fyDCs.reduce((max, inv) => {
            const match = inv.dcNumber.match(/DC\/\d{2}-\d{2}\/(\d+)/)
            const seq = match ? parseInt(match[1]) : 0
            const maxMatch = max.dcNumber.match(/DC\/\d{2}-\d{2}\/(\d+)/)
            const maxSeq = maxMatch ? parseInt(maxMatch[1]) : 0
            return seq > maxSeq ? inv : max
          }, fyDCs[0])
        : null
      
      const autoNumber = generateInvoiceNumber(lastInvoice?.number || null, invoiceDate)
      const autoDC = generateDCNumber(lastDC?.dcNumber || null, invoiceDate)
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + 60)
      setFormData(prev => ({
        ...prev,
        number: autoNumber,
        dcNumber: autoDC,
        dueDate: dueDate.toISOString().split('T')[0]
      }))
    }
  }, [invoice, companies, allInvoices])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (name === 'clientGSTN') {
      if (value && !validateGSTIN(value)) {
        setClientGstnError('Invalid GSTIN format. Must be 15 characters (e.g., 22AAAAA0000A1Z5)')
      } else {
        setClientGstnError('')
      }
    }
    
    if (name === 'companyGSTN') {
      if (value && !validateGSTIN(value)) {
        setCompanyGstnError('Invalid GSTIN format. Must be 15 characters (e.g., 22AAAAA0000A1Z5)')
      } else {
        setCompanyGstnError('')
      }
    }
    
    // Auto-calculate due date (60 days from invoice date)
    if (name === 'invoiceDate') {
      const invoiceDate = new Date(value)
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + 60)
      setFormData(prev => ({
        ...prev,
        [name]: value,
        dueDate: dueDate.toISOString().split('T')[0]
      }))
    }
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
        companyState: company.state || '',
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
        companyState: '',
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
        companyState: company.state || '',
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

  const updateLineItem = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          if (field === 'qty' || field === 'rate') {
            updatedItem.amount = updatedItem.qty * updatedItem.rate
          }
          return updatedItem
        }
        return item
      })
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
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between', paddingRight: '40px' }}>
          <span>{invoice ? 'Edit Invoice' : 'New Invoice'}</span>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setShowCompanyForm(true)}
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            ➕ Add Company
          </button>
        </h2>
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
                  style={{ borderColor: companyGstnError ? '#ef4444' : '' }}
                />
                {companyGstnError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{companyGstnError}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="companyState">State *</label>
                <select
                  id="companyState"
                  name="companyState"
                  value={safe(formData.companyState)}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select State</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                  <option value="Assam">Assam</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Chhattisgarh">Chhattisgarh</option>
                  <option value="Goa">Goa</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Himachal Pradesh">Himachal Pradesh</option>
                  <option value="Jharkhand">Jharkhand</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Odisha">Odisha</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Sikkim">Sikkim</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Tripura">Tripura</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Uttarakhand">Uttarakhand</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Chandigarh">Chandigarh</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                  <option value="Puducherry">Puducherry</option>
                </select>
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
              style={{ borderColor: clientGstnError ? '#ef4444' : '' }}
            />
            {clientGstnError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{clientGstnError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="clientState">State *</label>
            <select
              id="clientState"
              name="clientState"
              value={safe(formData.clientState)}
              onChange={handleChange}
              required
            >
              <option value="">Select State</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Arunachal Pradesh">Arunachal Pradesh</option>
              <option value="Assam">Assam</option>
              <option value="Bihar">Bihar</option>
              <option value="Chhattisgarh">Chhattisgarh</option>
              <option value="Goa">Goa</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Haryana">Haryana</option>
              <option value="Himachal Pradesh">Himachal Pradesh</option>
              <option value="Jharkhand">Jharkhand</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Kerala">Kerala</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Manipur">Manipur</option>
              <option value="Meghalaya">Meghalaya</option>
              <option value="Mizoram">Mizoram</option>
              <option value="Nagaland">Nagaland</option>
              <option value="Odisha">Odisha</option>
              <option value="Punjab">Punjab</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Sikkim">Sikkim</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Telangana">Telangana</option>
              <option value="Tripura">Tripura</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Uttarakhand">Uttarakhand</option>
              <option value="West Bengal">West Bengal</option>
              <option value="Chandigarh">Chandigarh</option>
              <option value="Delhi">Delhi</option>
              <option value="Jammu and Kashmir">Jammu and Kashmir</option>
              <option value="Puducherry">Puducherry</option>
            </select>
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
                        <td>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                            style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.hsnCode}
                            onChange={(e) => updateLineItem(item.id, 'hsnCode', e.target.value)}
                            style={{ width: '80px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateLineItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                            style={{ width: '60px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            step="0.01"
                            style={{ width: '80px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                          />
                        </td>
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
