import os

path = r'backend/saas_platform/settings.py'
with open(path, 'r') as f:
    content = f.read()

old_override = '''# FORCE SQLITE
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    },
    'fee_estimation': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'fee_estimation_db.sqlite3',
    },
    'ca_tools': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'ca_tools_db.sqlite3',
    },
    'hirelens': {
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
        },
        'fee_estimation': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'fee_estimation_db.sqlite3',
        },
        'ca_tools': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'ca_tools_db.sqlite3',
        },
        'hirelens': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }'''

if old_override in content:
    content = content.replace(old_override, new_override)
    with open(path, 'w') as f:
        f.write(content)
