import os
import sys
import django

# Add backend dir to python path
sys.path.append(r'f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_platform.settings')
django.setup()

from hirelense_backend.apps.candidates.models import Candidate
for c in Candidate.objects.all():
    print(c.email, c.student_id, 'opening:', c.opening.id if c.opening else 'None')
