import os

path = r'backend/hirelense_backend/config/settings/base.py'
with open(path, 'r') as f:
    content = f.read()

# Replace my old override with the smarter one
old_override = '''# OVERRIDE FOR LOCAL SQLITE
if os.environ.get('USE_SQLITE', 'True').lower() == 'true':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }'''

new_override = '''# DYNAMIC OVERRIDE: Use SQLite locally (Windows) and MySQL in Production (Linux)
use_sqlite_default = str(os.name == 'nt')
if os.environ.get('USE_SQLITE', use_sqlite_default).lower() == 'true':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }'''

content = content.replace(old_override, new_override)

with open(path, 'w') as f:
    f.write(content)
