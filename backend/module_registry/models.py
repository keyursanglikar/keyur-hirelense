# backend/modules/models.py
from django.db import models

class Module(models.Model):
    module_name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=100)
    slug = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True, blank=True)
    short_description = models.CharField(max_length=255, null=True, blank=True)
    category = models.CharField(max_length=50, null=True, blank=True)
    icon = models.CharField(max_length=100, null=True, blank=True)
    icon_svg = models.TextField(null=True, blank=True)
    color_code = models.CharField(max_length=20, null=True, blank=True)
    project_type = models.CharField(max_length=20, default='internal') # enum('internal','external')
    backend_url = models.CharField(max_length=500, null=True, blank=True)
    frontend_url = models.CharField(max_length=500, null=True, blank=True)
    database_name = models.CharField(max_length=100)
    database_host = models.CharField(max_length=255, null=True, blank=True)
    database_port = models.IntegerField(default=3306)
    database_username = models.CharField(max_length=100, null=True, blank=True)
    database_password = models.CharField(max_length=255, null=True, blank=True)
    database_type = models.CharField(max_length=20, default='mysql')
    api_version = models.CharField(max_length=10, null=True, blank=True)
    version = models.CharField(max_length=20, default='1.0.0')
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    release_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, default='draft') # enum('draft','published','archived','deprecated')
    min_plan_level = models.IntegerField(default=1)
    max_users = models.IntegerField(null=True, blank=True)
    setup_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.IntegerField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'modules'
        managed = True

    def __str__(self):
        return self.display_name


class FirmModule(models.Model):
    firm = models.ForeignKey('firms.CAFirm', on_delete=models.CASCADE, db_column='firm_id')
    module = models.ForeignKey(Module, on_delete=models.CASCADE, db_column='module_id')
    subscription = models.ForeignKey('subscriptions.FirmSubscription', on_delete=models.CASCADE, db_column='subscription_id')
    custom_module_url = models.CharField(max_length=500, null=True, blank=True)
    custom_backend_url = models.CharField(max_length=500, null=True, blank=True)
    database_name = models.CharField(max_length=100, null=True, blank=True)
    module_status = models.CharField(max_length=20, default='inactive') # enum('active','inactive','suspended','expired')
    activated_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    assigned_users_count = models.IntegerField(default=0)
    settings = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.IntegerField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'firm_modules'
        managed = True
