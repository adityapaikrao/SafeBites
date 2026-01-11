"""
SQLAlchemy models for SafeBites
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship, DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all models"""
    pass


class User(Base):
    """User model storing Auth0 user info and preferences"""
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # Auth0 sub (e.g., "auth0|123...")
    email = Column(String, nullable=False)
    name = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    
    # Preferences stored as JSON arrays
    allergies = Column(JSON, default=list)
    diet_goals = Column(JSON, default=list)
    avoid_ingredients = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scans = relationship("Scan", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "picture": self.picture,
            "allergies": self.allergies or [],
            "dietGoals": self.diet_goals or [],
            "avoidIngredients": self.avoid_ingredients or [],
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class Scan(Base):
    """Scan history for a user"""
    __tablename__ = "scans"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    product_name = Column(String, nullable=False)
    brand = Column(String, nullable=True, default="")
    image = Column(Text, nullable=True)  # Base64 or URL
    safety_score = Column(Integer, nullable=False)
    is_safe = Column(Boolean, nullable=False)
    ingredients = Column(JSON, default=list)  # List of ingredient dicts
    
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="scans")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "productName": self.product_name,
            "brand": self.brand or "",
            "image": self.image,
            "safetyScore": self.safety_score,
            "isSafe": self.is_safe,
            "ingredients": self.ingredients or [],
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None,
        }


class Favorite(Base):
    """User's favorite/bookmarked products"""
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    product_name = Column(String, nullable=False)
    brand = Column(String, nullable=True, default="")
    safety_score = Column(Integer, nullable=True)
    image = Column(Text, nullable=True)
    
    added_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="favorites")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "productName": self.product_name,
            "brand": self.brand or "",
            "safetyScore": self.safety_score,
            "image": self.image,
            "addedAt": self.added_at.isoformat() + "Z" if self.added_at else None,
        }


# Dietary templates - predefined preference sets
DIETARY_TEMPLATES = {
    "vegan": {
        "name": "Vegan",
        "description": "No animal products",
        "allergies": [],
        "dietGoals": ["vegan"],
        "avoidIngredients": [
            "meat", "fish", "dairy", "eggs", "honey", "gelatin",
            "whey", "casein", "lactose", "shellac"
        ]
    },
    "vegetarian": {
        "name": "Vegetarian",
        "description": "No meat or fish",
        "allergies": [],
        "dietGoals": ["vegetarian"],
        "avoidIngredients": ["meat", "fish", "gelatin", "shellac"]
    },
    "gluten_free": {
        "name": "Gluten-Free",
        "description": "No gluten-containing grains",
        "allergies": ["gluten"],
        "dietGoals": ["gluten-free"],
        "avoidIngredients": ["wheat", "barley", "rye", "malt", "brewer's yeast"]
    },
    "keto": {
        "name": "Keto",
        "description": "Low carb, high fat diet",
        "allergies": [],
        "dietGoals": ["keto", "low-carb"],
        "avoidIngredients": [
            "sugar", "corn syrup", "high fructose corn syrup",
            "maltodextrin", "dextrose", "sucrose"
        ]
    },
    "dairy_free": {
        "name": "Dairy-Free",
        "description": "No dairy products",
        "allergies": ["dairy"],
        "dietGoals": ["dairy-free"],
        "avoidIngredients": [
            "milk", "cream", "butter", "cheese", "yogurt",
            "whey", "casein", "lactose"
        ]
    },
    "nut_free": {
        "name": "Nut-Free",
        "description": "No tree nuts or peanuts",
        "allergies": ["tree nuts", "peanuts"],
        "dietGoals": ["nut-free"],
        "avoidIngredients": [
            "almonds", "cashews", "walnuts", "pecans", "pistachios",
            "hazelnuts", "macadamia", "brazil nuts", "peanuts"
        ]
    },
    "paleo": {
        "name": "Paleo",
        "description": "Whole foods, no processed ingredients",
        "allergies": [],
        "dietGoals": ["paleo"],
        "avoidIngredients": [
            "sugar", "corn syrup", "soy", "legumes", "dairy",
            "grains", "processed oils", "artificial sweeteners"
        ]
    },
}
