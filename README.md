# AEROMAXRR TEC Invoice Manager

Full-stack invoice management system for creating GST-style invoices, maintaining company and service masters, exporting documents, and managing access through authenticated sessions.

## What Changed

The app is no longer the earlier simple SQLite invoice tracker. The current version includes:

- JWT-based login
- PostgreSQL storage
- company master management
- service and HSN master management
- richer invoice data including GST, PO/DC numbers, line items, bank details, and round-off
- PDF and Excel export
- company logo upload for invoice documents
- React front-end served by the Express server in production

## Features

- Secure login with admin credentials from environment variables
- Create, edit, delete, and update invoice status
- Maintain separate company records for your own business and clients
- Maintain service master records with HSN/SAC code and default tax rate
- Auto-generate invoice numbers and DC numbers by financial year
- Multi-line invoice items with quantity, rate, amount, and HSN code
- GST-ready fields including CGST, SGST, IGST, GSTN, and state details
- Bank details and company profile data carried into export documents
- Export a single invoice to PDF or Excel
- Export a consolidated invoice report to Excel
- Upload a company logo used in invoice output
- Responsive React UI with modal-based forms

## Tech Stack

- Frontend: React 18, Vite, React Router
- Backend: Node.js, Express
- Database: PostgreSQL
- Auth: JSON Web Tokens, bcrypt
- File Uploads: multer
- Document Export: pdfkit, exceljs

## Project Structure

```text
aeromaxrrtecinvoice/
|-- frontend/
|   |-- src/
|   |   |-- App.jsx
|   |   |-- components/
|   |   `-- pages/
|   |-- index.html
|   |-- package.json
|   `-- vite.config.js
|-- server/
|   |-- db.js
|   |-- export.js
|   |-- index.js
|   |-- public/
|   |   `-- logos/
|   |-- SECURITY_SETUP.md
|   `-- package.json
|-- package.json
|-- QUICKSTART.md
`-- README.md
```

## Prerequisites

- Node.js 18 or later recommended
- npm
- PostgreSQL

## Environment Setup

Create a `.env` file for the server configuration. The application requires PostgreSQL and an admin password on first boot.

Example:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/aeromaxrrtecinvoicedb
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password-here
JWT_SECRET=aeromaxrr-local-dev-secret-2026
NODE_ENV=development
PORT=9999
```

Notes:

- `ADMIN_PASSWORD` is required. If it is missing, the server exits during startup.
- The first server run seeds the admin user automatically.
- In production, use a strong `JWT_SECRET` and secure PostgreSQL credentials.

## Installation

Install root dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

If you prefer running commands from the `server` directory directly, install there as well:

```bash
cd server
npm install
cd ..
```

## Running Locally

### Recommended on Windows: use two terminals

Terminal 1, start the API server:

```bash
cd server
npm start
```

Terminal 2, start the Vite front-end:

```bash
cd frontend
npm run dev
```

Local URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:9999/api`

### Root-level commands

The root package includes helper scripts:

```bash
npm start
npm run build
```

- `npm start` runs the Express server from the repository root.
- `npm run build` builds the front-end into `frontend/dist`.

## Authentication

Use the credentials configured in your `.env` file:

- Username: value of `ADMIN_USERNAME`, default `admin`
- Password: value of `ADMIN_PASSWORD`

After login, the front-end stores the JWT in local storage and sends it as a bearer token to protected API routes.

## Main Workflows

### 1. Manage company masters

- Open the `Companies` modal from the header
- Add your own company profile and client companies
- Store GSTN, state, email, address, and bank details

### 2. Manage service masters

- Open the `HSN` modal from the header
- Add service categories with HSN or SAC codes and default tax rates

### 3. Create invoices

- Click `New Invoice`
- Complete the form tabs for own company, client details, invoice details, products, and status
- Invoice number and DC number are auto-generated using the current financial year
- Due date is auto-calculated from invoice date

### 4. Export documents

- Export an invoice to PDF
- Export an invoice to Excel
- Download a consolidated Excel report from the header

### 5. Upload branding

- Click the logo area in the header to upload a company logo
- The uploaded logo is served from `server/public/logos`

## API Overview

Base URL:

```text
http://localhost:9999/api
```

### Public routes

- `GET /api`
- `GET /api/health`
- `GET /api/debug`
- `POST /api/auth/login`
- `POST /api/auth/register`

### Protected routes

#### Companies

- `GET /api/companies`
- `POST /api/companies`
- `PUT /api/companies/:id`
- `DELETE /api/companies/:id`

#### Services

- `GET /api/services`
- `POST /api/services`
- `PUT /api/services/:id`
- `DELETE /api/services/:id`

#### Invoices

- `GET /api/invoices`
- `GET /api/invoices/:id`
- `POST /api/invoices`
- `PUT /api/invoices/:id`
- `PATCH /api/invoices/:id/status`
- `DELETE /api/invoices/:id`

#### Exports

- `GET /api/invoices/:id/export/pdf`
- `GET /api/invoices/:id/export/excel`
- `GET /api/invoices/export/report`

#### Logo

- `POST /api/logo/upload`
- `GET /api/logo`

## Invoice Data Model

Invoices now support more than the original basic fields. Important fields include:

- `number`
- `invoiceDate`
- `dueDate`
- `status`
- `clientName`
- `clientAddress`
- `clientGSTN`
- `clientState`
- `companyName`
- `companyAddress`
- `companyGSTN`
- `companyState`
- `companyEmail`
- `dcNumber`
- `poNumber`
- `goodsService`
- `cgstRate`
- `sgstRate`
- `igstRate`
- `roundOff`
- `bankName`
- `bankBranch`
- `accountNo`
- `ifscCode`
- `notes`
- `lineItems[]`

Each line item includes:

- `description`
- `hsnCode`
- `qty`
- `rate`
- `amount`

## Build And Production

Build the front-end:

```bash
npm run build
```

In production, the Express server serves static files from the built front-end directory. The server contains path detection for typical deployment layouts, including Render-style environments.

Production checklist:

- set `DATABASE_URL`
- set a strong `ADMIN_PASSWORD`
- set a strong `JWT_SECRET`
- build the front-end before starting the server

## Troubleshooting

### Server exits during startup

Check:

- PostgreSQL is running
- `DATABASE_URL` is valid
- `ADMIN_PASSWORD` is present in the environment

### Front-end loads but API calls fail

Check:

- the server is running on port `9999`
- Vite proxy in `frontend/vite.config.js` still points to `http://localhost:9999`
- you are logged in and the token has not expired

### Login returns HTML instead of JSON

This usually means the API is not being reached correctly or the server is misconfigured. Check the server logs and verify the request is going to `/api/auth/login`.

### Logo upload fails

Check:

- file size is under 5 MB
- the uploaded file is an image
- the server can write to `server/public/logos`

## Related Docs

- See `QUICKSTART.md` for a shorter startup guide.
- See `server/SECURITY_SETUP.md` for credential and secret setup guidance.
