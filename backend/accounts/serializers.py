# backend/accounts/serializers.py

from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from .models import User

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            # First try to get user directly
            try:
                user = User.objects.get(email=email)
                # Check password using Django's check_password
                if not user.check_password(password):
                    user = None
            except User.DoesNotExist:
                user = None
            
            if not user:
                raise serializers.ValidationError('Invalid email or password.')
            
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            
            if user.is_locked:
                raise serializers.ValidationError('User account is locked. Contact support.')
            
            # Update last login
            user.last_login = timezone.now()
            user.save()
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            # Inject claims into JWT
            refresh['user_id'] = user.id
            refresh['role'] = user.role
            
            # Determine firm_id if applicable
            firm_id = None
            if user.role == 'firm_admin' or user.role == 'staff':
                from accounts.models import CAFirmUser
                firm_user = CAFirmUser.objects.filter(user=user, status='active').first()
                if firm_user:
                    firm_id = firm_user.firm.id
            
            refresh['firm_id'] = firm_id
            
            # Check email settings configuration state
            email_configured = False
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS email_settings (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        firm_id INT NULL,
                        provider VARCHAR(50) DEFAULT 'emailjs',
                        service_id VARCHAR(100) NOT NULL,
                        template_id VARCHAR(100) NOT NULL,
                        public_key VARCHAR(100) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    );
                """)
                if user.role == 'super_admin':
                    cursor.execute("SELECT id FROM email_settings WHERE firm_id IS NULL LIMIT 1")
                    email_configured = cursor.fetchone() is not None
                elif user.role == 'firm_admin':
                    from accounts.models import CAFirmUser
                    firm_user = CAFirmUser.objects.filter(user=user, status='active').first()
                    if firm_user:
                        cursor.execute("SELECT id FROM email_settings WHERE firm_id = %s LIMIT 1", [firm_user.firm.id])
                        email_configured = cursor.fetchone() is not None
                    else:
                        email_configured = True
                else:
                    email_configured = True

            return {
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role,
                    'role_display': user.role_display,
                    'email_settings_configured': email_configured,
                },
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'role': user.role,
                'role_display': user.role_display,
                'is_super_admin': user.is_super_admin,
                'is_firm_admin': user.is_firm_admin,
                'is_staff_user': user.is_staff_user,
            }
        else:
            raise serializers.ValidationError('Email and password are required.')