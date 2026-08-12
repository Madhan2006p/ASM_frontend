# Attack Surface Management (ASM) Platform

A comprehensive Attack Surface Management platform designed to discover, track, and monitor digital assets, open ports, subdomains, SSL certificates, brand impersonation, and vulnerabilities.

---

## 📁 Repository Structure

```
.
├── backend/                # Django REST API, Celery Tasks & Reconnaissance Engine
│   ├── core/              # Django Project Settings & Celery Init
│   ├── accounts/          # User Accounts Management
│   ├── authentication/    # Auth & Multi-Tenancy Organization logic
│   ├── assetDiscovery/    # Core Asset Discovery engine
│   ├── brand_monitoring/  # Phishing & Brand Protection logic
│   ├── owasp_scanner/     # OWASP Vulnerability Scanner module
│   ├── reconnaissance/    # Subdomain, DNS, & Port Scanners integration
│   ├── seed_data.py       # Database Initialization & Admin Seeding
│   └── .env.example       # Backend Configuration Template
├── frontend/               # React + Vite Web Application Interface
│   ├── src/               # React UI Components, Dashboards & Hooks
│   └── .env.example       # Frontend Configuration Template
├── SETUP_GUIDE.md          # Step-by-Step Setup & Deployment Instructions
└── README.md               # Quickstart Guide
```

---

## 🚀 Quick Setup Instructions

For step-by-step documentation, see [SETUP_GUIDE.md](file:///home/madhan/Desktop/ASM-New/SETUP_GUIDE.md).

### 1. Configure Environment Variables
```bash
# Backend Environment
cp backend/.env.example backend/.env

# Frontend Environment
cp frontend/.env.example frontend/.env
```

### 2. Start Backend & Services
```bash
# Set up Python environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# Migrate Database & Seed Initial Admin Account
python manage.py migrate
python seed_data.py

# Start Celery Worker (In background or separate terminal)
celery -A core worker -l info

# Start Django Server
python manage.py runserver 0.0.0.0:8000
```

### 3. Start Frontend UI
```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Default Access Credentials

- **Web Dashboard**: `http://localhost:5173`
- **Superadmin Username**: `admin`
- **Superadmin Password**: `changeme`
- **Tenant User**: `user` / `changeme`

---

## 📖 Complete Documentation

Please refer to [`SETUP_GUIDE.md`](file:///home/madhan/Desktop/ASM-New/SETUP_GUIDE.md) for full configuration details including external security tool integrations (Subfinder, Naabu, Gitleaks, VirusTotal, Faraday, MISP).
