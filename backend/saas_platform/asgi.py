# backend/saas_platform/asgi.py

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_platform.settings')


# Auto-migrate on startup for Render/Heroku deployments
try:
    from django.core.management import call_command
    print("Running automatic migrations on startup...")
    call_command("migrate", interactive=False)
    print("Migrations complete.")
except Exception as e:
    print("Warning: Auto-migration failed:", e)

application = get_asgi_application()
