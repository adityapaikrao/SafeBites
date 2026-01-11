"""
SafeBites AI Backend - FastAPI Application
"""
import logging
from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from utils import gemini_client
from utils import database
from agent import agent
from config import settings
from db import get_db, init_db
from auth import get_current_user, get_optional_user
from models import DIETARY_TEMPLATES

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SafeBites AI Backend",
    description="AI-powered product health analysis API",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "SafeBites AI Backend is running!", "status": "healthy", "version": "2.0.0"}


# ============== Product Analysis ==============

@app.post("/api/analyze")
async def analyze_product(
    image: UploadFile = File(...),
    user_id: Optional[str] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Analyze product image and return enriched product data.
    
    Args:
        image: Product image file
        user_id: User ID derived from Auth token (optional)
    """
    logger.info(f"API REQUEST - /api/analyze - Starting product analysis (user_id: {user_id})")
    
    image_bytes = await image.read()

    if not image_bytes:
        logger.error("No image bytes provided")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image bytes payload is required.",
        )

    # Fetch user preferences if user_id is provided
    user_preferences = None
    if user_id:
        try:
            user = database.get_user(db, user_id)
            if user:
                user_preferences = {
                    "allergies": user.get("allergies", []),
                    "dietGoals": user.get("dietGoals", []),
                    "avoidIngredients": user.get("avoidIngredients", []),
                }
                logger.info(f"User preferences loaded for user {user_id}: {user_preferences}")
        except Exception as exc:
            logger.warning(f"Failed to fetch user preferences: {exc}")
            # Continue without preferences if fetch fails

    try:
        product_name = await gemini_client.extract_product_name(image_bytes)
    except Exception as exc:
        logger.error(f"Failed to extract product name: {type(exc).__name__} at line {exc.__traceback__.tb_lineno} of {__file__}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to extract product information from image.",
        ) from exc

    if not product_name:
        logger.warning("No recognizable product found in the provided image.")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No recognizable product found in the provided image.",
        )

    try:
        web_search_result = await agent.run_web_search_agent(product_name)
    except Exception as exc:
        logger.error(f"Web search agent failed: {type(exc).__name__} at line {exc.__traceback__.tb_lineno} of {__file__}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve external product data.",
        ) from exc
    
    try:
        scoring_result = await agent.run_scorer_agent(
            web_search_result.model_dump_json(),
            user_preferences=user_preferences
        )
    except Exception as exc:
        logger.error(f"Scorer agent failed: {type(exc).__name__} at line {exc.__traceback__.tb_lineno} of {__file__}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve scoring data.",
        ) from exc
    
    scoring_result = scoring_result.model_dump_json()

    logger.info("API REQUEST - /api/analyze - Analysis completed successfully")

    return {
        "status": "success",
        "product_name": product_name,
        "scoring_data": scoring_result,
    }


@app.get("/api/reccomendations/{product_name}/{overall_score}")
async def reccomended_alternatives(product_name: str, overall_score: float):
    """Get reccomended alternatives for a product based on its overall score."""
    logger.info(f"API REQUEST - /api/reccomended_alternatives - Getting alternatives for {product_name} with score {overall_score}")
    
    try:
        reccomender_result = await agent.run_reccomender_agent(product_name, overall_score)
    except Exception as exc:
        logger.error(f"Reccomender agent failed: {type(exc).__name__} at line {exc.__traceback__.tb_lineno} of {__file__}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve reccomender data.",
        ) from exc

    logger.info("API REQUEST - /api/reccomended_alternatives - Alternatives retrieved successfully")

    return {
        "status": "success",
        "reccomender_data": reccomender_result.model_dump_json(),
    }


# ============== User Endpoints ==============

class UserCreate(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    allergies: Optional[List[str]] = None
    dietGoals: Optional[List[str]] = None
    avoidIngredients: Optional[List[str]] = None


@app.get("/api/users/me")
async def get_current_user_info(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the currently authenticated user's info"""
    user = database.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": user}


@app.get("/api/users/{user_id}")
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = database.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": user}


@app.post("/api/users")
async def create_or_update_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create or update user"""
    user = database.create_or_update_user(db, user_data.dict())
    return {"user": user}


class UserPreferences(BaseModel):
    allergies: Optional[List[str]] = None
    dietGoals: Optional[List[str]] = None
    avoidIngredients: Optional[List[str]] = None


@app.post("/api/users/{user_id}/preferences")
async def update_user_preferences(
    user_id: str,
    preferences: UserPreferences,
    db: Session = Depends(get_db)
):
    """Update user preferences"""
    preferences_dict = preferences.dict(exclude_none=True)
    user = database.update_user_preferences(db, user_id, preferences_dict)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logger.info(f"User preferences updated for {user_id}: {preferences_dict}")
    return {"user": user}


# ============== Dietary Templates ==============

@app.get("/api/dietary-templates")
async def get_dietary_templates():
    """Get all available dietary templates"""
    return {"templates": DIETARY_TEMPLATES}


@app.post("/api/users/{user_id}/apply-template/{template_key}")
async def apply_dietary_template(
    user_id: str,
    template_key: str,
    db: Session = Depends(get_db)
):
    """Apply a dietary template to user's preferences"""
    if template_key not in DIETARY_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unknown template: {template_key}")
    
    user = database.apply_dietary_template(db, user_id, template_key)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"Applied dietary template '{template_key}' for user {user_id}")
    return {"user": user, "template": DIETARY_TEMPLATES[template_key]}


# ============== Scan Endpoints ==============

class ScanCreate(BaseModel):
    productName: str
    brand: Optional[str] = ""
    image: str
    safetyScore: int
    isSafe: bool
    ingredients: List[dict]
    id: Optional[str] = None
    timestamp: Optional[str] = None


@app.get("/api/users/{user_id}/scans")
async def get_user_scans(
    user_id: str,
    limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get scans for a user"""
    scans = database.get_user_scans(db, user_id, limit)
    return {"scans": scans}


@app.post("/api/users/{user_id}/scans")
async def add_user_scan(
    user_id: str,
    scan_data: ScanCreate,
    db: Session = Depends(get_db)
):
    """Add a scan for a user"""
    scan = database.add_user_scan(db, user_id, scan_data.dict())
    return {"scan": scan, "status": "success"}


@app.get("/api/users/{user_id}/stats")
async def get_user_stats(user_id: str, db: Session = Depends(get_db)):
    """Get statistics for a user"""
    stats = database.get_user_stats(db, user_id)
    if stats is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {"stats": stats}


# ============== Favorites Endpoints ==============

class FavoriteCreate(BaseModel):
    productName: str
    brand: Optional[str] = ""
    safetyScore: Optional[int] = None
    image: Optional[str] = None


@app.get("/api/users/{user_id}/favorites")
async def get_user_favorites(user_id: str, db: Session = Depends(get_db)):
    """Get all favorites for a user"""
    favorites = database.get_user_favorites(db, user_id)
    return {"favorites": favorites}


@app.post("/api/users/{user_id}/favorites")
async def add_favorite(
    user_id: str,
    product_data: FavoriteCreate,
    db: Session = Depends(get_db)
):
    """Add a product to user's favorites"""
    favorite = database.add_favorite(db, user_id, product_data.dict())
    return {"favorite": favorite, "status": "success"}


@app.delete("/api/users/{user_id}/favorites/{favorite_id}")
async def remove_favorite(
    user_id: str,
    favorite_id: int,
    db: Session = Depends(get_db)
):
    """Remove a product from user's favorites"""
    success = database.remove_favorite(db, user_id, favorite_id)
    if not success:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"status": "success"}


@app.get("/api/users/{user_id}/favorites/check/{product_name}")
async def check_favorite(user_id: str, product_name: str, db: Session = Depends(get_db)):
    """Check if a product is in user's favorites"""
    is_favorite = database.is_favorite(db, user_id, product_name)
    return {"isFavorite": is_favorite}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)