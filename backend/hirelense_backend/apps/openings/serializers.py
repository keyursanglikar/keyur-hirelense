from rest_framework import serializers
from .models import JobOpening

from hirelense_backend.apps.flows.models import InterviewFlow
from hirelense_backend.apps.scorecards.models import Scorecard
from hirelense_backend.apps.tenants.models import Tenant

class JobOpeningSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobOpening
        fields = '__all__'
        extra_kwargs = {
            'tenant': {'required': False, 'allow_null': True},
            'flow': {'required': False, 'allow_null': True},
            'scorecard': {'required': False, 'allow_null': True}
        }

    def to_internal_value(self, data):
        # Make mutable if it's a QueryDict
        if hasattr(data, '_mutable') and not data._mutable:
            data = data.copy()

        # Set default tenant if missing based on the authenticated user's firm
        if 'tenant' not in data or data['tenant'] is None:
            request = self.context.get('request')
            tenant_id = None
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                try:
                    from accounts.models import CAFirmUser
                    firm_user = CAFirmUser.objects.filter(user=request.user).first()
                    if firm_user:
                        tenant_id = firm_user.firm.id
                except Exception:
                    pass
            
            if not tenant_id:
                tenant = Tenant.objects.first()
                tenant_id = tenant.id if tenant else 1
                
            data['tenant'] = tenant_id

        # Safely nullify mock/temporary flow IDs that don't exist in MySQL
        if 'flow' in data and data['flow'] is not None:
            try:
                flow_id = int(data['flow'])
                if not InterviewFlow.objects.filter(id=flow_id).exists():
                    data['flow'] = None
            except (ValueError, TypeError):
                data['flow'] = None

        # Safely nullify mock/temporary scorecard IDs that don't exist in MySQL
        if 'scorecard' in data and data['scorecard'] is not None:
            try:
                scorecard_id = int(data['scorecard'])
                if not Scorecard.objects.filter(id=scorecard_id).exists():
                    data['scorecard'] = None
            except (ValueError, TypeError):
                data['scorecard'] = None

        return super().to_internal_value(data)
