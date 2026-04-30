import os
import psycopg2
import boto3
from dotenv import load_dotenv
from .state import OutfitState

load_dotenv()

s3_client = boto3.client(
    's3',
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

S3_BUCKET = os.getenv("AWS_S3_BUCKET")

def get_presigned_url(crop_s3_key: str) -> str:
    return s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': S3_BUCKET,
            'Key': crop_s3_key
        },
        ExpiresIn=3600
    )

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def retrieval(state: OutfitState) -> dict:
    intent         = state["intent"]
    season         = state["season"]
    excluded_items = state.get("excluded_items") or []

    conn = get_connection()
    cur  = conn.cursor()

    cur.execute("""
        SELECT id, category, style, season, crop_s3_key
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
            "imageUrl": get_presigned_url(row[4]) if row[4] else None,
        }
        for row in rows
        if row[0] not in excluded_items
    ]

    return {"retrieved_items": retrieved_items}