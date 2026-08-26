# backend/create_admin_fixed.py

import os
import sys
import django
from django.contrib.auth.hashers import make_password
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_platform.settings')
django.setup()

def create_super_admin():
    print("=" * 60)
    print("Creating Super Admin with Bcrypt Hashing")
    print("=" * 60)
    
    # User details
    email = 'sanglikarkeyur@gmail.com'
    password = 'nzsolutions@2026'
    first_name = 'Keyur'
    last_name = 'Sanglikar'
    
    # Generate bcrypt hash
    password_hash = make_password(password)
    print(f"\nPassword Hash Generated:")
    print(f"   {password_hash[:50]}...")
    
    try:
        with connection.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE email = %s", [email])
            if cursor.fetchone():
                print(f"\nUser {email} already exists!")
                # Show existing user
                cursor.execute("""
                    SELECT u.id, u.email, u.first_name, u.last_name, r.role_name 
                    FROM users u
                    JOIN roles r ON u.role_id = r.id
                    WHERE u.email = %s
                """, [email])
                user = cursor.fetchone()
                if user:
                    print(f"   ID: {user[0]}")
                    print(f"   Email: {user[1]}")
                    print(f"   Name: {user[2]} {user[3]}")
                    print(f"   Role: {user[4]}")
                return
            
            # Insert super admin (only columns that exist)
            cursor.execute("""
                INSERT INTO users (
                    role_id,
                    first_name,
                    last_name,
                    email,
                    mobile,
                    password,
                    is_active,
                    is_verified,
                    is_locked,
                    failed_login_attempts,
                    preferred_language,
                    timezone,
                    created_at,
                    updated_at
                ) VALUES (
                    1,  -- role_id (super_admin)
                    %s,
                    %s,
                    %s,
                    '9999999999',
                    %s,
                    1,  -- is_active
                    1,  -- is_verified
                    0,  -- is_locked
                    0,  -- failed_login_attempts
                    'en',
                    'Asia/Kolkata',
                    NOW(),
                    NOW()
                )
            """, [first_name, last_name, email, password_hash])
            
            print("\nSuper Admin Created Successfully!")
            print("=" * 60)
            print(f"   Email: {email}")
            print(f"   Password: {password}")
            print(f"   Name: {first_name} {last_name}")
            print("=" * 60)
            
            # Verify
            cursor.execute("""
                SELECT u.id, u.email, u.first_name, u.last_name, r.role_name, u.is_active, u.is_verified
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.email = %s
            """, [email])
            result = cursor.fetchone()
            
            if result:
                print(f"\nDatabase Verified:")
                print(f"   ID: {result[0]}")
                print(f"   Email: {result[1]}")
                print(f"   Name: {result[2]} {result[3]}")
                print(f"   Role: {result[4]}")
                print(f"   Active: {result[5]}")
                print(f"   Verified: {result[6]}")
            
            print("\n" + "=" * 60)
            print("Super Admin ready for login!")
            print("=" * 60)
            
    except Exception as e:
        print(f"\nError creating super admin: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    create_super_admin()