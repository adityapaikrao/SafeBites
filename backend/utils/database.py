"""
Database operations for SafeBites using SQLAlchemy
"""
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session

from models import User, Scan, Favorite, DIETARY_TEMPLATES

logger = logging.getLogger(__name__)


# ============== User Operations ==============

def get_user(db: Session, user_id: str) -> Optional[Dict]:
    """Get user by ID, returns dict for API compatibility"""
    user = db.query(User).filter(User.id == user_id).first()
    return user.to_dict() if user else None


def create_or_update_user(db: Session, user_data: Dict) -> Dict:
    """Create or update user"""
    user_id = user_data.get('id')
    if not user_id:
        raise ValueError("User ID is required")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if user:
        # Update existing user
        if 'email' in user_data:
            user.email = user_data['email']
        if 'name' in user_data:
            user.name = user_data['name']
        if 'picture' in user_data:
            user.picture = user_data['picture']
        if 'allergies' in user_data:
            user.allergies = user_data['allergies']
        if 'dietGoals' in user_data:
            user.diet_goals = user_data['dietGoals']
        if 'avoidIngredients' in user_data:
            user.avoid_ingredients = user_data['avoidIngredients']
        user.updated_at = datetime.utcnow()
    else:
        # Create new user
        user = User(
            id=user_id,
            email=user_data.get('email', ''),
            name=user_data.get('name'),
            picture=user_data.get('picture'),
            allergies=user_data.get('allergies', []),
            diet_goals=user_data.get('dietGoals', []),
            avoid_ingredients=user_data.get('avoidIngredients', []),
            created_at=datetime.utcnow()
        )
        db.add(user)
    
    db.commit()
    db.refresh(user)
    return user.to_dict()


def update_user_preferences(db: Session, user_id: str, preferences: Dict) -> Optional[Dict]:
    """Update user preferences"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    
    if 'allergies' in preferences:
        user.allergies = preferences['allergies'] or []
    if 'dietGoals' in preferences:
        user.diet_goals = preferences['dietGoals'] or []
    if 'avoidIngredients' in preferences:
        user.avoid_ingredients = preferences['avoidIngredients'] or []
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user.to_dict()


def apply_dietary_template(db: Session, user_id: str, template_key: str) -> Optional[Dict]:
    """Apply a predefined dietary template to user preferences"""
    if template_key not in DIETARY_TEMPLATES:
        raise ValueError(f"Unknown template: {template_key}")
    
    template = DIETARY_TEMPLATES[template_key]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    
    # Merge template with existing preferences (don't overwrite, extend)
    existing_allergies = set(user.allergies or [])
    existing_goals = set(user.diet_goals or [])
    existing_avoid = set(user.avoid_ingredients or [])
    
    user.allergies = list(existing_allergies | set(template['allergies']))
    user.diet_goals = list(existing_goals | set(template['dietGoals']))
    user.avoid_ingredients = list(existing_avoid | set(template['avoidIngredients']))
    user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    return user.to_dict()


# ============== Scan Operations ==============

def get_user_scans(db: Session, user_id: str, limit: Optional[int] = None) -> List[Dict]:
    """Get scans for a user, ordered by most recent first"""
    query = db.query(Scan).filter(Scan.user_id == user_id).order_by(Scan.timestamp.desc())
    if limit:
        query = query.limit(limit)
    return [scan.to_dict() for scan in query.all()]


def add_user_scan(db: Session, user_id: str, scan_data: Dict) -> Dict:
    """Add a scan for a user"""
    scan_id = scan_data.get('id') or f"scan_{user_id}_{datetime.utcnow().timestamp()}"
    
    scan = Scan(
        id=scan_id,
        user_id=user_id,
        product_name=scan_data.get('productName', ''),
        brand=scan_data.get('brand', ''),
        image=scan_data.get('image'),
        safety_score=scan_data.get('safetyScore', 0),
        is_safe=scan_data.get('isSafe', False),
        ingredients=scan_data.get('ingredients', []),
        timestamp=datetime.utcnow()
    )
    
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan.to_dict()


def get_user_stats(db: Session, user_id: str) -> Optional[Dict]:
    """Get statistics for a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    
    scans = db.query(Scan).filter(Scan.user_id == user_id).all()
    
    if not scans:
        return {
            'totalScans': 0,
            'todayScans': 0,
            'safeToday': 0,
            'riskyToday': 0,
            'averageScore': 0,
        }
    
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    
    today_scans = [s for s in scans if s.timestamp and s.timestamp >= today_start]
    safe_today = sum(1 for s in today_scans if s.is_safe)
    
    total_score = sum(s.safety_score for s in scans)
    avg_score = int(total_score / len(scans)) if scans else 0
    
    return {
        'totalScans': len(scans),
        'todayScans': len(today_scans),
        'safeToday': safe_today,
        'riskyToday': len(today_scans) - safe_today,
        'averageScore': avg_score,
    }


# ============== Favorites Operations ==============

def get_user_favorites(db: Session, user_id: str) -> List[Dict]:
    """Get all favorites for a user"""
    favorites = db.query(Favorite).filter(Favorite.user_id == user_id).order_by(Favorite.added_at.desc()).all()
    return [fav.to_dict() for fav in favorites]


def add_favorite(db: Session, user_id: str, product_data: Dict) -> Dict:
    """Add a product to user's favorites"""
    # Check if already favorited
    existing = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_name == product_data.get('productName', '')
    ).first()
    
    if existing:
        return existing.to_dict()
    
    favorite = Favorite(
        user_id=user_id,
        product_name=product_data.get('productName', ''),
        brand=product_data.get('brand', ''),
        safety_score=product_data.get('safetyScore'),
        image=product_data.get('image'),
        added_at=datetime.utcnow()
    )
    
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite.to_dict()


def remove_favorite(db: Session, user_id: str, favorite_id: int) -> bool:
    """Remove a product from user's favorites"""
    favorite = db.query(Favorite).filter(
        Favorite.id == favorite_id,
        Favorite.user_id == user_id
    ).first()
    
    if not favorite:
        return False
    
    db.delete(favorite)
    db.commit()
    return True


def is_favorite(db: Session, user_id: str, product_name: str) -> bool:
    """Check if a product is in user's favorites"""
    favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_name == product_name
    ).first()
    return favorite is not None


# ============== Dietary Templates ==============

def get_dietary_templates() -> Dict[str, Any]:
    """Get all available dietary templates"""
    return DIETARY_TEMPLATES
