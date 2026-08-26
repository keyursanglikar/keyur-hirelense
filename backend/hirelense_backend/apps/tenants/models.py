from django.db import models

class Tenant(models.Model):
    name = models.CharField(max_length=255, db_column='firm_name')
    domain = models.CharField(max_length=255, unique=True, db_column='firm_code')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ca_firms'
        managed = False

    def __str__(self):
        return self.name
