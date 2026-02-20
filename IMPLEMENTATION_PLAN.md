# SafeBites Web Deployment - Implementation Plan

Convert SafeBites from a local development setup to a fully deployed, production-ready web application with user history, secure session management, favorites, and dietary templates.

## User Review Required

> [!IMPORTANT]
> **Database Choice**: Plan uses **Supabase (PostgreSQL)** for production. Confirm this is acceptable or if you prefer another provider (e.g., PlanetScale, Railway).

> [!IMPORTANT]
> **Backend Hosting**: Plan uses **Render.com** free tier for FastAPI. Alternatives include Railway or AWS Lambda via Mangum.

> [!WARNING]
> **Auth0 Configuration**: You will need to update Auth0 dashboard with production callback URLs once deployed.

---

## Proposed Changes

### Backend - Database Layer

Replace JSON file storage with SQLAlchemy ORM for reliable, scalable data persistence.

#### [NEW] [models.py](file:///Users/adityapaikrao/projects/SafeBites/backend/models.py)
SQLAlchemy models:
- `User`: id (Auth0 sub), email, name, picture, allergies (JSON), diet_goals (JSON), avoid_ingredients (JSON), created_at
- `Scan`: id, user_id (FK), product_name, brand, image_url, safety_score, is_safe, ingredients (JSON), timestamp
- `Favorite`: id, user_id (FK), product_name, added_at

#### [NEW] [db.py](file:///Users/adityapaikrao/projects/SafeBites/backend/db.py)
Database session management:
- `get_db()` dependency for FastAPI
- Connection string from `DATABASE_URL` env var
- SQLite for dev, PostgreSQL for prod

#### [MODIFY] [database.py](file:///Users/adityapaikrao/projects/SafeBites/backend/utils/database.py)
Rewrite all functions to use SQLAlchemy session instead of JSON read/write:
- `get_user()` → `session.query(User).filter_by(id=user_id).first()`
- `add_user_scan()` → `session.add(Scan(...))`
- Add `add_favorite()`, `remove_favorite()`, `get_favorites()`

---

### Backend - Authentication

Move session validation from frontend to backend using JWT verification.

#### [NEW] [auth.py](file:///Users/adityapaikrao/projects/SafeBites/backend/auth.py)
Auth0 JWT verification:
```python
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    # Verify with Auth0 JWKS
    # Return user_id (sub claim)
```

#### [MODIFY] [main.py](file:///Users/adityapaikrao/projects/SafeBites/backend/main.py)
- Import `get_current_user` dependency
- Replace `user_id: Optional[str] = Form(None)` with `user_id: str = Depends(get_current_user)`
- All protected endpoints now require valid Bearer token

---

### Backend - New Features

#### [NEW] Favorites Endpoints in [main.py](file:///Users/adityapaikrao/projects/SafeBites/backend/main.py)
```python
@app.post("/api/users/{user_id}/favorites/{product_name}")
@app.delete("/api/users/{user_id}/favorites/{product_name}")
@app.get("/api/users/{user_id}/favorites")
```

#### [NEW] Dietary Templates Endpoint
```python
@app.get("/api/dietary-templates")
# Returns predefined templates: Vegan, Keto, Gluten-Free, etc.
```

---

### Frontend - API Integration

#### [MODIFY] [backendApi.ts](file:///Users/adityapaikrao/projects/SafeBites/frontend/lib/backendApi.ts)
- Use `process.env.NEXT_PUBLIC_BACKEND_URL` instead of hardcoded localhost
- Add `getAccessToken()` helper using Auth0
- Attach `Authorization: Bearer <token>` header to all requests

#### [NEW] [app/api/token/route.ts](file:///Users/adityapaikrao/projects/SafeBites/frontend/app/api/token/route.ts)
Server-side route to fetch access token for backend API calls.

---

### Frontend - New Pages

#### [NEW] [app/history/page.tsx](file:///Users/adityapaikrao/projects/SafeBites/frontend/app/history/page.tsx)
Scan History page:
- Paginated list of past scans
- Click to view full result details
- Filter by date range

#### [NEW] [app/favorites/page.tsx](file:///Users/adityapaikrao/projects/SafeBites/frontend/app/favorites/page.tsx)
Favorites page:
- Grid of favorited products
- Quick safety score badge
- Remove from favorites action

#### [MODIFY] [components/scan-result/](file:///Users/adityapaikrao/projects/SafeBites/frontend/components/scan-result/)
Add "Add to Favorites" star button on scan results.

#### [MODIFY] [components/onboarding/](file:///Users/adityapaikrao/projects/SafeBites/frontend/components/onboarding/)
Add "Quick Setup" section with dietary template buttons (Vegan, Keto, etc.).

---

### Deployment Configuration

#### [NEW] [render.yaml](file:///Users/adityapaikrao/projects/SafeBites/backend/render.yaml)
```yaml
services:
  - type: web
    name: REDACTED_PASSWORD-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: AUTH0_DOMAIN
        sync: false
      - key: AUTH0_API_AUDIENCE
        sync: false
```

#### [MODIFY] [.env.example](file:///Users/adityapaikrao/projects/SafeBites/backend/.env.example)
Add new required variables:
- `DATABASE_URL`
- `AUTH0_DOMAIN`
- `AUTH0_API_AUDIENCE`

#### Frontend Vercel Config
Environment variables to set in Vercel dashboard:
- `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`
- `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- `NEXT_PUBLIC_BACKEND_URL` → Render backend URL

---

## Verification Plan

### Automated Tests
1. Run `pytest` on backend after database migration
2. Run `npm run build` on frontend to catch TypeScript errors
3. Test Auth0 flow locally with `npm run dev` and backend `uvicorn`

### Manual Verification
1. Complete login flow → verify token attached to API calls
2. Scan a product → verify scan saved to database
3. Add to favorites → verify appears on Favorites page
4. Select dietary template → verify preferences populated
5. Deploy to Render/Vercel → test full production flow
