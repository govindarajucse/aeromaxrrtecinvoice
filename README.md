# Invoice Manager App

A modern, full-stack invoice tracking and management application built with React (frontend) and Node.js/Express (backend) with SQLite database.

## Features

- **Create & Manage Invoices**: Add new invoices with invoice number, client name, amount, due date, and optional notes
- **Invoice Status Tracking**: Set and update invoice status (Draft, Sent, Paid, Overdue)
- **Visual Dashboard**: Clean, intuitive interface with a sortable invoice list
- **Due Date Tracking**: Automatically calculates days until due date
- **Edit & Delete**: Modify existing invoices or remove them when needed
- **Notes Support**: Add optional notes to invoices for additional context
- **Backend Database**: Persistent SQLite database with full API
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Currency Formatting**: Amounts displayed in USD format

## Tech Stack

- **Frontend**: React 18, Vite, CSS3
- **Backend**: Node.js, Express.js
- **Database**: SQLite with better-sqlite3
- **API**: RESTful endpoints with CORS support

## Project Structure

```
aeromaxrrtecinvoice/
├── src/                    # React frontend
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── components/
│       ├── InvoiceForm.jsx
│       ├── InvoiceList.jsx
│       └── InvoiceItem.jsx
├── server/                 # Express backend
│   ├── index.js           # API server
│   ├── db.js              # Database setup & operations
│   └── package.json
├── index.html
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install frontend dependencies**:
```bash
npm install
```

2. **Install backend dependencies**:
```bash
cd server
npm install
cd ..
```

### Running the Application

#### Start the backend server (Terminal 1):
```bash
cd server
npm start
# or for development with auto-reload:
npm run dev
```

The API will be running on `http://localhost:9999`

#### Start the frontend dev server (Terminal 2):
```bash
npm run dev
```

The app will open at `http://localhost:3000`

## API Endpoints

Base URL: `http://localhost:9999/api`

### Invoices

- **GET** `/invoices` - Get all invoices
- **GET** `/invoices/:id` - Get single invoice
- **POST** `/invoices` - Create invoice
- **PUT** `/invoices/:id` - Update invoice
- **PATCH** `/invoices/:id/status` - Update invoice status
- **DELETE** `/invoices/:id` - Delete invoice
- **GET** `/health` - Health check

### Example Request (Create Invoice)

```javascript
POST /api/invoices
Content-Type: application/json

{
  "number": "INV-001",
  "clientName": "Client Name",
  "amount": 5000.00,
  "dueDate": "2026-05-15",
  "status": "Draft",
  "notes": "Optional notes"
}
```

## Sample Data

The database is automatically seeded with sample invoices on first run, including:
- Your AEROMAXRR TEC invoice (25-26/AM/INV-006) with full details
- 4 additional sample invoices in various statuses

## Building for Production

### Frontend:
```bash
npm run build
# Outputs to dist/ folder
```

### Backend:
Simply deploy the `server` folder to your hosting service. Make sure to:
1. Install dependencies: `npm install --production`
2. Set up environment variables if needed
3. Run: `npm start`

## How to Use

### Creating an Invoice
1. Click **"+ New Invoice"** in the header
2. Fill in required fields:
   - Invoice Number
   - Client Name
   - Amount
   - Due Date
3. Optionally add status and notes
4. Click **"Create Invoice"**

### Updating Invoice Status
- Click the status dropdown on any invoice row
- Select: Draft, Sent, Paid, or Overdue

### Editing an Invoice
- Click the **✏️** edit icon
- Update fields and click **"Update Invoice"**

### Viewing Notes
- Click the **📝** notes icon to expand notes

### Deleting an Invoice
- Click the **🗑️** delete icon and confirm

## Database

SQLite database file: `server/invoices.db`

Schema includes:
- `id` (TEXT, primary key)
- `number` (TEXT, unique)
- `clientName` (TEXT)
- `amount` (REAL)
- `dueDate` (TEXT)
- `status` (TEXT)
- `notes` (TEXT)
- `createdAt` (TEXT, ISO-8601)
- `updatedAt` (TEXT, ISO-8601)

## Troubleshooting

**"API not responding" error:**
- Make sure the backend server is running on port 8080
- Check that both terminals are open and no errors are shown
- Refresh the browser page

**Port already in use:**
- Change port in `server/index.js` (search for `const PORT`)
- Or kill the process using the port

**Database issues:**
- Delete `server/invoices.db` to reset the database
- Restarting the server will recreate it with fresh sample data

## License

MIT
# aeromaxrrtecinvoice
