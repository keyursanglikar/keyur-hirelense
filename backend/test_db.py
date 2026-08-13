# backend/test_db.py

import os
import django
from dotenv import load_dotenv

# Load .env
load_dotenv()

print("Testing database connection...")
print(f"DB_NAME: {os.getenv('DB_NAME')}")
print(f"DB_USER: {os.getenv('DB_USER')}")
print(f"DB_HOST: {os.getenv('DB_HOST')}")
print(f"DB_PORT: {os.getenv('DB_PORT')}")

try:
    import pymysql
    
    connection = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'ca_saas_platform'),
        port=int(os.getenv('DB_PORT', '3306'))
    )
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"[OK] Connected to MySQL! Version: {version[0]}")
        
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"[OK] Found {len(tables)} tables in database")
        
        for table in tables[:20]:  # Show first 20 tables
            print(f"   - {table[0]}")
    
    connection.close()
    print("[OK] Database connection successful!")
    
except Exception as e:
    print(f"[ERROR] Database connection failed: {e}")