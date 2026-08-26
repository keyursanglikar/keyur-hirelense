import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_platform.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()
cursor.execute('SHOW TABLES')
tables = [t[0] for t in cursor.fetchall()]

hirelens_tables = [
    'candidates', 'candidate_score_details', 'candidate_transcript_lines', 
    'email_logs', 'flow_rounds', 'interview_flows', 'interview_invitations', 
    'interview_sessions', 'invitation_audits', 'invitations', 'job_openings', 
    'scorecards', 'scorecard_parameters', 'question_pools', 'pool_questions'
]

cursor.execute('SET FOREIGN_KEY_CHECKS=0')
for t in hirelens_tables:
    if t in tables:
        cursor.execute(f'DROP TABLE IF EXISTS {t}')
cursor.execute('SET FOREIGN_KEY_CHECKS=1')
print('Dropped Hirelens tables')

cursor.execute("DELETE FROM django_migrations WHERE app NOT IN ('accounts', 'activities', 'admin', 'auth', 'contenttypes', 'firms', 'module_registry', 'sessions', 'subscriptions')")
print('Cleared Hirelens migrations from django_migrations')
