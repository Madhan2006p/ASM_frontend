# Attack Surface Management (ASM) - Setup & Deployment Guide

This document provides complete instructions for setting up, configuring, and running the **Attack Surface Management (ASM)** application (Backend API, Celery Workers, Redis, PostgreSQL Database, and Frontend).

---

## 📋 System Prerequisites

Ensure the host system meets the following requirements:

- **OS**: Linux (Ubuntu 20.04/22.04 LTS recommended), macOS, or WSL2 (Windows)
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18.x or higher & npm
- **Database**: PostgreSQL 14+ (Required)
- **Redis Server**: Version 6.x or higher (used as Celery task broker)
- **Reconnaissance Tools (Installed in system PATH)**:
  - `subfinder`
  - `assetfinder`
  - `findomain`
  - `naabu`
  - `nmap`
  - `gitleaks`

---

## 🗄️ Step 1: PostgreSQL Database Setup

1. Start PostgreSQL server:
   ```bash
   sudo systemctl start postgresql
   ```
2. Create PostgreSQL database and user:
   ```bash
   sudo -u postgres psql -c "CREATE DATABASE asm_db;"
   sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE asm_db TO postgres;"
   ```

---

## ⚙️ Step 2: Environment Variables Configuration (`.env`)

### 2.1 Backend Environment Setup (`backend/.env`)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy `.env.example` to create your active `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Open `backend/.env` in an editor and update the fields:

```env
# --- Django Core Settings ---
SECRET_KEY=django-insecure-asm-key-%9x!&p8#2q@v$m4*z7+L1w^e5(r0)t6y3u_i=o-p
DEBUG=True
ALLOWED_HOSTS=*

# --- Database Configuration (PostgreSQL) ---
DB_ENGINE=django.db.backends.postgresql
DB_NAME=asm_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# --- Redis Broker & Celery ---
REDIS_URL=redis://localhost:6379/0

# --- Initial Admin Account Setup ---
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
ADMIN_EMAIL=admin@localhost

# --- Email Notifications ---
ALERT_EMAIL_ENABLED=False
ALERT_EMAIL_HOST=smtp.gmail.com
ALERT_EMAIL_PORT=587
ALERT_EMAIL_USER=
ALERT_EMAIL_PASSWORD=
ALERT_EMAIL_FROM=asm@localhost
ALERT_EMAIL_TO=admin@localhost

# --- External API Keys ---
VIRUSTOTAL_API_KEY=your_virustotal_api_key_here
WHATCMS_API_KEY=your_whatcms_api_key_here

# --- Recon Tool Paths (Leave blank to auto-detect from system PATH) ---
SUBFINDER_PATH=
ASSETFINDER_PATH=
FINDOMAIN_PATH=
NAABU_PATH=
GITLEAKS_PATH=
NUCLEI_TEMPLATES_PATH=
```

### 2.2 Frontend Environment Setup (`frontend/.env`)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Configure `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

---

## 🚀 Step 3: Backend Setup & Execution

### 3.1 Virtual Environment & Dependency Installation

1. Enter the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a Python virtual environment:
   ```bash
   python3 -m venv venv
   ```
3. Activate the virtual environment:
   ```bash
   source venv/bin/activate
   ```
4. Upgrade pip & install Python dependencies (includes `psycopg2-binary` for PostgreSQL):
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
5. Install Playwright browser dependencies:
   ```bash
   playwright install chromium
   ```

### 3.2 Database Migrations & Data Seeding (PostgreSQL)

1. Apply Django database migrations to PostgreSQL:
   ```bash
   python manage.py migrate
   ```
2. Seed the PostgreSQL database with initial admin credentials and default settings:
   ```bash
   python seed_data.py
   ```
   *This automatically creates:*
   - **Super Admin Account**: `admin` / `changeme`
   - **Default Regular User**: `user` / `changeme`

---

## 🏃 Step 4: Starting the Application Services

The ASM system uses **Celery and Redis** for asynchronous background tasks.

### 4.1 Start Redis Broker
Ensure Redis server is running:
```bash
sudo systemctl start redis-server
```

### 4.2 Start Celery Worker
In a terminal window (with `backend/venv` activated):
```bash
cd backend
source venv/bin/activate
celery -A core worker -l info
```

### 4.3 Start Django API Server
In a separate terminal window:
```bash
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```
The REST API will be available at `http://localhost:8000`.

---

## 💻 Step 5: Frontend Setup & Execution

1. Open a terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the UI in browser at `http://localhost:5173`.

---

## 🔑 Default Access Credentials

| Role | Username | Default Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin` | `changeme` |
| **Standard User** | `user` | `changeme` |

---

## 🧪 Summary of Operating Commands

```bash
# --- Terminal 1: PostgreSQL & Redis Services ---
sudo systemctl start postgresql
sudo systemctl start redis-server

# --- Terminal 2: Celery Worker ---
cd backend && source venv/bin/activate
celery -A core worker -l info

# --- Terminal 3: Backend API ---
cd backend && source venv/bin/activate
python manage.py runserver 0.0.0.0:8000

# --- Terminal 4: Frontend UI ---
cd frontend
npm run dev
```
