# backend/accounts/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import LoginSerializer

class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

from django.db import connection

class UserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        email_configured = False
        
        # Ensure the settings table exists
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

        return Response({
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'role_display': user.role_display,
            'email_settings_configured': email_configured
        }, status=status.HTTP_200_OK)