import os

settings_path = r'backend/saas_platform/settings.py'
with open(settings_path, 'a') as f:
    f.write('''

# OVERRIDE FOR LOCAL SQLITE
import os
if os.getenv('USE_SQLITE', 'True').lower() == 'true':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'ca_saas_platform.sqlite3',
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
            'NAME': BASE_DIR / 'hirelens_db.sqlite3',
        }
    }
''')
