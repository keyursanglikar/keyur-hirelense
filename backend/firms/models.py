# backend/firms/models.py
from django.db import models

class CAFirm(models.Model):
    firm_name = models.CharField(max_length=255)
    firm_code = models.CharField(max_length=50, unique=True)
    registration_number = models.CharField(max_length=100, null=True, blank=True)
    gst_number = models.CharField(max_length=50, null=True, blank=True)
    pan_number = models.CharField(max_length=20, null=True, blank=True)
    tan_number = models.CharField(max_length=20, null=True, blank=True)
    cin_number = models.CharField(max_length=50, null=True, blank=True)
    llp_number = models.CharField(max_length=50, null=True, blank=True)
    email = models.EmailField(max_length=255)
    mobile = models.CharField(max_length=20)
    alternate_mobile = models.CharField(max_length=20, null=True, blank=True)
    website = models.CharField(max_length=255, null=True, blank=True)
    address_line1 = models.TextField(null=True, blank=True)
    address_line2 = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, default='India')
    pincode = models.CharField(max_length=20, null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    logo = models.CharField(max_length=500, null=True, blank=True)
    business_type = models.CharField(max_length=50, null=True, blank=True)
    firm_size = models.CharField(max_length=20, null=True, blank=True)
    established_year = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, default='active') # enum('active','suspended','inactive','deleted')
    subscription_auto_renew = models.BooleanField(default=False)
    billing_email = models.EmailField(max_length=255, null=True, blank=True)
    billing_phone = models.CharField(max_length=20, null=True, blank=True)
    billing_address = models.TextField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.IntegerField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = True
        db_table = 'ca_firms'

    def __str__(self):
        return self.firm_name
