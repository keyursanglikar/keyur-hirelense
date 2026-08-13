import os
from pathlib import Path
import dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from SuperAdmin backend/.env
dotenv.load_dotenv(BASE_DIR.parent.parent.parent.parent / 'backend' / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-key')

DEBUG = True

ALLOWED_HOSTS = []

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    
    # Custom apps
    'hirelense_backend.apps.accounts',
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
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

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

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('HIRELENS_DB_NAME', 'hirelens'),
        'USER': os.environ.get('HIRELENS_DB_USER', 'root'),
        'PASSWORD': os.environ.get('HIRELENS_DB_PASSWORD', 'jay@123'),
        'HOST': os.environ.get('HIRELENS_DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('HIRELENS_DB_PORT', '3306'),
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        }
    }
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Allow local CORS requests from React development port
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


# Frontend URL configuration
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# Email configuration
EMAIL_PROVIDER = os.environ.get('EMAIL_PROVIDER', 'console')

if EMAIL_PROVIDER == 'smtp':
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')

email_port_val = os.environ.get('EMAIL_PORT', '25')
EMAIL_PORT = int(email_port_val) if email_port_val.strip() else 25

EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').strip() == 'True'
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'Hirelens <noreply@hirelens.in>')

# EmailJS Configuration settings
EMAILJS_SERVICE_ID = os.environ.get('EMAILJS_SERVICE_ID', '')
EMAILJS_TEMPLATE_ID = os.environ.get('EMAILJS_TEMPLATE_ID', '')
EMAILJS_PUBLIC_KEY = os.environ.get('EMAILJS_PUBLIC_KEY', '')
EMAILJS_PRIVATE_KEY = os.environ.get('EMAILJS_PRIVATE_KEY', '')

# Gemini API Setting
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')



AUTH_USER_MODEL = 'accounts.User'
