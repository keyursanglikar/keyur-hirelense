from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScorecardViewSet, ScorecardParameterViewSet

router = DefaultRouter()
router.register(r'parameters', ScorecardParameterViewSet)
router.register(r'', ScorecardViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
