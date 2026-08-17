# backend/firms/urls.py
from django.urls import path
from .views import (
    CAFirmsListCreateView,
    CAFirmsDetailView,
    ResendActivationEmailView,
    CAFirmActionView,
    GetAvailableModulesPlansView,
    ManageSubscriptionsView,
    ActivateAccountView,
    CAModulesListView,
    CAModuleAccessVerifyView,
    SystemEmailSettingsView,
    FirmEmailSettingsView,
    ModuleDetailView,
    SubscriptionPlanDetailView,
    LocalModulesDiscoveryView,
    SuperAdminDashboardDataView
)

urlpatterns = [
    # SuperAdmin endpoints
    path('dashboard/', SuperAdminDashboardDataView.as_view(), name='superadmin_dashboard'),
    path('', CAFirmsListCreateView.as_view(), name='firms_list_create'),
    path('system-email-settings/', SystemEmailSettingsView.as_view(), name='system_email_settings'),
    path('email-settings/', FirmEmailSettingsView.as_view(), name='firm_email_settings'),
    path('modules/', GetAvailableModulesPlansView.as_view(), name='available_modules_plans'),
    path('local-modules/', LocalModulesDiscoveryView.as_view(), name='local_modules_discovery'),
    path('modules/<int:pk>/', ModuleDetailView.as_view(), name='module_detail'),
    path('plans/', SubscriptionPlanDetailView.as_view(), name='plan_create'),
    path('plans/<int:pk>/', SubscriptionPlanDetailView.as_view(), name='plan_detail'),
    path('<int:id>/', CAFirmsDetailView.as_view(), name='firm_detail'),
    path('<int:id>/resend-activation/', ResendActivationEmailView.as_view(), name='resend_activation'),
    path('<int:id>/action/', CAFirmActionView.as_view(), name='firm_action'),
    path('<int:id>/subscriptions/', ManageSubscriptionsView.as_view(), name='manage_subscriptions'),

    # CA Activation (AllowAny)
    path('activate/', ActivateAccountView.as_view(), name='activate_account'),

    # CA / Staff dashboard & access endpoints
    path('ca/modules/', CAModulesListView.as_view(), name='ca_modules_list'),
    path('ca/modules/<slug:slug>/access/', CAModuleAccessVerifyView.as_view(), name='ca_module_access_verify'),
]
