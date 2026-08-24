from django.db import models
from hirelense_backend.apps.openings.models import JobOpening

class Candidate(models.Model):
    STATUS_CHOICES = [
        ('Invited', 'Invited'),
        ('In progress', 'In progress'),
        ('Scored', 'Scored'),
        ('Shortlisted', 'Shortlisted'),
        ('Rejected (auto)', 'Rejected (auto)'),
        ('Rejected', 'Rejected'),
    ]
    # Unique generated identifiers
    candidate_id = models.CharField(max_length=64, unique=True, null=True, blank=True)
    student_id = models.CharField(max_length=128, unique=True, null=True, blank=True)
    
    # Core contact details
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone_no = models.CharField(max_length=20, blank=True, default='')
    
    # Assessment positioning & details
    opening = models.ForeignKey(JobOpening, on_delete=models.CASCADE, related_name='candidates')
    position_applied_for = models.CharField(max_length=255, blank=True, default='')
    resume = models.TextField(blank=True, default='') # Holds base64 or path/URL
    highest_qualification = models.CharField(max_length=255, blank=True, default='')
    relevant_experience = models.CharField(max_length=50, blank=True, default='')
    notice_period = models.CharField(max_length=50, blank=True, default='')
    expected_ctc = models.CharField(max_length=50, blank=True, default='')
    linkedin_profile = models.URLField(max_length=500, blank=True, default='')

    # Assessment tracking fields (used by frontend camera flow)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Invited')
    score = models.IntegerField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    tab_switches = models.IntegerField(default=0)
    paste_events = models.IntegerField(default=0)
    replay_used = models.IntegerField(default=0)
    ai_summary = models.TextField(blank=True, default='')
    partner_note = models.TextField(blank=True, default='')
    consent_recorded = models.BooleanField(default=False)
    webcam_snapshot = models.TextField(blank=True, default='')
    video_link = models.URLField(max_length=1000, blank=True, null=True)
    meta_info = models.TextField(blank=True, default='{}')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidates'

    def __str__(self):
        return f"{self.name} ({self.student_id}) - {self.opening.title}"

class Invitation(models.Model):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='invitations')
    organization_name = models.CharField(max_length=255)
    job_opening = models.CharField(max_length=255)
    email = models.EmailField()
    interview_link = models.URLField(max_length=1000)
    link_expiry = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invitations'

    def __str__(self):
        return f"Invite for {self.email} to {self.job_opening}"

class CandidateScoreDetail(models.Model):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='scores')
    parameter_name = models.CharField(max_length=255)
    score_value = models.FloatField()

    class Meta:
        db_table = 'candidate_score_details'

    def __str__(self):
        return f"{self.parameter_name}: {self.score_value} for {self.candidate.name}"

class CandidateTranscriptLine(models.Model):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='transcript')
    question_text = models.TextField()
    timestamp = models.CharField(max_length=20)
    answer_text = models.TextField()
    expected_answer = models.TextField(blank=True, null=True)
    score_value = models.FloatField()
    feedback = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'candidate_transcript_lines'

    def __str__(self):
        return f"{self.candidate.name} - {self.timestamp} ({self.score_value}/10)"

class InterviewSession(models.Model):
    STATUS_CHOICES = [
        ('Not Started', 'Not Started'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Expired', 'Expired'),
    ]
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='sessions')
    invitation = models.ForeignKey(Invitation, on_delete=models.SET_NULL, null=True, blank=True, related_name='sessions')
    job_opening = models.ForeignKey('openings.JobOpening', on_delete=models.CASCADE, related_name='sessions')
    interview_flow = models.ForeignKey('flows.InterviewFlow', on_delete=models.SET_NULL, null=True, blank=True, related_name='sessions')
    scorecard = models.ForeignKey('scorecards.Scorecard', on_delete=models.SET_NULL, null=True, blank=True, related_name='sessions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Not Started')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    current_round = models.IntegerField(default=0)
    current_question = models.IntegerField(default=0)
    progress = models.FloatField(default=0.0)
    resume_info = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'interview_sessions'

    def __str__(self):
        return f"Session for {self.candidate.name} ({self.status})"
