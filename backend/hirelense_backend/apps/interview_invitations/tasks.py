import sys
import os

# Prevent local 'celery' folder shadowing the global celery package
project_root = os.path.normpath(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
paths_to_remove = []
for p in list(sys.path):
    abs_p = os.path.normpath(os.path.abspath(p)) if p else ''
    if not p or p == '.' or abs_p.lower() == project_root.lower():
        paths_to_remove.append(p)
        sys.path.remove(p)

try:
    from celery import shared_task
finally:
    for p in reversed(paths_to_remove):
        sys.path.insert(0, p)
from django.utils import timezone
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.db import transaction
import logging

from .models import InterviewInvitation, InvitationStatus, EmailLog
from .context_builders import build_invitation_context
from .email_service import EmailService

logger = logging.getLogger(__name__)

@shared_task
def send_invitation_email_task(invitation_id):
    logger.info(f"Starting background task for invitation ID: {invitation_id}")
    try:
        invitation = InterviewInvitation.objects.get(id=invitation_id)
    except InterviewInvitation.DoesNotExist:
        logger.error(f"Invitation with ID {invitation_id} not found.")
        return False
        
    try:
        invitation.transition_to(InvitationStatus.QUEUED, reason="Invitation task queued in background.")
        invitation.transition_to(InvitationStatus.SENDING, reason="Starting email dispatch process.")
    except Exception as e:
        logger.error(f"Failed to transition status for invitation {invitation_id}: {str(e)}")
        return False

    # 1. Cancel previous active invitations for this candidate to avoid concurrent login confusion
    try:
        with transaction.atomic():
            previous_invites = InterviewInvitation.objects.filter(
                candidate=invitation.candidate,
                is_active=True
            ).exclude(id=invitation.id)
            
            for prev in previous_invites:
                if prev.status in [InvitationStatus.PENDING, InvitationStatus.QUEUED, InvitationStatus.SENT, InvitationStatus.OPENED, InvitationStatus.STARTED, InvitationStatus.FAILED]:
                    prev.transition_to(InvitationStatus.CANCELLED, reason="Cancelled by new invitation.")
    except Exception as e:
        logger.error(f"Error cancelling previous invitations for candidate {invitation.candidate.id}: {str(e)}")

    # 2. Build email context
    context = build_invitation_context(invitation)
    
    # 3. Render template
    subject = f"Interview Invitation from {context['company_name']} - {context['job_title']}"
    html_body = render_to_string("emails/interview_invitation.html", context)
    text_body = strip_tags(html_body)
    
    # 4. Dispatch Email
    result = EmailService.send(context["candidate_email"], subject, html_body, text_body, context=context)
    
    # 5. Log status
    log_status = "success" if result["success"] else "failed"
    error_msg = result["error"]
    
    email_log = EmailLog.objects.create(
        invitation=invitation,
        recipient=context["candidate_email"],
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        provider=result["provider"],
        status=log_status,
        error_message=error_msg,
        retry_count=0
    )
    
    # 6. Final Status Transition
    if result["success"]:
        invitation.transition_to(InvitationStatus.SENT, reason=f"Email successfully dispatched via {result['provider']}.")
        return True
    else:
        invitation.transition_to(InvitationStatus.FAILED, reason=f"Email dispatch failed: {error_msg}")
        return False
