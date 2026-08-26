from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InterviewInvitationViewSet, SendInvitationView, TokenValidationView

router = DefaultRouter()
router.register(r'management', InterviewInvitationViewSet, basename='invitation-management')

urlpatterns = [
    path('send', SendInvitationView.as_view(), name='send-invitation'),
    path('<uuid:token>/', TokenValidationView.as_view(), name='token-validation'),
    path('', include(router.urls)),
]
