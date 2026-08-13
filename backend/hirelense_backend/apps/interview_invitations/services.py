from django.utils import timezone
from django.db import transaction
from datetime import timedelta
import logging

from .models import InterviewInvitation, InvitationStatus, InvitationAudit
from .tasks import send_invitation_email_task
from hirelense_backend.apps.candidates.models import Candidate
from hirelense_backend.apps.openings.models import JobOpening

logger = logging.getLogger(__name__)

class InvitationService:
    @staticmethod
    def create_invitation(candidate_id, job_opening_id, expiry_hours=48):
        try:
            candidate = Candidate.objects.get(id=candidate_id)
        except Candidate.DoesNotExist:
            raise ValueError(f"Candidate with ID {candidate_id} not found.")

        try:
            job_opening = JobOpening.objects.get(id=job_opening_id)
        except JobOpening.DoesNotExist:
            raise ValueError(f"Job Opening with ID {job_opening_id} not found.")

        expires_at = timezone.now() + timedelta(hours=int(expiry_hours))

        with transaction.atomic():
            invitation = InterviewInvitation.objects.create(
                candidate=candidate,
                job_opening=job_opening,
                expires_at=expires_at,
                status=InvitationStatus.PENDING,
                template_version='v1'
            )
            logger.info(f"Invitation created: Successful entry in DB (ID: {invitation.id}) for candidate {candidate.email}")
            
            InvitationAudit.objects.create(
                invitation=invitation,
                old_status='',
                new_status=InvitationStatus.PENDING,
                changed_by=None,
                reason="Invitation record created."
            )

        try:
            send_invitation_email_task.delay(invitation.id)
        except Exception:
            # Fallback silently to direct synchronous execution if Celery broker is not running locally
            send_invitation_email_task(invitation.id)

        return invitation
