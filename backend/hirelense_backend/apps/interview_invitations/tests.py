from django.test import TestCase
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import get_user_model
User = get_user_model()
from datetime import timedelta
import uuid

from hirelense_backend.apps.candidates.models import Candidate
from hirelense_backend.apps.openings.models import JobOpening
from hirelense_backend.apps.tenants.models import Tenant
from hirelense_backend.apps.interview_invitations.models import InterviewInvitation, InvitationStatus, InvitationAudit, EmailLog
from hirelense_backend.apps.interview_invitations.services import InvitationService

class InterviewInvitationTests(TestCase):
    def setUp(self):
        # Create user
        self.user = User.objects.create_user(username='hr_manager', password='password')
        
        # Create tenant
        self.tenant = Tenant.objects.create(name='Test Corp', domain='testcorp.com')
        
        # Create job opening
        self.opening = JobOpening.objects.create(
            title='Software Engineer',
            tenant=self.tenant
        )
        
        # Create candidate
        self.candidate = Candidate.objects.create(
            name='John Doe',
            email='john@example.com',
            opening=self.opening,
            student_id='test-student-1234'
        )

    def test_invitation_creation_and_defaults(self):
        expires_at = timezone.now() + timedelta(hours=48)
        invitation = InterviewInvitation.objects.create(
            candidate=self.candidate,
            job_opening=self.opening,
            expires_at=expires_at,
            status=InvitationStatus.PENDING
        )
        
        self.assertIsInstance(invitation.interview_token, uuid.UUID)
        self.assertEqual(invitation.status, InvitationStatus.PENDING)
        self.assertTrue(invitation.is_active)
        self.assertIsNone(invitation.deleted_at)
        self.assertEqual(invitation.template_version, 'v1')

    def test_state_machine_transition_valid(self):
        expires_at = timezone.now() + timedelta(hours=48)
        invitation = InterviewInvitation.objects.create(
            candidate=self.candidate,
            job_opening=self.opening,
            expires_at=expires_at,
            status=InvitationStatus.PENDING
        )
        
        # pending -> queued -> sending -> sent
        invitation.transition_to(InvitationStatus.QUEUED, user=self.user, reason="Task queued")
        self.assertEqual(invitation.status, InvitationStatus.QUEUED)
        
        invitation.transition_to(InvitationStatus.SENDING, user=self.user, reason="Sending")
        self.assertEqual(invitation.status, InvitationStatus.SENDING)
        
        invitation.transition_to(InvitationStatus.SENT, user=self.user, reason="Sent")
        self.assertEqual(invitation.status, InvitationStatus.SENT)
        self.assertIsNotNone(invitation.sent_at)
        
        # Verify audits were created
        audits = InvitationAudit.objects.filter(invitation=invitation).order_by('timestamp')
        self.assertEqual(audits.count(), 3)
        self.assertEqual(audits[0].new_status, InvitationStatus.QUEUED)
        self.assertEqual(audits[1].new_status, InvitationStatus.SENDING)
        self.assertEqual(audits[2].new_status, InvitationStatus.SENT)
        self.assertEqual(audits[2].changed_by, self.user)

    def test_state_machine_transition_invalid(self):
        expires_at = timezone.now() + timedelta(hours=48)
        invitation = InterviewInvitation.objects.create(
            candidate=self.candidate,
            job_opening=self.opening,
            expires_at=expires_at,
            status=InvitationStatus.PENDING
        )
        
        # Invalid direct transition: pending -> completed
        with self.assertRaises(ValueError):
            invitation.transition_to(InvitationStatus.COMPLETED)

    def test_invitation_service_creation(self):
        invitation = InvitationService.create_invitation(
            candidate_id=self.candidate.id,
            job_opening_id=self.opening.id,
            expiry_hours=24
        )
        
        self.assertEqual(invitation.candidate, self.candidate)
        self.assertEqual(invitation.job_opening, self.opening)
        
        # Verify it created an initial PENDING audit log
        audit = InvitationAudit.objects.filter(invitation=invitation).last()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.new_status, InvitationStatus.PENDING)

    def test_validation_api_endpoint(self):
        # Create sent invitation
        invitation = InvitationService.create_invitation(
            candidate_id=self.candidate.id,
            job_opening_id=self.opening.id,
            expiry_hours=24
        )
        invitation.status = InvitationStatus.SENT
        invitation.save()
        
        response = self.client.get(f'/api/interview-invitations/{invitation.interview_token}/')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertTrue(data['valid'])
        self.assertEqual(data['candidate_name'], 'John Doe')
        self.assertEqual(data['job_title'], 'Software Engineer')
        self.assertEqual(data['company_name'], 'Test Corp')
        self.assertNotIn('student_id', data)  # Verify sensitive password is not returned
        
        # Refresh from db and verify status changed to Opened
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, InvitationStatus.OPENED)
        self.assertIsNotNone(invitation.opened_at)
