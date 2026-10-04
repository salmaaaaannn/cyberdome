# CyberDome Backend — Phase 1 Architecture & API Reference

> **Tagline:** "Your Network's Silent Guardian."

## Overview
Phase 1 establishes the production-grade, authoritative FastAPI backend, database architecture, authentication, RBAC, and multi-tenant company isolation for the CyberDome cybersecurity platform.

---

## 1. Architecture Highlights

```
                                CYBERDOME
                                    │
                  ┌─────────────────┴─────────────────┐
                  │                                   │
            PERSONAL WORLD                      COMPANY WORLD
                  │                                   │
             NORMAL USER                             COMPANY
           company_id = NULL                          │
         NO company_users record        ┌─────────────┼─────────────┐
                                        │             │             │
                                      ADMIN       EMPLOYEES       ASSETS
                                        │             │             │
                                        └─────────────┼─────────────┘
                                                      │
                                            Company-specific data
                                                      │
                                    ┌─────────────────┼─────────────────┐
                                    │                 │                 │
                              Vulnerabilities     Incidents          Reports
                                    │                 │                 │
                                    └─────────────────┼─────────────────┘
                                                      │
                                                  company_id
```

### Key Principles
1. **Strict Multi-Tenancy**: Every company-owned record belongs to a `company_id`. Company A cannot access Company B resources (enforced server-side with 403 Forbidden and audit logging).
2. **Normal User Independence**: Normal users have `account_type = 'USER'`, `role = 'USER'`, `company_id = NULL`, and **no entry in `company_users`**. They are strictly barred from enterprise endpoints and are never counted in company employee statistics.
3. **Individual Credentials**: Every Admin, Employee, and Normal User has their own individual account and bcrypt-hashed password (no shared company passwords).
4. **Authoritative Backend Security**: Route access is enforced server-side via FastAPI dependencies (`get_current_user`, `require_role`, `require_permission`, `validate_tenant_access`).

---

## 2. API Endpoints Reference (`/api/v1`)

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/signup` — Public Normal User registration (no company code required, sets `company_id = NULL`).
- `POST /api/v1/auth/company-signup` — Provisions new Company, creates Admin user, and establishes Admin membership.
- `POST /api/v1/auth/login` — Unified login verifying individual credentials; returns JWT and role-based redirect target:
  - `ADMIN` → `/admin`
  - `EMPLOYEE` → `/employee/dashboard`
  - `USER` → `/personal/dashboard`
- `GET  /api/v1/auth/me` — Fetches authenticated user identity, role, permissions, and company info (if applicable).
- `POST /api/v1/auth/logout` — Logs logout event in immutable audit trail.
- `POST /api/v1/auth/forgot-password` — Secure password reset request.
- `POST /api/v1/auth/reset-password` — Password reset completion.

### Companies & Membership (`/api/v1/companies`)
- `POST /api/v1/companies/join` — Employee joins company using hashed company access code (e.g. `CSX-COMPANY`).
- `POST /api/v1/companies/invitations/accept` — Employee joins via secure Admin invitation token.

### Admin Portal (`/api/v1/admin`)
- `GET   /api/v1/admin/overview` — Company metrics overview (counts strictly `company_users`, NEVER public normal users).
- `GET   /api/v1/admin/employees` — Lists all employees for the admin's company.
- `POST  /api/v1/admin/employees/invite` — Creates an invitation token for an employee.
- `PATCH /api/v1/admin/employees/{id}/role` — Updates employee role/department.
- `PATCH /api/v1/admin/employees/{id}/status` — Activates, suspends, or deactivates an employee.
- `POST  /api/v1/admin/employees/{id}/reset-access` — Dispatches individual password reset.
- `GET   /api/v1/admin/company` — Retrieves company profile.
- `PATCH /api/v1/admin/company` — Updates company details.
- `GET   /api/v1/admin/audit` — Retrieves immutable company audit logs.

### Multi-Tenant Assets (`/api/v1/assets`)
- `GET  /api/v1/assets` — Lists assets belonging to the user's company (Admin and Employee).
- `GET  /api/v1/assets/{id}` — Fetches single asset with cross-tenant barrier validation.
- `POST /api/v1/assets` — Creates an asset bound to the caller's company.

### Notifications (`/api/v1/notifications`)
- `GET   /api/v1/notifications` — Fetches personal notifications (for Normal Users) or company alerts (for Company Users).
- `PATCH /api/v1/notifications/{id}/read` — Marks notification as read.
- `GET   /api/v1/notifications/preferences` — Gets user notification preferences.
- `PATCH /api/v1/notifications/preferences` — Updates notification preferences.

---

## 3. Running the Backend & Tests

### Start the FastAPI Server:
```bash
cd backend
source venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Swagger UI available at: `http://localhost:8000/docs`
Health check at: `http://localhost:8000/api/v1/health`

### Run Automated Tests:
```bash
cd backend
PYTHONPATH=. venv/bin/pytest -v tests/test_phase1.py
```
*(All 10 tests pass, covering Normal User isolation, Company signup, login routing, access code onboarding, invitation flow, cross-tenant barrier blocks, and admin employee metrics).*
