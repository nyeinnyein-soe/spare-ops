# 🔍 SpareOps Project Review

A comprehensive analysis of the architecture, data flow, and core logic of the SpareOps Inventory Management System.

## 🏗️ Architecture Overview

The project follows a modern full-stack decoupled architecture:
- **Backend:** Node.js + Express.js + Prisma ORM + PostgreSQL.
- **Frontend:** React (Vite) + Tailwind CSS + Lucide Icons.
- **State Management:** React Context API (`AuthContext`, `DataProvider`).
- **Authentication:** JWT-based stateless authentication.

## 🔄 Application Flow

### 1. Requisition Flow
- **Sales Staff** submits a stock request via `NewRequest.tsx`.
- **Backend** creates the request and notifies all **Admins/Managers**.
- **Admin/Manager** approves or rejects the request via `AdminDashboardView.tsx`.
- **Sales Staff** collects the approved equipment and marks it as `RECEIVED`.

### 2. Deployment Flow
- **Sales Staff** selects a `Shop` and an `InventoryItem`.
- **Sales Staff** uploads a proof image (voucher) and logs the usage.
- **Backend** creates a `Usage` record.

## 🧠 Logic Analysis

### Inventory Management
The system uses a **dynamic calculation pattern** for inventory:
- There is no "Stock" table or quantity field in `InventoryItem`.
- **On Hand** quantity is calculated on the frontend: `Sum(Received Requisitions) - Count(Usages)`.
- This ensures data integrity by deriving state from event logs (requests/usages) but has scaling implications.

### Authentication & Security
- **JWT** is used for session management.
- **Role-based middleware** (`verifyRole`) is implemented but inconsistently applied.

---

## ⚠️ Critical Findings

### 1. Security Vulnerabilities (Access Control) 🔴
- **Global Data Leaks:** The `getRequests` and `getUsages` endpoints in the backend return **all** records in the database to **all** authenticated users. Sales staff can see every request made in the system by intercepting the network response.
- **Missing Route Guards:** 
    - `/api/v1/users` (CRUD) is open to any authenticated user. A Sales staff could potentially delete or create users.
    - `/api/v1/inventory-items` (CRUD) is not strictly restricted to admins in the `index.ts`.
- **JWT Secret:** The `JWT_SECRET` has a default value in the code, which is a security risk if not overridden in `.env`.

### 2. Performance Bottlenecks 🟠
- **N+1 Query Problem:** The `getRequests` and `getUsages` controllers perform individual database lookups for users inside a `map` loop. This will slow down significantly as the record count grows.
- **Client-Side Aggregation:** Calculating global or per-user inventory on the client-side requires fetching the entire history of requests and usages. Eventually, this will exceed browser memory and network bandwidth.

### 3. Code Redundancy & Consistency 🟡
- **Duplicate Routes:** `apiRouter.post("/notifications/clear", ...)` is defined twice in `index.ts`.
- **Bulk Import:** Merchants have a bulk import feature, but Shops do not, leading to potential tedious manual entry for large clients.

---

## 💡 Recommendations

1. **Implement Scoped Queries:** Update backend controllers to filter data based on the user's role and ID (e.g., Sales should only receive their own requests).
2. **Harden Middleware:** Apply `verifyRole(["admin"])` to all user management and inventory definition routes.
3. **Optimize Queries:** Use Prisma's `include` feature to fetch related user data in a single query, eliminating the N+1 problem.
4. **Server-Side Summary:** Move inventory calculation to the backend and provide a summary endpoint for "On Hand" stock.
5. **Security Audit:** Rotate secrets and ensure all sensitive endpoints have multi-layer verification.
