from rest_framework import serializers
from .models import InterviewInvitation, InvitationAudit, EmailLog

class InvitationAuditSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InvitationAudit
        fields = '__all__'

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.username
        return "System"

class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailLog
        fields = '__all__'

class InterviewInvitationSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source='candidate.name', read_only=True)
    candidate_email = serializers.CharField(source='candidate.email', read_only=True)
    job_title = serializers.CharField(source='job_opening.title', read_only=True)
    company_name = serializers.SerializerMethodField()
    audits = InvitationAuditSerializer(many=True, read_only=True)
    email_logs = EmailLogSerializer(many=True, read_only=True)

    class Meta:
        model = InterviewInvitation
        fields = '__all__'

    def get_company_name(self, obj):
        tenant = obj.job_opening.tenant
        return tenant.name if tenant else "Hirelens"
