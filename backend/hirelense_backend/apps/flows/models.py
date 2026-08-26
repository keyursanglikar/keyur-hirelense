from django.db import models
from hirelense_backend.apps.tenants.models import Tenant

class InterviewFlow(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='flows')
    name = models.CharField(max_length=255)
    version = models.CharField(max_length=20, default='v1')
    is_live = models.BooleanField(default=False)
    ai_model = models.CharField(max_length=50, default='flash')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'interview_flows'

    def __str__(self):
        return f"{self.name} {self.version} ({self.tenant.name})"

class FlowRound(models.Model):
    ROUND_TYPES = [
        ('form', 'Pre-screen form'),
        ('hr', 'Video — HR conversation'),
        ('tech', 'Video — Technical Q&A'),
        ('case', 'Case study (on camera)'),
        ('mcq', 'Knowledge test (MCQ)'),
    ]
    flow = models.ForeignKey(InterviewFlow, on_delete=models.CASCADE, related_name='rounds')
    type = models.CharField(max_length=20, choices=ROUND_TYPES)
    dur = models.IntegerField(default=5)  # Duration in minutes
    order = models.IntegerField(default=0)  # Sequence order

    class Meta:
        ordering = ['order']
        db_table = 'flow_rounds'

    def __str__(self):
        return f"Round {self.order + 1}: {self.get_type_display()} ({self.dur} min)"
