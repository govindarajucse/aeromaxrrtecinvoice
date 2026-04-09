import React, { useState } from 'react'

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Login failed')
        }
        onLogin(data.token, data.user)
      } else {
        // Handle non-JSON response (e.g., server crash or HTML error page)
        const text = await response.text()
        console.error('Server returned non-JSON response:', text)
        const preview = text.substring(0, 50).trim()
        throw new Error(`Server error (${response.status}): The server returned a webpage instead of data. (Preview: "${preview}...")`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">📋</div>
          <h2>AeromaxRR Tec</h2>
          <p>Sign in to manage your invoices</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-badge">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>© {new Date().getFullYear()} AeromaxRR Tec</p>
          <p style={{ opacity: 0.3, fontSize: '10px' }}>V 1.0.10</p>
        </div>
      </div>

      <style jsx>{`
        .login-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #1a1c2c 0%, #4a192c 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo-circle {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 16px;
          box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
        }

        h2 {
          color: white;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        p {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          margin-top: 4px;
        }

        .login-form .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 8px;
        }

        input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 15px;
          transition: all 0.2s;
        }

        input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .btn-block {
          width: 100%;
          padding: 14px;
          font-weight: 600;
          margin-top: 8px;
        }

        .error-badge {
          background: rgba(ef, 44, 44, 0.1);
          border: 1px solid rgba(ef, 44, 44, 0.2);
          color: #ff4d4d;
          padding: 12px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 24px;
          text-align: center;
        }

        .login-footer {
          margin-top: 32px;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 24px;
        }

        .login-footer p {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  )
}

export default LoginForm
