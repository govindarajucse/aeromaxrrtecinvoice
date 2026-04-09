# Quick Start Guide

## One-Time Setup

### 1. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
cd ..
```

## Running the App

You'll need **two terminal windows** open:

### Terminal 1 - Backend Server

```bash
cd server
npm start
```

Expected output:
```
✓ Invoice API Server
  Running on http://localhost:8080
  API: http://localhost:8080/api/invoices
```

### Terminal 2 - Frontend Dev Server

```bash
npm run dev
```

Expected output:
```
  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

The app will open automatically in your browser. If not, go to: **http://localhost:3000**

## Initial Data

The backend automatically loads sample invoices on first run:
- **AEROMAXRR TEC Invoice** (25-26/AM/INV-006) - Your uploaded invoice
- **4 Additional sample invoices** - For testing

## Features to Try

1. ✅ **View invoices** - See all invoices in the table
2. ➕ **Create invoice** - Click "New Invoice" button
3. ✏️ **Edit invoice** - Click edit icon on any row
4. 🔄 **Change status** - Click status dropdown
5. 📝 **View notes** - Click notes icon if invoice has notes
6. 🗑️ **Delete invoice** - Click delete icon

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "API not responding" | Make sure backend is running on port 8080 |
| Port 3002 already in use | Kill process: `netstat -ano \| findstr :3002`, then `taskkill /PID <PID> /F` |
| Port 3000 already in use | Change in `vite.config.js` or kill the process |
| Database issues | Delete `server/invoices.db` and restart backend |

## Database Reset

To start fresh with sample data:

```bash
# Stop both servers (Ctrl+C)
# Delete the database
rm server/invoices.db

# Restart backend
cd server
npm start
```

The database will be recreated with sample data automatically.
