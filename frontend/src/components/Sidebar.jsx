import { Link, useLocation } from 'react-router-dom'

export default function Sidebar({ onDownloadReport, onOpenCompanies, onOpenServices, isOpen, onClose }) {
  const location = useLocation()

  const menuItems = [
    { path: '/', icon: '📊', label: 'Dashboard' },
  ]

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo">📋</span>
        <span className="sidebar-title">Invoice Manager</span>
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
        <button
          className="sidebar-link"
          onClick={() => {
            onOpenCompanies()
            onClose()
          }}
        >
          <span className="sidebar-icon">🏢</span>
          <span className="sidebar-label">Companies</span>
        </button>
        <button
          className="sidebar-link"
          onClick={() => {
            onOpenServices()
            onClose()
          }}
        >
          <span className="sidebar-icon">🛠️</span>
          <span className="sidebar-label">Services</span>
        </button>
        <button
          className="sidebar-link report-link"
          onClick={onDownloadReport}
        >
          <span className="sidebar-icon">📊</span>
          <span className="sidebar-label">Download Report</span>
        </button>
      </nav>
    </aside>
  )
}
