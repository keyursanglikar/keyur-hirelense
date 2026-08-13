import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import User
from hirelense_backend.apps.candidates.models import Candidate
from hirelense_backend.apps.openings.models import JobOpening

class InvitationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    QUEUED = "queued", "Queued"
    SENDING = "sending", "Sending"
    SENT = "sent", "Sent"
    OPENED = "opened", "Opened"
    STARTED = "started", "Started"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"
    EXPIRED = "expired", "Expired"

class InterviewInvitation(models.Model):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='interview_invitations')
    job_opening = models.ForeignKey(JobOpening, on_delete=models.CASCADE, related_name='interview_invitations')
    interview_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=InvitationStatus.choices, default=InvitationStatus.PENDING)
    template_version = models.CharField(max_length=20, default='v1')
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    sent_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'interview_invitations'
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation for {self.candidate.name} - Status: {self.status}"

    def transition_to(self, new_status, user=None, reason=None):
        old_status = self.status
        if old_status == new_status:
            return
        
        allowed_transitions = {
            InvitationStatus.PENDING: [InvitationStatus.QUEUED, InvitationStatus.CANCELLED, InvitationStatus.EXPIRED, InvitationStatus.OPENED],
            InvitationStatus.QUEUED: [InvitationStatus.SENDING, InvitationStatus.CANCELLED, InvitationStatus.EXPIRED, InvitationStatus.OPENED],
            InvitationStatus.SENDING: [InvitationStatus.SENT, InvitationStatus.FAILED, InvitationStatus.CANCELLED, InvitationStatus.EXPIRED, InvitationStatus.OPENED],
            InvitationStatus.SENT: [InvitationStatus.OPENED, InvitationStatus.STARTED, InvitationStatus.EXPIRED, InvitationStatus.CANCELLED, InvitationStatus.FAILED],
            InvitationStatus.OPENED: [InvitationStatus.STARTED, InvitationStatus.EXPIRED, InvitationStatus.CANCELLED],
            InvitationStatus.STARTED: [InvitationStatus.COMPLETED, InvitationStatus.EXPIRED, InvitationStatus.CANCELLED],
            InvitationStatus.COMPLETED: [],
            InvitationStatus.FAILED: [InvitationStatus.QUEUED, InvitationStatus.SENDING, InvitationStatus.CANCELLED, InvitationStatus.EXPIRED, InvitationStatus.OPENED],
            InvitationStatus.CANCELLED: [],
            InvitationStatus.EXPIRED: []
        }
        
        if new_status not in allowed_transitions.get(old_status, []):
            raise ValueError(f"Invalid status transition from {old_status} to {new_status}")
            
        self.status = new_status
        now = timezone.now()
        
        if new_status == InvitationStatus.SENT:
            self.sent_at = now
        elif new_status == InvitationStatus.OPENED:
            self.opened_at = now
        elif new_status == InvitationStatus.STARTED:
            self.started_at = now
        elif new_status == InvitationStatus.COMPLETED:
            self.completed_at = now
            
        self.save()
        
        InvitationAudit.objects.create(
            invitation=self,
            old_status=old_status,
            new_status=new_status,
            changed_by=user,
            reason=reason
        )

    def soft_delete(self):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save()

class InvitationAudit(models.Model):
    invitation = models.ForeignKey(InterviewInvitation, on_delete=models.CASCADE, related_name='audits')
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'invitation_audits'
        ordering = ['-timestamp']

class EmailLog(models.Model):
    invitation = models.ForeignKey(InterviewInvitation, on_delete=models.CASCADE, related_name='email_logs')
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    html_body = models.TextField()
    text_body = models.TextField()
    provider = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=[("success", "Success"), ("failed", "Failed")])
    retry_count = models.IntegerField(default=0)
    error_message = models.TextField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'email_logs'
        ordering = ['-sent_at']
