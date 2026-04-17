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

    // Group invoices by month (only paid invoices)
    const monthlyAmounts = {}

    invoices.forEach(invoice => {
      const status = invoice.status || 'Draft'
      statusCounts[status] = (statusCounts[status] || 0) + 1

      const amount = parseFloat(invoice.roundOff || 0)
      totalAmount += amount

      if (status === 'Paid') {
        totalPaid += amount

        // Group by month only for paid invoices
        if (invoice.invoiceDate) {
          const date = new Date(invoice.invoiceDate)
          const monthKey = date.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
          monthlyAmounts[monthKey] = (monthlyAmounts[monthKey] || 0) + amount
        }
      }
    })

    // Prepare status pie chart data
    const statusPieData = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status,
        value: count
      }))

    // Prepare monthly revenue pie chart data
    const monthlyPieData = Object.entries(monthlyAmounts)
      .sort((a, b) => {
        // Sort by date (most recent first)
        const dateA = new Date(a[0])
        const dateB = new Date(b[0])
        return dateB - dateA
      })
      .map(([month, amount]) => ({
        name: month,
        value: amount
      }))

    return {
      totalInvoices: invoices.length,
      totalAmount,
      totalPaid,
      statusCounts,
      statusPieData,
      monthlyPieData,
      pendingAmount: totalAmount - totalPaid,
      monthlyAmounts
    }
  }, [invoices])

  // Colors for each status
  const statusColors = {
    Draft: '#94a3b8',
    Sent: '#3b82f6',
    Paid: '#10b981',
    Overdue: '#ef4444'
  }

  // Colors for months
  const monthColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ]

  const statusPieColors = stats.statusPieData.map(item => statusColors[item.name])
  const monthlyPieColors = stats.monthlyPieData.map((_, index) => monthColors[index % monthColors.length])

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

        {/* Pie Charts */}
        {(stats.statusPieData.length > 0 || stats.monthlyPieData.length > 0) && (
          <div className="dashboard-charts">
            {/* Status Pie Chart */}
            {stats.statusPieData.length > 0 && (
              <div className="chart-container">
                <h3>Invoices by Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.statusPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={statusPieColors[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} invoices`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly Revenue Pie Chart */}
            {stats.monthlyPieData.length > 0 && (
              <div className="chart-container">
                <h3>Revenue by Month</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.monthlyPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.monthlyPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={monthlyPieColors[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Status Breakdown */}
        {stats.statusPieData.length > 0 && (
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
        )}

        {/* Monthly Breakdown */}
        {stats.monthlyPieData.length > 0 && (
          <div className="status-details">
            <h3>Monthly Breakdown</h3>
            <div className="status-list">
              {Object.entries(stats.monthlyAmounts)
                .sort((a, b) => {
                  const dateA = new Date(a[0])
                  const dateB = new Date(b[0])
                  return dateB - dateA
                })
                .map(([month, amount], index) => (
                  <div key={month} className="status-item">
                    <div className="status-indicator" style={{ backgroundColor: monthColors[index % monthColors.length] }}></div>
                    <div className="status-info">
                      <span className="status-name">{month}</span>
                      <span className="status-count">₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {stats.statusPieData.length === 0 && stats.monthlyPieData.length === 0 && (
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
