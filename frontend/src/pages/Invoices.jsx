import { useMemo } from 'react'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import InvoiceList from '../components/InvoiceList'

export default function Invoices({ token, invoices, onEdit, onDelete, onStatusChange }) {
  // Calculate statistics
  const stats = useMemo(() => {
    const statusCounts = {
      Draft: 0,
      Sent: 0,
      Paid: 0,
      Overdue: 0
    }
    
    let totalAmount = 0
    let totalPaid = 0
    
    invoices.forEach(invoice => {
      const status = invoice.status || 'Draft'
      statusCounts[status] = (statusCounts[status] || 0) + 1
      
      const amount = parseFloat(invoice.roundOff || 0)
      totalAmount += amount
      
      if (status === 'Paid') {
        totalPaid += amount
      }
    })
    
    // Prepare pie chart data
    const pieData = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status,
        value: count
      }))
    
    return {
      totalInvoices: invoices.length,
      totalAmount,
      totalPaid,
      statusCounts,
      pieData,
      pendingAmount: totalAmount - totalPaid
    }
  }, [invoices])

  // Colors for each status
  const statusColors = {
    Draft: '#94a3b8',
    Sent: '#3b82f6',
    Paid: '#10b981',
    Overdue: '#ef4444'
  }

  const pieColors = stats.pieData.map(item => statusColors[item.name])

  return (
    <div className="page-content">
      <h2 className="page-title">Invoices</h2>
      
      {/* Statistics Summary */}
      <div className="dashboard-stats">
        {/* Key Metrics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Invoices</div>
            <div className="stat-value">{stats.totalInvoices}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Amount</div>
            <div className="stat-value">₹{stats.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Paid</div>
            <div className="stat-value" style={{ color: '#10b981' }}>₹{stats.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>₹{stats.pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Pie Chart and Status Breakdown */}
        {stats.pieData.length > 0 && (
          <div className="dashboard-charts">
            <div className="chart-container">
              <h3>Invoices by Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} invoices`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status Details */}
            <div className="status-details">
              <h3>Status Breakdown</h3>
              <div className="status-list">
                {Object.entries(stats.statusCounts).map(([status, count]) => (
                  count > 0 && (
                    <div key={status} className="status-item">
                      <div className="status-indicator" style={{ backgroundColor: statusColors[status] }}></div>
                      <div className="status-info">
                        <span className="status-name">{status}</span>
                        <span className="status-count">{count} invoice{count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        {stats.pieData.length === 0 && (
          <div className="empty-message">
            <p>No invoices to display. Create your first invoice to see statistics.</p>
          </div>
        )}
      </div>

      {/* Invoice List */}
      {stats.totalInvoices > 0 && (
        <>
          <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>All Invoices</h3>
          <InvoiceList
            invoices={invoices}
            token={token}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        </>
      )}
    </div>
  )
}
