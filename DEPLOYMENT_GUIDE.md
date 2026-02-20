# SafeBites Deployment Guide

Follow this step-by-step guide to deploy your full-stack application to the web.

## 📋 Prerequisites
1. **GitHub Account**: Your code must be pushed to a GitHub repository.
2. **Supabase Account**: For the hosted PostgreSQL database.
3. **Render Account**: To host the FastAPI backend.
4. **Vercel Account**: To host the Next.js frontend.
5. **Auth0 Account**: To configure production URLs.

---

## 💾 Step 1: Database Setup (Supabase)

1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Note your database password!
3. Go to **Project Settings** → **Database** → **Connection String** → **URI**.
4. Copy the connection string. It will look like:
   `postgresql://postgres.kae...@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
5. Replace `[YOUR-PASSWORD]` with your actual password.
   > **Save this URL**. You will need it for the Render backend.

---

## 🚀 Step 2: Backend Deployment (Render)

1. Log in to [Render](https://render.com/).
2. Click **New +** → **Web Service**.
3. Connect your SafeBites GitHub repository.
4. Select the `backend` directory as the **Root Directory**.
5. **Runtime**: Python 3
6. **Build Command**: `pip install -r requirements.txt`
7. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
8. Scroll down to **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `PYTHON_VERSION` | `3.11.9` |
| `DATABASE_URL` | your supabase connection string (from Step 1) |
| `OPENAI_API_KEY` | your openai api key |
| `GEMINI_API_KEY` | your gemini api key |
| `AUTH0_DOMAIN` | your-tenant.auth0.com |
| `AUTH0_API_AUDIENCE` | https://safebites-api |

9. Click **Create Web Service**.
10. Wait for deployment. Once live, copy your **Backend URL** (e.g., `https://safebites-api.onrender.com`).

---

## 🌐 Step 3: Frontend Deployment (Vercel)

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** → **Project**.
3. Import your SafeBites GitHub repository.
4. **Framework Preset**: Next.js (should detect automatically).
5. Open **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `AUTH0_SECRET` | the generated hex secret |
| `AUTH0_BASE_URL` | leave empty or `https://your-vercel-project.vercel.app` (Vercel sets the default URL automatically, but specifically for Auth0 you might need to hardcode the production URL once you know it) |
| `AUTH0_ISSUER_BASE_URL` | https://your-tenant.auth0.com |
| `AUTH0_CLIENT_ID` | from Auth0 dashboard |
| `AUTH0_CLIENT_SECRET` | from Auth0 dashboard |
| `NEXT_PUBLIC_BACKEND_URL` | your Render backend URL (from Step 2) |

> **Note on AUTH0_BASE_URL**: On Vercel, you often have to deploy once to get the domain, then update this variable with the assigned domain (e.g., `https://safebites.vercel.app`), and redeploy.

6. Click **Deploy**.

---

## 🔒 Step 4: Auth0 Production Configuration

1. Go to your Auth0 Dashboard → Applications → SafeBites.
2. Update the **Application URIs** with your new Vercel domain:

| Setting | Add Value |
|---------|-----------|
| **Allowed Callback URLs** | `https://your-app.vercel.app/api/auth/callback` |
| **Allowed Logout URLs** | `https://your-app.vercel.app` |
| **Allowed Web Origins** | `https://your-app.vercel.app` |

3. Save Changes.

---

## ✅ Step 5: Verification

1. Go to your Vercel URL (e.g., `https://safebites.vercel.app`).
2. Login should work (redirects to Auth0 and back).
3. Try scanning an item. It should talk to the Render backend, which talks to the Supabase DB.
