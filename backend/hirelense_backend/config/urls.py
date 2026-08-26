from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('hirelense_backend.apps.users.urls')),
    path('api/candidates/', include('hirelense_backend.apps.candidates.urls')),
    path('api/openings/', include('hirelense_backend.apps.openings.urls')),
    path('api/flows/', include('hirelense_backend.apps.flows.urls')),
    path('api/scorecards/', include('hirelense_backend.apps.scorecards.urls')),
    path('api/interview-invitations/', include('hirelense_backend.apps.interview_invitations.urls')),
]
