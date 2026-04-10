# Security Setup Guide

## 🔒 Secure Admin Credentials Setup

The application now uses environment variables for admin credentials instead of hardcoded passwords.

### Required Steps:

1. **Update your `.env` file** with secure admin credentials:

```bash
# Database connection
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/aeromaxrrtecinvoicedb

# Admin User Credentials (REQUIRED)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password-here

# JWT Secret
JWT_SECRET=aeromaxrr-local-dev-secret-2026
NODE_ENV=development
```

2. **Replace `your-secure-admin-password-here`** with a strong password:
   - Use at least 12 characters
   - Include uppercase, lowercase, numbers, and special characters
   - Example: `MySecure@Pass2026!`

3. **Restart the server**:
   ```bash
   cd server
   node index.js
   ```

### Security Benefits:

✅ **No hardcoded passwords** in source code  
✅ **Environment-based configuration**  
✅ **Flexible admin credentials**  
✅ **Secure password storage** with bcrypt hashing  
✅ **Graceful error handling** if credentials missing  

### First-Time Setup:

- The server will automatically create the admin user on first run
- Password is securely hashed before storage
- If `ADMIN_PASSWORD` is missing, server will show setup instructions and exit

### Default Credentials (if not specified):

- Username: `admin` (configurable via `ADMIN_USERNAME`)
- Password: **MUST be set via `ADMIN_PASSWORD` environment variable

### Security Best Practices:

1. Use strong, unique passwords
2. Never commit `.env` file to version control
3. Change passwords regularly
4. Use different passwords for different environments
5. Consider using a password manager

### Troubleshooting:

**Server exits with "SECURITY SETUP REQUIRED"**:  
→ Add `ADMIN_PASSWORD=your-password` to your `.env` file

**Login not working**:  
→ Ensure you're using the password set in `ADMIN_PASSWORD`, not the old hardcoded one
