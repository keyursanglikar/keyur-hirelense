import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from hirelense_backend.apps.tenants.models import Tenant
from hirelense_backend.apps.flows.models import InterviewFlow, FlowRound
from hirelense_backend.apps.scorecards.models import Scorecard, ScorecardParameter
from hirelense_backend.apps.openings.models import JobOpening
from django.contrib.auth.models import User
from hirelense_backend.apps.users.models import UserProfile

def seed():
    print("Seeding database...")
    
    # 1. Create Tenant
    tenant, created = Tenant.objects.get_or_create(
        id=1,
        defaults={'name': 'Kulkarni & Co.', 'domain': 'kulkarni.co'}
    )
    print(f"Tenant: {tenant} (Created: {created})")

    # 2. Create User
    user, user_created = User.objects.get_or_create(
        username='impatiljay',
        defaults={
            'email': 'impatiljay@gmail.com',
            'first_name': 'Jay',
            'last_name': 'Patil',
            'is_staff': True,
            'is_superuser': True
        }
    )
    user.set_password('Jay@1234')
    user.save()
    print(f"User: {user} (Created: {user_created}, Password Set)")

    # 3. Create UserProfile
    profile, profile_created = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            'tenant': tenant,
            'role': 'Admin',
            'phone_number': '+91 98765 43210',
            'address': 'Aundh, Pune, Maharashtra 411007',
            'date_of_birth': '1995-08-15'
        }
    )
    print(f"Profile: {profile} (Created: {profile_created})")

    # 4. Create Interview Flow
    flow, flow_created = InterviewFlow.objects.get_or_create(
        id=1,
        defaults={
            'tenant': tenant,
            'name': 'Standard CA Candidate Flow',
            'version': 'v1',
            'is_live': True,
            'ai_model': 'sonnet'
        }
    )
    print(f"Flow: {flow} (Created: {flow_created})")

    if flow_created:
        FlowRound.objects.get_or_create(flow=flow, type='form', defaults={'dur': 5, 'order': 0})
        FlowRound.objects.get_or_create(flow=flow, type='hr', defaults={'dur': 10, 'order': 1})
        FlowRound.objects.get_or_create(flow=flow, type='tech', defaults={'dur': 15, 'order': 2})

    # 5. Create Scorecard
    scorecard, sc_created = Scorecard.objects.get_or_create(
        id=1,
        defaults={
            'tenant': tenant,
            'name': 'Audit Executive Scorecard',
            'version': 'v1',
            'is_live': True,
            'auto_reject_threshold': 50,
            'rating_scale': '1-10'
        }
    )
    print(f"Scorecard: {scorecard} (Created: {sc_created})")

    if sc_created:
        ScorecardParameter.objects.get_or_create(scorecard=scorecard, name='Domain knowledge', defaults={'weight': 30, 'description': 'Tax and GST accounting concept check'})
        ScorecardParameter.objects.get_or_create(scorecard=scorecard, name='Communication', defaults={'weight': 20, 'description': 'Speaking and articulation clarity'})
        ScorecardParameter.objects.get_or_create(scorecard=scorecard, name='Problem Solving', defaults={'weight': 20, 'description': 'Logical resolution of accounting notices'})
        ScorecardParameter.objects.get_or_create(scorecard=scorecard, name='Culture Fit', defaults={'weight': 15, 'description': 'Ownership and general alignment'})
        ScorecardParameter.objects.get_or_create(scorecard=scorecard, name='Expected Stature', defaults={'weight': 15, 'description': 'Maturity levels'})

    # 6. Create Job Opening
    opening, op_created = JobOpening.objects.get_or_create(
        id=1,
        defaults={
            'tenant': tenant,
            'flow': flow,
            'scorecard': scorecard,
            'title': 'Audit & Tax Executive',
            'status': 'Live',
            'meta_info': '{"description": "Tax audit and statutory audit compliance."}'
        }
    )
    print(f"Job Opening: {opening} (Created: {op_created})")
    print("Database seeding completed successfully!")

if __name__ == '__main__':
    seed()
