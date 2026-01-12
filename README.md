# 📦 SpareOps - Inventory Management System

SpareOps is a full-stack inventory control application designed for tracking spare parts, managing requisitions between sales staff and managers, and logging equipment deployment.

## 🛠️ Tech Stack

*   **Frontend:** React (Vite), Tailwind CSS, Lucide Icons
*   **Backend:** Node.js, Express.js
*   **Database:** PostgreSQL (via Prisma ORM)
*   **Authentication:** JWT (JSON Web Tokens)

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:

1.  **Node.js** (v18 or higher)
2.  **PostgreSQL** (Running locally or via a cloud provider)
3.  **Git**

---

## 📂 Directory Structure
```text
/project
  ├── /client      (The React Frontend code)
  └── /server      (The Node.js/Express Backend code)
```

---

## Setup Guide

### Step 1: Database Setup

1.  Open your terminal or a tool like PgAdmin/BeekeeperStudio.
2.  Create a new, empty database named `spareops_db`:
    ```sql
    CREATE DATABASE spareops_db;
    ```

### Step 2: Backend (Server) Setup

1.  Navigate to the server directory:
    ```bash
    cd server
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Create a `.env` file in the `server` folder:
    ```bash
    # Create file
    touch .env
    ```

4.  Add the following content to `server/.env`:
    ```env
    PORT=5000
    # Replace 'user' and 'password' with your Postgres credentials
    DATABASE_URL="postgresql://postgres:password@localhost:5432/spareops_db?schema=public"
    JWT_SECRET="super_secret_secure_key_123"
    ```

5.  **Migrate and Seed the Database:**
    ```bash
    # Create tables
    npx prisma migrate dev --name init

    # Populate initial data (Users/Passwords)
    npx prisma db seed
    ```

6.  Start the Server:
    ```bash
    npm run dev
    ```

### Step 3: Frontend (Client) Setup

1.  Open a **new** terminal window (keep the server running).
2.  Navigate to the client directory:
    ```bash
    cd client
    ```

3.  Install dependencies:
    ```bash
    npm install
    ```

4.  Create a `.env` file in the `client` folder (Vite requires `VITE_` prefix):
    ```bash
    touch .env
    ```

5.  Add the following content to `client/.env`:
    ```env
    VITE_API_URL=http://localhost:5000
    ```

6.  Start the React Application:
    ```bash
    npm run dev
    ```

---

## How to Run

1.  Ensure your **Database** is running.
2.  Terminal 1 (Server): `npm run dev` (Runs on port 5000).
3.  Terminal 2 (Client): `npm run dev` (Runs on port 3000).
4.  Open your browser to `http://localhost:3000`.
5.  Login with the credentials defined in your `prisma/seed.ts` file.

---

## Default Roles & Permissions

*   **Admin:** Full access to Dashboard, History, Staff Directory (Create/Delete users), Audit Reports, and AI Insights.
*   **Manager:** Can view Dashboards, approve requests, and view Reports. Cannot create new system users.
*   **Sales:** Can only view their own inventory ("On Hand"), create new Requests, and log Deployment usage.

---

## Troubleshooting

*   **"Ts-node not found"**: If seeding fails, try running `npm install -D ts-node typescript` in the server folder again.
*   **"Connection Refused"**: Ensure your PostgreSQL service is running and the credentials in `server/.env` are correct.
*   **"CORS Error"**: Ensure the server `index.ts` has `app.use(cors({ origin: "*" }))` enabled.
