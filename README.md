# EzeHub — Smart PG & Accommodation Management Platform (Frontend)

<div align="center">
  <h3>India's Smartest Multi-Tenant SaaS for PGs, Hostels & Co-Living Spaces</h3>
  <p>Manage buildings, rooms, beds, residents, rent, staff, food menus, complaints, and finances — all in one modern dashboard.</p>
</div>

---

## 📌 Overview

**EzeHub** is an enterprise-grade multi-tenant web application designed specifically for PG owners, hostel managers, and co-living operators. The frontend provides two distinct management portals within a unified interface:

1. **Tenant Portal (PG Admin & Staff)**: Full-featured operations hub for managing daily accommodation activities, room/bed allocations, rent invoicing, staff permissions, complaint tracking, and accounting.
2. **Platform Portal (Super Admin)**: Centralized SaaS governance dashboard for managing tenant accounts, subscription plans, platform-wide analytics, and billing.

---

## 🚀 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework & Core** | [React 18](https://react.dev/) with [Vite 6](https://vitejs.dev/) |
| **Styling & Design System** | [Tailwind CSS 3](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), Glassmorphism UI |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs/) with persistent local storage |
| **Data Fetching & Caching** | [TanStack React Query v5](https://tanstack.com/query/latest) |
| **Tables & Data Grids** | [TanStack React Table v8](https://tanstack.com/table/latest) |
| **Data Visualization** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **HTTP Client** | [Axios](https://axios-http.com/) with automatic JWT refresh interceptors |

---

## 🌟 Key Features & Modules

### 🏢 Property & Structure Management
- **Hierarchical Structure**: Multi-building support with custom floors, rooms, and bed configurations.
- **Interactive Visual Bed Map**: Color-coded occupancy map displaying boys, girls, occupied, and available beds. Click any bed to assign or transfer residents instantly.
- **Room Types & Amenities**: Single, double, triple, and dorm sharing configurations with custom rent amounts.

### 👥 Resident Lifecycle Management
- **Comprehensive Profiles**: Check-in to checkout lifecycle, KYC documentation, food preferences, and emergency contacts.
- **Bed Allocation & Transfers**: One-click bed reassignment with automatic status updates.
- **Rent History**: Direct view of resident charges, security deposits, payment proofs, and outstanding balances.

### 💳 Smart Rent & Financial Accounting
- **Auto-Generated Rent**: Dynamic rent calculation, payment proof uploads, and payment verification.
- **Income & Expense Bookkeeping**: Record manual income (rent, deposits, laundry) and operational expenses (utilities, salaries, repairs).
- **Real-Time Financial Dashboard**: Instant computation of total income, total expenses, net profit, and pending rent.

### 🛠️ Complaints & Maintenance Ticketing
- **Resident Complaints**: Ticket submission, priority tagging (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and category classification.
- **Staff Assignment**: Assign tickets to operational staff and update status (`IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REJECTED`) with resolution notes.
- **Facility Maintenance**: Schedule facility repairs, track technician costs, and manage status lifecycles.

### 🔐 Security & Access Control
- **Granular Permissions**: Role-based access control (RBAC) ensuring staff see only what their role allows.
- **Public Tenant Registration**: Frictionless self-service sign-up with strict 10-digit phone verification, password confirmation, and show/hide toggles.
- **Dual-Session Protection**: Automatic session validation and seamless JWT token renewal.

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```env
# URL pointing to the active EzeHub Backend API
# For local development:
# VITE_API_BASE_URL=http://localhost:5000/api/v1

# For deployed backend:
VITE_API_BASE_URL=https://ezehub-backend.onrender.com/api/v1
```

> [!IMPORTANT]
> Vite bakes `VITE_` variables into the JavaScript bundle at build time. When changing `VITE_API_BASE_URL` for production, always re-run `npm run build`.

---

## 🛠️ Getting Started (Local Development)

### Prerequisites
- Node.js `v20.x` or higher
- npm `v10.x` or higher

### Installation & Run

1. **Clone the repository and switch to the `fardin` branch**:
   ```bash
   git clone https://github.com/pavankumar-avineni/ezehub_frontend.git
   cd ezehub_frontend
   git checkout fardin
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure the environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your backend API URL
   ```

4. **Start the local Vite development server**:
   ```bash
   npm run dev
   ```
   The portal will be live at **`http://localhost:5174`**.

5. **Build for production**:
   ```bash
   npm run build
   ```
   Static build output will be generated inside the `dist/` directory.

6. **Preview the production build**:
   ```bash
   npm run preview
   ```

---

## 📂 Project Architecture

```
ezehub_frontend/
├── public/                 # Static assets & favicon
├── src/
│   ├── components/
│   │   ├── layout/         # DashboardLayout, Sidebar, Navbar
│   │   ├── shared/         # PageHeader, StatCard, ProtectedRoute, Modals
│   │   └── ui/             # Radix primitives (Button, Input, Dialog, Table, Badge...)
│   ├── lib/
│   │   ├── api.js          # Axios instance with request/response JWT interceptors
│   │   └── utils.js        # Formatting helpers (currency, dates, tailwind clsx)
│   ├── pages/              # Portal views (Dashboard, BedMap, Rent, Complaints...)
│   ├── stores/             # Zustand persistent state (authStore)
│   ├── App.jsx             # React Router v7 routes & layout wrapping
│   ├── index.css           # Tailwind custom styles & glassmorphism theme
│   └── main.jsx            # React root entry point
├── .env                    # Active environment variables (git-ignored)
├── .env.example            # Sample environment variables
├── ISSUES_AND_FIXES_REPORT.md # Audit log of all identified bugs and resolved gaps
└── package.json            # Scripts & project dependencies
```

---

## 👤 Default User Accounts (for Testing)

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@ezehub.com` | `Admin@123456` | Platform Portal |
| **Tenant Admin** | `admin@slinkinn.com` | `Admin@123456` | Tenant Portal |

---

## 📄 License
Private & Proprietary — Developed for EzeHub. All rights reserved.
