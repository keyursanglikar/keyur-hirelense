from rest_framework import serializers
from django.conf import settings
from django.contrib.auth import get_user_model
User = get_user_model()
from .models import UserProfile

class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', required=False)
    phone_number = serializers.CharField(source='profile.phone_number', required=False, allow_blank=True)
    address = serializers.CharField(source='profile.address', required=False, allow_blank=True)
    date_of_birth = serializers.DateField(source='profile.date_of_birth', required=False, allow_null=True)
    profile_picture = serializers.CharField(source='profile.profile_picture', required=False, allow_blank=True)
    tenant_id = serializers.IntegerField(source='profile.tenant.id', read_only=True)
    tenant_name = serializers.CharField(source='profile.tenant.name', required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'role', 'phone_number', 'address', 'date_of_birth', 
            'profile_picture', 'tenant_id', 'tenant_name'
        ]
        read_only_fields = ['id', 'username', 'email', 'tenant_id']

    def update(self, instance, validated_data):
        # 1. Update Core User fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()

        # 2. Update linked UserProfile fields
        profile_data = validated_data.get('profile', {})
        profile = getattr(instance, 'profile', None)
        if profile and profile_data:
            profile.phone_number = profile_data.get('phone_number', profile.phone_number)
            profile.address = profile_data.get('address', profile.address)
            profile.date_of_birth = profile_data.get('date_of_birth', profile.date_of_birth)
            profile.profile_picture = profile_data.get('profile_picture', profile.profile_picture)
            profile.role = profile_data.get('role', profile.role)
            
            # Optionally update Tenant Name
            tenant_data = profile_data.get('tenant', {})
            tenant_name = tenant_data.get('name')
            if tenant_name and profile.tenant:
                profile.tenant.name = tenant_name
                profile.tenant.save()
                
            profile.save()

        return instance
