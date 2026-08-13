from django.db import models
from hirelense_backend.apps.tenants.models import Tenant

class Scorecard(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='scorecards')
    name = models.CharField(max_length=255)
    version = models.CharField(max_length=20, default='v1')
    is_live = models.BooleanField(default=False)
    auto_reject_threshold = models.IntegerField(default=50)
    rating_scale = models.CharField(max_length=20, default='1-10')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'scorecards'

    def __str__(self):
        return f"{self.name} {self.version} ({self.tenant.name})"

class ScorecardParameter(models.Model):
    scorecard = models.ForeignKey(Scorecard, on_delete=models.CASCADE, related_name='parameters')
    name = models.CharField(max_length=255)
    weight = models.IntegerField()  # Percentage
    description = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'scorecard_parameters'

    def __str__(self):
        return f"{self.name} ({self.weight}%)"
