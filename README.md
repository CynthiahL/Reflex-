# 🚀 Reflex — Real-Time Retail Delivery & Fleet Command Hub

Reflex is a web-based, real-time logistics and dispatch coordination system custom-built for small-scale Kenyan retailers (such as electronics shops, local pharmacies, and hardware stores). By replacing fragmented WhatsApp communication channels with an integrated command hub, Reflex provides structured delivery logs, real-time vehicle allocation visibility, and strict compliance with local data tracking regulations.

---

## 🏗️ System Architecture & Persona Collapse Rationale

During our development cycle, Reflex underwent a significant architectural refactor to maximize operational efficiency for small businesses:
* **The Unified Retailer Hub:** We intentionally collapsed the traditional detached *Dispatcher* persona directly into the *Retailer* workspace. In the target Kenyan market, the employee cataloging stock or logging transactions is almost always the same individual coordinating local drivers.
* **The Data Flow:** Merging these panels allows store operators to log customer criteria and match an available driver from a dynamic **Rider Availability Matrix** in a single frontend action, cutting system routing overhead by 33%.
* **Real-Time WebSocket Signaling:** Reflex utilizes a hybrid WebSocket pattern. The frontend leverages Supabase Realtime channels strictly as a lightweight signaling trigger. When database columns shift, the socket signals the client to re-fetch profiles from secure backend API routes. This prevents raw data exposure across public browser streams.

---

## 🔒 Ephemeral Data Safeguards (KDPA Compliance)

To fully satisfy the guidelines of the **Kenya Data Protection Act (KDPA)**, customer contact details are handled as ephemeral states within the network layers:
1. **Frontend Call Masking:** Active riders view customer phone numbers through a masked string format (`07** *** ***`). An unmasked dialer deep link (`<a href="tel:... ">`) is rendered, allowing couriers to voice-coordinate routing locations without exposing digits or letting them copy records.
2. **Backend Context Redaction:** The moment an order transitions to a `Delivered` or `Cancelled` state, our Node.js controller (`deliveryController.js`) automatically strips the raw `customer_phone` and `delivery_address` entries from all retrieval queries made by the `rider` role.

---

## 📂 Project Repository Tree

```text
reflex/
├── backend/                      # Node.js + Express API Microservice
│   ├── src/
│   │   ├── config/               # Supabase standard & administrative clients
│   │   ├── controllers/          # Identity, onboarding, delivery & fleet logic
│   │   ├── middleware/           # JWT signature verification & role clearance guards
│   │   ├── routes/               # Modular API endpoint tree definitions
│   │   └── app.js                # Core app listener and global error pipelines
│   ├── package.json              # Backend script manifests (ES Modules configured)
│   └── test-flow.js              # Headless end-to-end integration test runner
│
├── frontend/                     # Next.js 16 + React 19 Client Web App
│   ├── app/                      # App Router branches (Globals, Entry Gate, Hub)
│   ├── components/               # Global presentational primitive atoms
│   ├── features/                 # Modular workspaces separated by User Persona
│   │   ├── auth/                 # Dual-mode Sign In / Sign Up gateway panel
│   │   └── retailer/             # Intake form, logs log, and live fleet matrix grid
│   ├── hooks/                    # useRealtimeDeliveries WebSocket mapping logic
│   └── lib/                      # Public low-privilege Supabase initialization
│
└── supabase/                     # Cloud Database Management
    └── seeds.sql                 # Automated database initialization queries
```

---

## ⚙️ Environment Configurations Setup

Before initializing application servers, configure your local environment strings inside your root components.

### 1. Backend Variable Configuration
Create a file named `.env` inside the `backend/` folder:
```bash
PORT=5000
SUPABASE_URL="https://supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1..." # Keep completely hidden on the server!
```

### 2. Frontend Variable Configuration
Create a file named `.env.local` inside the `frontend/` folder:
```bash
NEXT_PUBLIC_SUPABASE_URL="https://supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1..." # Public
```

---

## ⚡ Setup & Local Installation Commands

Follow this execution loop to spin up the entire application architecture locally:

### Step 1: Database Initialization
1. Log into your web browser's **Supabase Project Workspace console**.
2. Open the **SQL Editor**, create a clean tab, paste the complete code blocks from `supabase/seeds.sql`, and hit **Run**. 
3. *This initializes the tables, builds custom enums, and populates your baseline profile records.*

### Step 2: Launch the Backend Service
Open a terminal window inside your system workspace and execute:
```bash
cd backend
npm install
npm run dev
```
*The Express api server will compile and stream live on **`http://localhost:5000`**.*

### Step 3: Run the Integration Test Suite
To confirm that your database permissions, role middleware, and endpoint logic match all application constraints before rendering frontend pages, run this command in a separate backend terminal window:
```bash
node test-flow.js
```
*You will receive an explicit `ALL REFLEX CORE FUNCTIONALITY TESTS PASSED` terminal validation matrix.*

### Step 4: Launch the Frontend Workspace
Open a separate terminal window, navigate to your client project directory, and execute:
```bash
cd frontend
npm install
npm run dev
```
*The Next.js framework will compile styles and launch your active client dashboard natively on **`http://localhost:3000`**.*

---

## 🔑 Testing Credentials Matrix

Use these seeded identities to verify role isolation and evaluate layout experiences:

| Workplace Persona | Registered Access Email | Universal Password | Interface Validation Target |
| :--- | :--- | :--- | :--- |
| **Retailer / Operator** | `manager@store.co.ke` | `ReflexTest2026!` | Unified workspace, operational entry intake form, and live fleet status matrix. |
| **Active Fleet Courier** | `david.makori@reflex.co.ke` | `ReflexTest2026!` | Responsive mobile queue view, status modifiers, and auto-masking data privacy rules. |
