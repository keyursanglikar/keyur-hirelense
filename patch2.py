import re

with open('backend/saas_platform/settings.py', 'r') as f:
    content = f.read()

content = content + '''

# FORCE SQLITE
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
}
'''

with open('backend/saas_platform/settings.py', 'w') as f:
    f.write(content)
