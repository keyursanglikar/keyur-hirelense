import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_platform.settings')
django.setup()

from subscriptions.models import SubscriptionPlan
from module_registry.models import Module
from django.db import connection

# Find the ca_tool module
module = Module.objects.filter(slug='ca_tools').first()
if not module:
    module = Module.objects.create(
        module_name='ca_tools',
        slug='ca_tools',
        display_name='CA Tool',
        description='CA Management Utility',
        frontend_url='/ca-tool',
        database_name='default'
    )
    print("Created ca_tools module.")

plans_data = [
    {"name": "CA Tool Basic (1 Month)", "price": 499.00, "days": 30, "code": "CA_TOOL_1M"},
    {"name": "CA Tool Quarterly (3 Months)", "price": 1299.00, "days": 90, "code": "CA_TOOL_3M"},
    {"name": "CA Tool Half-Yearly (6 Months)", "price": 2499.00, "days": 180, "code": "CA_TOOL_6M"},
    {"name": "CA Tool Annual (1 Year)", "price": 4999.00, "days": 365, "code": "CA_TOOL_1Y"},
    {"name": "CA Tool Biannual (2 Years)", "price": 8999.00, "days": 730, "code": "CA_TOOL_2Y"},
]

created_plans = []
for p in plans_data:
    plan, created = SubscriptionPlan.objects.get_or_create(
        plan_name=p["name"],
        defaults={
            "plan_code": p["code"],
            "price": p["price"],
            "duration_days": p["days"],
            "description": f"Subscription for {p['days']} days.",
            "is_active": True,
            "is_trial": False
        }
    )
    created_plans.append(plan)
    print(f"{'Created' if created else 'Found'} plan: {plan.plan_name}")

# Map them in plan_modules table
with connection.cursor() as cursor:
    for plan in created_plans:
        cursor.execute(
            "INSERT IGNORE INTO plan_modules (plan_id, module_id) VALUES (%s, %s)",
            [plan.id, module.id]
        )
    print("Mapped plans to ca_tools module.")
