📄 Project: Personal AI Stylist (MVP)
Goal: An AI-driven fashion assistant that manages your wardrobe and suggests the perfect outfit based on weather, personal taste, and style aspirations.

🚀 1. Core Functional Specifications (핵심 기능)
1.1 User Management
Authentication: Secure login via Email/Password and Social Auth (Google, Apple).

Style Profile: Onboarding to collect Gender, Location (for weather sync), and Preferred Style Keywords.

1.2 Digital Wardrobe (AI Closet)
Smart Registration: One-tap photo upload with YOLO-based automatic category classification.

Feature Extraction: Utilize CLIP model to extract visual embeddings (Texture, Pattern, Silhouette).

Smart Status: Tracking via isWashing and isArchived to ensure recommendation accuracy.

Thermal Mapping: Define minTemp and maxTemp for each item to drive weather-aware suggestions.

1.3 Style Book (Reference Gallery)
Inspiration Scraping: Save "Goal Styles" from magazines, Pinterest, or Instagram screenshots.

Visual Deconstruction: Segment images into individual items and store their 768-dim embedding vectors.

Preference Learning: AI analyzes the "Mood" of the Style Book to refine the recommendation engine's filter.

1.4 Daily Outfit (Weather-Adaptive Suggestion)
Weather API Integration: Real-time sync with local weather (Temp, Precipitation) based on the user's location (e.g., Vancouver, BC).

Hard Filtering: First-pass filtering of items that match the current temperature.

Ranking (Vector Search): Sort filtered items by Cosine Similarity against the user's Style Book embeddings.

1.5 Monetization: "The Missing Piece" (Affiliate Marketing)
Gap Analysis: Identify items in a Style Book image that are missing from the user's actual closet.

Similar Item Search: Query external e-commerce databases for visually similar products.

Purchase Integration: Provide Affiliate Links via the WishlistItem model.

Business Logic: "Shop the Look" CTA allowing users to purchase the missing item to complete a desired style.