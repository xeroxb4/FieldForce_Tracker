# FieldForce Tracker

Field sales & merchandising app for OMRs and Merchandisers.

## Features

### OMR Interface
- Login with username & password
- Log Shop visits
- Day Wrap-Up with **Auto-fill** from today's visits
- Personal reports

### Merchandiser Interface
- Login with username & password
- Shop visits with **Nivea SKU tracking**
- Categories: Roll-ons, Sprays, Lotions, Shower Gels
- Record: Availability, Facings, Price, Order Qty

### Admin
- View all reports
- Filter by date, rep, territory, distributor
- CSV exports (coming soon)

## Tech Stack

- **Frontend**: React + Vite + Tailwind (coming next)
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas

## Quick Start

### 1. Backend

```bash
cd server
npm install
node seed.js          # creates test users + Nivea SKUs
npm run dev           # starts server on http://localhost:5000
```

### 2. Test Accounts (after seeding)

| Role          | Username  | Password  |
|---------------|-----------|-----------|
| Admin         | admin     | admin123  |
| OMR           | marilyn   | omr123    |
| Merchandiser  | merch1    | merch123  |

## Project Structure

```
FieldForce_Tracker/
├── server/           # Backend API
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── index.js
└── client/           # Frontend (next)
```
