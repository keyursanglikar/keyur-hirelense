# backend/saas_platform/settings.py

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(override=True)

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent
import sys
sys.path.insert(0, str(BASE_DIR.parent))
sys.path.insert(0, str(BASE_DIR.parent / 'modules' / 'Hirelens' / 'hirelense' / 'backend'))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-default-key-change-this')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

# ALLOWED_HOSTS - read from env, split by comma, fallback to local hosts
allowed_hosts_env = os.getenv('ALLOWED_HOSTS', '')
if allowed_hosts_env:
    ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(',')]
else:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_yasg',
    
    # Custom apps
    'accounts',
    'firms',
    'modules',
    'subscriptions',
    'payments',
    'permissions',
    'activities',
    'notifications',
    'core',
    'module_registry',
    
    # Hirelens Apps
    'hirelense_backend.apps.tenants',
    'hirelense_backend.apps.users',
    'hirelense_backend.apps.openings',
    'hirelense_backend.apps.flows',
    'hirelense_backend.apps.pools',
    'hirelense_backend.apps.scorecards',
    'hirelense_backend.apps.candidates',
    'hirelense_backend.apps.interview_invitations',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'saas_platform.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'saas_platform.wsgi.application'

# ==============================================
# DATABASE - Using .env variables
# ==============================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('PLATFORM_DB_NAME', 'ca_saas_platform'),
        'USER': os.getenv('PLATFORM_DB_USER', 'root'),
        'PASSWORD': os.getenv('PLATFORM_DB_PASSWORD', ''),
        'HOST': os.getenv('PLATFORM_DB_HOST', 'localhost'),
        'PORT': os.getenv('PLATFORM_DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    },
    'fee_estimation': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('FEE_DB_NAME', 'fee_estimation_db'),
        'USER': os.getenv('FEE_DB_USER', 'root'),
        'PASSWORD': os.getenv('FEE_DB_PASSWORD', ''),
        'HOST': os.getenv('FEE_DB_HOST', 'localhost'),
        'PORT': os.getenv('FEE_DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    },
    'ca_tools': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('CA_TOOLS_DB_NAME', 'ca_tools_db'),
        'USER': os.getenv('CA_TOOLS_DB_USER', 'root'),
        'PASSWORD': os.getenv('CA_TOOLS_DB_PASSWORD', ''),
        'HOST': os.getenv('CA_TOOLS_DB_HOST', 'localhost'),
        'PORT': os.getenv('CA_TOOLS_DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    },
    'hirelens': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('HIRELENS_DB_NAME', 'hirelens_db'),
        'USER': os.getenv('HIRELENS_DB_USER', 'root'),
        'PASSWORD': os.getenv('HIRELENS_DB_PASSWORD', ''),
        'HOST': os.getenv('HIRELENS_DB_HOST', 'localhost'),
        'PORT': os.getenv('HIRELENS_DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

DATABASE_ROUTERS = ['saas_platform.database_router.ModuleDatabaseRouter']

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# WhiteNoise storage configuration for static files
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Honor the 'X-Forwarded-Proto' header for request.is_secure()
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# CSRF Trusted Origins for admin panel/forms in production
csrf_trusted_origins_env = os.getenv('CSRF_TRUSTED_ORIGINS', '')
if csrf_trusted_origins_env:
    CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in csrf_trusted_origins_env.split(',')]

DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'

# CORS Configuration - read from env, split by comma, fallback to local origins
cors_origins_env = os.getenv('CORS_ALLOWED_ORIGINS', '')
if cors_origins_env:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins_env.split(',')]
else:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
    ]
CORS_ALLOW_CREDENTIALS = True

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ==============================================
# DYNAMIC MODULE LOADER
# ==============================================
# Scan root ca-saas-platform/modules/ for any subdirectories that are Django apps (have backend/apps.py)
MODULES_DIR = os.path.join(BASE_DIR.parent, 'modules')
if os.path.exists(MODULES_DIR):
    for module_name in os.listdir(MODULES_DIR):
        module_path = os.path.join(MODULES_DIR, module_name)
        backend_path = os.path.join(module_path, 'backend')
        # Check if it's a directory and has backend/apps.py (valid Django app)
        if os.path.isdir(module_path) and os.path.exists(os.path.join(backend_path, 'apps.py')):
            
            # Register the dynamic app from the root modules directory
            app_path = f'modules.{module_name}.backend'
            if app_path not in INSTALLED_APPS:
                INSTALLED_APPS.append(app_path)


PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.BCryptPasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
]

# ==============================================
# EMAIL CONFIGURATION
# ==============================================
if os.getenv('EMAIL_HOST'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
    DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'no-reply@nzsolution.com')
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = 'no-reply@nzsolution.com'