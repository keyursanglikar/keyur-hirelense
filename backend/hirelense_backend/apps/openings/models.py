from django.db import models
from hirelense_backend.apps.tenants.models import Tenant
from hirelense_backend.apps.flows.models import InterviewFlow
from hirelense_backend.apps.scorecards.models import Scorecard

class JobOpening(models.Model):
    STATUS_CHOICES = [
        ('Live', 'Live'),
        ('Draft', 'Draft'),
        ('Closed', 'Closed'),
    ]
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='openings')
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    meta_info = models.TextField(blank=True, default='')
    flow = models.ForeignKey(InterviewFlow, on_delete=models.SET_NULL, null=True, blank=True, related_name='openings')
    scorecard = models.ForeignKey(Scorecard, on_delete=models.SET_NULL, null=True, blank=True, related_name='openings')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'job_openings'

    def __str__(self):
        return f"{self.title} ({self.status}) - {self.tenant.name}"
