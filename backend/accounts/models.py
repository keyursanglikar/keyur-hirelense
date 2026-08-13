# backend/accounts/models.py

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)
        extra_fields.setdefault('role_id', 1)  # super_admin
        return self.create_user(email, password, **extra_fields)
    
    def create_firm_admin(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)
        extra_fields.setdefault('role_id', 2)  # firm_admin
        return self.create_user(email, password, **extra_fields)
    
    def create_staff(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)
        extra_fields.setdefault('role_id', 3)  # staff
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser):  # Removed PermissionsMixin
    # ONLY columns that exist in your table
    role_id = models.IntegerField()
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True, max_length=255)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    password = models.CharField(max_length=255)
    profile_picture = models.CharField(max_length=500, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    failed_login_attempts = models.IntegerField(default=0)
    last_login = models.DateTimeField(null=True, blank=True)
    last_password_change = models.DateTimeField(null=True, blank=True)
    password_reset_token = models.CharField(max_length=255, null=True, blank=True)
    password_reset_expires = models.DateTimeField(null=True, blank=True)
    email_verification_token = models.CharField(max_length=255, null=True, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    preferred_language = models.CharField(max_length=10, default='en')
    timezone = models.CharField(max_length=50, default='UTC')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.IntegerField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        managed = True
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"
    
    @property
    def role(self):
        """Get role name from roles table"""
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT role_name FROM roles WHERE id = %s", [self.role_id])
            result = cursor.fetchone()
            return result[0] if result else None
    
    @property
    def role_display(self):
        """Get display role name"""
        role_map = {
            'super_admin': 'Super Admin',
            'firm_admin': 'Firm Admin',
            'staff': 'Staff',
            'accountant': 'Accountant',
            'auditor': 'Auditor'
        }
        return role_map.get(self.role, self.role)
    
    @property
    def is_super_admin(self):
        return self.role == 'super_admin'
    
    @property
    def is_firm_admin(self):
        return self.role == 'firm_admin'
    
    @property
    def is_staff_user(self):
        return self.role == 'staff'
    
    @property
    def is_accountant(self):
        return self.role == 'accountant'
    
    @property
    def is_auditor(self):
        return self.role == 'auditor'
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_authenticated(self):
        return True
    
    @property
    def is_anonymous(self):
        return False
    
    def check_password(self, raw_password):
        """Check if the raw password matches the stored hash"""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password)

class CAFirmUser(models.Model):
    firm = models.ForeignKey('firms.CAFirm', on_delete=models.CASCADE, db_column='firm_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    designation = models.CharField(max_length=100, null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    is_primary_contact = models.BooleanField(default=False)
    is_owner = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default='active') # enum('active','inactive','suspended')
    joining_date = models.DateField(null=True, blank=True)
    exit_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.IntegerField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'ca_firm_users'
        managed = True
