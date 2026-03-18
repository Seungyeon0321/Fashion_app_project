# AI Fashion Coordinator - Database Schema Design

## 1. Overview
This document outlines the database design for the AI-based Fashion Coordination App.
It is designed to manage user wardrobe data and optimize image similarity search and style recommendations using AI models (CLIP).

* **Database:** PostgreSQL (v15+)
* **ORM:** Prisma
* **Key Extension:** `pgvector` (Vector operation and search optimization)

## 2. Key Strategies

### A. Vector Search Optimization
* **`embedding` field in `ClosetItem` table:**
    * Directly stores 768-dimensional vector data extracted by the AI model (CLIP) into the database.
    * Utilizes PostgreSQL's `vector` extension to perform high-speed similarity searches (Cosine Similarity) at the DB level, eliminating the need to load all clothing data into memory on an external Python server.
    * Optimized to search quickly within a specific user's wardrobe by combining with the `userId` index.

### B. Outfit Combination Flexibility
* **Resolving N:M Relationships (`OutfitItem`):**
    * Clothes (`ClosetItem`) and Outfits (`Outfit`) have a Many-to-Many relationship. A single item can be used in multiple outfits.
    * An `OutfitItem` junction table is used to prevent data redundancy and to store placement (layering) or positional information of items within a specific outfit.
* **Shopping Item Integration:**
    * The `wishlistItemId` (FK to `WishlistItem`) in `OutfitItem` allows items **not owned by the user (recommended purchase items)** to be included as part of an outfit. (Supports the monetization model).

### C. Visual Style Analysis
* **`StyleReference` table:**
    * Stores 'Inspirational Style' photos uploaded by the user.
    * The `analysisResult` (JSON) field stores analysis results from YOLO (Object Detection), e.g. `{ "top": { "bbox": [x,y,w,h], "color": "red" }, "bottom": ... }`. This allows the UI to display bounding boxes without re-running the AI model every time.

---

## 1. Technologies & Conventions

| Category      | Technology                          |
|---------------|-------------------------------------|
| Database      | PostgreSQL (v15+)                   |
| Extensions    | pgvector (Vector Similarity Search) |
| ORM           | Prisma                              |
| Target Market | Canada (Unit: Celsius, Currency: CAD) |

## 2. Domain: User & Authentication

### Table: User

| Column    | Type   | Constraints              | Description           |
|-----------|--------|---------------------------|-----------------------|
| id        | INT    | PK, AUTO_INCREMENT        | Unique user ID        |
| email     | STRING | UNIQUE, NOT NULL          | Login email           |
| password  | STRING | NOT NULL                  | Hashed password       |
| nickname  | STRING | NULLABLE                  | Display name          |
| gender    | Gender | NULLABLE                  | For recommendation fit (MALE, FEMALE, UNISEX) |
| location  | STRING | NULLABLE                  | For Weather API (e.g. Vancouver) |
| createdAt | DATETIME | NOT NULL, DEFAULT now() | Created at            |
| updatedAt | DATETIME | NOT NULL, @updatedAt    | Last updated          |

## 3. Domain: Digital Wardrobe (Closet)

### Table: ClosetItem

| Column      | Type   | Constraints           | Description            |
|-------------|--------|------------------------|------------------------|
| id          | INT    | PK, AUTO_INCREMENT     | Unique item ID         |
| userId      | INT    | FK (User.id), CASCADE  | Owner                  |
| imageUrl    | STRING | NOT NULL               | Item image URL         |
| category    | Category | NOT NULL             | Major category (TOP, BOTTOM, OUTER, DRESS, SHOES, BAG, ACC) |
| subCategory | SubCategory | NOT NULL          | Precise category (T_SHIRT_SHORT, JACKET, COAT, ...) |
| minTemp     | FLOAT  | NULLABLE               | Min wearable temp (°C) |
| maxTemp     | FLOAT  | NULLABLE               | Max wearable temp (°C) |
| isArchived  | BOOLEAN| DEFAULT FALSE          | Exclude discarded/unworn items |
| isWashing   | BOOLEAN| DEFAULT FALSE          | Currently in laundry   |
| embedding   | VECTOR | vector(768), NULLABLE  | Visual vector (CLIP)   |
| colors      | STRING[] | NOT NULL             | Detected colors        |
| season      | Season | NULLABLE               | SPRING, SUMMER, FALL, WINTER, ALL |
| brand       | STRING | NULLABLE               | Brand name             |
| wearCount   | INT    | DEFAULT 0              | Usage frequency        |
| createdAt   | DATETIME | DEFAULT now()         | Created at             |
| updatedAt   | DATETIME | @updatedAt            | Last updated           |

## 4. Domain: Style Reference (Style Book)

### Table: StyleReference

| Column           | Type   | Constraints       | Description         |
|------------------|--------|-------------------|---------------------|
| id               | INT    | PK, AUTO_INCREMENT| Reference photo ID  |
| userId           | INT    | FK (User.id), CASCADE | Linked user    |
| originalImageUrl | STRING | NOT NULL          | Uploaded photo URL  |
| rating           | INT    | DEFAULT 5         | User rating         |
| analysisResult   | JSON   | NULLABLE          | YOLO (e.g. top/bottom bbox, colors) |
| embedding        | VECTOR | vector(768), NULLABLE | Style mood vector |
| createdAt        | DATETIME | DEFAULT now()   | Created at          |

## 5. Domain: Outfit & Recommendations

### Table: Outfit

| Column        | Type         | Constraints       | Description         |
|---------------|--------------|-------------------|---------------------|
| id            | INT          | PK, AUTO_INCREMENT| Combination ID      |
| userId        | INT          | FK (User.id), CASCADE | Created by      |
| title         | STRING       | NULLABLE          | Outfit title        |
| imageUrl      | STRING       | NULLABLE          | Completed outfit image |
| recordedTemp  | FLOAT        | NULLABLE          | Temp at record time (°C) |
| recordedWeather | STRING     | NULLABLE          | Rainy, Snowy, etc.  |
| source        | OutfitSource | DEFAULT MANUAL    | MANUAL, AI_SUGGEST, CALENDAR |
| createdAt     | DATETIME     | DEFAULT now()     | Created at          |

### Table: OutfitItem

| Column         | Type   | Constraints    | Description           |
|----------------|--------|----------------|-----------------------|
| id             | INT    | PK, AUTO_INCREMENT | Row ID            |
| outfitId       | INT    | FK (Outfit.id), CASCADE | Parent Outfit   |
| closetItemId   | INT    | NULLABLE, FK   | Owned item used       |
| wishlistItemId | INT    | NULLABLE, FK   | Recommended purchase (WishlistItem) |
| position       | STRING | NULLABLE      | Layering order (e.g. INNER, OUTER) |

## 6. Domain: Wishlist & Monetization

### Table: WishlistItem

| Column        | Type        | Constraints       | Description            |
|---------------|-------------|-------------------|------------------------|
| id            | INT         | PK, AUTO_INCREMENT| Wish item ID           |
| userId        | INT         | FK (User.id), CASCADE | Target user        |
| productName   | STRING      | NULLABLE          | Product name           |
| brand         | STRING      | NULLABLE          | Brand                  |
| price         | FLOAT       | NULLABLE          | Item price             |
| currency      | STRING      | DEFAULT "CAD"     | e.g. CAD               |
| imageUrl      | STRING      | NOT NULL          | Product image URL      |
| purchaseUrl   | STRING      | NOT NULL          | Affiliate Link         |
| embedding     | VECTOR      | vector(768), NULLABLE | For similarity with ClosetItem |
| category      | Category    | NOT NULL          | TOP, BOTTOM, OUTER, ...|
| subCategory   | SubCategory | NOT NULL          | Precise category       |
| originStyleId | INT         | NULLABLE, FK (StyleReference.id) | Recommendation source |
| isPurchased   | BOOLEAN     | DEFAULT FALSE     | Conversion tracking    |
| createdAt     | DATETIME    | DEFAULT now()     | Created at             |

## 7. Enums

| Enum          | Values |
|---------------|--------|
| Gender        | MALE, FEMALE, UNISEX |
| Category      | TOP, BOTTOM, OUTER, DRESS, SHOES, BAG, ACC |
| SubCategory   | T_SHIRT_SHORT, T_SHIRT_LONG, SHIRT, KNIT, SWEATSHIRT, HOODIE, VEST, CARDIGAN, WINDBREAKER, JACKET, COAT, PADDED_LIGHT, PADDED_HEAVY, DENIM, SLACKS, COTTON_PANTS, SWEATPANTS, SHORTS, SKIRT, ... |
| Season        | SPRING, SUMMER, FALL, WINTER, ALL |
| OutfitSource  | MANUAL, AI_SUGGEST, CALENDAR |