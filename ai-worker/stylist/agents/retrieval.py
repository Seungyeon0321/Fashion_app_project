import os
import psycopg2
from dotenv import load_dotenv
from .state import OutfitState

load_dotenv()

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def retrieval(state: OutfitState) -> dict:
    intent         = state["intent"]
    season         = state["season"]
    excluded_items = state.get("excluded_items") or []

    conn = get_connection()
    cur  = conn.cursor()

    cur.execute("""
        SELECT id, category, style, season, "imageUrl"
        FROM closet_items
        WHERE season = %s
          AND style = %s
          AND "isArchived" = false
          AND "isWashing" = false
    """, (season.upper(), intent))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    retrieved_items = [
        {
            "id":       row[0],
            "category": row[1],
            "style":    row[2],
            "season":   row[3],
            "imageUrl": row[4],
        }
        for row in rows
        if row[0] not in excluded_items
    ]

    return {"retrieved_items": retrieved_items}