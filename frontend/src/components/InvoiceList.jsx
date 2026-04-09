import React from 'react'
import InvoiceItem from './InvoiceItem'

function InvoiceList({ invoices, onEdit, onDelete, onStatusChange }) {
  if (invoices.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Invoices Yet</h3>
        <p>Create your first invoice to get started</p>
      </div>
    )
  }

  return (
    <div className="invoice-list">
      <table className="invoices-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>PO Number</th>
            <th>Client</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Elapsed</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(invoice => (
            <InvoiceItem
              key={invoice.id}
              invoice={invoice}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default InvoiceList
