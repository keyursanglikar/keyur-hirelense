# backend/accounts/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'first_name', 'last_name', 'role_id', 'is_active', 'is_verified')
    list_filter = ('role_id', 'is_active', 'is_verified', 'is_locked')
    search_fields = ('email', 'first_name', 'last_name', 'mobile')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'mobile', 'profile_picture')}),
        ('Permissions', {'fields': ('role_id', 'is_active', 'is_verified', 'is_locked', 'failed_login_attempts')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'role_id'),
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_login')

# Register the User model
admin.site.register(User, CustomUserAdmin)