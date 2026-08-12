# Attack Surface Management (ASM) - Setup & Deployment Guide

This document provides complete instructions for setting up, configuring, and running the **Attack Surface Management (ASM)** application (Backend API, Celery Workers, Redis, Database, and Frontend).

---

## 📋 System Prerequisites

Ensure the target host system meets the following requirements:

- **OS**: Linux (Ubuntu 20.04/22.04 LTS recommended) or macOS / WSL2 (Windows)
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18.x or higher & npm
- **Redis Server**: Version 6.x or higher (used as Celery message broker)
- **Database**: SQLite3 (default for local development) or PostgreSQL 14+ (recommended for production)
- **Reconnaissance Tools (Installed in system PATH)**:
  - `subfinder`
  - `assetfinder`
  - `findomain`
  - `naabu`
  - `nmap`
  - `gitleaks`

---

## ⚙️ Step 1: Environment Variables Configuration (`.env`)

### 1.1 Backend Environment Setup (`backend/.env`)

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
SECRET_KEY=generate-a-strong-random-secret-key
DEBUG=True
ALLOWED_HOSTS=*

# --- Database Configuration ---
# Default SQLite3 setup:
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3

# For PostgreSQL setup (Optional):
# DB_ENGINE=django.db.backends.postgresql
# DB_NAME=asm_db
# DB_USER=postgres
# DB_PASSWORD=your_postgres_password
# DB_HOST=localhost
# DB_PORT=5432

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

# --- Faraday Security Platform (Optional Integration) ---
FARADAY_PIPELINE_URL=http://localhost:8001
FARADAY_AUTO_IMPORT_NUCLEI=True
FARADAY_URL=http://localhost:5985
FARADAY_USERNAME=faraday
FARADAY_PASSWORD=changeme
FARADAY_WORKSPACE=nuclei-asm
FARADAY_VERIFY_SSL=false

# --- MISP Threat Intelligence (Optional Integration) ---
MISP_URL=http://localhost:80
MISP_API_KEY=your_misp_api_key_here
```

### 1.2 Frontend Environment Setup (`frontend/.env`)

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
   # API Backend URL (Leave empty if using Vite dev proxy, or specify server URL)
   VITE_API_URL=http://localhost:8000
   ```

---

## 🚀 Step 2: Backend Setup & Execution

### 2.1 Virtual Environment & Dependency Installation

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
4. Upgrade pip & install Python dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
5. Install Playwright browser dependencies (required for automated website screenshots & technology scans):
   ```bash
   playwright install chromium
   ```

### 2.2 Database Initialization & Data Seeding

1. Apply Django database migrations:
   ```bash
   python manage.py migrate
   ```
2. Seed the database with initial admin credentials and default settings:
   ```bash
   python seed_data.py
   ```
   *This automatically creates:*
   - **Super Admin Account**: `admin` / `changeme`
   - **Default Regular User**: `user` / `changeme`

---

## 🏃 Step 3: Starting the Application Services

The ASM system requires 4 running processes: **Redis**, **Celery Worker**, **Django Backend Server**, and **Frontend Dev Server**.

### 3.1 Start Redis Broker
Ensure Redis server is running locally:
```bash
# Ubuntu/Debian service
sudo systemctl start redis-server

# Or run via Docker:
docker run -d -p 6379:6379 --name asm-redis redis:alpine
```

### 3.2 Start Celery Worker (Asynchronous Scan Execution)
In a terminal window (with `backend/venv` activated):
```bash
cd backend
source venv/bin/activate
celery -A core worker -l info
```

### 3.3 (Optional) Start Celery Beat (Scheduled Asset Monitoring)
In a separate terminal window:
```bash
cd backend
source venv/bin/activate
celery -A core beat -l info
```

### 3.4 Start Django API Server
In a separate terminal window:
```bash
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```
The REST API will be available at: `http://localhost:8000`

---

## 💻 Step 4: Frontend Setup & Execution

1. Open a new terminal and navigate to the `frontend` directory:
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
4. Access the web interface in your browser at `http://localhost:5173`.

---

## 🔑 Default Login Credentials

| Role | Username | Default Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin` | `changeme` |
| **Standard User** | `user` | `changeme` |

*Note: Please update default passwords after first login!*

---

## 🧪 Summary of Workflow Commands

```bash
# --- Terminal 1: Redis ---
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
