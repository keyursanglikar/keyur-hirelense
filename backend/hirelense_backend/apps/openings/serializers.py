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
        # Set default tenant if missing
        if 'tenant' not in data or data['tenant'] is None:
            tenant = Tenant.objects.first() or Tenant.objects.create(id=1, name="Default Tenant")
            data['tenant'] = tenant.id

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
