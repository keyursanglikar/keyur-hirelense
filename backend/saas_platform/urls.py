# backend/saas_platform/urls.py

import time
import logging
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Health-check endpoint — registered FIRST so it is never blocked by
# authentication middleware.  Must be:
#   • No DB query   • No Gemini / third-party calls   • No auth required
#   • Returns HTTP 200 within milliseconds
# ---------------------------------------------------------------------------
def health_check(request):
    """
    Lightweight liveness probe used by Render uptime monitoring.
    Intentionally performs zero I/O so it responds instantly.
    """
    t0 = time.monotonic()
    response_data = {"status": "ok", "service": "backend"}
    response = JsonResponse(response_data, status=200)
    elapsed_ms = round((time.monotonic() - t0) * 1000, 2)
    logger.info("GET /health - 200 - %sms", elapsed_ms)
    return response


urlpatterns = [
    # ── Health probe (must be first, no auth) ──────────────────────────────
    path('health', health_check, name='health_check'),

    # ── Admin & auth ────────────────────────────────────────────────────────
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/firms/', include('firms.urls')),
    
    # Hirelens API Endpoints
    path('api/users/', include('hirelense_backend.apps.users.urls')),
    path('api/candidates/', include('hirelense_backend.apps.candidates.urls')),
    path('api/openings/', include('hirelense_backend.apps.openings.urls')),
    path('api/flows/', include('hirelense_backend.apps.flows.urls')),
    path('api/scorecards/', include('hirelense_backend.apps.scorecards.urls')),
    path('api/interview-invitations/', include('hirelense_backend.apps.interview_invitations.urls')),
]

import os
import json
from django.conf import settings

# ==============================================
# DYNAMIC MODULE URL LOADER
# ==============================================
# Scan root ca-saas-platform/modules/ for module.json and urls.py
MODULES_DIR = os.path.join(settings.BASE_DIR.parent, 'modules')
if os.path.exists(MODULES_DIR):
    for module_name in os.listdir(MODULES_DIR):
        module_path = os.path.join(MODULES_DIR, module_name)
        backend_path = os.path.join(module_path, 'backend')
        json_path = os.path.join(module_path, 'module.json')
        
        if os.path.isdir(module_path) and os.path.exists(json_path) and os.path.exists(os.path.join(backend_path, 'urls.py')):
            try:
                with open(json_path, 'r') as f:
                    manifest = json.load(f)
                    slug = manifest.get('slug', module_name)
                    backend_urls = manifest.get('backend', {}).get('urls', f'modules.{module_name}.backend.urls')
                    
                    urlpatterns.append(path(f'api/modules/{slug}/', include(backend_urls)))
            except Exception as e:
                print(f"Failed to load module URLs for {module_name}: {e}")