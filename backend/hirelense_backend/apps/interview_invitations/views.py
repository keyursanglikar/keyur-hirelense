from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db import transaction
from django.conf import settings
import uuid

from .models import InterviewInvitation, InvitationStatus, EmailLog
from .serializers import InterviewInvitationSerializer
from .services import InvitationService
from hirelense_backend.apps.candidates.models import Candidate
from hirelense_backend.apps.openings.models import JobOpening
from hirelense_backend.apps.flows.serializers import FlowRoundSerializer

class SendInvitationView(APIView):
    def post(self, request):
        candidate_id = request.data.get('candidate_id')
        job_opening_id = request.data.get('job_opening_id')
        expiry_hours = request.data.get('expiry_hours', 48)

        if not candidate_id or not job_opening_id:
            return Response(
                {"error": "candidate_id and job_opening_id are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            invitation = InvitationService.create_invitation(
                candidate_id=candidate_id,
                job_opening_id=job_opening_id,
                expiry_hours=expiry_hours
            )
            
            interview_link = f"{settings.FRONTEND_URL.rstrip('/')}/interview/invite/{invitation.interview_token}"
            
            return Response({
                "success": True,
                "invitation_id": invitation.id,
                "status": invitation.status,
                "expires_at": invitation.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC'),
                "interview_link": interview_link
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TokenValidationView(APIView):
    from rest_framework.permissions import AllowAny
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            # Look up invitation by UUID token
            invitation = InterviewInvitation.objects.get(interview_token=token, is_active=True)
        except (InterviewInvitation.DoesNotExist, ValueError):
            return Response({"error": "Invalid interview link."}, status=status.HTTP_404_NOT_FOUND)

        candidate = invitation.candidate
        opening = invitation.job_opening
        
        # 1. Check Cancellation status
        if invitation.status == InvitationStatus.CANCELLED:
            return Response({"error": "This invitation has been cancelled. Please contact HR for a new invite."}, status=status.HTTP_400_BAD_REQUEST)
            
        # 2. Check Expiry
        if invitation.expires_at < timezone.now():
            if invitation.status not in [InvitationStatus.EXPIRED, InvitationStatus.COMPLETED]:
                invitation.transition_to(InvitationStatus.EXPIRED, reason="Access link opened after expiration timestamp.")
            return Response({"error": "This interview link has expired. Please request a new invite from HR."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Transition to Opened if currently Sent/Queued/Pending
        if invitation.status in [InvitationStatus.PENDING, InvitationStatus.QUEUED, InvitationStatus.SENDING, InvitationStatus.SENT, InvitationStatus.FAILED]:
            invitation.transition_to(InvitationStatus.OPENED, reason="Access link opened by candidate.")

        # 4. Gather rounds
        flow = opening.flow
        rounds_list = []
        if flow:
            rounds_list = FlowRoundSerializer(flow.rounds.all(), many=True).data

        # Update started_at on InterviewSession when candidate accesses
        from hirelense_backend.apps.candidates.models import InterviewSession
        session = candidate.sessions.filter(status='In Progress').last()
        if not session:
            session = candidate.sessions.filter(status='Not Started').last()
            if not session:
                session = InterviewSession.objects.create(
                    candidate=candidate,
                    job_opening=opening,
                    interview_flow=opening.flow,
                    scorecard=opening.scorecard,
                    status='Not Started',
                    started_at=timezone.now(),
                    progress=0.0
                )
            else:
                session.started_at = timezone.now()
                session.save()
        else:
            pass

        session_data = None
        if session:
            session_data = {
                'id': session.id,
                'status': session.status,
                'current_round': session.current_round,
                'current_question': session.current_question,
                'progress': session.progress,
                'resume_info': session.resume_info
            }

        import json
        opening_meta = {}
        if opening.meta_info:
            try:
                opening_meta = json.loads(opening.meta_info)
            except Exception:
                pass

        company_name = opening.tenant.name if (opening.tenant and opening.tenant.name) else "Hirelens"

        return Response({
            "valid": True,
            "invitation_id": invitation.id,
            "candidate_id": candidate.id,
            "candidate_name": candidate.name,
            "candidate_email": candidate.email,
            "candidate_phone": candidate.phone_no,
            "candidate_qualification": candidate.highest_qualification,
            "candidate_experience": candidate.relevant_experience,
            "candidate_notice_period": candidate.notice_period,
            "candidate_expected_ctc": candidate.expected_ctc,
            "candidate_linkedin": candidate.linkedin_profile,
            "job_title": opening.title,
            "company_name": company_name,
            "opening_experience": opening_meta.get('experience', ''),
            "opening_salary": opening_meta.get('salary', ''),
            "expires_at": invitation.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC'),
            "flow": {
                "id": flow.id if flow else None,
                "name": flow.name if flow else '',
                "rounds": rounds_list
            },
            "session": session_data
        })

class InterviewInvitationViewSet(viewsets.ModelViewSet):
    queryset = InterviewInvitation.objects.filter(is_active=True)
    serializer_class = InterviewInvitationSerializer

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        invitation = self.get_object()
        try:
            # Create a brand new invitation record
            new_invitation = InvitationService.create_invitation(
                candidate_id=invitation.candidate.id,
                job_opening_id=invitation.job_opening.id,
                expiry_hours=48
            )
            return Response(InterviewInvitationSerializer(new_invitation).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        invitation = self.get_object()
        try:
            invitation.transition_to(InvitationStatus.CANCELLED, user=request.user, reason="Cancelled manually by employer.")
            return Response(InterviewInvitationSerializer(invitation).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
