# SafeBites Complete Setup Guide

## Prerequisites
- Node.js 18+
- Python 3.11+
- Auth0 account (free tier works)
- OpenAI API key
- Google Gemini API key

---

## Step 1: Auth0 Setup (One-time)

### 1.1 Create Auth0 Application
1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. **Applications** → **Create Application**
3. Name: `SafeBites`, Type: **Regular Web Applications**
4. Click **Create**

### 1.2 Configure Application Settings
In Settings tab, set:

| Setting | Value |
|---------|-------|
| Allowed Callback URLs | `http://localhost:3000/api/auth/callback` |
| Allowed Logout URLs | `http://localhost:3000` |
| Allowed Web Origins | `http://localhost:3000` |

Click **Save Changes**

### 1.3 Note Your Credentials
From the Settings tab, copy:
- **Domain** (e.g., `dev-xxxxx.us.auth0.com`)
- **Client ID**
- **Client Secret**

---

## Step 2: Environment Variables

### 2.1 Generate AUTH0_SECRET
Run in terminal:
```bash
openssl rand -hex 32
```
Copy the output.

### 2.2 Frontend: `frontend/.env.local`
Create/edit this file:

```bash
# Auth0 - REQUIRED
AUTH0_SECRET=<paste-output-from-step-2.1>
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://<your-auth0-domain>
AUTH0_CLIENT_ID=<your-client-id>
AUTH0_CLIENT_SECRET=<your-client-secret>

# Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

**Example:**
```bash
AUTH0_SECRET=a1b2c3d4e5f6...
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://dev-abc123.us.auth0.com
AUTH0_CLIENT_ID=xyzABC123...
AUTH0_CLIENT_SECRET=secret123...
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 2.3 Backend: `backend/.env`
Create/edit this file:

```bash
# API Keys - REQUIRED
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AI...

# Server
PORT=8000
ENV=development

# CORS
CORS_ORIGINS=http://localhost:3000

# Database (SQLite for local dev)
DATABASE_URL=sqlite:///./safebites.db

# Auth0 (optional for dev mode)
AUTH0_DOMAIN=dev-abc123.us.auth0.com
AUTH0_API_AUDIENCE=
```

---

## Step 3: Install Dependencies

### Backend
```bash
cd backend
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

---

## Step 4: Run the App

### Terminal 1 - Backend
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

---

## Step 5: Test

1. Open http://localhost:3000
2. Click **Login** / **Continue with Auth0**
3. Create account or sign in
4. Complete onboarding (allergies, diet goals)
5. Try scanning a product!

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 500 on /api/auth/login | Check all Auth0 env vars are set correctly |
| "Invalid callback URL" | Verify callback URL in Auth0 dashboard matches exactly |
| Backend connection error | Ensure backend is running on port 8000 |
| CORS error | Check CORS_ORIGINS includes http://localhost:3000 |

---

## Quick Checklist

- [ ] Auth0 application created
- [ ] Callback URLs configured in Auth0
- [ ] `frontend/.env.local` has all 6 variables
- [ ] `backend/.env` has OPENAI_API_KEY and GEMINI_API_KEY
- [ ] Both `npm install` and `pip install` completed
- [ ] Both servers running
