import React, { useState } from 'react'

function ConfirmModal({ open, onConfirm, onCancel, message }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)', position: 'relative' }}>
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
        <div style={{ marginBottom: 16 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onCancel} style={{ padding: '6px 18px', borderRadius: 4, border: '1px solid #ccc', background: '#eee', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '6px 18px', borderRadius: 4, border: 'none', background: '#c00', color: '#fff', cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
import { formatINR } from '../App'

function InvoiceItem({ invoice, token, onEdit, onDelete, onStatusChange }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotes, setShowNotes] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatAmount = (amount) => {
    return formatINR(amount)
  }

  const handleDownload = async (format) => {
    try {
      setDownloading(format)
      const response = await fetch(`/api/invoices/${invoice.id}/export/${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice-${invoice.number}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      alert(`Error downloading ${format.toUpperCase()}: ${error.message}`)
    } finally {
      setDownloading(null)
    }
  }

  const getStatusClass = (status) => {
    return `status-${status.toLowerCase()}`
  }

  const getDaysUntilDue = () => {
    const dueDate = new Date(invoice.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    const days = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
    return days
  }

  const getDaysElapsed = () => {
    const createdDate = new Date(invoice.createdAt || Date.now())
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    createdDate.setHours(0, 0, 0, 0)
    const diffTime = today - createdDate
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 0 ? diffDays : 0
  }

  const daysUntilDue = getDaysUntilDue()
  const daysElapsed = getDaysElapsed()

  return (
    <>
      <tr className="invoice-row">
        <td className="invoice-number">{invoice.number}</td>
        <td className="invoice-date" style={{ whiteSpace: 'nowrap' }}>
          {invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '-'}
        </td>
        <td className="po-number">{invoice.poNumber || '-'}</td>
        <td className="client-name">{invoice.clientName}</td>
        <td className="amount">
          {(() => {
            const subTotal = invoice.lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0
            const cgstAmount = (subTotal * (invoice.cgstRate || 9)) / 100
            const sgstAmount = (subTotal * (invoice.sgstRate || 9)) / 100
            const igstAmount = (subTotal * (invoice.igstRate || 0)) / 100
            const roundOff = parseFloat(invoice.roundOff) || 0
            return formatAmount(subTotal + cgstAmount + sgstAmount + igstAmount + roundOff)
          })()}
        </td>
        <td className="due-date">
          <div>{formatDate(invoice.dueDate)}</div>
          <div className="days-until">
            {getDaysUntilDue() > 0 ? `${getDaysUntilDue()} days left` : 'Due'}
          </div>
        </td>
        <td className="elapsed-cell">
          <div style={{ fontWeight: '600', color: '#666' }}>{daysElapsed} Days</div>
        </td>
        <td className="status-cell">
          <select
            className={`status-select ${getStatusClass(invoice.status)}`}
            value={invoice.status}
            onChange={(e) => onStatusChange(invoice.id, e.target.value)}
          >
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </td>
        <td className="actions-cell">
          <div className="action-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className="btn-icon"
              title="Actions"
              onClick={() => setShowActionMenu((v) => !v)}
            >
              ⋮
            </button>
            {showActionMenu && (
              <div className="action-menu" style={{ position: 'absolute', right: 0, zIndex: 10, background: '#fff', border: '1px solid #ccc', borderRadius: 4, minWidth: 100 }}>
                <button
                  className="action-option"
                  onClick={() => {
                    setShowActionMenu(false);
                    onEdit(invoice);
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  ✏️ Edit
                </button>
                <button
                  className="action-option"
                  onClick={() => {
                    setShowActionMenu(false);
                    setShowDeleteModal(true);
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#c00' }}
                >
                  🗑️ Delete
                </button>
                <ConfirmModal
                  open={showDeleteModal}
                  message={`Are you sure you want to delete invoice ${invoice.number}?`}
                  onCancel={() => setShowDeleteModal(false)}
                  onConfirm={() => {
                    setShowDeleteModal(false);
                    onDelete(invoice.id);
                  }}
                />
                {invoice.notes && (
                  <button
                    className="action-option"
                    onClick={() => {
                      setShowActionMenu(false);
                      setShowNotes((v) => !v);
                    }}
                    style={{ width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    📝 Notes
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="export-menu-container">
            <button
              className="btn-icon"
              title="Export"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              {downloading ? '⏳' : '📥'}
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button
                  className="export-option"
                  disabled={downloading === 'pdf'}
                  onClick={() => {
                    handleDownload('pdf')
                    setShowExportMenu(false)
                  }}
                >
                  📄 PDF
                </button>
                <button
                  className="export-option"
                  disabled={downloading === 'excel'}
                  onClick={() => {
                    handleDownload('excel')
                    setShowExportMenu(false)
                  }}
                >
                  📊 Excel
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
      {showNotes && invoice.notes && (
        <tr className="notes-row">
          <td colSpan="7">
            <div className="notes-content" style={{ position: 'relative' }}>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowNotes(false)}
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
              <strong>Notes:</strong>
              <p>{invoice.notes}</p>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default InvoiceItem
