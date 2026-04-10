import InvoiceList from '../components/InvoiceList'

export default function Dashboard({ token, invoices, onEdit, onDelete, onStatusChange }) {
  return (
    <div className="page-content">
      <h2 className="page-title">Dashboard</h2>
      <InvoiceList
        invoices={invoices}
        token={token}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
      />
    </div>
  )
}
