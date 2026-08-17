# backend/firms/views.py
import secrets
import hashlib
import traceback
import os
import json
from django.db import transaction, connection
from django.utils import timezone
from datetime import timedelta, datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.mail import send_mail
from django.conf import settings

from accounts.models import User, CAFirmUser
from module_registry.models import Module, FirmModule
from subscriptions.models import SubscriptionPlan, FirmSubscription
from activities.models import AuditLog
from .models import CAFirm
from .serializers import CAFirmCreateSerializer

# Helper to verify if user is SuperAdmin
class IsSuperAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        is_auth = super().has_permission(request, view)
        return is_auth and request.user.is_super_admin


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_audit(user_id, firm_id, table_name, record_id, action, old_values=None, new_values=None, request=None):
    try:
        ip = get_client_ip(request) if request else None
        agent = request.META.get('HTTP_USER_AGENT') if request else None
        
        # Raw cursor SQL insert to ensure audit log is written even if transaction issues occur
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO audit_logs 
                (user_id, firm_id, table_name, record_id, action, old_values, new_values, ip_address, user_agent, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                [
                    user_id, 
                    firm_id, 
                    table_name, 
                    record_id, 
                    action, 
                    str(old_values) if old_values else None, 
                    str(new_values) if new_values else None, 
                    ip, 
                    agent
                ]
            )
    except Exception as e:
        print("Failed to log audit:", e)


# Module slug → frontend route mapping
MODULE_FRONTEND_ROUTES = {
    'fee-estimation': '/ca/fee-estimation',
    'gst': '/ca/gst',
    'income-tax': '/ca/income-tax',
    'payroll': '/ca/payroll',
    'audit': '/ca/audit',
    'compliance': '/ca/compliance',
    'accounting': '/ca/accounting',
    'tds': '/ca/tds',
    # Add more slug → route mappings as modules are added
}

DEFAULT_FRONTEND_BASE = os.getenv("FRONTEND_URL", "http://localhost:5173")


def build_email_payload(user, firm, token_raw, subs_info=[]):
    """Build a structured dict of template variables for the EmailJS onboarding template."""
    activation_link = f"{DEFAULT_FRONTEND_BASE}/ca/activate?token={token_raw}&email={user.email}"

    # --- Build modules_links HTML block ---
    if subs_info:
        modules_html_parts = []
        for sub in subs_info:
            slug = sub.get('module_slug', '')
            route = MODULE_FRONTEND_ROUTES.get(slug, f"/ca/{slug}")
            # Use custom_module_url from firm_modules if present, else build default
            access_url = f"{DEFAULT_FRONTEND_BASE}{sub.get('module_url')}" if sub.get('module_url') else f"{DEFAULT_FRONTEND_BASE}{route}"
            auto_renew_label = 'Yes (Auto-Renew)' if sub.get('auto_renew') else 'Manual Renewal'
            status_label = sub.get('status', 'active').capitalize()
            status_color = '#2d6a4f' if status_label == 'Active' else '#c0392b'

            modules_html_parts.append(
                f'<div style="border:1px solid #e8f0eb; border-radius:8px; padding:14px 16px; margin-bottom:10px; background:#fafdfb;">'
                f'<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">'
                f'<span style="font-weight:700; color:#1b4332; font-size:14px;">{sub["module_name"]}</span>'
                f'<span style="font-size:11px; font-weight:600; color:{status_color}; background:{status_color}1a; padding:2px 8px; border-radius:20px;">{status_label}</span>'
                f'</div>'
                f'<table style="width:100%; font-size:12px; color:#555; border-collapse:collapse;">'
                f'<tr><td style="padding:2px 0; width:40%;"><strong>Plan:</strong></td><td>{sub["plan_name"]}</td></tr>'
                f'<tr><td style="padding:2px 0;"><strong>Valid From:</strong></td><td>{sub["start_date"]}</td></tr>'
                f'<tr><td style="padding:2px 0;"><strong>Valid Until:</strong></td><td>{sub["expiry_date"]}</td></tr>'
                f'<tr><td style="padding:2px 0;"><strong>Duration:</strong></td><td>{sub.get("duration_days", "")} days</td></tr>'
                f'<tr><td style="padding:2px 0;"><strong>Renewal:</strong></td><td>{auto_renew_label}</td></tr>'
                f'</table>'
                f'<div style="margin-top:10px;">'
                f'<a href="{access_url}" style="display:inline-block; background:#2d6a4f; color:#fff !important; padding:7px 18px; border-radius:6px; font-size:12px; font-weight:700; text-decoration:none;">'
                f'Access {sub["module_name"]} &rarr;'
                f'</a>'
                f'<span style="margin-left:10px; font-size:11px; color:#888;">{access_url}</span>'
                f'</div>'
                f'</div>'
            )
        modules_links = ''.join(modules_html_parts)
    else:
        modules_links = '<p style="color:#888; font-style:italic;">No modules have been assigned to your firm yet. Please contact your NZSolution administrator.</p>'

    return {
        'to_name': f"{user.first_name} {user.last_name}",
        'to_email': user.email,
        'firm_name': firm.firm_name,
        'firm_code': firm.firm_code,
        'activation_link': activation_link,
        'modules_links': modules_links,
    }


def get_superadmin_emailjs_credentials():
    """Fetch SuperAdmin EmailJS credentials from email_settings table."""
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT service_id, template_id, public_key FROM email_settings WHERE firm_id IS NULL LIMIT 1"
            )
            row = cursor.fetchone()
            if row:
                return {'service_id': row[0], 'template_id': row[1], 'public_key': row[2]}
    except Exception as e:
        print("Failed to fetch EmailJS credentials:", e)
    return None


class CAFirmsListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        # Fetch list of all firms
        firms = CAFirm.objects.exclude(status='deleted').order_by('-created_at')
        data = []
        for f in firms:
            # Get primary admin details
            admin_user = None
            primary_mapping = CAFirmUser.objects.filter(firm_id=f.id, is_primary_contact=True).first()
            if primary_mapping:
                admin_user = User.objects.filter(id=primary_mapping.user_id).first()
                
            # Get subscriptions count
            active_subs_count = FirmSubscription.objects.filter(firm_id=f.id, status='active').count()
            
            data.append({
                'id': f.id,
                'firm_name': f.firm_name,
                'firm_code': f.firm_code,
                'email': f.email,
                'mobile': f.mobile,
                'city': f.city,
                'state': f.state,
                'status': f.status,
                'created_at': f.created_at,
                'active_subscriptions': active_subs_count,
                'admin_name': f"{admin_user.first_name} {admin_user.last_name}" if admin_user else 'None',
                'admin_email': admin_user.email if admin_user else 'None'
            })
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CAFirmCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        subscriptions_input = validated_data.pop('subscriptions', [])

        token_raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token_raw.encode()).hexdigest()

        try:
            with transaction.atomic():
                # 1. Create Firm
                firm = CAFirm.objects.create(
                    firm_name=validated_data.get('firm_name'),
                    firm_code=validated_data.get('firm_code'),
                    registration_number=validated_data.get('registration_number', ''),
                    gst_number=validated_data.get('gst_number', ''),
                    pan_number=validated_data.get('pan_number', ''),
                    tan_number=validated_data.get('tan_number', ''),
                    cin_number=validated_data.get('cin_number', ''),
                    llp_number=validated_data.get('llp_number', ''),
                    email=validated_data.get('email'),
                    mobile=validated_data.get('mobile'),
                    alternate_mobile=validated_data.get('alternate_mobile', ''),
                    website=validated_data.get('website', ''),
                    address_line1=validated_data.get('address_line1', ''),
                    address_line2=validated_data.get('address_line2', ''),
                    city=validated_data.get('city', ''),
                    state=validated_data.get('state', ''),
                    country=validated_data.get('country', 'India'),
                    pincode=validated_data.get('pincode', ''),
                    business_type=validated_data.get('business_type', ''),
                    firm_size=validated_data.get('firm_size', ''),
                    established_year=validated_data.get('established_year'),
                    billing_email=validated_data.get('billing_email'),
                    billing_phone=validated_data.get('billing_phone', ''),
                    billing_address=validated_data.get('billing_address', ''),
                    status='active',
                    created_by=request.user.id
                )

                # 2. Create User (CA Admin role_id = 2)
                # Set a secure random string for initial dummy password (will be overwritten upon activation)
                dummy_pass = secrets.token_urlsafe(16)
                user = User(
                    email=validated_data.get('admin_email'),
                    first_name=validated_data.get('admin_first_name'),
                    last_name=validated_data.get('admin_last_name'),
                    mobile=validated_data.get('admin_mobile'),
                    role_id=2, # firm_admin
                    is_active=True,
                    is_verified=False,
                    email_verification_token=token_hash,
                    password_reset_expires=timezone.now() + timedelta(hours=24),
                    created_by=request.user.id
                )
                user.set_password(dummy_pass)
                user.save()

                # 3. Create ca_firm_users mapping
                CAFirmUser.objects.create(
                    firm_id=firm.id,
                    user_id=user.id,
                    designation=validated_data.get('admin_designation', 'CA Admin'),
                    is_primary_contact=True,
                    is_owner=True,
                    status='active',
                    joining_date=timezone.now().date(),
                    created_by=request.user.id
                )

                # 4. Create subscriptions
                subs_info_for_email = []
                for sub_in in subscriptions_input:
                    module = Module.objects.get(id=sub_in['module_id'])
                    plan = SubscriptionPlan.objects.get(id=sub_in['plan_id'])
                    
                    sub_code = f"SUB-{firm.firm_code.upper()}-{module.slug.upper().replace('-', '_')}"
                    
                    # Deduce status from dates
                    today = timezone.now().date()
                    sub_status = 'active'
                    if sub_in['start_date'] > today:
                        sub_status = 'pending'
                    elif sub_in['expiry_date'] < today:
                        sub_status = 'expired'

                    subscription = FirmSubscription.objects.create(
                        firm_id=firm.id,
                        plan_id=plan.id,
                        subscription_code=sub_code,
                        start_date=sub_in['start_date'],
                        expiry_date=sub_in['expiry_date'],
                        auto_renew=sub_in['auto_renew'],
                        is_active=True,
                        is_trial=plan.is_trial,
                        status=sub_status,
                        created_by=request.user.id
                    )

                    # Generate unique link for this firm and module
                    unique_url = f"/ca/{firm.firm_code}/{module.slug}"

                    # Create firm_modules link
                    fm = FirmModule.objects.create(
                        firm_id=firm.id,
                        module_id=module.id,
                        subscription_id=subscription.id,
                        module_status=sub_status,
                        custom_module_url=unique_url,
                        activated_at=datetime.combine(sub_in['start_date'], datetime.min.time(), tzinfo=timezone.utc),
                        expires_at=datetime.combine(sub_in['expiry_date'], datetime.max.time(), tzinfo=timezone.utc),
                        created_by=request.user.id
                    )

                    # Build duration label
                    delta = (sub_in['expiry_date'] - sub_in['start_date']).days

                    subs_info_for_email.append({
                        'module_name': module.display_name,
                        'module_slug': module.slug,
                        'module_url': fm.custom_module_url or module.frontend_url or '',
                        'plan_name': plan.plan_name,
                        'plan_code': plan.plan_code,
                        'price': str(plan.price),
                        'duration_days': delta,
                        'start_date': str(sub_in['start_date']),
                        'expiry_date': str(sub_in['expiry_date']),
                        'auto_renew': sub_in['auto_renew'],
                        'status': sub_status,
                    })

                # Audit Log CA Firm Creation
                log_audit(
                    user_id=request.user.id,
                    firm_id=firm.id,
                    table_name='ca_firms',
                    record_id=firm.id,
                    action='create',
                    new_values=f"Created CA Firm {firm.firm_name} with Admin {user.email}",
                    request=request
                )

            # Build email payload for frontend to send via EmailJS
            email_payload = build_email_payload(user, firm, token_raw, subs_info_for_email)
            emailjs_creds = get_superadmin_emailjs_credentials()

            return Response({
                'id': firm.id,
                'firm_name': firm.firm_name,
                'firm_code': firm.firm_code,
                'admin_email': user.email,
                'admin_first_name': user.first_name,
                'admin_last_name': user.last_name,
                'activation_token': token_raw,
                'subscriptions': subs_info_for_email,
                # Frontend uses these to call emailjs.send()
                'email_payload': email_payload,
                'emailjs_credentials': emailjs_creds,
                'message': 'CA Firm and Administrator created successfully.'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            traceback.print_exc()
            return Response({'error': f"Failed to create CA Firm: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CAFirmsDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, id):
        try:
            f = CAFirm.objects.get(id=id)
        except CAFirm.DoesNotExist:
            return Response({'error': 'CA Firm does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        # Get admin mapping
        admin_user = None
        primary_mapping = CAFirmUser.objects.filter(firm_id=f.id, is_primary_contact=True).first()
        if primary_mapping:
            admin_user = User.objects.filter(id=primary_mapping.user_id).first()

        # Get subscriptions
        subs = FirmSubscription.objects.filter(firm_id=f.id)
        subs_list = []
        for s in subs:
            # Map module linked via firm_modules
            fm = FirmModule.objects.filter(subscription_id=s.id).first()
            module_name = fm.module.display_name if fm else 'Unknown Module'
            subs_list.append({
                'id': s.id,
                'module_name': module_name,
                'plan_name': s.plan.plan_name,
                'start_date': s.start_date,
                'expiry_date': s.expiry_date,
                'status': s.status,
                'auto_renew': s.auto_renew,
                'payment_status': 'Completed' if s.status == 'active' else 'Expired/Pending'
            })

        data = {
            'firm': {
                'id': f.id,
                'firm_name': f.firm_name,
                'firm_code': f.firm_code,
                'registration_number': f.registration_number,
                'gst_number': f.gst_number,
                'pan_number': f.pan_number,
                'tan_number': f.tan_number,
                'cin_number': f.cin_number,
                'llp_number': f.llp_number,
                'email': f.email,
                'mobile': f.mobile,
                'alternate_mobile': f.alternate_mobile,
                'website': f.website,
                'address_line1': f.address_line1,
                'address_line2': f.address_line2,
                'city': f.city,
                'state': f.state,
                'country': f.country,
                'pincode': f.pincode,
                'business_type': f.business_type,
                'firm_size': f.firm_size,
                'established_year': f.established_year,
                'billing_email': f.billing_email,
                'billing_phone': f.billing_phone,
                'billing_address': f.billing_address,
                'status': f.status,
                'created_at': f.created_at
            },
            'admin': {
                'name': f"{admin_user.first_name} {admin_user.last_name}" if admin_user else 'None',
                'email': admin_user.email if admin_user else 'None',
                'mobile': admin_user.mobile if admin_user else 'None',
                'designation': primary_mapping.designation if primary_mapping else 'None',
                'is_verified': admin_user.is_verified if admin_user else False,
                'last_login': admin_user.last_login if admin_user else None,
                'status': 'Active' if admin_user and admin_user.is_active else 'Disabled'
            },
            'subscriptions': subs_list
        }
        return Response(data, status=status.HTTP_200_OK)


class ResendActivationEmailView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, id):
        primary_mapping = CAFirmUser.objects.filter(firm_id=id, is_primary_contact=True).first()
        if not primary_mapping:
            return Response({'error': 'Primary contact admin not found for this firm.'}, status=status.HTTP_404_NOT_FOUND)

        user = User.objects.filter(id=primary_mapping.user_id).first()
        if not user:
            return Response({'error': 'Admin user record not found.'}, status=status.HTTP_404_NOT_FOUND)

        firm = CAFirm.objects.get(id=id)

        token_raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token_raw.encode()).hexdigest()

        user.email_verification_token = token_hash
        user.password_reset_expires = timezone.now() + timedelta(hours=24)
        user.save()

        # Get subscriptions to display in email
        subs = FirmSubscription.objects.filter(firm_id=id, status='active')
        subs_info = []
        for s in subs:
            fm = FirmModule.objects.filter(subscription_id=s.id).first()
            if fm:
                subs_info.append({
                    'module_name': fm.module.display_name,
                    'plan_name': s.plan.plan_name,
                    'start_date': str(s.start_date),
                    'expiry_date': str(s.expiry_date)
                })

        email_sent = send_activation_email(user, firm, token_raw, subs_info)

        # Log resend to audit logs
        log_audit(
            user_id=request.user.id,
            firm_id=firm.id,
            table_name='users',
            record_id=user.id,
            action='resend_activation',
            new_values=f"Resent activation token email to CA Admin {user.email}",
            request=request
        )

        return Response({
            'email_sent': email_sent,
            'message': 'Activation token generated and verification email resent.' if email_sent else 'Failed to send activation email.'
        }, status=status.HTTP_200_OK if email_sent else status.HTTP_500_INTERNAL_SERVER_ERROR)


class CAFirmActionView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, id):
        action = request.data.get('action') # activate, suspend, delete
        try:
            firm = CAFirm.objects.get(id=id)
        except CAFirm.DoesNotExist:
            return Response({'error': 'CA Firm not found.'}, status=status.HTTP_404_NOT_FOUND)

        old_status = firm.status

        if action == 'activate':
            firm.status = 'active'
            firm.save()
        elif action == 'suspend':
            firm.status = 'suspended'
            firm.save()
        elif action == 'delete':
            firm.status = 'deleted'
            firm.deleted_at = timezone.now()
            firm.save()
        else:
            return Response({'error': 'Invalid action parameters.'}, status=status.HTTP_400_BAD_REQUEST)

        # Log change to audit logs
        log_audit(
            user_id=request.user.id,
            firm_id=firm.id,
            table_name='ca_firms',
            record_id=firm.id,
            action=action,
            old_values=f"Status: {old_status}",
            new_values=f"Status: {firm.status}",
            request=request
        )

        return Response({'message': f"CA Firm status changed to {firm.status} successfully."}, status=status.HTTP_200_OK)


class GetAvailableModulesPlansView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        modules = Module.objects.filter(is_active=True)
        plans = SubscriptionPlan.objects.filter(is_active=True)
        
        # Build plan modules relationships
        with connection.cursor() as cursor:
            cursor.execute("SELECT plan_id, module_id FROM plan_modules")
            relations = cursor.fetchall()
            
        # Group plan IDs by module ID
        module_plans_map = {}
        for r in relations:
            pid, mid = r[0], r[1]
            if mid not in module_plans_map:
                module_plans_map[mid] = []
            module_plans_map[mid].append(pid)

        modules_list = []
        for m in modules:
            allowed_plan_ids = module_plans_map.get(m.id, [])
            # If no specific plans are mapped, allow all active plans, otherwise restrict
            plan_pool = plans if not allowed_plan_ids else [p for p in plans if p.id in allowed_plan_ids]
            
            module_plans = [
                {
                    'id': p.id,
                    'plan_name': p.plan_name,
                    'plan_code': p.plan_code,
                    'price': p.price,
                    'duration_days': p.duration_days,
                    'is_trial': p.is_trial
                } for p in plan_pool
            ]
            
            modules_list.append({
                'id': m.id,
                'module_name': m.module_name,
                'display_name': m.display_name,
                'slug': m.slug,
                'description': m.description,
                'frontend_url': m.frontend_url,
                'plans': module_plans
            })

        return Response(modules_list, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            module = Module.objects.create(
                module_name=request.data.get('module_name'),
                display_name=request.data.get('display_name'),
                slug=request.data.get('slug'),
                description=request.data.get('description'),
                short_description=request.data.get('short_description'),
                category=request.data.get('category'),
                frontend_url=request.data.get('frontend_url'),
                backend_url=request.data.get('backend_url'),
                database_name=request.data.get('database_name'),
                status=request.data.get('status', 'draft'),
                is_active=request.data.get('is_active', True),
                is_featured=request.data.get('is_featured', False),
                created_by=request.user.id if request.user else None
            )
            return Response({'message': 'Module created successfully', 'id': module.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ModuleDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, pk):
        try:
            module = Module.objects.get(pk=pk)
            for key, value in request.data.items():
                if hasattr(module, key):
                    setattr(module, key, value)
            module.updated_by = request.user.id if request.user else None
            module.save()
            return Response({'message': 'Module updated successfully'}, status=status.HTTP_200_OK)
        except Module.DoesNotExist:
            return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            module = Module.objects.get(pk=pk)
            module.delete()
            return Response({'message': 'Module deleted successfully'})
        except Module.DoesNotExist:
            return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class SubscriptionPlanDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, pk):
        try:
            plan = SubscriptionPlan.objects.get(pk=pk)
            for key, value in request.data.items():
                if hasattr(plan, key):
                    setattr(plan, key, value)
            plan.updated_by = request.user.id if request.user else None
            plan.save()
            return Response({'message': 'Subscription Plan updated successfully'}, status=status.HTTP_200_OK)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Subscription Plan not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        try:
            plan = SubscriptionPlan.objects.create(
                plan_name=request.data.get('plan_name'),
                plan_code=request.data.get('plan_code'),
                price=request.data.get('price', 0),
                duration_days=request.data.get('duration_days', 365),
                is_trial=request.data.get('is_trial', False),
                created_by=request.user.id if request.user else None
            )
            module_id = request.data.get('module_id')
            if module_id:
                with connection.cursor() as cursor:
                    cursor.execute("INSERT INTO plan_modules (plan_id, module_id) VALUES (%s, %s)", [plan.id, module_id])
            
            return Response({'message': 'Subscription Plan created successfully', 'id': plan.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class LocalModulesDiscoveryView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        """Scans the root modules directory for any apps containing a module.json file"""
        modules_dir = os.path.normpath(os.path.join(settings.BASE_DIR, '..', 'modules'))
        discovered_modules = []

        try:
            if not os.path.exists(modules_dir):
                return Response([], status=status.HTTP_200_OK)

            # Recursively walk through the modules directory to find module.json files
            for root, dirs, files in os.walk(modules_dir):
                # Skip common ignored directories
                dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', 'venv', 'env']]
                if 'module.json' not in files:
                    # Check if it looks like a project folder (contains package.json, manage.py, etc.)
                    if any(f in files for f in ['package.json', 'manage.py', 'requirements.txt']):
                        folder_name = os.path.basename(root)
                        module_config = {
                            "name": folder_name.replace('-', ' ').replace('_', ' ').title(),
                            "slug": folder_name.lower().replace('-', '_').replace(' ', '_'),
                            "version": "1.0.0",
                            "description": "Auto-generated module configuration.",
                            "author": "System",
                            "routes": {
                                "frontend_entry": "",
                                "backend_apps": []
                            }
                        }
                        try:
                            json_path = os.path.join(root, 'module.json')
                            with open(json_path, 'w', encoding='utf-8-sig') as f:
                                json.dump(module_config, f, indent=2)
                            files.append('module.json')
                        except Exception as e:
                            print(f"Failed to auto-generate module.json in {root}: {e}")
                
                if 'module.json' in files:
                    # Stop recursing into subdirectories of this module
                    dirs.clear()
                    json_path = os.path.join(root, 'module.json')
                    try:
                        with open(json_path, 'r', encoding='utf-8-sig') as f:
                            module_config = json.load(f)
                        
                        # Check if it's already installed in the database
                        slug = module_config.get('slug')
                        is_installed = False
                        if slug:
                            is_installed = Module.objects.filter(slug=slug).exists()
                            
                            # Auto-detect database name from .env
                            env_var_name = f"{slug.upper().replace('-', '_')}_DB_NAME"
                            db_name = os.environ.get(env_var_name)
                            if not db_name:
                                try:
                                    env_path = os.path.join(settings.BASE_DIR, '.env')
                                    if os.path.exists(env_path):
                                        with open(env_path, 'r') as env_file:
                                            for line in env_file:
                                                if line.startswith(env_var_name + '='):
                                                    db_name = line.strip().split('=', 1)[1]
                                                    break
                                except Exception:
                                    pass
                            if db_name:
                                module_config['database_name'] = db_name
                        
                        module_config['is_installed'] = is_installed
                        # Use the relative path from the modules folder as the folder_name
                        rel_path = os.path.relpath(root, modules_dir)
                        # Normalize path separators to forward slash for frontend consistency
                        module_config['folder_name'] = rel_path.replace(os.sep, '/')
                        discovered_modules.append(module_config)
                    except Exception as e:
                        print(f"Error reading module.json in {root}: {e}")
            
            return Response(discovered_modules, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f"Failed to scan modules: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ManageSubscriptionsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, id):
        subs = FirmSubscription.objects.filter(firm_id=id)
        data = []
        for s in subs:
            fm = FirmModule.objects.filter(subscription_id=s.id).first()
            module_name = fm.module.display_name if fm else 'Unknown'
            data.append({
                'id': s.id,
                'module_id': fm.module.id if fm else None,
                'module_name': module_name,
                'plan_id': s.plan.id,
                'plan_name': s.plan.plan_name,
                'start_date': s.start_date,
                'expiry_date': s.expiry_date,
                'status': s.status,
                'auto_renew': s.auto_renew
            })
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, id):
        try:
            firm = CAFirm.objects.get(id=id)
        except CAFirm.DoesNotExist:
            return Response({'error': 'CA Firm does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action') # add, edit, cancel
        module_id = request.data.get('module_id')
        plan_id = request.data.get('plan_id')
        start_date_str = request.data.get('start_date')
        expiry_date_str = request.data.get('expiry_date')
        auto_renew = request.data.get('auto_renew', False)
        subscription_id = request.data.get('subscription_id')

        if action not in ['cancel', 'delete']:
            if (action == 'add' and not module_id) or not plan_id or not start_date_str or not expiry_date_str:
                return Response({'error': 'Missing parameters.'}, status=status.HTTP_400_BAD_REQUEST)
            
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d').date()
            
            if expiry_date <= start_date:
                return Response({'error': 'Expiry date must be after start date.'}, status=status.HTTP_400_BAD_REQUEST)

            plan = SubscriptionPlan.objects.get(id=plan_id)
            today = timezone.now().date()
            sub_status = 'active'
            if start_date > today:
                sub_status = 'pending'
            elif expiry_date < today:
                sub_status = 'expired'
        else:
            today = timezone.now().date()
            
        module = Module.objects.filter(id=module_id).first() if module_id else None

        try:
            with transaction.atomic():
                if action == 'add':
                    if not module:
                        return Response({'error': 'Valid module is required for new subscriptions.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    sub_code = f"SUB-{firm.firm_code.upper()}-{module.slug.upper().replace('-', '_')}-{secrets.token_hex(3)}"
                    subscription = FirmSubscription.objects.create(
                        firm_id=firm.id,
                        plan_id=plan.id,
                        subscription_code=sub_code,
                        start_date=start_date,
                        expiry_date=expiry_date,
                        auto_renew=auto_renew,
                        is_active=True,
                        status=sub_status,
                        created_by=request.user.id
                    )

                    FirmModule.objects.create(
                        firm_id=firm.id,
                        module_id=module.id,
                        subscription_id=subscription.id,
                        module_status=sub_status,
                        activated_at=datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc),
                        expires_at=datetime.combine(expiry_date, datetime.max.time(), tzinfo=timezone.utc),
                        created_by=request.user.id
                    )

                    log_audit(
                        user_id=request.user.id,
                        firm_id=firm.id,
                        table_name='firm_subscriptions',
                        record_id=subscription.id,
                        action='subscribe',
                        new_values=f"Added subscription for module {module.display_name} under plan {plan.plan_name}",
                        request=request
                    )

                elif action == 'edit':
                    if not subscription_id:
                        return Response({'error': 'Subscription ID is missing.'}, status=status.HTTP_400_BAD_REQUEST)
                        
                    sub = FirmSubscription.objects.filter(id=subscription_id, firm_id=firm.id).first()
                    if not sub:
                        return Response({'error': 'Subscription not found.'}, status=status.HTTP_404_NOT_FOUND)

                    old_values = f"Start: {sub.start_date}, Expiry: {sub.expiry_date}, Plan: {sub.plan.plan_name}, Status: {sub.status}"

                    sub.plan = plan
                    sub.start_date = start_date
                    sub.expiry_date = expiry_date
                    sub.auto_renew = auto_renew
                    sub.status = sub_status
                    sub.save()

                    # Find related FirmModule to update its status
                    fm = FirmModule.objects.filter(subscription_id=sub.id).first()
                    if fm:
                        fm.module_status = sub_status
                        fm.activated_at = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
                        fm.expires_at = datetime.combine(expiry_date, datetime.max.time(), tzinfo=timezone.utc)
                        fm.save()

                    log_audit(
                        user_id=request.user.id,
                        firm_id=firm.id,
                        table_name='firm_subscriptions',
                        record_id=sub.id,
                        action='extend',
                        old_values=old_values,
                        new_values=f"Start: {start_date}, Expiry: {expiry_date}, Plan: {plan.plan_name}, Status: {sub_status}",
                        request=request
                    )

                elif action == 'cancel':
                    if not subscription_id:
                        return Response({'error': 'Subscription ID is missing for cancellation.'}, status=status.HTTP_400_BAD_REQUEST)
                        
                    sub = FirmSubscription.objects.filter(id=subscription_id, firm_id=firm.id).first()
                    if not sub:
                        return Response({'error': 'Subscription not found.'}, status=status.HTTP_404_NOT_FOUND)
                        
                    sub.status = 'cancelled'
                    sub.is_active = False
                    sub.cancellation_date = today
                    sub.cancellation_reason = 'Cancelled by SuperAdmin'
                    sub.save()

                    fm = FirmModule.objects.filter(subscription_id=sub.id).first()
                    if fm:
                        fm.module_status = 'inactive'
                        fm.save()

                    log_audit(
                        user_id=request.user.id,
                        firm_id=firm.id,
                        table_name='firm_subscriptions',
                        record_id=sub.id,
                        action='cancel',
                        new_values="Cancelled module subscription",
                        request=request
                    )
                elif action == 'delete':
                    if not subscription_id:
                        return Response({'error': 'Subscription ID is missing for deletion.'}, status=status.HTTP_400_BAD_REQUEST)
                        
                    sub = FirmSubscription.objects.filter(id=subscription_id, firm_id=firm.id).first()
                    if not sub:
                        return Response({'error': 'Subscription not found.'}, status=status.HTTP_404_NOT_FOUND)
                        
                    # Delete the related FirmModule if it exists (cascade will handle it, but let's be explicit and audit)
                    fm = FirmModule.objects.filter(subscription_id=sub.id).first()
                    
                    log_audit(
                        user_id=request.user.id,
                        firm_id=firm.id,
                        table_name='firm_subscriptions',
                        record_id=sub.id,
                        action='delete',
                        new_values="Permanently deleted subscription record",
                        request=request
                    )
                    
                    if fm:
                        fm.delete()
                    
                    sub.delete()
                else:
                    return Response({'error': 'Unsupported action.'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({'message': 'Subscriptions updated successfully.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f"Failed to manage subscription: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# AllowAny API for CA Admin Activation
class ActivateAccountView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_raw = request.data.get('token')
        email = request.data.get('email')
        password = request.data.get('password')

        if not token_raw or not email or not password:
            return Response({'error': 'Activation token, email, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        token_hash = hashlib.sha256(token_raw.encode()).hexdigest()

        try:
            user = User.objects.get(email=email, email_verification_token=token_hash)
        except User.DoesNotExist:
            return Response({'error': 'Invalid activation token or email address.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check token expiry
        if user.password_reset_expires and user.password_reset_expires < timezone.now():
            return Response({'error': 'Activation token has expired. Request a new activation link.'}, status=status.HTTP_400_BAD_REQUEST)

        # Activate user
        with transaction.atomic():
            user.set_password(password)
            user.is_verified = True
            user.is_active = True
            user.email_verified_at = timezone.now()
            user.email_verification_token = None
            user.password_reset_expires = None
            user.save()

            # Find mapped firm to log audit
            firm_map = CAFirmUser.objects.filter(user_id=user.id).first()
            firm_id = firm_map.firm_id if firm_map else None

            log_audit(
                user_id=user.id,
                firm_id=firm_id,
                table_name='users',
                record_id=user.id,
                action='activate',
                new_values="Account verified and password configured.",
                request=request
            )

        return Response({'message': 'Your NZSolution CA account has been successfully activated. You can now login.'}, status=status.HTTP_200_OK)


# CA Admin & Staff Module Access APIs
class CAModulesListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Find which CA Firm this user belongs to
        firm_user = CAFirmUser.objects.filter(user_id=user.id, status='active').first()
        if not firm_user:
            return Response({'error': 'User is not associated with any active CA Firm.'}, status=status.HTTP_403_FORBIDDEN)
            
        firm = CAFirm.objects.filter(id=firm_user.firm_id).first()
        if not firm or firm.status != 'active':
            return Response({'error': 'CA Firm is inactive or suspended.'}, status=status.HTTP_403_FORBIDDEN)

        # Get active modules from firm_modules
        today = timezone.now()
        firm_mods = FirmModule.objects.filter(firm_id=firm.id)
        
        modules_data = []
        for fm in firm_mods:
            # Enforce server-side validation: Module active + Firm Active + Current Date within Subscription
            is_valid_sub = (
                fm.module.is_active and 
                fm.module_status == 'active' and 
                fm.activated_at <= today <= fm.expires_at
            )
            
            days_remaining = (fm.expires_at - today).days
            sub_status = fm.module_status
            if today > fm.expires_at:
                sub_status = 'expired'
                is_valid_sub = False

            # We format data for Dashboard rendering
            modules_data.append({
                'id': fm.module.id,
                'module_name': fm.module.display_name,
                'description': fm.module.description,
                'slug': fm.module.slug,
                'plan_name': fm.subscription.plan.plan_name,
                'start_date': fm.activated_at.date(),
                'expiry_date': fm.expires_at.date(),
                'days_remaining': max(0, days_remaining),
                'subscription_status': sub_status,
                'is_accessible': is_valid_sub,
                'frontend_url': fm.module.frontend_url
            })

        return Response({
            'ca_name': f"{user.first_name} {user.last_name}",
            'firm_name': firm.firm_name,
            'firm_status': firm.status,
            'modules': modules_data
        }, status=status.HTTP_200_OK)


class CAModuleAccessVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        user = request.user
        firm_user = CAFirmUser.objects.filter(user_id=user.id, status='active').first()
        if not firm_user:
            return Response({'error': 'Access Denied: User not mapped to CA Firm.'}, status=status.HTTP_403_FORBIDDEN)
            
        firm = CAFirm.objects.filter(id=firm_user.firm_id).first()
        if not firm or firm.status != 'active':
            return Response({'error': 'Access Denied: CA Firm is inactive.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            module = Module.objects.get(slug=slug, is_active=True)
        except Module.DoesNotExist:
            return Response({'error': 'Access Denied: Module does not exist or is inactive.'}, status=status.HTTP_404_NOT_FOUND)

        # Get mapping
        fm = FirmModule.objects.filter(firm_id=firm.id, module_id=module.id).first()
        if not fm:
            return Response({'error': 'Access Denied: Module is not subscribed.'}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.now()
        # Full validation: CA Firm Active + Module Active + Module Assigned + Subscription Active + Date within Subscription
        if not (fm.module_status == 'active' and fm.activated_at <= today <= fm.expires_at):
            return Response({'error': 'Your subscription for this module has expired.'}, status=status.HTTP_403_FORBIDDEN)

        # If authorized, return access status and URL
        return Response({
            'status': 'Access Granted',
            'frontend_url': fm.module.frontend_url
        }, status=status.HTTP_200_OK)


def ensure_email_settings_table():
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS email_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                firm_id INT NULL,
                provider VARCHAR(50) DEFAULT 'emailjs',
                service_id VARCHAR(100) NOT NULL,
                template_id VARCHAR(100) NOT NULL,
                public_key VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        """)


class SystemEmailSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ensure_email_settings_table()
        # Fetch system settings (firm_id is NULL)
        with connection.cursor() as cursor:
            cursor.execute("SELECT service_id, template_id, public_key FROM email_settings WHERE firm_id IS NULL LIMIT 1")
            row = cursor.fetchone()
        
        if row:
            return Response({
                'service_id': row[0],
                'template_id': row[1],
                'public_key': row[2]
            }, status=status.HTTP_200_OK)
            
        return Response({
            'service_id': '',
            'template_id': '',
            'public_key': ''
        }, status=status.HTTP_200_OK)

    def post(self, request):
        ensure_email_settings_table()
        service_id = request.data.get('service_id')
        template_id = request.data.get('template_id')
        public_key = request.data.get('public_key')

        if not service_id or not template_id or not public_key:
            return Response({'error': 'service_id, template_id, and public_key are required'}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM email_settings WHERE firm_id IS NULL LIMIT 1")
            row = cursor.fetchone()
            if row:
                cursor.execute(
                    "UPDATE email_settings SET service_id = %s, template_id = %s, public_key = %s WHERE id = %s",
                    [service_id, template_id, public_key, row[0]]
                )
            else:
                cursor.execute(
                    "INSERT INTO email_settings (firm_id, provider, service_id, template_id, public_key) VALUES (NULL, 'emailjs', %s, %s, %s)",
                    [service_id, template_id, public_key]
                )

        return Response({'message': 'System email settings updated successfully'}, status=status.HTTP_200_OK)


class FirmEmailSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ensure_email_settings_table()
        from accounts.models import CAFirmUser
        firm_user = CAFirmUser.objects.filter(user=request.user, status='active').first()
        if not firm_user:
            return Response({'error': 'No active firm association found for this user'}, status=status.HTTP_400_BAD_REQUEST)

        firm_id = firm_user.firm.id
        with connection.cursor() as cursor:
            cursor.execute("SELECT service_id, template_id, public_key FROM email_settings WHERE firm_id = %s LIMIT 1", [firm_id])
            row = cursor.fetchone()

        if row:
            return Response({
                'service_id': row[0],
                'template_id': row[1],
                'public_key': row[2]
            }, status=status.HTTP_200_OK)

        return Response({
            'service_id': '',
            'template_id': '',
            'public_key': ''
        }, status=status.HTTP_200_OK)

    def post(self, request):
        ensure_email_settings_table()
        from accounts.models import CAFirmUser
        firm_user = CAFirmUser.objects.filter(user=request.user, status='active').first()
        if not firm_user:
            return Response({'error': 'No active firm association found for this user'}, status=status.HTTP_400_BAD_REQUEST)

        firm_id = firm_user.firm.id
        service_id = request.data.get('service_id')
        template_id = request.data.get('template_id')
        public_key = request.data.get('public_key')

        if not service_id or not template_id or not public_key:
            return Response({'error': 'service_id, template_id, and public_key are required'}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM email_settings WHERE firm_id = %s LIMIT 1", [firm_id])
            row = cursor.fetchone()
            if row:
                cursor.execute(
                    "UPDATE email_settings SET service_id = %s, template_id = %s, public_key = %s WHERE id = %s",
                    [service_id, template_id, public_key, row[0]]
                )
            else:
                cursor.execute(
                    "INSERT INTO email_settings (firm_id, provider, service_id, template_id, public_key) VALUES (%s, 'emailjs', %s, %s, %s)",
                    [firm_id, service_id, template_id, public_key]
                )

        return Response({'message': 'Firm email settings updated successfully'}, status=status.HTTP_200_OK)


class SuperAdminDashboardDataView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from django.db.models import Sum
        from django.utils import timezone
        import datetime

        total_firms = CAFirm.objects.filter(status='active').count()
        total_plans = SubscriptionPlan.objects.filter(is_active=True).count()
        active_subscriptions = FirmSubscription.objects.filter(status='active').count()
        
        # Revenue
        active_firm_subs = FirmSubscription.objects.filter(status='active')
        total_revenue = active_firm_subs.aggregate(total=Sum('plan__price'))['total'] or 0
        
        # Chart data: Last 6 months
        today = timezone.now().date()
        chart_data = []
        for i in range(5, -1, -1):
            d = today - datetime.timedelta(days=30*i)
            month_str = d.strftime('%b %Y')
            regs = CAFirm.objects.filter(created_at__year=d.year, created_at__month=d.month).count()
            rev = FirmSubscription.objects.filter(created_at__year=d.year, created_at__month=d.month).aggregate(total=Sum('plan__price'))['total'] or 0
            chart_data.append({
                'month': month_str,
                'Revenue': float(rev),
                'Registrations': regs
            })
            
        # Recent Subscriptions
        recent_subs_objs = FirmSubscription.objects.select_related('firm', 'plan').all().order_by('-created_at')[:5]
        recent_subscriptions = []
        for s in recent_subs_objs:
            recent_subscriptions.append({
                'id': s.subscription_code,
                'firm': s.firm.firm_name,
                'owner': s.firm.email,
                'plan': s.plan.plan_name,
                'amount': f"₹{s.plan.price}",
                'date': s.start_date.strftime('%b %d, %Y'),
                'expiry': s.expiry_date.strftime('%b %d, %Y'),
                'status': s.status.capitalize()
            })
            
        # Plan Details
        plans = SubscriptionPlan.objects.filter(is_active=True)
        plan_details = []
        for p in plans:
            active_count = FirmSubscription.objects.filter(plan=p, status='active').count()
            inactive_count = FirmSubscription.objects.filter(plan=p).exclude(status='active').count()
            if active_count > 0 or inactive_count > 0:
                plan_details.append({
                    'name': p.plan_name,
                    'active': active_count,
                    'inactive': inactive_count,
                    'color': '#006c3f',
                    'price': f"₹{p.price}"
                })
                
        return Response({
            'metrics': {
                'total_firms': total_firms,
                'total_plans': total_plans,
                'active_subscriptions': active_subscriptions,
                'total_revenue': float(total_revenue)
            },
            'chartData': chart_data,
            'recentSubscriptions': recent_subscriptions,
            'planDetails': plan_details
        }, status=status.HTTP_200_OK)

