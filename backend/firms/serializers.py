# backend/firms/serializers.py
from rest_framework import serializers
from django.utils import timezone
from .models import CAFirm
from accounts.models import User, CAFirmUser
from module_registry.models import Module, FirmModule
from subscriptions.models import SubscriptionPlan, FirmSubscription

class ModuleSubscriptionInputSerializer(serializers.Serializer):
    module_id = serializers.IntegerField()
    plan_id = serializers.IntegerField()
    start_date = serializers.DateField()
    expiry_date = serializers.DateField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    auto_renew = serializers.BooleanField(default=False)

    def validate(self, data):
        if data['expiry_date'] <= data['start_date']:
            raise serializers.ValidationError("Expiry date must be after the start date.")
        
        # Verify module exists and is active
        try:
            module = Module.objects.get(id=data['module_id'], is_active=True)
        except Module.DoesNotExist:
            raise serializers.ValidationError(f"Module with ID {data['module_id']} does not exist or is inactive.")
            
        # Verify plan exists and is active
        try:
            plan = SubscriptionPlan.objects.get(id=data['plan_id'], is_active=True)
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError(f"Plan with ID {data['plan_id']} does not exist or is inactive.")
            
        return data


class CAFirmCreateSerializer(serializers.Serializer):
    # Firm Details
    firm_name = serializers.CharField(max_length=255)
    firm_code = serializers.CharField(max_length=50)
    registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    gst_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    pan_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    tan_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    cin_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    llp_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    email = serializers.EmailField()
    mobile = serializers.CharField(max_length=20)
    alternate_mobile = serializers.CharField(max_length=20, required=False, allow_blank=True)
    website = serializers.CharField(max_length=255, required=False, allow_blank=True)
    address_line1 = serializers.CharField(required=False, allow_blank=True)
    address_line2 = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    country = serializers.CharField(max_length=100, default='India')
    pincode = serializers.CharField(max_length=20, required=False, allow_blank=True)
    business_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
    firm_size = serializers.CharField(max_length=20, required=False, allow_blank=True)
    established_year = serializers.IntegerField(required=False, allow_null=True)
    billing_email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    billing_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    billing_address = serializers.CharField(required=False, allow_blank=True)

    # Admin Details
    admin_first_name = serializers.CharField(max_length=100)
    admin_last_name = serializers.CharField(max_length=100)
    admin_email = serializers.EmailField()
    admin_mobile = serializers.CharField(max_length=20)
    admin_designation = serializers.CharField(max_length=100, default='CA Admin')

    # Subscribed Modules
    subscriptions = ModuleSubscriptionInputSerializer(many=True, required=False)

    def validate_firm_code(self, value):
        # We must bypass Meta-managed restriction to check if firm_code already exists
        # Wait, custom queryset check works perfectly even with managed=False
        if CAFirm.objects.filter(firm_code=value).exists():
            raise serializers.ValidationError("A firm with this firm code already exists.")
        return value

    def validate_admin_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return value
