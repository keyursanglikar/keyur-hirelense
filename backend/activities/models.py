# backend/activities/models.py
from django.db import models

class AuditLog(models.Model):
    user_id = models.IntegerField()
    firm_id = models.IntegerField(null=True, blank=True)
    table_name = models.CharField(max_length=100)
    record_id = models.IntegerField()
    action = models.CharField(max_length=20) # e.g. create, update, delete
    old_values = models.TextField(null=True, blank=True)
    new_values = models.TextField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        managed = True
