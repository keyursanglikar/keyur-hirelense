from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InterviewFlowViewSet, FlowRoundViewSet

router = DefaultRouter()
router.register(r'rounds', FlowRoundViewSet)
router.register(r'', InterviewFlowViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
