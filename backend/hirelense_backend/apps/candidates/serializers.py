from rest_framework import serializers
from .models import Candidate, CandidateScoreDetail, CandidateTranscriptLine, Invitation, InterviewSession

class CandidateScoreDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateScoreDetail
        fields = '__all__'

class CandidateTranscriptLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateTranscriptLine
        fields = '__all__'

class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = '__all__'

class InterviewSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewSession
        fields = '__all__'

class CandidateSerializer(serializers.ModelSerializer):
    scores = CandidateScoreDetailSerializer(many=True, read_only=True)
    transcript = CandidateTranscriptLineSerializer(many=True, read_only=True)
    invitations = InvitationSerializer(many=True, read_only=True)

    class Meta:
        model = Candidate
        fields = [
            'id', 'candidate_id', 'student_id', 'opening', 'name', 'email', 'phone_no',
            'position_applied_for', 'resume', 'highest_qualification', 'relevant_experience',
            'notice_period', 'expected_ctc', 'linkedin_profile', 'status', 'score',
            'completed_at', 'tab_switches', 'paste_events', 'replay_used', 'ai_summary',
            'partner_note', 'consent_recorded', 'webcam_snapshot', 'scores', 'transcript', 'invitations', 'created_at', 'updated_at'
        ]
