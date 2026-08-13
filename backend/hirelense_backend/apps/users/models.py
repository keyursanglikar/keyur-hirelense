from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
User = get_user_model()
from hirelense_backend.apps.tenants.models import Tenant

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Recruiter', 'Recruiter'),
        ('Reviewer', 'Reviewer'),
    ]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='users')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Reviewer')
    phone_number = models.CharField(max_length=20, blank=True, default='')
    address = models.TextField(blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    profile_picture = models.TextField(blank=True, default='') # Can store base64 or URL

    class Meta:
        db_table = 'user_profiles'

    def __str__(self):
        return f"{self.user.username} ({self.role}) - {self.tenant.name}"
