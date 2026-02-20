# SafeBites Web Deployment - Task List

## Phase 1: Database Migration
- [x] Install SQLAlchemy and database drivers
- [x] Create database models (`User`, `Scan`, `Favorite`)
- [x] Migrate `database.py` from JSON to SQLAlchemy
- [x] Test locally with SQLite

## Phase 2: Backend Auth Hardening
- [x] Install `python-jose` and `httpx` for JWT verification
- [x] Create Auth0 token verification middleware
- [x] Protect all user-specific endpoints with auth dependency
- [x] Remove `user_id` from form fields, derive from token

## Phase 3: New Features
- [x] Add Favorites model and endpoints (`POST/DELETE /api/users/{id}/favorites`)
- [x] Add Dietary Templates endpoint (`GET /api/dietary-templates`)
- [x] Create frontend Favorites UI (star button on results, favorites page)
- [x] Create frontend Dietary Templates selector in onboarding

## Phase 4: Frontend Integration
- [x] Update `backendApi.ts` to use environment variable for backend URL
- [x] Attach Auth0 access token to all backend API calls
- [x] Create Scan History page with pagination
- [x] Create Favorites page

## Phase 5: Deployment Configuration
- [x] Create `render.yaml` for backend deployment
- [ ] Configure Vercel environment variables for frontend
- [ ] Set up Supabase PostgreSQL for production
- [ ] Configure Auth0 for production URLs (callbacks, allowed origins)
- [ ] Test end-to-end on deployed environment
