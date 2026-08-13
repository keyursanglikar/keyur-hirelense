# backend/describe_db.py
import os
import pymysql
from dotenv import load_dotenv

load_dotenv(dotenv_path="f:/FREELANCE/NZ-Solutions/ca_saas_platform/ca-saas-platform/backend/.env")

try:
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'ca_saas_platform'),
        port=int(os.getenv('DB_PORT', '3306'))
    )
    c = conn.cursor()
    
    c.execute("SHOW TABLES")
    tables = [row[0] for row in c.fetchall()]
    print("ALL TABLES:")
    print(tables)
    print("=" * 50)
    
    for table in tables:
        print(f"SCHEMA FOR TABLE: {table}")
        c.execute(f"DESCRIBE `{table}`")
        for col in c.fetchall():
            print(f"  {col}")
        print("-" * 50)
        
    conn.close()
except Exception as e:
    print("Error:", e)
