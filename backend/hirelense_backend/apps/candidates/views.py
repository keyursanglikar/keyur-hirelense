import os
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Candidate, CandidateScoreDetail, CandidateTranscriptLine, Invitation, InterviewSession
from .serializers import CandidateSerializer, CandidateScoreDetailSerializer, CandidateTranscriptLineSerializer
from hirelense_backend.apps.openings.models import JobOpening
from rest_framework.permissions import AllowAny

class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer

    def get_queryset(self):
        from django.db import connection
        try:
            with connection.cursor() as cursor:
                engine = connection.settings_dict['ENGINE']
                if 'mysql' in engine:
                    cursor.execute("SHOW COLUMNS FROM candidates LIKE 'video_link'")
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE candidates ADD COLUMN video_link VARCHAR(1000) NULL")
                    cursor.execute("SHOW COLUMNS FROM candidates LIKE 'meta_info'")
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE candidates ADD COLUMN meta_info LONGTEXT NULL")
                    cursor.execute("SHOW COLUMNS FROM candidate_transcript_lines LIKE 'expected_answer'")
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE candidate_transcript_lines ADD COLUMN expected_answer LONGTEXT NULL")
                elif 'postgresql' in engine or 'psycopg' in engine:
                    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='candidates' and column_name='video_link';")
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE candidates ADD COLUMN video_link VARCHAR(1000) NULL")
                    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='candidates' and column_name='meta_info';")
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE candidates ADD COLUMN meta_info TEXT NULL")
                    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='candidate_transcript_lines' and column_name='expected_answer';")
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE candidate_transcript_lines ADD COLUMN expected_answer TEXT NULL")
        except Exception as e:
            pass # fallback to normal
        return super().get_queryset()



    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            from rest_framework.response import Response
            return Response({'error': str(e), 'trace': error_trace}, status=500)



    def get_permissions(self):
        if self.action in ['login', 'start_session', 'update_session', 'submit_interview', 'partial_update', 'update']:
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=['post'])
    def invite(self, request):
        import uuid
        import re
        import random
        from django.utils import timezone
        from datetime import timedelta
        
        opening_id = request.data.get('opening')
        if not opening_id:
            return Response({'error': 'opening ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            opening = JobOpening.objects.get(id=opening_id)
        except JobOpening.DoesNotExist:
            return Response({'error': 'Job Opening not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Retrieve list of candidates (supports bulk upload list)
        candidates_data = request.data.get('candidates', [])
        if not isinstance(candidates_data, list):
            candidates_data = []
            
        # If single candidate object, pack into list
        if not candidates_data:
            name = request.data.get('name')
            email = request.data.get('email')
            if name and email:
                candidates_data.append({
                    'name': name,
                    'email': email,
                    'phone_no': request.data.get('phone_no', ''),
                    'position_applied_for': request.data.get('position_applied_for', ''),
                    'resume': request.data.get('resume', ''),
                    'highest_qualification': request.data.get('highest_qualification', ''),
                    'relevant_experience': request.data.get('relevant_experience', ''),
                    'notice_period': request.data.get('notice_period', ''),
                    'expected_ctc': request.data.get('expected_ctc', ''),
                    'linkedin_profile': request.data.get('linkedin_profile', ''),
                    'expiry_hours': request.data.get('expiry_hours', 48)
                })
                
        if not candidates_data:
            return Response({'error': 'No candidate details provided.'}, status=status.HTTP_400_BAD_REQUEST)
            
        created_invitations = []
        
        for cand in candidates_data:
            name = cand.get('name')
            email = cand.get('email')
            if not name or not email:
                continue
                
            # 1. Generate unique Candidate ID
            cand_id = f"CAND-{uuid.uuid4().hex[:8].upper()}"
            
            # 2. Generate unique Student ID: 2 words of job + 2 words of candidate + unique number
            job_words = [w.lower() for w in re.findall(r'\b\w+\b', opening.title)[:2]]
            cand_words = [w.lower() for w in re.findall(r'\b\w+\b', name)[:2]]
            base_id = "-".join(job_words + cand_words)
            
            student_id = f"{base_id}-{random.randint(1000, 9999)}"
            while Candidate.objects.filter(student_id=student_id).exists():
                student_id = f"{base_id}-{random.randint(1000, 9999)}"
                
            # 3. Create Candidate in DB
            candidate = Candidate.objects.create(
                opening=opening,
                candidate_id=cand_id,
                student_id=student_id,
                name=name,
                email=email,
                phone_no=cand.get('phone_no', ''),
                position_applied_for=cand.get('position_applied_for', opening.title),
                resume=cand.get('resume', ''),
                highest_qualification=cand.get('highest_qualification', ''),
                relevant_experience=cand.get('relevant_experience', ''),
                notice_period=cand.get('notice_period', ''),
                expected_ctc=cand.get('expected_ctc', ''),
                linkedin_profile=cand.get('linkedin_profile', ''),
                status='Invited'
            )
            
            # 4. Generate Link
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            interview_link = f"{frontend_url}/candidate-portal/login?student_id={student_id}"
            
            # 5. Create Invitation Table Record
            expiry_hours = int(cand.get('expiry_hours', 48))
            link_expiry = timezone.now() + timedelta(hours=expiry_hours)
            tenant_name = opening.tenant.name if (opening.tenant and opening.tenant.name) else "Hirelens"
            
            Invitation.objects.create(
                candidate=candidate,
                organization_name=tenant_name,
                job_opening=opening.title,
                email=email,
                interview_link=interview_link,
                link_expiry=link_expiry
            )
            
            # Populate the new InterviewInvitation model and send the responsive email
            from hirelense_backend.apps.interview_invitations.services import InvitationService
            invitation_token = None
            try:
                invitation_obj = InvitationService.create_invitation(
                    candidate_id=candidate.id,
                    job_opening_id=opening.id,
                    expiry_hours=expiry_hours
                )
                if invitation_obj:
                    invitation_token = invitation_obj.interview_token
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to create new InterviewInvitation: {str(e)}")
            
            serialized_cand = CandidateSerializer(candidate).data
            
            # Attach the secure token for direct login bypass
            if invitation_token:
                serialized_cand['interview_token'] = invitation_token
            
            # Fetch EmailJS credentials for the frontend
            from django.db import connection
            with connection.cursor() as cursor:
                row = None
                if opening.tenant:
                    cursor.execute("SELECT service_id, template_id, public_key FROM email_settings WHERE firm_id = %s", [opening.tenant.id])
                    row = cursor.fetchone()
                
                # Fallback to global settings if firm hasn't configured theirs
                if not row:
                    cursor.execute("SELECT service_id, template_id, public_key FROM email_settings WHERE firm_id IS NULL LIMIT 1")
                    row = cursor.fetchone()
                    
                if row:
                    serialized_cand['emailjs_settings'] = {
                        'service_id': row[0],
                        'template_id': row[1],
                        'public_key': row[2]
                    }
            
            created_invitations.append(serialized_cand)
            
        # Update invited count in JobOpening meta_info
        if created_invitations:
            import json
            try:
                meta = json.loads(opening.meta_info) if opening.meta_info else {}
                meta['invited'] = int(meta.get('invited', 0)) + len(created_invitations)
                opening.meta_info = json.dumps(meta)
                opening.save()
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to update invited count in JobOpening meta_info: {str(e)}")
            
        return Response(created_invitations, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def login(self, request):
        student_id = request.data.get('student_id')
        email = request.data.get('email')
        if not student_id or not email:
            return Response({'error': 'Student ID and Email are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            candidate = Candidate.objects.get(student_id=student_id, email=email)
            # Check link expiry against last invitation
            invitation = candidate.invitations.last()
            from django.utils import timezone
            if invitation and invitation.link_expiry < timezone.now():
                return Response({'error': 'This interview link has expired.'}, status=status.HTTP_400_BAD_REQUEST)
                
            opening = candidate.opening
            flow = opening.flow if opening else None
            
            rounds_list = []
            if flow:
                from hirelense_backend.apps.flows.serializers import FlowRoundSerializer
                rounds_list = FlowRoundSerializer(flow.rounds.all(), many=True).data
                
            # Get or create active session and update started_at
            session = candidate.sessions.filter(status='In Progress').last()
            if not session:
                session = candidate.sessions.filter(status='Not Started').last()
                if not session:
                    from hirelense_backend.apps.candidates.models import InterviewSession
                    session = InterviewSession.objects.create(
                        candidate=candidate,
                        invitation=candidate.invitations.last(),
                        job_opening=opening,
                        interview_flow=flow,
                        scorecard=opening.scorecard if opening else None if opening else None,
                        status='Not Started',
                        started_at=timezone.now(),
                        progress=0.0
                    )
                else:
                    session.started_at = timezone.now()
                    session.save()

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
            if opening and opening.meta_info:
                try:
                    opening_meta = json.loads(opening.meta_info)
                except Exception:
                    pass
            expires_at_str = ""
            if invitation and invitation.link_expiry:
                expires_at_str = invitation.link_expiry.strftime('%Y-%m-%d %H:%M:%S UTC')
                
            return Response({
                'expires_at': expires_at_str,
                'candidate': {
                    'id': candidate.id,
                    'candidate_id': candidate.candidate_id,
                    'student_id': candidate.student_id,
                    'name': candidate.name,
                    'email': candidate.email,
                    'phone_no': candidate.phone_no,
                    'highest_qualification': candidate.highest_qualification,
                    'relevant_experience': candidate.relevant_experience,
                    'notice_period': candidate.notice_period,
                    'expected_ctc': candidate.expected_ctc,
                    'linkedin_profile': candidate.linkedin_profile,
                    'status': candidate.status
                },
                'opening': {
                    'id': opening.id if opening else None,
                    'title': opening.title if opening else None,
                    'status': opening.status if opening else None,
                    'experience': opening_meta.get('experience', ''),
                    'salary': opening_meta.get('salary', '')
                } if opening else None,
                'flow': {
                    'id': flow.id if flow else None,
                    'name': flow.name if flow else '',
                    'rounds': rounds_list
                },
                'session': session_data
            })
        except Candidate.DoesNotExist:
            return Response({'error': 'Invalid Student ID or Email ID.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def start_session(self, request, pk=None):
        candidate = self.get_object()
        from django.utils import timezone
        
        # Check if there is an active session
        session = candidate.sessions.filter(status='In Progress').last()
        if not session:
            session = candidate.sessions.filter(status='Not Started').last()
            if session:
                session.status = 'In Progress'
                session.started_at = timezone.now()
                session.save()
            else:
                # Create a new session
                session = InterviewSession.objects.create(
                    candidate=candidate,
                    invitation=candidate.invitations.last(),
                    job_opening=candidate.opening,
                    interview_flow=candidate.opening.flow,
                    scorecard=candidate.opening.scorecard,
                    status='In Progress',
                    started_at=timezone.now(),
                    progress=0.0
                )
            
            # Update candidate status to 'In progress'
            candidate.status = 'In progress'
            candidate.save()
            
            # Transition new invitation to started
            from hirelense_backend.apps.interview_invitations.models import InterviewInvitation, InvitationStatus
            invitation = InterviewInvitation.objects.filter(candidate=candidate, is_active=True).first()
            if invitation and invitation.status in [InvitationStatus.SENT, InvitationStatus.OPENED]:
                try:
                    invitation.transition_to(InvitationStatus.STARTED, reason="Candidate started the interview session.")
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to transition invitation to STARTED: {str(e)}")
            
        return Response({
            'session_id': session.id,
            'status': session.status,
            'current_round': session.current_round,
            'current_question': session.current_question,
            'progress': session.progress,
            'resume_info': session.resume_info
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'])
    def update_session(self, request, pk=None):
        candidate = self.get_object()
        session = candidate.sessions.filter(status='In Progress').last()
        if not session:
            return Response({'error': 'No active session found.'}, status=status.HTTP_400_BAD_REQUEST)
            
        current_round = request.data.get('current_round')
        current_question = request.data.get('current_question')
        progress = request.data.get('progress')
        resume_info = request.data.get('resume_info')
        
        if current_round is not None:
            session.current_round = int(current_round)
        if current_question is not None:
            session.current_question = int(current_question)
        if progress is not None:
            session.progress = float(progress)
        if resume_info is not None:
            session.resume_info = resume_info
            
        session.save()
        return Response({'status': 'Session progress updated successfully.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def submit_interview(self, request, pk=None):
        from django.db import transaction
        from django.utils import timezone
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            candidate = Candidate.objects.get(pk=pk)
        except Candidate.DoesNotExist:
            return Response({'error': 'Candidate not found'}, status=status.HTTP_404_NOT_FOUND)
            
        # If the candidate has already been evaluated successfully, skip to prevent duplicates
        if candidate.status == 'Scored' and candidate.transcript.exists():
            logger.info(f"Candidate {candidate.id} has already been evaluated. Skipping duplicate submission request.")
            return Response({'status': 'Interview already submitted and evaluated successfully.'}, status=status.HTTP_200_OK)
            
        answers = request.data.get('answers', {})
        mcq_answers = request.data.get('mcq_answers', {})
        proctoring = request.data.get('proctoring', {})

        # 1. Update candidate status and proctoring stats
        candidate.status = 'Scored'
        candidate.completed_at = timezone.now()
        
        try:
            candidate.tab_switches = int(proctoring.get('tab_switches', candidate.tab_switches) or 0)
            candidate.paste_events = int(proctoring.get('paste_events', candidate.paste_events) or 0)
            candidate.replay_used = int(proctoring.get('replay_used', candidate.replay_used) or 0)
        except (ValueError, TypeError):
            pass
            
        candidate.save()
        
        # Delete existing transcript and scorecard detail records
        candidate.transcript.all().delete()
        candidate.scores.all().delete()

        opening = candidate.opening

        # 2. Evaluate candidate interview using the Evaluation Service
        from hirelense_backend.apps.candidates.services import CandidateEvaluationService
        try:
            CandidateEvaluationService.evaluate_interview(
                candidate=candidate,
                answers=answers,
                mcq_answers=mcq_answers,
                flow=opening.flow if opening else None,
                scorecard=opening.scorecard if opening else None
            )
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            logger.error(f"Error evaluating interview for candidate {candidate.id}: {str(e)}", exc_info=True)
            # Revert status if completely failed
            candidate.status = 'In progress'
            candidate.save()
            return Response({'error': f'An internal error occurred during evaluation: {str(e)} | {tb}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Finalize active Interview Session and Invitation outside the transaction lock
        # 4. Finalize active Interview Session
        session = candidate.sessions.filter(status='In Progress').last()
        if session:
            session.status = 'Completed'
            session.completed_at = timezone.now()
            session.progress = 100.0
            session.save()
            
        # Transition new invitation to completed
        from hirelense_backend.apps.interview_invitations.models import InterviewInvitation, InvitationStatus
        invitation = InterviewInvitation.objects.filter(candidate=candidate, is_active=True).first()
        if invitation and invitation.status == InvitationStatus.STARTED:
            try:
                invitation.transition_to(InvitationStatus.COMPLETED, reason="Candidate submitted the interview.")
            except Exception as e:
                logger.warning(f"Failed to transition invitation to COMPLETED: {str(e)}")
            
        return Response({'status': 'Interview submitted and evaluated successfully.'}, status=status.HTTP_200_OK)

class CandidateScoreDetailViewSet(viewsets.ModelViewSet):
    queryset = CandidateScoreDetail.objects.all()
    serializer_class = CandidateScoreDetailSerializer

class CandidateTranscriptLineViewSet(viewsets.ModelViewSet):
    queryset = CandidateTranscriptLine.objects.all()
    serializer_class = CandidateTranscriptLineSerializer

    @action(detail=True, methods=['post'], url_path='upload-video')
    def upload_video(self, request, pk=None):
        candidate = self.get_object()
        video_file = request.FILES.get('video')
        if not video_file:
            return Response({'error': 'No video file provided'}, status=status.HTTP_400_BAD_REQUEST)

        from django.db import connection
        tenant_id = candidate.opening.tenant.id if candidate.opening.tenant else None
        
        service_account_json = None
        folder_id = None
        
        with connection.cursor() as cursor:
            if tenant_id:
                # Try creating table just in case
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS gdrive_settings (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        firm_id INT NULL,
                        service_account_json TEXT,
                        folder_id VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    );
                """)
                cursor.execute("SELECT service_account_json, folder_id FROM gdrive_settings WHERE firm_id = %s LIMIT 1", [tenant_id])
                row = cursor.fetchone()
                if row:
                    service_account_json, folder_id = row

        if not service_account_json or not folder_id:
            return Response({'error': 'Google Drive not configured for this firm'}, status=status.HTTP_400_BAD_REQUEST)

        import json
        import datetime
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaIoBaseUpload
        import io

        try:
            creds_dict = json.loads(service_account_json)
            scopes = ['https://www.googleapis.com/auth/drive']
            credentials = Credentials.from_service_account_info(creds_dict, scopes=scopes)
            drive_service = build('drive', 'v3', credentials=credentials)

            # 1. Create or get Job Opening Folder
            job_title = candidate.opening.title if candidate.opening else "UnknownJob"
            job_title = job_title.replace('/', '-')
            job_folder_name = f"{job_title}{datetime.date.today().strftime('%d/%m/%Y')}"
            
            query = f"name='{job_folder_name}' and mimeType='application/vnd.google-apps.folder' and '{folder_id}' in parents and trashed=false"
            response = drive_service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
            job_folder_id = None
            if response.get('files', []):
                job_folder_id = response.get('files')[0].get('id')
            else:
                file_metadata = {
                    'name': job_folder_name,
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [folder_id]
                }
                folder = drive_service.files().create(body=file_metadata, fields='id').execute()
                job_folder_id = folder.get('id')

            # 2. Create Candidate Folder
            candidate_folder_name = f"{candidate.name.replace(' ', '')}{candidate.id}{candidate.email}"
            
            query = f"name='{candidate_folder_name}' and mimeType='application/vnd.google-apps.folder' and '{job_folder_id}' in parents and trashed=false"
            response = drive_service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
            candidate_folder_id = None
            if response.get('files', []):
                candidate_folder_id = response.get('files')[0].get('id')
            else:
                file_metadata = {
                    'name': candidate_folder_name,
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [job_folder_id]
                }
                folder = drive_service.files().create(body=file_metadata, fields='id').execute()
                candidate_folder_id = folder.get('id')

            # 3. Upload Video
            video_bytes = video_file.read()
            media = MediaIoBaseUpload(io.BytesIO(video_bytes), mimetype=video_file.content_type or 'video/webm', resumable=True)
            
            file_metadata = {
                'name': f"interview.mp4",
                'parents': [candidate_folder_id]
            }
            
            file = drive_service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
            
            video_url = file.get('webViewLink')

            try:
                drive_service.permissions().create(
                    fileId=file.get('id'),
                    body={'type': 'anyone', 'role': 'reader'}
                ).execute()
            except Exception as perm_e:
                pass

            meta = {}
            if candidate.meta_info:
                try:
                    meta = json.loads(candidate.meta_info)
                except:
                    pass
            meta['video_drive_link'] = video_url
            candidate.meta_info = json.dumps(meta)
            candidate.video_link = video_url
            candidate.save()

            return Response({
                'message': 'Video uploaded successfully to Google Drive',
                'video_url': video_url
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)