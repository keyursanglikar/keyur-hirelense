# backend/subscriptions/models.py
from django.db import models

class SubscriptionPlan(models.Model):
    plan_name = models.CharField(max_length=100)
    plan_code = models.CharField(max_length=50, unique=True)
    description = models.TextField(null=True, blank=True)
    duration_days = models.IntegerField()
    duration_months = models.IntegerField(null=True, blank=True)
    duration_years = models.IntegerField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    setup_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    is_trial = models.BooleanField(default=False)
    trial_days = models.IntegerField(default=0)
    billing_frequency = models.CharField(max_length=20, null=True, blank=True)
    max_users = models.IntegerField(null=True, blank=True)
    max_storage_gb = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=False)
    features = models.TextField(null=True, blank=True)
    terms_and_conditions = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.IntegerField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'subscription_plans'
        managed = True

    def __str__(self):
        return self.plan_name


class FirmSubscription(models.Model):
    firm = models.ForeignKey('firms.CAFirm', on_delete=models.CASCADE, db_column='firm_id')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE, db_column='plan_id')
    subscription_code = models.CharField(max_length=50, unique=True)
    start_date = models.DateField()
    expiry_date = models.DateField()
    trial_end_date = models.DateField(null=True, blank=True)
    auto_renew = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_trial = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default='pending') # enum('active','expired','cancelled','suspended','pending','trial')
    cancellation_date = models.DateField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)
    next_billing_date = models.DateField(null=True, blank=True)
    grace_period_days = models.IntegerField(default=0)
    grace_period_end = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.IntegerField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'firm_subscriptions'
        managed = True
