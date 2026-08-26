from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CandidateViewSet, CandidateScoreDetailViewSet, CandidateTranscriptLineViewSet

router = DefaultRouter()
router.register(r'', CandidateViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
