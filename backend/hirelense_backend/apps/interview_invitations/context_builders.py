from django.conf import settings
from django.contrib.auth import get_user_model
User = get_user_model()

def build_invitation_context(invitation):
    candidate = invitation.candidate
    opening = invitation.job_opening
    tenant = opening.tenant
    
    company_name = tenant.name if tenant else "Hirelens"
    
    interview_link = f"{settings.FRONTEND_URL.rstrip('/')}/interview/invite/{invitation.interview_token}"
    
    expires_in_hours = 48
    if invitation.expires_at and invitation.created_at:
        expires_in_hours = int((invitation.expires_at - invitation.created_at).total_seconds() / 3600)
    
    return {
        "company_name": company_name,
        "candidate_name": candidate.name,
        "candidate_email": candidate.email,
        "student_id": candidate.student_id,
        "job_title": opening.title,
        "job_department": getattr(opening, 'department', 'Recruitment'),
        "interview_link": interview_link,
        "expires_at": invitation.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC') if invitation.expires_at else "",
        "expires_in_hours": expires_in_hours,
        "support_email": getattr(settings, 'SUPPORT_EMAIL', 'support@hirelens.in')
    }
